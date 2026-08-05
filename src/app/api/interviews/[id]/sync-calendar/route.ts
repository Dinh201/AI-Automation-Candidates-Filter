import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createCalendarEvent, refreshAccessToken, GoogleTokens } from "@/services/google-calendar-service";
import { logAudit } from "@/services/audit-service";

type Params = { params: Promise<{ id: string }> };

// Tạo lại sự kiện Google Calendar cho 1 lịch phỏng vấn đã có sẵn trong DB
// nhưng chưa có google_event_id — xảy ra khi lịch được đặt lúc Calendar đang
// mất kết nối/token hết hạn (đặt lịch trong app vẫn thành công vì DB insert
// không phụ thuộc Calendar, xem /api/interviews/schedule/route.ts). Kết nối
// lại Calendar chỉ làm mới token, KHÔNG tự backfill các lịch cũ — cần gọi
// route này để tạo bù sự kiện.
async function getValidTokens(): Promise<GoogleTokens | null> {
  const { data } = await supabaseAdmin
    .from("hr_calendar_tokens")
    .select("*")
    .eq("id", "default")
    .single();

  if (!data) return null;

  const tokens: GoogleTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? undefined,
    expiry: data.expiry,
  };

  const needsRefresh = !tokens.expiry || tokens.expiry - Date.now() < 60_000;
  if (needsRefresh && tokens.refresh_token) {
    try {
      const refreshed = await refreshAccessToken(tokens.refresh_token);
      await supabaseAdmin
        .from("hr_calendar_tokens")
        .update({ access_token: refreshed.access_token, expiry: refreshed.expiry, updated_at: new Date().toISOString() })
        .eq("id", "default");
      return refreshed;
    } catch (err) {
      console.warn("[calendar] Refresh thất bại, thử dùng token hiện tại:", err);
    }
  }

  return tokens;
}

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;

  const { data: interview, error: fetchError } = await supabaseAdmin
    .from("interviews")
    .select("id, candidate_id, start_time, end_time, interviewer_name, interviewer_email, notes, google_event_id, candidates(name, email, jobs(title))")
    .eq("id", id)
    .single();

  if (fetchError || !interview) {
    return NextResponse.json({ error: "Không tìm thấy buổi phỏng vấn", code: "NOT_FOUND" }, { status: 404 });
  }

  if (interview.google_event_id) {
    return NextResponse.json({ error: "Buổi phỏng vấn này đã có sự kiện Google Calendar", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const tokens = await getValidTokens();
  if (!tokens) {
    return NextResponse.json({ error: "Google Calendar chưa được kết nối", code: "CALENDAR_NOT_CONNECTED" }, { status: 400 });
  }

  const candidate = interview.candidates as unknown as { name: string; email: string; jobs: { title: string } | null } | null;
  if (!candidate) {
    return NextResponse.json({ error: "Không tìm thấy ứng viên", code: "NOT_FOUND" }, { status: 404 });
  }
  const jobTitle = candidate.jobs?.title ?? "Vị trí tuyển dụng";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const event = await createCalendarEvent(tokens, {
      summary: `Interview - ${candidate.name} - ${jobTitle}`,
      description: [
        `Ứng viên: ${candidate.name} (${candidate.email})`,
        `Vị trí: ${jobTitle}`,
        `Interviewer: ${interview.interviewer_name}`,
        interview.notes ? `Ghi chú: ${interview.notes}` : "",
        `\nHồ sơ AI: ${appUrl}/candidates/${interview.candidate_id}`,
      ].filter(Boolean).join("\n"),
      startTime: new Date(interview.start_time),
      endTime: new Date(interview.end_time),
      attendees: [
        { email: candidate.email, name: candidate.name },
        { email: interview.interviewer_email, name: interview.interviewer_name },
      ],
    });

    await supabaseAdmin
      .from("interviews")
      .update({ google_event_id: event.eventId, meet_link: event.meetLink ?? null, updated_at: new Date().toISOString() })
      .eq("id", id);

    logAudit({
      entity_type: "interview",
      entity_id: id,
      entity_name: candidate.name,
      action: "interview_calendar_synced",
      details: { job_title: jobTitle },
    });

    return NextResponse.json({ success: true, google_event_id: event.eventId, meet_link: event.meetLink ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sync-calendar] Lỗi tạo sự kiện:", message);
    return NextResponse.json({ error: "Không tạo được sự kiện Google Calendar. Vui lòng thử lại.", code: "EVENT_CREATE_FAILED" }, { status: 500 });
  }
}

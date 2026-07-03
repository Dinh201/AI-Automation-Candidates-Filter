import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  createCalendarEvent,
  checkFreeBusy,
  refreshAccessToken,
  GoogleTokens,
} from "@/services/google-calendar-service";
import { sendInterviewInvitation } from "@/services/email-service";
import { logAudit } from "@/services/audit-service";

async function getCalendarTokens(): Promise<GoogleTokens | null> {
  const { data } = await supabaseAdmin
    .from("hr_calendar_tokens")
    .select("*")
    .eq("id", "default")
    .single();

  if (!data) return null;

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? undefined,
    expiry: data.expiry,
  };
}

async function getValidTokens(): Promise<GoogleTokens | null> {
  const tokens = await getCalendarTokens();
  if (!tokens) return null;

  const needsRefresh = !tokens.expiry || tokens.expiry - Date.now() < 60_000;
  if (needsRefresh && tokens.refresh_token) {
    try {
      const refreshed = await refreshAccessToken(tokens.refresh_token);
      await supabaseAdmin.from("hr_calendar_tokens").update({
        access_token: refreshed.access_token,
        expiry: refreshed.expiry,
        updated_at: new Date().toISOString(),
      }).eq("id", "default");
      return refreshed;
    } catch (err) {
      console.warn("[calendar] Refresh token thất bại, thử dùng access_token hiện tại:", err);
      // Fall through — try the current access_token; Calendar API will return 401 if truly expired
    }
  }

  return tokens;
}

export async function POST(request: Request) {
  let body: {
    candidate_id: string;
    job_id: string;
    interviewer_name: string;
    interviewer_email: string;
    start_time: string;
    duration_minutes: number;
    notes?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { candidate_id, job_id, interviewer_name, interviewer_email, start_time, duration_minutes, notes } = body;

  if (!candidate_id || !job_id || !interviewer_name || !interviewer_email || !start_time || !duration_minutes) {
    return NextResponse.json(
      { error: "Thiếu thông tin bắt buộc", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const startDate = new Date(start_time);
  const endDate = new Date(startDate.getTime() + duration_minutes * 60_000);

  // DB-level overlap check — runs regardless of Calendar connection
  const { data: overlapping } = await supabaseAdmin
    .from("interviews")
    .select("id, start_time, end_time")
    .neq("status", "Cancelled")
    .lt("start_time", endDate.toISOString())
    .gt("end_time", startDate.toISOString());

  if (overlapping && overlapping.length > 0) {
    const conflict = overlapping[0];
    const conflictStart = new Date(conflict.start_time).toLocaleTimeString("vi-VN", {
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh",
    });
    const conflictEnd = new Date(conflict.end_time).toLocaleTimeString("vi-VN", {
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh",
    });
    return NextResponse.json(
      {
        error: `Khung giờ này trùng với một buổi phỏng vấn khác (${conflictStart}–${conflictEnd}). Vui lòng chọn giờ khác.`,
        code: "SLOT_NOT_AVAILABLE",
      },
      { status: 409 }
    );
  }

  const { data: candidate, error: candidateError } = await supabaseAdmin
    .from("candidates")
    .select("name, email, jobs(title)")
    .eq("id", candidate_id)
    .single();

  if (candidateError || !candidate) {
    console.error("[schedule] Không tìm thấy ứng viên:", candidateError?.message);
    return NextResponse.json({ error: "Ứng viên không tồn tại", code: "NOT_FOUND" }, { status: 404 });
  }

  const jobTitle = (candidate.jobs as unknown as { title: string } | null)?.title ?? "Vị trí tuyển dụng";

  let googleEventId: string | null = null;
  let meetLink: string | null = null;
  let calendarConnected = false;
  let calendarError: string | null = null;

  const tokens = await getValidTokens();
  if (!tokens) {
    calendarError = "Google Calendar chưa kết nối. Vào cài đặt để kết nối.";
  } else {
    // Check free/busy before creating the event
    try {
      const busyPeriods = await checkFreeBusy(tokens, startDate, endDate);
      if (busyPeriods.length > 0) {
        const busyStart = new Date(busyPeriods[0].start).toLocaleTimeString("vi-VN", {
          hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh",
        });
        const busyEnd = new Date(busyPeriods[0].end).toLocaleTimeString("vi-VN", {
          hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh",
        });
        return NextResponse.json(
          {
            error: `Khung giờ này đã bận trên Google Calendar (${busyStart}–${busyEnd}). Vui lòng chọn giờ khác.`,
            code: "SLOT_NOT_AVAILABLE",
          },
          { status: 409 }
        );
      }
    } catch (err) {
      // FreeBusy failed (e.g. token lacks calendar.readonly scope) — log and continue
      console.warn("FreeBusy check skipped:", err);
    }

    try {
      console.log("[calendar] Tạo sự kiện — token expiry:", new Date(tokens.expiry).toISOString(), "| có refresh_token:", !!tokens.refresh_token);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const event = await createCalendarEvent(tokens, {
        summary: `Interview - ${candidate.name} - ${jobTitle}`,
        description: [
          `Ứng viên: ${candidate.name} (${candidate.email})`,
          `Vị trí: ${jobTitle}`,
          `Interviewer: ${interviewer_name}`,
          notes ? `Ghi chú: ${notes}` : "",
          `\nHồ sơ AI: ${appUrl}/candidates/${candidate_id}`,
        ].filter(Boolean).join("\n"),
        startTime: startDate,
        endTime: endDate,
        attendees: [
          { email: candidate.email, name: candidate.name },
          { email: interviewer_email, name: interviewer_name },
        ],
      });

      googleEventId = event.eventId;
      meetLink = event.meetLink ?? null;
      calendarConnected = true;
      console.log("[calendar] Sự kiện tạo thành công — eventId:", googleEventId, "| meetLink:", meetLink);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[calendar] Lỗi tạo sự kiện Google Calendar:", message);
      if (message.includes("insufficientPermissions") || message.includes("forbidden") || message.includes("403")) {
        calendarError = "Token Google Calendar thiếu quyền tạo sự kiện. Vui lòng kết nối lại.";
      } else if (message.includes("invalid_grant") || message.includes("401")) {
        calendarError = "Token Google Calendar đã hết hạn. Vui lòng kết nối lại.";
      } else {
        calendarError = "Không thể tạo sự kiện Google Calendar. Lịch phỏng vấn vẫn được lưu trong hệ thống.";
      }
    }
  }

  const { data: interview, error: dbError } = await supabaseAdmin
    .from("interviews")
    .insert([{
      candidate_id,
      job_id,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      interviewer_email,
      interviewer_name,
      notes: notes ?? null,
      google_event_id: googleEventId,
      meet_link: meetLink,
      status: "Scheduled",
    }])
    .select()
    .single();

  if (dbError) {
    console.error("Interview DB error:", dbError);
    return NextResponse.json({ error: dbError.message, code: "DATABASE_ERROR" }, { status: 500 });
  }

  await supabaseAdmin
    .from("candidates")
    .update({ status: "Interviewing" })
    .eq("id", candidate_id);

  logAudit({
    entity_type: "interview",
    entity_id: interview.id,
    entity_name: candidate.name,
    action: "interview_scheduled",
    details: {
      job_title: jobTitle,
      interviewer: interviewer_name,
      start_time: startDate.toISOString(),
      has_calendar_event: !!googleEventId,
    },
  });

  let emailSent = false;
  try {
    await sendInterviewInvitation({
      candidateEmail: candidate.email,
      candidateName: candidate.name,
      interviewerEmail: interviewer_email,
      interviewerName: interviewer_name,
      jobTitle,
      startTime: startDate,
      endTime: endDate,
      meetLink: meetLink ?? undefined,
      notes,
    });
    emailSent = true;
  } catch (err) {
    console.error("Email send error (non-fatal):", err);
  }

  return NextResponse.json({
    success: true,
    interview,
    calendar_connected: calendarConnected,
    calendar_error: calendarError,
    meet_link: meetLink,
    email_sent: emailSent,
  });
}
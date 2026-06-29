import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/services/audit-service";
import {
  deleteCalendarEvent,
  refreshAccessToken,
  GoogleTokens,
} from "@/services/google-calendar-service";
import {
  sendHiredNotification,
  sendRejectedNotification,
} from "@/services/email-service";

type Params = { params: Promise<{ id: string }> };

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

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

  let body: {
    status?: "Completed" | "Cancelled" | "Rescheduled";
    outcome?: "Hired" | "Rejected";
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { status, outcome } = body;

  if (!status && !outcome) {
    return NextResponse.json(
      { error: "Cần ít nhất status hoặc outcome", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const { data: interview, error: fetchError } = await supabaseAdmin
    .from("interviews")
    .select("id, candidate_id, status, google_event_id, interviewer_name, candidates(name, email, jobs(title))")
    .eq("id", id)
    .single();

  if (fetchError || !interview) {
    return NextResponse.json({ error: "Không tìm thấy buổi phỏng vấn", code: "NOT_FOUND" }, { status: 404 });
  }

  const candidate = interview.candidates as unknown as { name: string; email: string; jobs: { title: string } | null } | null;

  if (status) {
    const { error } = await supabaseAdmin
      .from("interviews")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message, code: "DATABASE_ERROR" }, { status: 500 });
    }

    // Xóa Google Calendar event khi hủy lịch
    if (status === "Cancelled" && interview.google_event_id) {
      try {
        const tokens = await getValidTokens();
        if (tokens) {
          await deleteCalendarEvent(tokens, interview.google_event_id);
          console.log("[calendar] Đã xóa sự kiện:", interview.google_event_id);
        }
      } catch (err) {
        console.warn("[calendar] Không thể xóa sự kiện Google Calendar:", err);
      }
    }
  }

  if (outcome) {
    const candidateStatus = outcome === "Hired" ? "Hired" : "Rejected";
    const { error } = await supabaseAdmin
      .from("candidates")
      .update({ status: candidateStatus, updated_at: new Date().toISOString() })
      .eq("id", interview.candidate_id);

    if (error) {
      return NextResponse.json({ error: error.message, code: "DATABASE_ERROR" }, { status: 500 });
    }

    // Gửi email kết quả cho ứng viên
    if (candidate?.email) {
      const emailData = {
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        jobTitle: candidate.jobs?.title ?? "Vị trí tuyển dụng",
        interviewerName: interview.interviewer_name ?? undefined,
        hrEmail: process.env.HR_EMAIL,
      };
      try {
        if (outcome === "Hired") {
          await sendHiredNotification(emailData);
          console.log("[email] Đã gửi mail chúc mừng tuyển dụng:", candidate.email);
        } else {
          await sendRejectedNotification(emailData);
          console.log("[email] Đã gửi mail thông báo từ chối:", candidate.email);
        }
      } catch (err) {
        console.error("[email] Lỗi gửi mail kết quả (non-fatal):", err);
      }
    }

    logAudit({
      entity_type: "interview",
      entity_id: id,
      entity_name: candidate?.name ?? interview.candidate_id,
      action: "interview_outcome",
      details: { outcome, candidate_id: interview.candidate_id },
    });
  }

  return NextResponse.json({ success: true });
}
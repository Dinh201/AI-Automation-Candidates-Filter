import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  createCalendarEvent,
  refreshAccessToken,
  GoogleTokens,
} from "@/services/google-calendar-service";
import { sendInterviewInvitation } from "@/services/email-service";

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

  if (tokens.expiry - Date.now() < 60_000 && tokens.refresh_token) {
    try {
      const refreshed = await refreshAccessToken(tokens.refresh_token);
      await supabaseAdmin.from("hr_calendar_tokens").update({
        access_token: refreshed.access_token,
        expiry: refreshed.expiry,
        updated_at: new Date().toISOString(),
      }).eq("id", "default");
      return refreshed;
    } catch {
      return null;
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

  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("name, email, jobs(title)")
    .eq("id", candidate_id)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: "Ứng viên không tồn tại", code: "NOT_FOUND" }, { status: 404 });
  }

  const jobTitle = (candidate.jobs as unknown as { title: string } | null)?.title ?? "Vị trí tuyển dụng";

  let googleEventId: string | null = null;
  let meetLink: string | null = null;
  let calendarConnected = false;

  const tokens = await getValidTokens();
  if (tokens) {
    try {
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
    } catch (err) {
      console.error("Google Calendar error (non-fatal):", err);
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const interviewBriefUrl = `${appUrl}/interview-brief/${interview.id}`;

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
      interviewBriefUrl,
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
    meet_link: meetLink,
    email_sent: emailSent,
    interview_brief_url: interviewBriefUrl,
  });
}

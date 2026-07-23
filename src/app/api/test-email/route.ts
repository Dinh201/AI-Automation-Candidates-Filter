import { NextResponse } from "next/server";
import {
  sendCandidateAppliedNotification,
  sendInterviewInvitation,
  sendHiredNotification,
} from "@/services/email-service";

export async function POST(request: Request) {
  try {
    const { type, to } = await request.json().catch(() => ({ type: "notification" }));
    const recipient = to || process.env.GMAIL_USER!;

    if (type === "offer") {
      await sendHiredNotification({
        candidateName: "Nguyễn Văn Test",
        candidateEmail: recipient,
        jobTitle: "Senior Frontend Developer",
      });
      return NextResponse.json({ ok: true, type: "offer" });
    }

    if (type === "interview") {
      const result = await sendInterviewInvitation({
        candidateName: "Nguyễn Văn Test",
        candidateEmail: recipient,
        interviewerName: "HR Manager",
        interviewerEmail: recipient,
        jobTitle: "Senior Frontend Developer",
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        meetLink: "https://meet.google.com/test-link",
        notes: "Đây là email test từ hệ thống AutoFilter.",
      });
      return NextResponse.json({ ok: true, type: "interview", result });
    }

    await sendCandidateAppliedNotification({
      candidateName: "Nguyễn Văn Test",
      candidateEmail: "test@example.com",
      jobTitle: "Senior Frontend Developer",
      candidateId: "test-id-123",
      appUrl: process.env.NEXTAUTH_URL || "http://localhost:3000",
      scored: true,
      totalScore: 8.5,
      finalDecision: "STRONG HIRE",
    });
    return NextResponse.json({ ok: true, type: "notification" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[test-email]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

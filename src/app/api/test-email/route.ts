import { NextResponse } from "next/server";
import {
  sendCandidateAppliedToEmails,
  sendInterviewInvitation,
  sendInterviewerNotification,
  sendInterviewHRNotification,
  sendHiredNotification,
  sendRejectedNotification,
  sendCustomInviteEmail,
  sendCustomOutcomeEmail,
  buildInviteDraft,
  buildOutcomeDraft,
} from "@/services/email-service";

const TEST_CANDIDATE = "Nguyễn Văn Test";
const TEST_JOB = "Senior Frontend Developer";
const TEST_START = new Date(Date.now() + 24 * 60 * 60 * 1000);
const TEST_END = new Date(TEST_START.getTime() + 30 * 60 * 1000);
const TEST_MEET = "https://meet.google.com/test-link";

type SendFn = (recipient: string) => Promise<unknown>;

const TEMPLATES: Record<string, SendFn> = {
  "invite-hcm": async (recipient) => {
    const draft = buildInviteDraft("hcm", {
      candidateName: TEST_CANDIDATE,
      jobTitle: TEST_JOB,
      startTime: TEST_START,
      endTime: TEST_END,
    });
    await sendCustomInviteEmail({ candidateEmail: recipient, subject: draft.subject, body: draft.body });
  },
  "invite-hanoi": async (recipient) => {
    const draft = buildInviteDraft("hanoi", {
      candidateName: TEST_CANDIDATE,
      jobTitle: TEST_JOB,
      startTime: TEST_START,
      endTime: TEST_END,
      meetLink: TEST_MEET,
    });
    await sendCustomInviteEmail({ candidateEmail: recipient, subject: draft.subject, body: draft.body });
  },
  interview: async (recipient) => {
    await sendInterviewInvitation({
      candidateName: TEST_CANDIDATE,
      candidateEmail: recipient,
      interviewerName: "HR Manager",
      interviewerEmail: recipient,
      jobTitle: TEST_JOB,
      startTime: TEST_START,
      endTime: TEST_END,
      meetLink: TEST_MEET,
      notes: "Đây là email test từ hệ thống AutoFilter.",
    });
  },
  interviewer: async (recipient) => {
    await sendInterviewerNotification({
      candidateName: TEST_CANDIDATE,
      candidateEmail: recipient,
      interviewerName: "HR Manager",
      interviewerEmail: recipient,
      jobTitle: TEST_JOB,
      startTime: TEST_START,
      endTime: TEST_END,
      meetLink: TEST_MEET,
    });
  },
  "hr-interview-notification": async (recipient) => {
    await sendInterviewHRNotification([recipient], {
      candidateName: TEST_CANDIDATE,
      candidateId: "test-id-123",
      jobTitle: TEST_JOB,
      interviewerName: "HR Manager",
      startTime: TEST_START,
      endTime: TEST_END,
      meetLink: TEST_MEET,
      appUrl: process.env.NEXTAUTH_URL || "http://localhost:3000",
    });
  },
  offer: async (recipient) => {
    await sendHiredNotification({ candidateName: TEST_CANDIDATE, candidateEmail: recipient, jobTitle: TEST_JOB });
  },
  reject: async (recipient) => {
    await sendRejectedNotification({ candidateName: TEST_CANDIDATE, candidateEmail: recipient, jobTitle: TEST_JOB });
  },
  "outcome-hired-draft": async (recipient) => {
    const draft = buildOutcomeDraft("Hired", { candidateName: TEST_CANDIDATE, candidateEmail: recipient, jobTitle: TEST_JOB });
    await sendCustomOutcomeEmail({ outcome: "Hired", candidateEmail: recipient, subject: draft.subject, body: draft.body });
  },
  "outcome-rejected-draft": async (recipient) => {
    const draft = buildOutcomeDraft("Rejected", { candidateName: TEST_CANDIDATE, candidateEmail: recipient, jobTitle: TEST_JOB });
    await sendCustomOutcomeEmail({ outcome: "Rejected", candidateEmail: recipient, subject: draft.subject, body: draft.body });
  },
  notification: async (recipient) => {
    await sendCandidateAppliedToEmails([recipient], {
      candidateName: TEST_CANDIDATE,
      candidateEmail: "test@example.com",
      jobTitle: TEST_JOB,
      candidateId: "test-id-123",
      appUrl: process.env.NEXTAUTH_URL || "http://localhost:3000",
      scored: true,
      totalScore: 8.5,
      finalDecision: "STRONG HIRE",
    });
  },
};

export async function POST(request: Request) {
  const { type, to } = await request.json().catch(() => ({ type: "notification" }));
  const recipient = to || process.env.GMAIL_USER!;

  const typesToSend = type === "all" ? Object.keys(TEMPLATES) : [type];

  const results: { type: string; ok: boolean; error?: string }[] = [];
  for (const t of typesToSend) {
    const fn = TEMPLATES[t];
    if (!fn) {
      results.push({ type: t, ok: false, error: "Không tìm thấy template" });
      continue;
    }
    try {
      await fn(recipient);
      results.push({ type: t, ok: true });
    } catch (err) {
      results.push({ type: t, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ ok: allOk, recipient, results }, { status: allOk ? 200 : 500 });
}

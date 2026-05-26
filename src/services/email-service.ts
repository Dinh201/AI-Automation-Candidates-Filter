import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "AutoFilter <noreply@autofilter.ai>";
const HR_EMAIL = process.env.HR_EMAIL || "";

export interface InterviewEmailData {
  candidateEmail: string;
  candidateName: string;
  interviewerEmail: string;
  interviewerName: string;
  jobTitle: string;
  startTime: Date;
  endTime: Date;
  meetLink?: string;
  interviewBriefUrl?: string;
  notes?: string;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildEmailHtml(data: InterviewEmailData, forCandidate: boolean): string {
  const recipient = forCandidate ? data.candidateName : data.interviewerName;
  const role = forCandidate ? "ứng viên" : "interviewer";
  const start = formatDateTime(data.startTime);
  const end = data.endTime.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto">
    <tr><td style="background:#18181b;border-radius:12px 12px 0 0;padding:28px 32px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="background:#4f46e5;width:32px;height:32px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center">
          <span style="color:#fff;font-size:16px">⚡</span>
        </div>
        <span style="color:#fff;font-weight:700;font-size:18px">AutoFilter</span>
      </div>
    </td></tr>

    <tr><td style="background:#fff;padding:32px">
      <h2 style="margin:0 0 8px;color:#09090b;font-size:22px">
        ${forCandidate ? "Thư mời phỏng vấn" : "Lịch phỏng vấn mới"}
      </h2>
      <p style="margin:0 0 24px;color:#71717a;font-size:15px">
        Xin chào <strong>${recipient}</strong>,
        ${forCandidate
          ? ` chúng tôi vui mừng thông báo bạn đã được mời phỏng vấn vị trí <strong>${data.jobTitle}</strong>.`
          : ` bạn có một lịch phỏng vấn ${role} mới được tạo.`}
      </p>

      <div style="background:#f4f4f5;border-radius:8px;padding:20px;margin-bottom:24px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:6px 0;color:#71717a;font-size:14px;width:120px">Vị trí</td>
            <td style="padding:6px 0;color:#18181b;font-size:14px;font-weight:600">${data.jobTitle}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#71717a;font-size:14px">Ứng viên</td>
            <td style="padding:6px 0;color:#18181b;font-size:14px">${data.candidateName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#71717a;font-size:14px">Interviewer</td>
            <td style="padding:6px 0;color:#18181b;font-size:14px">${data.interviewerName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#71717a;font-size:14px">Thời gian</td>
            <td style="padding:6px 0;color:#18181b;font-size:14px"><strong>${start}</strong> – ${end}</td>
          </tr>
          ${data.meetLink ? `<tr>
            <td style="padding:6px 0;color:#71717a;font-size:14px">Meet link</td>
            <td style="padding:6px 0"><a href="${data.meetLink}" style="color:#4f46e5;text-decoration:none;font-size:14px">Tham gia buổi phỏng vấn →</a></td>
          </tr>` : ""}
        </table>
      </div>

      ${data.notes ? `<div style="border-left:3px solid #4f46e5;padding:12px 16px;margin-bottom:24px;background:#eef2ff;border-radius:0 8px 8px 0">
        <p style="margin:0;color:#3730a3;font-size:14px">${data.notes}</p>
      </div>` : ""}

      ${!forCandidate && data.interviewBriefUrl ? `<div style="margin-bottom:24px">
        <a href="${data.interviewBriefUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          Xem Interview Kit →
        </a>
        <p style="margin:8px 0 0;color:#71717a;font-size:12px">Bao gồm hồ sơ ứng viên, điểm AI, và câu hỏi gợi ý.</p>
      </div>` : ""}

    </td></tr>

    <tr><td style="background:#f4f4f5;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center">
      <p style="margin:0;color:#a1a1aa;font-size:12px">
        Email này được gửi tự động từ hệ thống AutoFilter AI Recruitment.<br>
        Múi giờ: Asia/Ho_Chi_Minh (GMT+7)
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

export interface CandidateAppliedData {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  candidateId: string;
  appUrl: string;
  scored: boolean;
  totalScore?: number;
  finalDecision?: string;
  scoringFailed?: boolean;
}

function decisionLabel(d?: string): string {
  switch (d) {
    case "STRONG HIRE": return "Strong Hire";
    case "HIRE":        return "Hire";
    case "CONSIDER":    return "Cân nhắc";
    case "REJECT":      return "Từ chối";
    default:            return d ?? "—";
  }
}

function buildCandidateAppliedHtml(data: CandidateAppliedData): string {
  const scoreHtml = data.scored && data.totalScore != null
    ? `<tr>
        <td style="padding:6px 0;color:#71717a;font-size:14px;width:140px">Điểm AI</td>
        <td style="padding:6px 0;color:#18181b;font-size:14px;font-weight:600">
          ${data.totalScore.toFixed(1)}/10 · ${decisionLabel(data.finalDecision)}
        </td>
       </tr>`
    : data.scoringFailed
      ? `<tr>
          <td style="padding:6px 0;color:#71717a;font-size:14px">Điểm AI</td>
          <td style="padding:6px 0;color:#ef4444;font-size:14px">⚠️ Chấm điểm thất bại — cần review thủ công</td>
         </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto">
    <tr><td style="background:#18181b;border-radius:12px 12px 0 0;padding:28px 32px">
      <div>
        <div style="background:#4f46e5;width:32px;height:32px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center">
          <span style="color:#fff;font-size:16px">⚡</span>
        </div>
        <span style="color:#fff;font-weight:700;font-size:18px;margin-left:10px;vertical-align:middle">AutoFilter</span>
      </div>
    </td></tr>

    <tr><td style="background:#fff;padding:32px">
      <h2 style="margin:0 0 8px;color:#09090b;font-size:22px">Ứng viên mới đã nộp hồ sơ</h2>
      <p style="margin:0 0 24px;color:#71717a;font-size:15px">
        Hệ thống vừa nhận được CV từ ứng viên <strong>${data.candidateName}</strong> cho vị trí <strong>${data.jobTitle}</strong>.
      </p>

      <div style="background:#f4f4f5;border-radius:8px;padding:20px;margin-bottom:24px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:6px 0;color:#71717a;font-size:14px;width:140px">Ứng viên</td>
            <td style="padding:6px 0;color:#18181b;font-size:14px;font-weight:600">${data.candidateName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#71717a;font-size:14px">Email</td>
            <td style="padding:6px 0;color:#18181b;font-size:14px">${data.candidateEmail}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#71717a;font-size:14px">Vị trí</td>
            <td style="padding:6px 0;color:#18181b;font-size:14px">${data.jobTitle}</td>
          </tr>
          ${scoreHtml}
        </table>
      </div>

      <a href="${data.appUrl}/candidates/${data.candidateId}"
         style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Xem hồ sơ ứng viên →
      </a>
    </td></tr>

    <tr><td style="background:#f4f4f5;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center">
      <p style="margin:0;color:#a1a1aa;font-size:12px">
        Email tự động từ AutoFilter AI Recruitment.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendCandidateAppliedNotification(data: CandidateAppliedData): Promise<void> {
  if (!HR_EMAIL) return; // bỏ qua nếu chưa cấu hình HR_EMAIL
  await resend.emails.send({
    from: FROM,
    to: HR_EMAIL,
    subject: `[AutoFilter] Hồ sơ mới: ${data.candidateName} – ${data.jobTitle}`,
    html: buildCandidateAppliedHtml(data),
  });
}

export async function sendInterviewInvitation(data: InterviewEmailData) {
  const [candidateResult, interviewerResult] = await Promise.allSettled([
    resend.emails.send({
      from: FROM,
      to: data.candidateEmail,
      subject: `[AutoFilter] Thư mời phỏng vấn – ${data.jobTitle}`,
      html: buildEmailHtml(data, true),
    }),
    resend.emails.send({
      from: FROM,
      to: data.interviewerEmail,
      subject: `[AutoFilter] Lịch phỏng vấn: ${data.candidateName} – ${data.jobTitle}`,
      html: buildEmailHtml(data, false),
    }),
  ]);

  const errors: string[] = [];
  if (candidateResult.status === "rejected") errors.push(`candidate: ${candidateResult.reason}`);
  if (interviewerResult.status === "rejected") errors.push(`interviewer: ${interviewerResult.reason}`);

  if (errors.length === 2) throw new Error(`Email failed: ${errors.join("; ")}`);
  return { partial: errors.length === 1, errors };
}

import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER || "";
const HR_EMAIL = process.env.HR_EMAIL || "";
const COMPANY = "VACONS";

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: GMAIL_USER,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    },
  });
}

// ─── Shared layout ────────────────────────────────────────────────────────────

function emailWrapper(headerColor: string, body: string, footerNote?: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto">
    <tr><td style="background:${headerColor};border-radius:12px 12px 0 0;padding:28px 32px">
      <span style="color:#fff;font-weight:800;font-size:20px;letter-spacing:1px">${COMPANY}</span>
    </td></tr>

    <tr><td style="background:#fff;padding:32px 36px">
      ${body}
    </td></tr>

    <tr><td style="background:#f4f4f5;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center">
      <p style="margin:0;color:#a1a1aa;font-size:12px">
        ${footerNote ?? `Email này được gửi tự động bởi hệ thống tuyển dụng ${COMPANY}.<br>Múi giờ: Asia/Ho_Chi_Minh (GMT+7)`}
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

function infoTable(rows: Array<{ label: string; value: string; link?: string }>): string {
  const rowsHtml = rows.map(({ label, value, link }) => `
    <tr>
      <td style="padding:8px 0;color:#71717a;font-size:14px;width:130px;vertical-align:top">${label}</td>
      <td style="padding:8px 0;color:#18181b;font-size:14px;vertical-align:top">
        ${link ? `<a href="${link}" style="color:#4f46e5;text-decoration:none;font-weight:600">${value}</a>` : `<strong>${value}</strong>`}
      </td>
    </tr>`).join("");
  return `<div style="background:#f9f9fa;border-radius:10px;padding:20px 24px;margin-bottom:24px">
    <table width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
  </div>`;
}

function primaryButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.3px">${label}</a>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatTime(date: Date): string {
  return date.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Interview Invitation ─────────────────────────────────────────────────────

export interface InterviewEmailData {
  candidateEmail: string;
  candidateName: string;
  interviewerEmail: string;
  interviewerName: string;
  jobTitle: string;
  startTime: Date;
  endTime: Date;
  meetLink?: string;
  notes?: string;
}

function buildInterviewInviteCandidate(data: InterviewEmailData): string {
  const start = formatDateTime(data.startTime);
  const end = formatTime(data.endTime);

  const rows = [
    { label: "Vị trí", value: data.jobTitle },
    { label: "Interviewer", value: data.interviewerName },
    { label: "Thời gian", value: `${start} – ${end}` },
    ...(data.meetLink ? [{ label: "Link họp", value: "Tham gia Google Meet →", link: data.meetLink }] : []),
  ];

  const notes = data.notes
    ? `<div style="border-left:3px solid #1d4ed8;padding:12px 16px;margin-bottom:24px;background:#eff6ff;border-radius:0 8px 8px 0">
        <p style="margin:0;color:#1e40af;font-size:14px;line-height:1.6">${data.notes}</p>
       </div>`
    : "";

  const body = `
    <h2 style="margin:0 0 6px;color:#09090b;font-size:22px;font-weight:700">Thư mời phỏng vấn</h2>
    <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6">
      Xin chào <strong>${data.candidateName}</strong>,
    </p>
    <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6">
      Chúng tôi vui mừng thông báo bạn đã vượt qua vòng sơ tuyển và được mời tham dự buổi phỏng vấn
      cho vị trí <strong>${data.jobTitle}</strong> tại <strong>${COMPANY}</strong>.
    </p>
    ${infoTable(rows)}
    ${notes}
    <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6">
      Vui lòng xác nhận tham dự bằng cách trả lời email này. Nếu có thay đổi về lịch,
      hãy liên hệ sớm để chúng tôi sắp xếp lại.
    </p>
    ${data.meetLink ? primaryButton(data.meetLink, "Tham gia buổi phỏng vấn →") : ""}
  `;

  return emailWrapper("#1d4ed8", body);
}

function buildInterviewNotifyInterviewer(data: InterviewEmailData): string {
  const start = formatDateTime(data.startTime);
  const end = formatTime(data.endTime);

  const rows = [
    { label: "Ứng viên", value: `${data.candidateName} (${data.candidateEmail})` },
    { label: "Vị trí", value: data.jobTitle },
    { label: "Thời gian", value: `${start} – ${end}` },
    ...(data.meetLink ? [{ label: "Link họp", value: "Tham gia Google Meet →", link: data.meetLink }] : []),
  ];

  const notes = data.notes
    ? `<div style="border-left:3px solid #1d4ed8;padding:12px 16px;margin-bottom:24px;background:#eff6ff;border-radius:0 8px 8px 0">
        <p style="margin:0;color:#1e40af;font-size:14px;line-height:1.6"><strong>Ghi chú từ HR:</strong> ${data.notes}</p>
       </div>`
    : "";

  const body = `
    <h2 style="margin:0 0 6px;color:#09090b;font-size:22px;font-weight:700">Lịch phỏng vấn mới</h2>
    <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6">
      Xin chào <strong>${data.interviewerName}</strong>,
    </p>
    <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6">
      Bạn có một lịch phỏng vấn ứng viên mới được tạo bởi bộ phận HR.
    </p>
    ${infoTable(rows)}
    ${notes}
    ${data.meetLink ? primaryButton(data.meetLink, "Tham gia buổi phỏng vấn →") : ""}
  `;

  return emailWrapper("#18181b", body);
}

export async function sendInterviewInvitation(data: InterviewEmailData) {
  if (!GMAIL_USER) throw new Error("GMAIL_USER chưa được cấu hình");
  const transporter = createTransporter();

  const [candidateResult, interviewerResult] = await Promise.allSettled([
    transporter.sendMail({
      from: `${COMPANY} Recruitment <${GMAIL_USER}>`,
      to: data.candidateEmail,
      subject: `[${COMPANY}] Thư mời phỏng vấn – ${data.jobTitle}`,
      html: buildInterviewInviteCandidate(data),
    }),
    transporter.sendMail({
      from: `${COMPANY} HR <${GMAIL_USER}>`,
      to: data.interviewerEmail,
      subject: `[${COMPANY}] Lịch phỏng vấn: ${data.candidateName} – ${data.jobTitle}`,
      html: buildInterviewNotifyInterviewer(data),
    }),
  ]);

  const errors: string[] = [];
  if (candidateResult.status === "rejected") errors.push(`candidate: ${candidateResult.reason}`);
  if (interviewerResult.status === "rejected") errors.push(`interviewer: ${interviewerResult.reason}`);

  if (errors.length === 2) throw new Error(`Email failed: ${errors.join("; ")}`);
  return { partial: errors.length === 1, errors };
}

// ─── Hired Notification ───────────────────────────────────────────────────────

export interface OutcomeEmailData {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  interviewerName?: string;
  hrEmail?: string;
  notes?: string;
}

function buildHiredHtml(data: OutcomeEmailData): string {
  const body = `
    <h2 style="margin:0 0 6px;color:#09090b;font-size:22px;font-weight:700">🎉 Chúc mừng bạn đã được tuyển dụng!</h2>
    <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6">
      Xin chào <strong>${data.candidateName}</strong>,
    </p>
    <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6">
      Sau quá trình xem xét kỹ lưỡng, chúng tôi vui mừng thông báo bạn đã <strong>vượt qua vòng phỏng vấn</strong>
      và được tuyển chọn cho vị trí <strong>${data.jobTitle}</strong> tại <strong>${COMPANY}</strong>.
    </p>
    ${infoTable([
      { label: "Vị trí", value: data.jobTitle },
      { label: "Kết quả", value: "✅ Được tuyển dụng" },
      ...(data.interviewerName ? [{ label: "Interviewer", value: data.interviewerName }] : []),
    ])}
    <p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.6">
      Bộ phận HR sẽ liên hệ với bạn trong thời gian sớm nhất để thông báo về ngày bắt đầu làm việc
      và các thủ tục cần thiết.
    </p>
    <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6">
      Một lần nữa, chúc mừng và chào đón bạn gia nhập đội ngũ <strong>${COMPANY}</strong>!
    </p>
    ${data.hrEmail ? `<p style="margin:0;color:#71717a;font-size:13px">Nếu có câu hỏi, vui lòng liên hệ HR: <a href="mailto:${data.hrEmail}" style="color:#1d4ed8">${data.hrEmail}</a></p>` : ""}
  `;

  return emailWrapper("#15803d", body, `Email thông báo tuyển dụng từ ${COMPANY}. Vui lòng không trả lời email này.`);
}

export async function sendHiredNotification(data: OutcomeEmailData): Promise<void> {
  if (!GMAIL_USER) throw new Error("GMAIL_USER chưa được cấu hình");
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `${COMPANY} HR <${GMAIL_USER}>`,
    to: data.candidateEmail,
    subject: `[${COMPANY}] Chúc mừng! Bạn đã được tuyển dụng – ${data.jobTitle}`,
    html: buildHiredHtml(data),
  });
}

// ─── Rejected Notification ────────────────────────────────────────────────────

function buildRejectedHtml(data: OutcomeEmailData): string {
  const body = `
    <h2 style="margin:0 0 6px;color:#09090b;font-size:22px;font-weight:700">Kết quả ứng tuyển tại ${COMPANY}</h2>
    <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6">
      Xin chào <strong>${data.candidateName}</strong>,
    </p>
    <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6">
      Cảm ơn bạn đã dành thời gian tham dự buổi phỏng vấn cho vị trí
      <strong>${data.jobTitle}</strong> tại <strong>${COMPANY}</strong>.
    </p>
    <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6">
      Sau khi cân nhắc kỹ lưỡng, chúng tôi rất tiếc phải thông báo rằng hồ sơ của bạn
      chưa phù hợp với yêu cầu của vị trí này ở thời điểm hiện tại.
    </p>
    ${infoTable([
      { label: "Vị trí", value: data.jobTitle },
      { label: "Kết quả", value: "Chưa phù hợp lần này" },
    ])}
    <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6">
      Đây không phải là đánh giá về năng lực của bạn, mà là sự phù hợp với nhu cầu
      cụ thể của vị trí tại thời điểm này. Chúng tôi trân trọng sự quan tâm của bạn
      và khuyến khích bạn theo dõi các cơ hội tiếp theo tại ${COMPANY}.
    </p>
    ${data.hrEmail ? `<p style="margin:0;color:#71717a;font-size:13px">Nếu có câu hỏi, vui lòng liên hệ: <a href="mailto:${data.hrEmail}" style="color:#1d4ed8">${data.hrEmail}</a></p>` : ""}
  `;

  return emailWrapper("#18181b", body, `Email thông báo kết quả tuyển dụng từ ${COMPANY}. Vui lòng không trả lời email này.`);
}

export async function sendRejectedNotification(data: OutcomeEmailData): Promise<void> {
  if (!GMAIL_USER) throw new Error("GMAIL_USER chưa được cấu hình");
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `${COMPANY} HR <${GMAIL_USER}>`,
    to: data.candidateEmail,
    subject: `[${COMPANY}] Kết quả ứng tuyển – ${data.jobTitle}`,
    html: buildRejectedHtml(data),
  });
}

// ─── Candidate Applied Notification (to HR) ───────────────────────────────────

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
  const scoreRow = data.scored && data.totalScore != null
    ? `<tr>
        <td style="padding:8px 0;color:#71717a;font-size:14px;width:140px">Điểm AI</td>
        <td style="padding:8px 0;color:#18181b;font-size:14px;font-weight:600">
          ${data.totalScore.toFixed(1)}/10 · ${decisionLabel(data.finalDecision)}
        </td>
       </tr>`
    : data.scoringFailed
      ? `<tr>
          <td style="padding:8px 0;color:#71717a;font-size:14px">Điểm AI</td>
          <td style="padding:8px 0;color:#ef4444;font-size:14px">⚠️ Chấm điểm thất bại — cần review thủ công</td>
         </tr>`
      : "";

  const body = `
    <h2 style="margin:0 0 6px;color:#09090b;font-size:22px;font-weight:700">Ứng viên mới đã nộp hồ sơ</h2>
    <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6">
      Hệ thống vừa nhận được CV từ ứng viên <strong>${data.candidateName}</strong>
      cho vị trí <strong>${data.jobTitle}</strong>.
    </p>
    <div style="background:#f9f9fa;border-radius:10px;padding:20px 24px;margin-bottom:24px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;color:#71717a;font-size:14px;width:140px">Ứng viên</td>
          <td style="padding:8px 0;color:#18181b;font-size:14px;font-weight:600">${data.candidateName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#71717a;font-size:14px">Email</td>
          <td style="padding:8px 0;color:#18181b;font-size:14px">${data.candidateEmail}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#71717a;font-size:14px">Vị trí</td>
          <td style="padding:8px 0;color:#18181b;font-size:14px">${data.jobTitle}</td>
        </tr>
        ${scoreRow}
      </table>
    </div>
    ${primaryButton(`${data.appUrl}/candidates/${data.candidateId}`, "Xem hồ sơ ứng viên →")}
  `;

  return emailWrapper("#18181b", body, `Email tự động từ hệ thống tuyển dụng ${COMPANY}.`);
}

export async function sendCandidateAppliedNotification(data: CandidateAppliedData): Promise<void> {
  if (!HR_EMAIL || !GMAIL_USER) return;
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `${COMPANY} Recruitment <${GMAIL_USER}>`,
    to: HR_EMAIL,
    subject: `[${COMPANY}] Hồ sơ mới: ${data.candidateName} – ${data.jobTitle}`,
    html: buildCandidateAppliedHtml(data),
  });
}
import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER || "";
const HR_EMAIL = process.env.HR_EMAIL || "";
const COMPANY = "VACONS";
const COMPANY_VI = "CÔNG TY TNHH KIẾN TRÚC XÂY DỰNG VIỆT AN (VACONS)";
const COMPANY_EN = "VIET AN CONSTRUCTION ARCHITECTURE COMPANY LIMITED (VACONS)";
const OFFICE_ADDRESS_VI = "Số 25, Đường 34, Phường An Khánh, TP. Hồ Chí Minh";
const OFFICE_ADDRESS_EN = "No. 25, Street No. 34, An Khanh Ward, Ho Chi Minh City";
const WEBSITE = "https://vacons.com.vn/";

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

function formatDate(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ordinal(n: number): string {
  if (n >= 11 && n <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function formatInterviewDateVN(date: Date): string {
  const weekday = date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long" });
  const dmy = date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
  return `${weekday} – Ngày ${dmy}`;
}

function formatInterviewDateEN(date: Date): string {
  const weekday = date.toLocaleDateString("en-US", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long" });
  const month = date.toLocaleDateString("en-US", { timeZone: "Asia/Ho_Chi_Minh", month: "long" });
  const day = parseInt(date.toLocaleDateString("en-US", { timeZone: "Asia/Ho_Chi_Minh", day: "numeric" }), 10);
  const year = date.toLocaleDateString("en-US", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric" });
  return `${weekday}, ${month} ${ordinal(day)}, ${year}`;
}

function salutation(name: string, gender?: "male" | "female"): string {
  if (gender === "male") return `Mr. ${name}`;
  if (gender === "female") return `Ms. ${name}`;
  return name;
}

interface InfoRow {
  label: string;
  value: string;
  link?: string;
}

function emailWrapper(headerColor: string, body: string, footerNote?: string): string {
  const foot = footerNote ?? `Email tự động từ ${COMPANY}. Vui lòng không trả lời email này.`;
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <tr><td style="background:${headerColor};border-radius:12px 12px 0 0;padding:28px 36px">
          <span style="color:#fff;font-weight:700;font-size:20px;letter-spacing:-0.3px">${COMPANY}</span>
        </td></tr>
        <tr><td style="background:#ffffff;padding:36px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7">
          ${body}
        </td></tr>
        <tr><td style="background:#f9f9fa;border-radius:0 0 12px 12px;border:1px solid #e4e4e7;border-top:none;padding:20px 36px;text-align:center">
          <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.6">${foot}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function infoTable(rows: InfoRow[]): string {
  const trs = rows.map(r => `
    <tr>
      <td style="padding:9px 0;color:#71717a;font-size:14px;white-space:nowrap;width:130px;vertical-align:top">${r.label}</td>
      <td style="padding:9px 0;color:#18181b;font-size:14px;font-weight:500">
        ${r.link ? `<a href="${r.link}" style="color:#1d4ed8;text-decoration:none">${r.value}</a>` : r.value}
      </td>
    </tr>`).join("");
  return `<div style="background:#f9f9fa;border-radius:10px;padding:16px 20px;margin-bottom:24px">
    <table width="100%" cellpadding="0" cellspacing="0">${trs}</table>
  </div>`;
}

function primaryButton(href: string, label: string): string {
  return `<div style="margin-bottom:24px">
    <a href="${href}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">${label}</a>
  </div>`;
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface InterviewEmailData {
  candidateEmail: string;
  candidateName: string;
  gender?: "male" | "female";
  interviewerEmail: string;
  interviewerName: string;
  jobTitle: string;
  startTime: Date;
  endTime: Date;
  meetLink?: string;
  notes?: string;
}

export interface OutcomeEmailData {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  gender?: "male" | "female";
  interviewerName?: string;
  hrEmail?: string;
  notes?: string;
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

// ─── Interview Invitation ─────────────────────────────────────────────────────

function buildInterviewInviteCandidate(data: InterviewEmailData): string {
  const startT = formatTime(data.startTime);
  const endT = formatTime(data.endTime);
  const timeRangeVN = `${startT} – ${endT}, ${formatInterviewDateVN(data.startTime)}`;
  const timeRangeEN = `${startT} – ${endT}, ${formatInterviewDateEN(data.startTime)}`;
  const salut = salutation(data.candidateName, data.gender);

  const meetRow = data.meetLink
    ? `<tr>
        <td style="padding:9px 0;color:#71717a;font-size:14px;white-space:nowrap;width:170px;vertical-align:top">Link họp / Meet Link</td>
        <td style="padding:9px 0;font-size:14px"><a href="${data.meetLink}" style="color:#1d4ed8;font-weight:500;text-decoration:none">Tham gia Google Meet →</a></td>
      </tr>`
    : "";

  const notesBlock = data.notes
    ? `<div style="border-left:3px solid #208994;padding:12px 16px;margin-bottom:24px;background:#eff6ff;border-radius:0 8px 8px 0">
        <p style="margin:0;color:#1e40af;font-size:14px;line-height:1.6">${data.notes}</p>
       </div>`
    : "";

  const body = `
    <p style="margin:0 0 20px;color:#09090b;font-size:15px">Dear <strong>${salut}</strong>,</p>

    <p style="margin:0 0 6px;color:#374151;font-size:15px;line-height:1.7">
      <strong>${COMPANY_VI}</strong> chân thành cảm ơn bạn đã quan tâm đến vị trí <strong>${data.jobTitle}</strong> mà chúng tôi đang tuyển dụng.
    </p>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.7;font-style:italic">
      <strong>${COMPANY_EN}</strong> sincerely thanks you for your interest in the <strong>${data.jobTitle}</strong> position we are currently hiring for.
    </p>

    <p style="margin:0 0 6px;color:#374151;font-size:15px;line-height:1.7">
      Chúng tôi rất hân hạnh mời bạn đến tham dự buổi phỏng vấn trực tiếp với thông tin như sau:
    </p>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.7;font-style:italic">
      We are pleased to invite you to attend a face-to-face interview with the following details:
    </p>

    <div style="background:#f9f9fa;border-radius:10px;padding:16px 20px;margin-bottom:24px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:9px 0;color:#71717a;font-size:14px;white-space:nowrap;width:170px;vertical-align:top">Thời gian / Time</td>
          <td style="padding:9px 0;font-size:14px;font-weight:500;color:#18181b">
            ${timeRangeVN}<br>
            <span style="color:#6b7280;font-style:italic;font-weight:400">${timeRangeEN}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:9px 0;color:#71717a;font-size:14px;white-space:nowrap;vertical-align:top">Trụ sở / Address</td>
          <td style="padding:9px 0;font-size:14px;font-weight:500;color:#18181b">
            ${OFFICE_ADDRESS_VI}<br>
            <span style="color:#6b7280;font-style:italic;font-weight:400">${OFFICE_ADDRESS_EN}</span>
          </td>
        </tr>
        ${meetRow}
      </table>
    </div>

    ${notesBlock}

    <p style="margin:0 0 6px;color:#374151;font-size:15px;line-height:1.7">
      Chúng tôi rất mong nhận được sự xác nhận tham dự từ bạn qua email này. Trong trường hợp bạn cần thêm thông tin hoặc gặp khó khăn về mặt thời gian, đừng ngần ngại liên hệ với chúng tôi để được hỗ trợ nhanh chóng.
    </p>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.7;font-style:italic">
      Please kindly confirm your attendance by replying to this email. If you require any further information or need to reschedule, feel free to contact us at the provided phone numbers.
    </p>

    <p style="margin:0 0 4px;color:#374151;font-size:15px;line-height:1.7">
      Bạn có thể tìm hiểu thêm về công ty qua website chính thức:
    </p>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.7;font-style:italic">
      You can learn more about our company at: <a href="${WEBSITE}" style="color:#1d4ed8;text-decoration:none">${WEBSITE}</a>
    </p>

    <p style="margin:0 0 4px;color:#374151;font-size:15px;line-height:1.7">Chúng tôi rất mong được gặp bạn tại buổi phỏng vấn sắp tới!</p>
    <p style="margin:0 0 32px;color:#6b7280;font-size:14px;line-height:1.7;font-style:italic">We look forward to meeting you at the upcoming interview!</p>

    <div style="border-top:1px solid #e5e7eb;padding-top:20px">
      <p style="margin:0 0 2px;color:#374151;font-size:14px;font-weight:600">Thanks and Best Regards,</p>
      <p style="margin:0 0 2px;color:#374151;font-size:14px">Ms. Nhi Nguyen</p>
      <p style="margin:0 0 2px;color:#6b7280;font-size:13px">Talent Acquisition (HR)</p>
      <p style="margin:0;color:#6b7280;font-size:13px">${COMPANY_EN}</p>
    </div>
  `;

  return emailWrapper("#208994", body);
}

function buildInterviewNotifyInterviewer(data: InterviewEmailData): string {
  const startT = formatTime(data.startTime);
  const endT = formatTime(data.endTime);
  const date = formatDate(data.startTime);

  const rows: InfoRow[] = [
    { label: "Ứng viên", value: `${data.candidateName} (${data.candidateEmail})` },
    { label: "Vị trí", value: data.jobTitle },
    { label: "Thời gian", value: `${startT} – ${endT} ${date}` },
    ...(data.meetLink ? [{ label: "Link họp", value: "Tham gia Google Meet →", link: data.meetLink }] : []),
  ];

  const notes = data.notes
    ? `<div style="border-left:3px solid #208994;padding:12px 16px;margin-bottom:24px;background:#eff6ff;border-radius:0 8px 8px 0">
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

  return emailWrapper("#208994", body);
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

function buildHiredHtml(data: OutcomeEmailData): string {
  const salut = salutation(data.candidateName, data.gender);
  const pronoun = data.gender === "male" ? "Anh" : data.gender === "female" ? "Chị" : "Anh/Chị";

  const body = `
    <p style="margin:0 0 20px;color:#09090b;font-size:15px">Dear <strong>${salut}</strong>,</p>

    <p style="margin:0 0 6px;color:#374151;font-size:15px;line-height:1.7">
      <strong>${COMPANY_VI}</strong> trân trọng thông báo ${pronoun} đã trúng tuyển vị trí <strong>${data.jobTitle}</strong> tại công ty.
    </p>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.7;font-style:italic">
      <strong>${COMPANY_EN}</strong> is pleased to inform you that you have been selected for the <strong>${data.jobTitle}</strong> position.
    </p>

    <p style="margin:0 0 6px;color:#374151;font-size:15px;line-height:1.7">
      Chúng tôi đánh giá cao năng lực, kinh nghiệm cũng như sự phù hợp của ${pronoun} với văn hóa VACONS, và tin rằng ${pronoun} sẽ đóng góp tích cực vào sự phát triển của đội ngũ.
    </p>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.7;font-style:italic">
      We highly appreciate your qualifications and believe you will be a valuable addition to our team.
    </p>

    <p style="margin:0 0 6px;color:#374151;font-size:15px;line-height:1.7">
      Thông tin nhận việc cụ thể sẽ được trao đổi chi tiết qua điện thoại/Zalo trong thời gian sớm nhất.
    </p>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.7;font-style:italic">
      Further details regarding your onboarding will be discussed with you via phone/Zalo shortly.
    </p>

    <p style="margin:0 0 6px;color:#374151;font-size:15px;line-height:1.7">Rất mong được chào đón ${pronoun} gia nhập VACONS.</p>
    <p style="margin:0 0 32px;color:#6b7280;font-size:14px;line-height:1.7;font-style:italic">We look forward to welcoming you to VACONS.</p>

    <div style="border-top:1px solid #e5e7eb;padding-top:20px">
      <p style="margin:0 0 2px;color:#374151;font-size:14px;font-weight:600">Thanks and Best Regards,</p>
      <p style="margin:0 0 2px;color:#374151;font-size:14px">Ms. Nhi Nguyen</p>
      <p style="margin:0 0 2px;color:#6b7280;font-size:13px">Talent Acquisition (HR)</p>
      <p style="margin:0;color:#6b7280;font-size:13px">${COMPANY_EN}</p>
    </div>
  `;

  return emailWrapper("#208994", body, `Email thông báo kết quả tuyển dụng từ ${COMPANY}.`);
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

// ─── Rejected Notification (VACONS official template) ────────────────────────

function buildRejectedHtml(data: OutcomeEmailData): string {
  const body = `
    <p style="margin:0 0 24px;color:#09090b;font-size:15px">Dear <strong>${data.candidateName}</strong>,</p>

    <p style="margin:0 0 6px;color:#374151;font-size:15px;line-height:1.7">
      <strong>${COMPANY_VI}</strong> chân thành cảm ơn bạn đã tham gia phỏng vấn cho vị trí
      <strong>${data.jobTitle}</strong> tại công ty.
    </p>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.7;font-style:italic">
      ${COMPANY_EN} sincerely thanks you for attending the interview for the
      <strong>${data.jobTitle}</strong> position.
    </p>

    <p style="margin:0 0 4px;color:#374151;font-size:15px;line-height:1.7">
      Sau khi đánh giá kỹ hồ sơ, chúng tôi rất tiếc thông báo rằng ${COMPANY} chưa thể tiếp tục với đơn ứng tuyển của bạn ở thời điểm này.
    </p>
    <p style="margin:0 0 4px;color:#6b7280;font-size:14px;line-height:1.7;font-style:italic">
      After careful evaluation, we regret to inform you that ${COMPANY} will not be proceeding with your application at this time.
    </p>
    <p style="margin:0 0 4px;color:#374151;font-size:15px;line-height:1.7">
      Quyết định này dựa trên định hướng và nhu cầu hiện tại của vị trí, không phản ánh toàn diện giá trị và kinh nghiệm mà bạn mang lại.
    </p>
    <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.7;font-style:italic">
      This decision reflects the current direction and needs of the position and is not a full assessment of your experience or professional strengths.
    </p>

    <p style="margin:0 0 4px;color:#374151;font-size:15px;line-height:1.7">
      Chúng tôi cảm ơn sự quan tâm của bạn tới ${COMPANY} và chúc bạn nhiều thành công trong tương lai.
    </p>
    <p style="margin:0 0 32px;color:#6b7280;font-size:14px;line-height:1.7;font-style:italic">
      We appreciate your interest in ${COMPANY} and wish you every success in the future.
    </p>

    <div style="border-top:1px solid #e5e7eb;padding-top:20px">
      <p style="margin:0 0 2px;color:#374151;font-size:14px;font-weight:600">Kind regards,</p>
      <p style="margin:0 0 2px;color:#374151;font-size:14px">Ms. Nhi Nguyen</p>
      <p style="margin:0 0 2px;color:#6b7280;font-size:13px">Talent acquisition (HR)</p>
      <p style="margin:0;color:#6b7280;font-size:13px">${COMPANY_EN}</p>
    </div>
  `;

  return emailWrapper("#208994", body, `Email thông báo kết quả tuyển dụng từ ${COMPANY}.`);
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

function decisionLabel(d?: string): string {
  switch (d) {
    case "STRONG HIRE": return "Strong Hire";
    case "HIRE": return "Hire";
    case "CONSIDER": return "Cân nhắc";
    case "REJECT": return "Từ chối";
    default: return d ?? "—";
  }
}

function buildCandidateAppliedHtml(data: CandidateAppliedData): string {
  const scoreRows: InfoRow[] = [];
  if (data.scored && data.totalScore != null) {
    scoreRows.push({ label: "Điểm AI", value: `${data.totalScore.toFixed(1)}/10 · ${decisionLabel(data.finalDecision)}` });
  } else if (data.scoringFailed) {
    scoreRows.push({ label: "Điểm AI", value: "⚠️ Chấm điểm thất bại — cần review thủ công" });
  }

  const body = `
    <h2 style="margin:0 0 6px;color:#09090b;font-size:22px;font-weight:700">Ứng viên mới đã nộp hồ sơ</h2>
    <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6">
      Hệ thống vừa nhận được CV từ ứng viên <strong>${data.candidateName}</strong>
      cho vị trí <strong>${data.jobTitle}</strong>.
    </p>
    ${infoTable([
    { label: "Ứng viên", value: data.candidateName },
    { label: "Email", value: data.candidateEmail },
    { label: "Vị trí", value: data.jobTitle },
    ...scoreRows,
  ])}
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

export async function sendCandidateAppliedToEmails(
  emails: string[],
  data: CandidateAppliedData
): Promise<void> {
  if (!GMAIL_USER || emails.length === 0) return;
  const transporter = createTransporter();
  const sends = emails.map((to) =>
    transporter.sendMail({
      from: `${COMPANY} Recruitment <${GMAIL_USER}>`,
      to,
      subject: `[${COMPANY}] Hồ sơ mới: ${data.candidateName} – ${data.jobTitle}`,
      html: buildCandidateAppliedHtml(data),
    }).catch((err) => console.warn(`[email] Gửi thất bại cho ${to}:`, err))
  );
  await Promise.allSettled(sends);
}

function buildInterviewHRNotifyHtml(data: {
  candidateName: string;
  jobTitle: string;
  interviewerName: string;
  startTime: Date;
  endTime: Date;
  meetLink?: string;
  notes?: string;
  appUrl: string;
  candidateId: string;
}): string {
  const startT = formatTime(data.startTime);
  const endT = formatTime(data.endTime);
  const date = formatDate(data.startTime);
  const rows: InfoRow[] = [
    { label: "Ứng viên", value: data.candidateName },
    { label: "Vị trí", value: data.jobTitle },
    { label: "Người phỏng vấn", value: data.interviewerName },
    { label: "Thời gian", value: `${startT} – ${endT}, ${date}` },
    ...(data.meetLink ? [{ label: "Link họp", value: "Tham gia Google Meet →", link: data.meetLink }] : []),
  ];
  const notesBlock = data.notes
    ? `<div style="border-left:3px solid #208994;padding:12px 16px;margin-bottom:24px;background:#eff6ff;border-radius:0 8px 8px 0">
        <p style="margin:0;color:#1e40af;font-size:14px;line-height:1.6"><strong>Ghi chú:</strong> ${data.notes}</p>
       </div>`
    : "";
  const body = `
    <h2 style="margin:0 0 6px;color:#09090b;font-size:22px;font-weight:700">Lịch phỏng vấn đã được tạo</h2>
    <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6">
      Một lịch phỏng vấn mới vừa được tạo trong hệ thống ATS.
    </p>
    ${infoTable(rows)}
    ${notesBlock}
    ${primaryButton(`${data.appUrl}/candidates/${data.candidateId}`, "Xem hồ sơ ứng viên →")}
  `;
  return emailWrapper("#208994", body, `Thông báo tự động từ hệ thống tuyển dụng ${COMPANY}.`);
}

export async function sendInterviewHRNotification(
  emails: string[],
  data: {
    candidateName: string;
    candidateId: string;
    jobTitle: string;
    interviewerName: string;
    startTime: Date;
    endTime: Date;
    meetLink?: string;
    notes?: string;
    appUrl: string;
  }
): Promise<void> {
  if (!GMAIL_USER || emails.length === 0) return;
  const transporter = createTransporter();
  const html = buildInterviewHRNotifyHtml(data);
  const sends = emails.map((to) =>
    transporter.sendMail({
      from: `${COMPANY} HR <${GMAIL_USER}>`,
      to,
      subject: `[${COMPANY}] Lịch PV mới: ${data.candidateName} – ${data.jobTitle}`,
      html,
    }).catch((err) => console.warn(`[email] Gửi HR interview notify thất bại cho ${to}:`, err))
  );
  await Promise.allSettled(sends);
}
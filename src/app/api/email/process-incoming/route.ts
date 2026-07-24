import { NextResponse } from "next/server";
import { Buffer } from "buffer";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { extractTextFromPDF } from "@/lib/pdf-parser";
import { scoreCandidate } from "@/services/ai/scoring";
import { sendCandidateAppliedNotification } from "@/services/email-service";
import {
  initGmailReader,
  listUnprocessedEmailIds,
  getEmailDetails,
  downloadAttachment,
  markEmailAsProcessed as markGmailMessageAsProcessed,
} from "@/services/gmail-reader-service";
import {
  isImapConfigured,
  listUnprocessedEmails as listUnprocessedImapEmails,
  markEmailAsProcessed as markImapMessageAsProcessed,
} from "@/services/imap-reader-service";

export const maxDuration = 120;

const BUCKET = "cv_uploads";

// ─── CẤU HÌNH TỪ KHÓA QUÉT EMAIL ────────────────────────────────────────────
//
// SCAN_SUBJECT_KEYWORDS: Từ khóa xuất hiện trong tiêu đề email thì MỚI lấy về.
// Email KHÔNG chứa bất kỳ từ khóa nào dưới đây sẽ bị BỎ QUA hoàn toàn.
// (Pre-filter phía server mail — chạy trước khi tải email về)
//
// Thêm/xóa từ khóa theo nhu cầu. Không phân biệt hoa/thường.
const SCAN_SUBJECT_KEYWORDS: string[] = [
  // Từ khóa generic cho CV / đơn ứng tuyển
  "cv", "resume", "ứng tuyển", "xin việc", "apply", "application",
  // Tên vị trí cụ thể
  "BDE", "Business Development Executive (Leasing/Design & Build/Furniture)",
  "Graphic Designer", "Graphic Designer ",
  "Content Marketing", "Digital Marketing", "Social Media Executive",
  // Thêm từ khóa tại đây:
];

// ─── Alias thủ công ───────────────────────────────────────────────────────────
// Dùng để map từ khóa trong tiêu đề email → tên vị trí trong DB.
// Chỉ ảnh hưởng đến việc PHÂN LOẠI (gán vào job nào), không ảnh hưởng đến
// việc CÓ lấy email hay không (xem SCAN_SUBJECT_KEYWORDS ở trên).
const SUBJECT_ALIASES: { keyword: string; jobTitle: string }[] = [
  // BDE — viết tắt, cần map sang tên đầy đủ trong DB
  { keyword: "bde", jobTitle: "Business Development Executive (Leasing/Design & Build/Furniture)" },
  { keyword: "business development executive", jobTitle: "Business Development Executive (Leasing/Design & Build/Furniture)" },
  { keyword: "business development", jobTitle: "Business Development Executive (Leasing/Design & Build/Furniture)" },
  // Graphic Designer
  { keyword: "graphic designer", jobTitle: "Graphic Designer" },
  // Marketing
  { keyword: "content marketing", jobTitle: "Content Marketing" },
  { keyword: "digital marketing", jobTitle: "Digital Marketing" },
  // Social Media
  { keyword: "social media executive", jobTitle: "Social Media Executive" },
  { keyword: "social media", jobTitle: "Social Media Executive" },
  // Thêm dòng mới ở đây theo cú pháp: { keyword: "...", jobTitle: "..." },
];
// ─────────────────────────────────────────────────────────────────────────────

type JobRef = { id: string; title: string };

type ScanResult = {
  email: string;
  status: "ok" | "skipped_no_pdf" | "skipped_no_jobs" | "skipped_no_match" | "error";
  candidateId?: string;
  jobTitle?: string;
  error?: string;
};

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
    });
  }
}

function matchJob(subject: string, jobs: JobRef[]): JobRef | null {
  const lower = subject.toLowerCase();

  // Expand subject with alias-matched job titles for broader matching
  const aliasedTitles = SUBJECT_ALIASES
    .filter((a) => lower.includes(a.keyword.toLowerCase()))
    .map((a) => a.jobTitle.toLowerCase());

  let best: JobRef | null = null;
  for (const job of jobs) {
    const titleLower = job.title.toLowerCase();
    const matched = lower.includes(titleLower) || aliasedTitles.some((t) => t.includes(titleLower) || titleLower.includes(t));
    if (matched) {
      if (!best || job.title.length > best.title.length) best = job;
    }
  }
  return best;
}

/**
 * Xử lý 1 email đã đọc xong (bất kể nguồn Gmail hay IMAP): match job, upload CV,
 * tạo candidate, chấm điểm AI, báo HR. Không tự đánh dấu "đã xử lý" — việc đó
 * do caller quyết định (khác cơ chế giữa Gmail label và IMAP move-folder).
 */
async function processCandidateEmail(params: {
  senderName: string;
  senderEmail: string;
  subject: string;
  pdfBuffer: Buffer | null;
  jobs: JobRef[];
  appUrl: string;
}): Promise<ScanResult> {
  const { senderName, senderEmail, subject, pdfBuffer, jobs, appUrl } = params;

  if (!pdfBuffer) {
    return { email: senderEmail, status: "skipped_no_pdf" };
  }

  if (jobs.length === 0) {
    return { email: senderEmail, status: "skipped_no_jobs" };
  }

  const matchedJob = matchJob(subject, jobs);
  if (!matchedJob) {
    return { email: senderEmail, status: "skipped_no_match" };
  }

  const fileName = `${matchedJob.id}/${Date.now()}-email-${senderEmail.split("@")[0] || "unknown"}.pdf`;
  const { error: storageError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(fileName, pdfBuffer, { contentType: "application/pdf" });

  if (storageError) {
    console.error("[email-scan] Lỗi upload:", storageError);
    return { email: senderEmail, status: "error", error: "Upload CV thất bại" };
  }

  const { data: signedUrlData } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(fileName, 60 * 24 * 60 * 60);
  const cvUrl = signedUrlData?.signedUrl ?? fileName;

  // Create candidate record
  const { data: candidate, error: dbError } = await supabaseAdmin
    .from("candidates")
    .insert([
      {
        job_id: matchedJob.id,
        name: senderName,
        email: senderEmail,
        phone: null,
        form_answers: `Nguồn: Email tự động | Tiêu đề email: ${subject}`,
        cv_url: cvUrl,
        status: "New",
      },
    ])
    .select()
    .single();

  if (dbError || !candidate) {
    console.error("[email-scan] Lỗi tạo candidate:", dbError);
    return { email: senderEmail, status: "error", error: "Lỗi lưu ứng viên vào DB" };
  }

  // AI Scoring
  let aiResult = null;
  let scoringFailed = false;

  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("id", matchedJob.id)
    .single();

  if (job) {
    await supabaseAdmin
      .from("candidates")
      .update({ status: "Scoring" })
      .eq("id", candidate.id);

    try {
      const cvText = await extractTextFromPDF(pdfBuffer);
      aiResult = await scoreCandidate({
        jobDescription: job.description,
        requiredSkills: job.required_skills,
        preferredSkills: job.preferred_skills || "",
        experienceRequirement: job.experience_requirement || "",
        customRubric: JSON.stringify(job.rubric || {}),
        formAnswers: "",
        cvText,
      });

      // Tính total_score server-side để tránh AI trả về 0
      const totalScore = parseFloat(
        (aiResult.job_fit_score * 0.5 + aiResult.potential_score * 0.3 + aiResult.cultural_fit_score * 0.2).toFixed(2)
      );
      aiResult = { ...aiResult, total_score: totalScore };

      await supabaseAdmin
        .from("candidates")
        .update({
          ai_score_result: aiResult,
          total_score: totalScore,
          missing_information: aiResult.missing_information.length > 0,
          status: "Scored",
        })
        .eq("id", candidate.id);

      console.log(
        `[email-scan] Scored ${senderEmail} → ${aiResult.total_score}/10 (${aiResult.final_decision})`
      );
    } catch (aiErr) {
      console.error("[email-scan] AI scoring thất bại:", senderEmail, aiErr);
      scoringFailed = true;
      await supabaseAdmin
        .from("candidates")
        .update({ status: "New" })
        .eq("id", candidate.id);
    }
  }

  // Notify HR (non-blocking)
  sendCandidateAppliedNotification({
    candidateName: senderName,
    candidateEmail: senderEmail,
    jobTitle: matchedJob.title,
    candidateId: candidate.id,
    appUrl,
    scored: !!aiResult,
    totalScore: aiResult?.total_score,
    finalDecision: aiResult?.final_decision,
    scoringFailed,
  }).catch((err) => console.error("[email-scan] Gửi thông báo HR thất bại:", err));

  return {
    email: senderEmail,
    status: "ok",
    candidateId: candidate.id,
    jobTitle: matchedJob.title,
  };
}

async function scanViaGmail(jobs: JobRef[], appUrl: string) {
  const results: ScanResult[] = [];

  let token: string;
  let processedLabelId: string;
  try {
    ({ token, processedLabelId } = await initGmailReader());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email-scan] Không khởi tạo được Gmail reader:", message);
    return NextResponse.json({ error: message, code: "GMAIL_INIT_FAILED" }, { status: 500 });
  }

  const messageIds = await listUnprocessedEmailIds(token, SCAN_SUBJECT_KEYWORDS);
  if (messageIds.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  for (const messageId of messageIds) {
    let parsed;
    try {
      parsed = await getEmailDetails(token, messageId);
    } catch (err) {
      console.error("[email-scan] Không đọc được email:", messageId, err);
      results.push({ email: messageId, status: "error", error: "Không đọc được email" });
      continue;
    }

    const { senderName, senderEmail, subject, pdfAttachments } = parsed;

    let pdfBuffer: Buffer | null = null;
    if (pdfAttachments.length > 0) {
      try {
        pdfBuffer = await downloadAttachment(token, messageId, pdfAttachments[0].attachmentId);
      } catch (err) {
        console.error("[email-scan] Không tải được CV:", senderEmail, err);
        results.push({ email: senderEmail, status: "error", error: "Không tải được file PDF" });
        continue;
      }
    }

    const result = await processCandidateEmail({ senderName, senderEmail, subject, pdfBuffer, jobs, appUrl });
    results.push(result);
    await markGmailMessageAsProcessed(token, messageId, processedLabelId);
  }

  const okCount = results.filter((r) => r.status === "ok").length;
  console.log(`[email-scan] Xử lý xong: ${okCount}/${messageIds.length} email (Gmail)`);
  return NextResponse.json({ processed: results.length, created: okCount, results });
}

async function scanViaImap(jobs: JobRef[], appUrl: string) {
  const results: ScanResult[] = [];

  let emails;
  try {
    emails = await listUnprocessedImapEmails(SCAN_SUBJECT_KEYWORDS);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email-scan] Không khởi tạo được IMAP reader:", message);
    return NextResponse.json({ error: message, code: "IMAP_INIT_FAILED" }, { status: 500 });
  }

  if (emails.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  for (const email of emails) {
    const pdfBuffer = email.pdfAttachments[0]?.content ?? null;
    const result = await processCandidateEmail({
      senderName: email.senderName,
      senderEmail: email.senderEmail,
      subject: email.subject,
      pdfBuffer,
      jobs,
      appUrl,
    });
    results.push(result);

    try {
      await markImapMessageAsProcessed(email.uid);
    } catch (err) {
      console.error("[email-scan] Không chuyển được email IMAP vào Processed:", email.uid, err);
    }
  }

  const okCount = results.filter((r) => r.status === "ok").length;
  console.log(`[email-scan] Xử lý xong: ${okCount}/${emails.length} email (IMAP)`);
  return NextResponse.json({ processed: results.length, created: okCount, results });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET chưa được cấu hình trong .env.local" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: openJobs } = await supabaseAdmin
    .from("jobs")
    .select("id, title")
    .eq("status", "Open");
  const jobs = openJobs ?? [];

  await ensureBucket();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (isImapConfigured()) {
    return scanViaImap(jobs, appUrl);
  }
  return scanViaGmail(jobs, appUrl);
}

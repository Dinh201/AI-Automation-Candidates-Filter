import { NextResponse } from "next/server";
import { Buffer } from "buffer";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { extractTextFromPDF } from "@/lib/pdf-parser";
import { scoreCandidate } from "@/services/ai/scoring";
import { logAudit } from "@/services/audit-service";
import { MISSING_EMAIL_PLACEHOLDER, isValidEmailFormat } from "@/lib/candidate-email";

export const maxDuration = 120;

const BUCKET = "cv_uploads";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const jobId = (body.job_id as string) || "";
    const providedName = ((body.name as string) || "").trim();
    const providedEmail = ((body.email as string) || "").trim();
    const email = providedEmail || MISSING_EMAIL_PLACEHOLDER;
    const cvPath = (body.cv_path as string) || "";

    if (!jobId || !cvPath) {
      return NextResponse.json(
        { error: "Thiếu job_id hoặc file CV", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { data: job } = await supabaseAdmin
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (!job) {
      return NextResponse.json(
        { error: "Không tìm thấy vị trí tuyển dụng", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // File PDF đã được client upload thẳng lên Storage qua signed upload URL
    // (/api/cv-analyze/upload-url) — bỏ qua serverless function để không bị
    // Vercel chặn ở giới hạn 4.5MB/request. Tải lại nội dung ở đây để trích
    // xuất text và tạo signed URL xem CV.
    const { data: downloaded, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(cvPath);

    if (downloadError || !downloaded) {
      console.error("Lỗi tải file CV đã upload:", downloadError);
      return NextResponse.json(
        { error: "Không tìm thấy file CV đã upload. Vui lòng thử lại.", code: "CV_UPLOAD_FAILED" },
        { status: 400 }
      );
    }

    const fileBuffer = await downloaded.arrayBuffer();

    const { data: signedUrlData } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(cvPath, 60 * 24 * 60 * 60);
    const cvUrl = signedUrlData?.signedUrl ?? cvPath;

    // Tạo candidate record với tên tạm thời (sẽ cập nhật sau khi AI trích xuất)
    const tempName = providedName || "Ứng viên không rõ tên";
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from("candidates")
      .insert([{ job_id: jobId, name: tempName, email, cv_url: cvUrl, status: "Scoring" }])
      .select()
      .single();

    if (candidateError) {
      console.error("Lỗi tạo candidate:", candidateError);
      return NextResponse.json(
        { error: "Không thể lưu thông tin ứng viên", code: "DATABASE_ERROR" },
        { status: 500 }
      );
    }

    logAudit({
      entity_type: "candidate",
      entity_id: candidate.id,
      entity_name: tempName,
      action: "candidate_applied",
      details: { job_id: jobId, job_title: job.title, email },
    });

    // Chạy AI scoring
    const cvText = await extractTextFromPDF(Buffer.from(new Uint8Array(fileBuffer)));

    let result = await scoreCandidate({
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
      (result.job_fit_score * 0.5 + result.potential_score * 0.3 + result.cultural_fit_score * 0.2).toFixed(2)
    );
    result = { ...result, total_score: totalScore };

    // Xác định tên cuối cùng: ưu tiên user nhập > AI trích xuất > mặc định
    const aiName = result.candidate_name?.trim() || "";
    const finalName = providedName || aiName || "Ứng viên không rõ tên";

    // Xác định email cuối cùng: ưu tiên user nhập > AI trích xuất (đúng định dạng) > placeholder
    const aiEmail = result.candidate_email?.trim() || "";
    const finalEmail = providedEmail || (isValidEmailFormat(aiEmail) ? aiEmail : "") || MISSING_EMAIL_PLACEHOLDER;

    // Lưu kết quả AI vào DB, cập nhật tên/email nếu AI trích xuất được
    await supabaseAdmin
      .from("candidates")
      .update({
        ai_score_result: result,
        total_score: totalScore,
        missing_information: result.missing_information.length > 0,
        status: "Scored",
        ...(finalName !== tempName ? { name: finalName } : {}),
        ...(finalEmail !== email ? { email: finalEmail } : {}),
      })
      .eq("id", candidate.id);

    logAudit({
      entity_type: "candidate",
      entity_id: candidate.id,
      entity_name: finalName,
      action: "candidate_scored",
      details: {
        job_title: job.title,
        total_score: result.total_score,
        final_decision: result.final_decision,
      },
    });

    return NextResponse.json({
      result,
      jobTitle: job.title,
      candidateId: candidate.id,
      candidateName: finalName,
    });
  } catch (error: unknown) {
    console.error("Lỗi cv-analyze:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi phân tích CV. Vui lòng thử lại.", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
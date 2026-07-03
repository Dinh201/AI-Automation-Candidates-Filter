import { NextResponse } from "next/server";
import { Buffer } from "buffer";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { extractTextFromPDF } from "@/lib/pdf-parser";
import { scoreCandidate } from "@/services/ai/scoring";
import { logAudit } from "@/services/audit-service";

export const maxDuration = 120;

const BUCKET = "cv_uploads";

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await supabaseAdmin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
    });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const jobId = formData.get("job_id") as string;
    const providedName = ((formData.get("name") as string) || "").trim();
    const email = (formData.get("email") as string) || "unknown@quickscan.local";
    const file = formData.get("cv") as File;

    if (!jobId || !file) {
      return NextResponse.json(
        { error: "Thiếu job_id hoặc file CV", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Chỉ chấp nhận file PDF", code: "VALIDATION_ERROR" },
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

    await ensureBucket();

    // Upload CV lên Storage
    const fileBuffer = await file.arrayBuffer();
    const fileName = `${jobId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: storageError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(fileName, fileBuffer, { contentType: "application/pdf" });

    let cvUrl = fileName;
    if (!storageError) {
      const { data: signedUrlData } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(fileName, 60 * 24 * 60 * 60);
      cvUrl = signedUrlData?.signedUrl ?? fileName;
    }

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

    // Lưu kết quả AI vào DB, cập nhật tên nếu AI trích xuất được
    await supabaseAdmin
      .from("candidates")
      .update({
        ai_score_result: result,
        total_score: totalScore,
        missing_information: result.missing_information.length > 0,
        status: "Scored",
        ...(finalName !== tempName ? { name: finalName } : {}),
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
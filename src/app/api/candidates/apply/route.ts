import { NextResponse } from "next/server";
import { Buffer } from "buffer";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { extractTextFromPDF } from "@/lib/pdf-parser";
import { scoreCandidate } from "@/services/ai/scoring";
import { sendCandidateAppliedToEmails } from "@/services/email-service";
import { sendPushToAll } from "@/lib/push-service";

// Cho phép route chạy lâu hơn 30s mặc định (cần thiết cho AI scoring)
export const maxDuration = 120;

const BUCKET = "cv_uploads";

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
    });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const jobId = formData.get("job_id") as string;
    const formAnswers = formData.get("form_answers") as string;
    const file = formData.get("cv") as File;

    if (!name || !email || !jobId || !file) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc: tên, email, job_id hoặc CV", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Chỉ chấp nhận file PDF", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Đảm bảo bucket tồn tại
    await ensureBucket();

    // 1. Upload CV lên Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const fileName = `${jobId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const { error: storageError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(fileName, fileBuffer, { contentType: "application/pdf" });

    if (storageError) {
      console.error("Lỗi upload CV:", storageError);
      return NextResponse.json(
        { error: "Không thể upload CV. Vui lòng thử lại.", code: "CV_UPLOAD_FAILED" },
        { status: 500 }
      );
    }

    // Lấy signed URL (60 ngày) vì bucket là private
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(fileName, 60 * 24 * 60 * 60);
    const cvUrl = signedUrlData?.signedUrl ?? fileName;

    // 2. Tạo record Candidate với trạng thái "New"
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from("candidates")
      .insert([
        {
          job_id: jobId,
          name,
          email,
          phone: phone || null,
          form_answers: formAnswers || "",
          cv_url: cvUrl,
          status: "New",
        },
      ])
      .select()
      .single();

    if (candidateError) {
      console.error("Lỗi tạo candidate:", candidateError);
      return NextResponse.json(
        { error: "Không thể lưu thông tin ứng viên", code: "DATABASE_ERROR" },
        { status: 500 }
      );
    }

    // 3. Lấy thông tin Job để chạy AI scoring
    const { data: job } = await supabaseAdmin
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    let scoringFailed = false;
    let aiResult = null;

    if (job) {
      // Cập nhật trạng thái sang Scoring
      await supabaseAdmin
        .from("candidates")
        .update({ status: "Scoring" })
        .eq("id", candidate.id);

      try {
        const cvText = await extractTextFromPDF(Buffer.from(new Uint8Array(fileBuffer)));

        aiResult = await scoreCandidate({
          jobDescription: job.description,
          requiredSkills: job.required_skills,
          preferredSkills: job.preferred_skills || "",
          experienceRequirement: job.experience_requirement || "",
          customRubric: JSON.stringify(job.rubric || {}),
          formAnswers: formAnswers || "",
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
      } catch (aiError: unknown) {
        console.error("Lỗi AI scoring:", aiError);
        scoringFailed = true;
        // Đặt lại New để HR biết cần review thủ công
        await supabaseAdmin
          .from("candidates")
          .update({ status: "New" })
          .eq("id", candidate.id);
      }
    }

    // Gửi thông báo cho HR dựa theo notification_prefs (không block response)
    const notifPayload = {
      candidateName: name,
      candidateEmail: email,
      jobTitle: job?.title ?? "Vị trí không xác định",
      candidateId: candidate.id,
      appUrl,
      scored: !!aiResult,
      totalScore: aiResult?.total_score,
      finalDecision: aiResult?.final_decision,
      scoringFailed,
    };

    void (async () => {
      try {
        const { data: profiles } = await supabaseAdmin
          .from("user_profiles")
          .select("id, notification_prefs");

        if (profiles) {
          // Email: gửi tới những user có emailApplicant = true
          const emailEnabled = profiles.filter((p) => {
            const prefs = p.notification_prefs as Record<string, boolean> | null;
            return prefs?.emailApplicant !== false;
          });

          if (emailEnabled.length > 0) {
            const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
            const emailMap = new Map(
              authUsers?.users?.map((u) => [u.id, u.email]) ?? []
            );
            const emails = emailEnabled
              .map((p) => emailMap.get(p.id))
              .filter((e): e is string => !!e);
            await sendCandidateAppliedToEmails(emails, notifPayload);
          }
        }

        // Push: gửi tới những user có pushApplicant = true
        await sendPushToAll(
          {
            title: "Ứng viên mới nộp hồ sơ",
            body: `${name} vừa ứng tuyển vị trí ${job?.title ?? ""}`,
            url: `/candidates/${candidate.id}`,
            tag: `candidate-${candidate.id}`,
          },
          "pushApplicant"
        );
      } catch (err) {
        console.error("[notify] Lỗi gửi thông báo ứng viên mới:", err);
      }
    })();

    return NextResponse.json(
      {
        success: true,
        candidate_id: candidate.id,
        message: "Nộp CV thành công!",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Lỗi apply route:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra. Vui lòng thử lại.", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}

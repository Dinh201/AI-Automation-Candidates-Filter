import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "cv_uploads";

// Cấp URL để ứng viên (không đăng nhập) upload CV thẳng lên Supabase Storage
// thay vì gửi qua serverless function /api/candidates/apply — Vercel giới
// hạn cứng 4.5MB/request cho function, trong khi bucket cv_uploads cho phép
// tới 50MB. /api/candidates/apply chỉ nhận JSON nhỏ (đường dẫn file) sau khi
// client đã upload xong. Route công khai — xem middleware.ts.
async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await supabaseAdmin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 50 * 1024 * 1024,
    });
  }
}

export async function POST(request: Request) {
  try {
    const { job_id: jobId, file_name: fileName } = await request.json();

    if (!jobId || !fileName) {
      return NextResponse.json(
        { error: "Thiếu job_id hoặc file_name", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (!fileName.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Chỉ chấp nhận file PDF", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { data: job } = await supabaseAdmin.from("jobs").select("id").eq("id", jobId).single();
    if (!job) {
      return NextResponse.json(
        { error: "Không tìm thấy vị trí tuyển dụng", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    await ensureBucket();

    const path = `${jobId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error("Lỗi tạo signed upload URL:", error);
      return NextResponse.json(
        { error: "Không tạo được URL upload. Vui lòng thử lại.", code: "UNKNOWN_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({ path: data.path, token: data.token });
  } catch (error: unknown) {
    console.error("Lỗi candidates/apply/upload-url:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra. Vui lòng thử lại.", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}

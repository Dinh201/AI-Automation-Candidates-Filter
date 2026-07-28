import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CV_BUCKET, CV_SIGNED_URL_TTL_SECONDS, extractCvStoragePath } from "@/lib/cv-storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: candidate, error } = await supabaseAdmin
    .from("candidates")
    .select("cv_url")
    .eq("id", id)
    .single();

  if (error || !candidate) {
    return NextResponse.json({ error: "Không tìm thấy ứng viên", code: "NOT_FOUND" }, { status: 404 });
  }

  const path = extractCvStoragePath(candidate.cv_url);
  if (!path) {
    return NextResponse.json(
      { error: "Không xác định được vị trí file CV", code: "CV_UPLOAD_FAILED" },
      { status: 500 }
    );
  }

  const { data: signedUrlData, error: signError } = await supabaseAdmin.storage
    .from(CV_BUCKET)
    .createSignedUrl(path, CV_SIGNED_URL_TTL_SECONDS);

  if (signError || !signedUrlData) {
    console.error("Lỗi tạo signed URL cho CV:", signError);
    return NextResponse.json(
      { error: "Không tạo được link xem CV", code: "CV_UPLOAD_FAILED" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: signedUrlData.signedUrl });
}

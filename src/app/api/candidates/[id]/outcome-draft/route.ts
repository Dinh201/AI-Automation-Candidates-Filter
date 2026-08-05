import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildOutcomeDraft } from "@/services/email-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const outcome = new URL(request.url).searchParams.get("outcome");

  if (outcome !== "Hired" && outcome !== "Rejected") {
    return NextResponse.json(
      { error: "outcome phải là 'Hired' hoặc 'Rejected'", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const { data: candidate, error } = await supabaseAdmin
    .from("candidates")
    .select("name, email, jobs(title)")
    .eq("id", id)
    .single();

  if (error || !candidate) {
    return NextResponse.json({ error: "Không tìm thấy ứng viên", code: "NOT_FOUND" }, { status: 404 });
  }

  if (!candidate.email) {
    return NextResponse.json({ error: "Ứng viên chưa có email", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const jobTitle = (candidate.jobs as unknown as { title: string } | null)?.title ?? "Vị trí tuyển dụng";

  const draft = buildOutcomeDraft(outcome, {
    candidateName: candidate.name,
    candidateEmail: candidate.email,
    jobTitle,
  });

  return NextResponse.json(draft);
}

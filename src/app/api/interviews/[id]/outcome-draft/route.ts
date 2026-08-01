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

  const { data: interview, error } = await supabaseAdmin
    .from("interviews")
    .select("candidates(name, email, jobs(title))")
    .eq("id", id)
    .single();

  if (error || !interview) {
    return NextResponse.json({ error: "Không tìm thấy buổi phỏng vấn", code: "NOT_FOUND" }, { status: 404 });
  }

  const candidate = interview.candidates as unknown as { name: string; email: string; jobs: { title: string } | null } | null;
  if (!candidate?.email) {
    return NextResponse.json({ error: "Ứng viên chưa có email", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const draft = buildOutcomeDraft(outcome, {
    candidateName: candidate.name,
    candidateEmail: candidate.email,
    jobTitle: candidate.jobs?.title ?? "Vị trí tuyển dụng",
  });

  return NextResponse.json(draft);
}

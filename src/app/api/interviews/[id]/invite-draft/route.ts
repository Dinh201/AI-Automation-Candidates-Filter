import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildInviteDraft, InterviewBranch } from "@/services/email-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const branch = new URL(request.url).searchParams.get("branch");

  if (branch !== "hcm" && branch !== "hanoi") {
    return NextResponse.json(
      { error: "branch phải là 'hcm' hoặc 'hanoi'", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const { data: interview, error } = await supabaseAdmin
    .from("interviews")
    .select("start_time, end_time, meet_link, candidates(name, email, jobs(title))")
    .eq("id", id)
    .single();

  if (error || !interview) {
    return NextResponse.json({ error: "Không tìm thấy buổi phỏng vấn", code: "NOT_FOUND" }, { status: 404 });
  }

  const candidate = interview.candidates as unknown as { name: string; email: string; jobs: { title: string } | null } | null;
  if (!candidate?.email) {
    return NextResponse.json({ error: "Ứng viên chưa có email", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const draft = buildInviteDraft(branch as InterviewBranch, {
    candidateName: candidate.name,
    jobTitle: candidate.jobs?.title ?? "Vị trí tuyển dụng",
    startTime: new Date(interview.start_time),
    endTime: new Date(interview.end_time),
    meetLink: interview.meet_link ?? undefined,
  });

  return NextResponse.json(draft);
}

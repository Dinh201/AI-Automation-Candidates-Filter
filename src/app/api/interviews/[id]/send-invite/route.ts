import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/services/audit-service";
import { sendCustomInviteEmail } from "@/services/email-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  let body: { subject?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  if (!body.subject || !body.body) {
    return NextResponse.json(
      { error: "Cần có subject và body", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const { data: interview, error } = await supabaseAdmin
    .from("interviews")
    .select("candidate_id, candidates(name, email)")
    .eq("id", id)
    .single();

  if (error || !interview) {
    return NextResponse.json({ error: "Không tìm thấy buổi phỏng vấn", code: "NOT_FOUND" }, { status: 404 });
  }

  const candidate = interview.candidates as unknown as { name: string; email: string } | null;
  if (!candidate?.email) {
    return NextResponse.json({ error: "Ứng viên chưa có email", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    await sendCustomInviteEmail({ candidateEmail: candidate.email, subject: body.subject, body: body.body });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Gửi mail thất bại: ${message}`, code: "EMAIL_SEND_FAILED" }, { status: 500 });
  }

  await supabaseAdmin.from("interviews").update({ invite_sent: true }).eq("id", id);

  logAudit({
    entity_type: "interview",
    entity_id: id,
    entity_name: candidate.name,
    action: "interview_invite_sent",
    details: { candidate_id: interview.candidate_id },
  });

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
<<<<<<< HEAD
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/services/audit-service";
=======
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88

export async function GET() {
  const { data, error } = await supabase
    .from("candidates")
    .select("id, name, email, status, total_score, ai_score_result, created_at, jobs(title)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Lỗi lấy danh sách ứng viên:", error);
    return NextResponse.json({ error: "DATABASE_ERROR", code: "DATABASE_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ data });
}
<<<<<<< HEAD

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ids: unknown = body.ids;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Danh sách ID không hợp lệ", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const validIds = ids.filter((id): id is string => typeof id === "string");

  const { data: candidates } = await supabaseAdmin
    .from("candidates")
    .select("id, name")
    .in("id", validIds);

  const { error } = await supabaseAdmin
    .from("candidates")
    .delete()
    .in("id", validIds);

  if (error) {
    return NextResponse.json({ error: "DATABASE_ERROR", code: "DATABASE_ERROR" }, { status: 500 });
  }

  for (const c of candidates ?? []) {
    logAudit({
      entity_type: "candidate",
      entity_id: c.id,
      entity_name: c.name,
      action: "candidate_deleted",
      details: { bulk: true },
    });
  }

  return NextResponse.json({ success: true, deleted: validIds.length });
}
=======
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88

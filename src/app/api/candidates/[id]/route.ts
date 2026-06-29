import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/services/audit-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("candidates")
    .select("*, jobs(*)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Không tìm thấy ứng viên", code: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const allowed = ["status"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Không có trường hợp lệ để cập nhật", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("candidates")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "DATABASE_ERROR", code: "DATABASE_ERROR" }, { status: 500 });
  }

  if (updates.status) {
    logAudit({
      entity_type: "candidate",
      entity_id: id,
      entity_name: data.name,
      action: "candidate_status_changed",
      details: { new_status: updates.status },
    });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: "Không tìm thấy ứng viên", code: "NOT_FOUND" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("candidates")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "DATABASE_ERROR", code: "DATABASE_ERROR" }, { status: 500 });
  }

  logAudit({
    entity_type: "candidate",
    entity_id: id,
    entity_name: candidate.name,
    action: "candidate_deleted",
    details: {},
  });

  return NextResponse.json({ success: true });
}

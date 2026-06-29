import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // dùng admin client để trang apply công khai luôn đọc được job
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Không tìm thấy vị trí", code: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ job: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const allowed = ["title", "description", "required_skills", "preferred_skills", "experience_requirement", "benefits", "rubric", "status"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Không có trường hợp lệ để cập nhật", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("jobs")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Lỗi cập nhật job:", error);
    return NextResponse.json({ error: error.message, code: "DATABASE_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ job: data });
}

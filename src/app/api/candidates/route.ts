import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

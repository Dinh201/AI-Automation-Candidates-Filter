import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("interviews")
    .select("*, candidates(name, email, status, jobs(title))")
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message, code: "DATABASE_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ data });
}

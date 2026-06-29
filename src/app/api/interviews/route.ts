import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("interviews")
<<<<<<< HEAD
    .select("*, candidates(name, email, status, jobs(title))")
=======
    .select("*, candidates(name, email, jobs(title))")
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message, code: "DATABASE_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ data });
}

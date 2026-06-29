import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { data } = await supabaseAdmin
    .from("hr_calendar_tokens")
    .select("access_token, expiry")
    .eq("id", "default")
    .single();

  const connected = !!data?.access_token;
  return NextResponse.json({ connected });
}

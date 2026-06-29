import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { data } = await supabaseAdmin
    .from("hr_gmail_tokens")
    .select("access_token")
    .eq("id", "default")
    .single();

  const hasOAuth = !!data?.access_token;
  const hasEnvToken = !!process.env.GMAIL_REFRESH_TOKEN;

  return NextResponse.json({
    connected: hasOAuth || hasEnvToken,
    source: hasOAuth ? "oauth" : hasEnvToken ? "env" : "none",
  });
}
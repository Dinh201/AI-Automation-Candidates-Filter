import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function POST() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  // Trả JSON để client tự handle redirect (tránh fetch follow redirect)
  return NextResponse.json({ ok: true });
}
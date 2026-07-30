import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Trạng thái tài khoản Gmail dùng để GỬI mail (thư mời phỏng vấn, kết quả...).
// Tách riêng khỏi /api/gmail/status (trạng thái QUÉT CV, ưu tiên IMAP) vì đây là
// hai kết nối hoàn toàn độc lập dù có thể trùng địa chỉ hiển thị.
export async function GET() {
  const { data } = await supabaseAdmin
    .from("hr_gmail_tokens")
    .select("email, refresh_token")
    .eq("id", "default")
    .single();

  if (data?.refresh_token) {
    return NextResponse.json({ connected: true, email: data.email ?? null, source: "oauth" });
  }

  const hasEnvToken = !!process.env.GMAIL_REFRESH_TOKEN;
  return NextResponse.json({
    connected: hasEnvToken,
    email: hasEnvToken ? (process.env.GMAIL_USER ?? null) : null,
    source: hasEnvToken ? "env" : "none",
  });
}

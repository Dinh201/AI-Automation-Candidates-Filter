import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isImapConfigured } from "@/services/imap-reader-service";

export async function GET() {
  // /api/email/process-incoming ưu tiên IMAP nếu đã cấu hình (xem isImapConfigured),
  // chỉ dùng Gmail OAuth/env token khi IMAP chưa cấu hình — status trả về phải
  // phản ánh đúng cơ chế nào THỰC SỰ đang chạy khi bấm "Quét ngay".
  if (isImapConfigured()) {
    return NextResponse.json({ connected: true, source: "imap" });
  }

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
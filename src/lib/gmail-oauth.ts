import { supabaseAdmin } from "@/lib/supabase-admin";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

async function refreshViaEnvToken(): Promise<string> {
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error(
      "Gmail chưa được kết nối. Kết nối qua trang Ứng viên (nút 'Kết nối Gmail') hoặc cấu hình GMAIL_REFRESH_TOKEN trong .env.local"
    );
  }
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Refresh token Gmail thất bại: ${err}`);
  }
  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Gmail token không hợp lệ — kiểm tra GMAIL_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET");
  }
  return data.access_token as string;
}

/**
 * Trả về access token Gmail còn hiệu lực cho tài khoản đã kết nối qua giao diện
 * ("Kết nối Gmail" ở trang Ứng viên → lưu vào bảng hr_gmail_tokens, tự refresh
 * khi hết hạn), fallback GMAIL_REFRESH_TOKEN trong .env.local nếu chưa kết nối
 * qua giao diện. Dùng chung cho cả đọc CV (gmail-reader-service) lẫn gửi mail
 * (email-service) — cùng 1 tài khoản Gmail, cùng 1 nguồn token.
 */
export async function getGmailAccessToken(): Promise<string> {
  const { data: dbTokens } = await supabaseAdmin
    .from("hr_gmail_tokens")
    .select("*")
    .eq("id", "default")
    .single();

  if (dbTokens?.refresh_token) {
    if (dbTokens.expiry && dbTokens.expiry - Date.now() > 60_000) {
      return dbTokens.access_token as string;
    }
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: dbTokens.refresh_token,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      await supabaseAdmin
        .from("hr_gmail_tokens")
        .update({
          access_token: json.access_token,
          expiry: Date.now() + json.expires_in * 1000,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "default");
      return json.access_token as string;
    }

    // Đã có kết nối qua giao diện nhưng refresh lỗi (vd token bị thu hồi) —
    // KHÔNG được âm thầm rơi về GMAIL_REFRESH_TOKEN trong .env.local, vì đó rất
    // có thể là token của một tài khoản Gmail KHÁC, gây lỗi xác thực khó hiểu
    // (SMTP báo sai username/password dù access token trông "hợp lệ").
    const err = await res.text();
    throw new Error(
      `Refresh token Gmail (đã kết nối qua giao diện) thất bại: ${err}. Vào Cài đặt → "Gửi email (Gmail)" → bấm "Kết nối lại".`
    );
  }

  return refreshViaEnvToken();
}

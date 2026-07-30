import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function appUrl(request: Request): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (base) return base;
  const u = new URL(request.url);
  return `${u.protocol}//${u.host}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const base = appUrl(request);
  const state = searchParams.get("state");
  const returnPath = state && state.startsWith("/") ? state : "/candidates";

  if (error || !code) {
    return NextResponse.redirect(
      `${base}${returnPath}?gmail_error=${error ?? "no_code"}`
    );
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_GMAIL_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Token exchange thất bại: ${err}`);
    }

    const json = await res.json();

    // Lấy địa chỉ email của tài khoản vừa kết nối để hiển thị ở Cài đặt —
    // không chặn kết nối nếu bước này lỗi, chỉ đơn giản là không có email hiển thị.
    let email: string | null = null;
    try {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${json.access_token}` },
      });
      if (userRes.ok) {
        const userJson = await userRes.json();
        email = userJson.email ?? null;
      }
    } catch (err) {
      console.warn("[gmail-callback] Không lấy được email tài khoản:", err);
    }

    const { error: dbError } = await supabaseAdmin.from("hr_gmail_tokens").upsert({
      id: "default",
      access_token: json.access_token,
      refresh_token: json.refresh_token ?? null,
      expiry: Date.now() + json.expires_in * 1000,
      email,
      updated_at: new Date().toISOString(),
    });

    if (dbError) {
      throw new Error(`Lưu token vào DB thất bại: ${dbError.message}`);
    }

    return NextResponse.redirect(`${base}${returnPath}?gmail_connected=1`);
  } catch (err) {
    console.error("Gmail OAuth callback error:", err);
    return NextResponse.redirect(
      `${base}${returnPath}?gmail_error=token_exchange_failed`
    );
  }
}
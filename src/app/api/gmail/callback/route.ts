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

  if (error || !code) {
    return NextResponse.redirect(
      `${base}/candidates?gmail_error=${error ?? "no_code"}`
    );
  }

  const state = searchParams.get("state");
  const returnPath = state && state.startsWith("/") ? state : "/candidates";

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

    await supabaseAdmin.from("hr_gmail_tokens").upsert({
      id: "default",
      access_token: json.access_token,
      refresh_token: json.refresh_token ?? null,
      expiry: Date.now() + json.expires_in * 1000,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.redirect(`${base}${returnPath}?gmail_connected=1`);
  } catch (err) {
    console.error("Gmail OAuth callback error:", err);
    return NextResponse.redirect(
      `${base}/candidates?gmail_error=token_exchange_failed`
    );
  }
}
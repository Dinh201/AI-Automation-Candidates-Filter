import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/services/google-calendar-service";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/interviews?calendar_error=${error ?? "no_code"}`
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    await supabaseAdmin.from("hr_calendar_tokens").upsert({
      id: "default",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expiry: tokens.expiry,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/interviews?calendar_connected=1`
    );
  } catch (err) {
    console.error("Calendar callback error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/interviews?calendar_error=token_exchange_failed`
    );
  }
}

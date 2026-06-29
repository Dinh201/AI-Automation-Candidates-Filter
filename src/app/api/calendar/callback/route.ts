import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/services/google-calendar-service";
import { supabaseAdmin } from "@/lib/supabase-admin";

<<<<<<< HEAD
function appUrl(request: Request): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (base) return base;
  const u = new URL(request.url);
  return `${u.protocol}//${u.host}`;
}

=======
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
<<<<<<< HEAD
  const base = appUrl(request);

  if (error || !code) {
    return NextResponse.redirect(
      `${base}/interviews?calendar_error=${error ?? "no_code"}`
    );
  }

  const state = searchParams.get("state");
  const returnPath = state && state.startsWith("/") ? state : "/interviews";

=======

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/interviews?calendar_error=${error ?? "no_code"}`
    );
  }

>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
  try {
    const tokens = await exchangeCodeForTokens(code);

    await supabaseAdmin.from("hr_calendar_tokens").upsert({
      id: "default",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expiry: tokens.expiry,
      updated_at: new Date().toISOString(),
    });

<<<<<<< HEAD
    return NextResponse.redirect(`${base}${returnPath}?calendar_connected=1`);
  } catch (err) {
    console.error("Calendar callback error:", err);
    return NextResponse.redirect(`${base}/interviews?calendar_error=token_exchange_failed`);
=======
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/interviews?calendar_connected=1`
    );
  } catch (err) {
    console.error("Calendar callback error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/interviews?calendar_error=token_exchange_failed`
    );
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
  }
}

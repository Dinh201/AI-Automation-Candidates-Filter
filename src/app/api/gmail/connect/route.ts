import { NextResponse } from "next/server";
import { buildGmailOAuthUrl } from "@/services/google-calendar-service";

export async function GET(request: Request) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_GMAIL_REDIRECT_URI) {
    return NextResponse.json(
      {
        error: "Google OAuth chưa được cấu hình. Kiểm tra GOOGLE_CLIENT_ID và GOOGLE_GMAIL_REDIRECT_URI trong .env.local",
        code: "GMAIL_NOT_CONNECTED",
      },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("return_to") ?? undefined;
  const url = buildGmailOAuthUrl(returnTo);
  return NextResponse.redirect(url);
}
import { NextResponse } from "next/server";
import { buildOAuthUrl } from "@/services/google-calendar-service";

export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    return NextResponse.json(
      { error: "Google OAuth chưa được cấu hình. Kiểm tra GOOGLE_CLIENT_ID và GOOGLE_REDIRECT_URI trong .env.local", code: "CALENDAR_NOT_CONNECTED" },
      { status: 500 }
    );
  }

  const url = buildOAuthUrl();
  return NextResponse.redirect(url);
}

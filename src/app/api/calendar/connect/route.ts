import { NextResponse } from "next/server";
import { buildOAuthUrl } from "@/services/google-calendar-service";

<<<<<<< HEAD
export async function GET(request: Request) {
=======
export async function GET() {
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    return NextResponse.json(
      { error: "Google OAuth chưa được cấu hình. Kiểm tra GOOGLE_CLIENT_ID và GOOGLE_REDIRECT_URI trong .env.local", code: "CALENDAR_NOT_CONNECTED" },
      { status: 500 }
    );
  }

<<<<<<< HEAD
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("return_to") ?? undefined;

  const url = buildOAuthUrl(returnTo);
  return NextResponse.redirect(url);
}
=======
  const url = buildOAuthUrl();
  return NextResponse.redirect(url);
}
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88

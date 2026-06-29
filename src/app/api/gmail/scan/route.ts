import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET chưa cấu hình trong .env.local", code: "CRON_SECRET_MISSING" },
      { status: 500 }
    );
  }

  const u = new URL(request.url);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? `${u.protocol}//${u.host}`;

  const res = await fetch(`${base}/api/email/process-incoming`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
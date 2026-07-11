import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendPushToAll } from "@/lib/push-service";

export async function GET(request: Request) {
  const secret = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + 28 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 33 * 60 * 1000);

  const { data: interviews } = await supabaseAdmin
    .from("interviews")
    .select("id, interviewer_name, start_time, candidates(name, jobs(title))")
    .eq("status", "Scheduled")
    .gt("start_time", windowStart.toISOString())
    .lt("start_time", windowEnd.toISOString());

  if (!interviews || interviews.length === 0) {
    return NextResponse.json({ reminders: 0 });
  }

  let sent = 0;
  for (const interview of interviews) {
    const candidateName =
      (interview.candidates as unknown as { name: string } | null)?.name ?? "Ứng viên";
    const jobTitle =
      (interview.candidates as unknown as { jobs: { title: string } | null } | null)?.jobs
        ?.title ?? "Vị trí tuyển dụng";
    const startTime = new Date(interview.start_time).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh",
    });

    await sendPushToAll(
      {
        title: "Nhắc nhở: Phỏng vấn sắp diễn ra",
        body: `${candidateName} – ${jobTitle} lúc ${startTime} (còn ~30 phút)`,
        url: "/interviews",
        requireInteraction: true,
        tag: `reminder-${interview.id}`,
      },
      "pushInterview"
    );
    sent++;
  }

  return NextResponse.json({ reminders: sent });
}
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  calendarSettingsFromRow,
  calendarSettingsToRow,
  validateCalendarSettings,
} from "@/lib/calendar-settings";

export async function GET() {
  const { data } = await supabaseAdmin
    .from("calendar_settings")
    .select("*")
    .eq("id", "default")
    .single();

  return NextResponse.json({ data: calendarSettingsFromRow(data) });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const result = validateCalendarSettings(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("calendar_settings")
    .upsert(
      { id: "default", ...calendarSettingsToRow(result.data), updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );

  if (error) {
    console.error("Lỗi lưu cấu hình lịch làm việc:", error);
    return NextResponse.json(
      { error: "Không thể lưu cấu hình. Kiểm tra bảng calendar_settings đã được tạo trong Supabase chưa.", code: "DATABASE_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: result.data });
}

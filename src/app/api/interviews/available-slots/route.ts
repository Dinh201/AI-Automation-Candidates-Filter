import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  checkFreeBusy,
  refreshAccessToken,
  GoogleTokens,
  BusyPeriod,
} from "@/services/google-calendar-service";
import { calendarSettingsFromRow, tzOffset } from "@/lib/calendar-settings";

const SLOT_STEP_MIN = 30;
const SCAN_DAYS = 14;
const MAX_SLOTS = 3;

async function getCalendarSettings() {
  const { data } = await supabaseAdmin
    .from("calendar_settings")
    .select("*")
    .eq("id", "default")
    .single();

  return calendarSettingsFromRow(data);
}

async function getValidTokens(): Promise<GoogleTokens | null> {
  const { data } = await supabaseAdmin
    .from("hr_calendar_tokens")
    .select("*")
    .eq("id", "default")
    .single();

  if (!data) return null;

  const tokens: GoogleTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? undefined,
    expiry: data.expiry,
  };

  const needsRefresh = !tokens.expiry || tokens.expiry - Date.now() < 60_000;
  if (needsRefresh && tokens.refresh_token) {
    try {
      const refreshed = await refreshAccessToken(tokens.refresh_token);
      await supabaseAdmin
        .from("hr_calendar_tokens")
        .update({
          access_token: refreshed.access_token,
          expiry: refreshed.expiry,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "default");
      return refreshed;
    } catch (err) {
      console.warn("[calendar] Refresh token thất bại, thử dùng access_token hiện tại:", err);
    }
  }

  return tokens;
}

// Returns "YYYY-MM-DD" in the configured timezone
function dateStrInTz(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone: timezone });
}

// Add N calendar days to a "YYYY-MM-DD" string
function addDays(dateStr: string, n: number, timezone: string, offset: string): string {
  const d = new Date(`${dateStr}T12:00:00${offset}`);
  d.setDate(d.getDate() + n);
  return dateStrInTz(d, timezone);
}

// Get day-of-week (0=Sun, 6=Sat) for a "YYYY-MM-DD" string in the configured timezone
function weekday(dateStr: string, offset: string): number {
  return new Date(`${dateStr}T12:00:00${offset}`).getDay();
}

// Build a Date from a local date + minutes-since-midnight, in the configured timezone
function makeSlot(dateStr: string, totalMinutes: number, offset: string): Date {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return new Date(`${dateStr}T${h}:${m}:00${offset}`);
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function overlapsAny(
  slotStart: Date,
  slotEnd: Date,
  busy: { start: string; end: string }[],
  bufferMs: number
): boolean {
  const s = slotStart.getTime();
  const e = slotEnd.getTime();
  return busy.some((p) => {
    const ps = new Date(p.start).getTime() - bufferMs;
    const pe = new Date(p.end).getTime() + bufferMs;
    return s < pe && e > ps;
  });
}

export async function POST(request: Request) {
  let body: { duration_minutes?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const duration = Number(body.duration_minutes ?? 45);
  if (isNaN(duration) || duration < 15 || duration > 120) {
    return NextResponse.json(
      { error: "duration_minutes phải từ 15 đến 120", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // Cấu hình "Lịch làm việc" từ Cài đặt → Workspace (ngày/giờ làm việc, nghỉ
  // trưa, múi giờ, buffer) — điều khiển trực tiếp việc gợi ý slot bên dưới.
  const settings = await getCalendarSettings();
  const offset = tzOffset(settings.timezone);
  const workDaySet = new Set(settings.workDays);
  const bufferMs = settings.bufferMinutes * 60_000;

  const workStartMin = timeToMinutes(settings.workStart);
  const workEndMin = timeToMinutes(settings.workEnd);
  const lunchStartMin = timeToMinutes(settings.lunchStart);
  const lunchEndMin = timeToMinutes(settings.lunchEnd);
  const hasLunchGap = lunchStartMin > workStartMin && lunchEndMin < workEndMin;
  const dayWindows = hasLunchGap
    ? [
        { start: workStartMin, end: lunchStartMin },
        { start: lunchEndMin, end: workEndMin },
      ]
    : [{ start: workStartMin, end: workEndMin }];

  // Scan window: tomorrow → +SCAN_DAYS
  const fromStr = addDays(dateStrInTz(new Date(), settings.timezone), 1, settings.timezone, offset);
  const toStr = addDays(fromStr, SCAN_DAYS, settings.timezone, offset);
  const scanStart = new Date(`${fromStr}T00:00:00${offset}`);
  const scanEnd = new Date(`${toStr}T23:59:59${offset}`);

  // 1. Fetch all non-cancelled interviews in the scan window from DB
  const { data: dbRows } = await supabaseAdmin
    .from("interviews")
    .select("start_time, end_time")
    .neq("status", "Cancelled")
    .lt("start_time", scanEnd.toISOString())
    .gt("end_time", scanStart.toISOString());

  const dbBusy: { start: string; end: string }[] = (dbRows ?? []).map((r) => ({
    start: r.start_time,
    end: r.end_time,
  }));

  // 2. Fetch Google Calendar busy periods (one call for the whole range)
  let calBusy: BusyPeriod[] = [];
  const tokens = await getValidTokens();
  if (tokens) {
    try {
      calBusy = await checkFreeBusy(tokens, scanStart, scanEnd);
    } catch {
      // Non-fatal — proceed with only DB data
    }
  }

  const allBusy: { start: string; end: string }[] = [
    ...dbBusy,
    ...calBusy.map((p) => ({ start: p.start, end: p.end })),
  ];

  // 3. Find available slots — chỉ trong ngày/giờ làm việc đã cấu hình, trừ giờ
  // nghỉ trưa, và né các khoảng bận theo buffer đã cấu hình.
  const available: { start_time: string; end_time: string }[] = [];

  for (let dayOffset = 0; dayOffset < SCAN_DAYS && available.length < MAX_SLOTS; dayOffset++) {
    const dateStr = addDays(fromStr, dayOffset, settings.timezone, offset);
    if (!workDaySet.has(weekday(dateStr, offset))) continue;

    for (const window of dayWindows) {
      const windowMaxStart = window.end - duration;
      if (windowMaxStart < window.start) continue; // duration too long for this window

      for (
        let startMin = window.start;
        startMin <= windowMaxStart && available.length < MAX_SLOTS;
        startMin += SLOT_STEP_MIN
      ) {
        const slotStart = makeSlot(dateStr, startMin, offset);
        const slotEnd = makeSlot(dateStr, startMin + duration, offset);

        if (overlapsAny(slotStart, slotEnd, allBusy, bufferMs)) continue;

        available.push({
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
        });
      }
    }
  }

  return NextResponse.json({
    slots: available,
    calendar_connected: !!tokens,
    duration_minutes: duration,
  });
}

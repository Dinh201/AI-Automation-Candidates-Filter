import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  checkFreeBusy,
  refreshAccessToken,
  GoogleTokens,
  BusyPeriod,
} from "@/services/google-calendar-service";

const TZ = "Asia/Ho_Chi_Minh";
const WORK_START_H = 9;
const WORK_END_H = 18;
const LUNCH_START_MIN = 12 * 60;       // 12:00
const LUNCH_END_MIN = 13 * 60 + 30;    // 13:30
const SLOT_STEP_MIN = 30;
const SCAN_DAYS = 14;
const MAX_SLOTS = 3;

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

// Returns "YYYY-MM-DD" in VN timezone
function vnDateStr(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: TZ });
}

// Add N calendar days to a "YYYY-MM-DD" string
function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00+07:00`);
  d.setDate(d.getDate() + n);
  return vnDateStr(d);
}

// Get day-of-week (0=Sun, 6=Sat) for a "YYYY-MM-DD" string in VN timezone
function weekday(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00+07:00`).getDay();
}

// Build a UTC Date from a VN local date + minutes-since-midnight
function makeSlot(dateStr: string, totalMinutes: number): Date {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return new Date(`${dateStr}T${h}:${m}:00+07:00`);
}

function overlapsLunch(startMin: number, endMin: number): boolean {
  return startMin < LUNCH_END_MIN && endMin > LUNCH_START_MIN;
}

function overlapsAny(
  slotStart: Date,
  slotEnd: Date,
  busy: { start: string; end: string }[]
): boolean {
  const s = slotStart.getTime();
  const e = slotEnd.getTime();
  return busy.some((p) => {
    const ps = new Date(p.start).getTime();
    const pe = new Date(p.end).getTime();
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

  // Scan window: tomorrow → +SCAN_DAYS
  const fromStr = addDays(vnDateStr(new Date()), 1);
  const toStr = addDays(fromStr, SCAN_DAYS);
  const scanStart = new Date(`${fromStr}T00:00:00+07:00`);
  const scanEnd = new Date(`${toStr}T23:59:59+07:00`);

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

  // 3. Find available slots, iterate day-by-day
  const available: { start_time: string; end_time: string }[] = [];
  const maxStartMin = WORK_END_H * 60 - duration;

  for (let dayOffset = 0; dayOffset < SCAN_DAYS && available.length < MAX_SLOTS; dayOffset++) {
    const dateStr = addDays(fromStr, dayOffset);
    if (weekday(dateStr) === 0 || weekday(dateStr) === 6) continue; // skip weekend

    for (
      let startMin = WORK_START_H * 60;
      startMin <= maxStartMin && available.length < MAX_SLOTS;
      startMin += SLOT_STEP_MIN
    ) {
      const endMin = startMin + duration;

      if (overlapsLunch(startMin, endMin)) continue;

      const slotStart = makeSlot(dateStr, startMin);
      const slotEnd = makeSlot(dateStr, endMin);

      if (overlapsAny(slotStart, slotEnd, allBusy)) continue;

      available.push({
        start_time: slotStart.toISOString(),
        end_time: slotEnd.toISOString(),
      });
    }
  }

  return NextResponse.json({
    slots: available,
    calendar_connected: !!tokens,
    duration_minutes: duration,
  });
}
export type CalendarSettings = {
  workDays: number[]; // 0=CN, 1=T2 ... 6=T7
  workStart: string; // "HH:MM"
  workEnd: string;
  lunchStart: string;
  lunchEnd: string;
  timezone: string;
  bufferMinutes: number;
};

export const CALENDAR_SETTINGS_DEFAULTS: CalendarSettings = {
  workDays: [1, 2, 3, 4, 5],
  workStart: "08:00",
  workEnd: "17:30",
  lunchStart: "12:00",
  lunchEnd: "13:30",
  timezone: "Asia/Ho_Chi_Minh",
  bufferMinutes: 15,
};

export const CALENDAR_TIMEZONES = ["Asia/Ho_Chi_Minh", "Asia/Bangkok", "Asia/Singapore"] as const;

// Cả 3 timezone hỗ trợ đều không có DST nên dùng offset cố định là đủ chính xác.
const TZ_OFFSETS: Record<string, string> = {
  "Asia/Ho_Chi_Minh": "+07:00",
  "Asia/Bangkok": "+07:00",
  "Asia/Singapore": "+08:00",
};

export function tzOffset(timezone: string): string {
  return TZ_OFFSETS[timezone] ?? TZ_OFFSETS[CALENDAR_SETTINGS_DEFAULTS.timezone];
}

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

type CalendarSettingsRow = {
  work_days?: number[] | null;
  work_start?: string | null;
  work_end?: string | null;
  lunch_start?: string | null;
  lunch_end?: string | null;
  timezone?: string | null;
  buffer_minutes?: number | null;
};

export function calendarSettingsFromRow(row: CalendarSettingsRow | null | undefined): CalendarSettings {
  if (!row) return CALENDAR_SETTINGS_DEFAULTS;
  return {
    workDays: row.work_days?.length ? row.work_days : CALENDAR_SETTINGS_DEFAULTS.workDays,
    workStart: row.work_start ?? CALENDAR_SETTINGS_DEFAULTS.workStart,
    workEnd: row.work_end ?? CALENDAR_SETTINGS_DEFAULTS.workEnd,
    lunchStart: row.lunch_start ?? CALENDAR_SETTINGS_DEFAULTS.lunchStart,
    lunchEnd: row.lunch_end ?? CALENDAR_SETTINGS_DEFAULTS.lunchEnd,
    timezone: row.timezone ?? CALENDAR_SETTINGS_DEFAULTS.timezone,
    bufferMinutes: row.buffer_minutes ?? CALENDAR_SETTINGS_DEFAULTS.bufferMinutes,
  };
}

export function calendarSettingsToRow(s: CalendarSettings) {
  return {
    work_days: s.workDays,
    work_start: s.workStart,
    work_end: s.workEnd,
    lunch_start: s.lunchStart,
    lunch_end: s.lunchEnd,
    timezone: s.timezone,
    buffer_minutes: s.bufferMinutes,
  };
}

export function validateCalendarSettings(input: unknown): { data: CalendarSettings } | { error: string } {
  if (!input || typeof input !== "object") return { error: "Dữ liệu không hợp lệ" };
  const b = input as Record<string, unknown>;

  const workDays = Array.isArray(b.workDays)
    ? Array.from(new Set(b.workDays.filter((d): d is number => typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6)))
    : null;
  if (!workDays || workDays.length === 0) {
    return { error: "Vui lòng chọn ít nhất 1 ngày làm việc" };
  }

  const { workStart, workEnd, lunchStart, lunchEnd } = b as Record<string, unknown>;
  if (
    typeof workStart !== "string" || !HHMM_RE.test(workStart) ||
    typeof workEnd !== "string" || !HHMM_RE.test(workEnd) ||
    typeof lunchStart !== "string" || !HHMM_RE.test(lunchStart) ||
    typeof lunchEnd !== "string" || !HHMM_RE.test(lunchEnd)
  ) {
    return { error: "Giờ làm việc / giờ nghỉ trưa không hợp lệ (định dạng HH:MM)" };
  }

  const toMin = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
  };
  const wStartMin = toMin(workStart), wEndMin = toMin(workEnd);
  const lStartMin = toMin(lunchStart), lEndMin = toMin(lunchEnd);

  if (wStartMin >= wEndMin) return { error: "Giờ bắt đầu làm việc phải trước giờ kết thúc" };
  if (lStartMin >= lEndMin) return { error: "Giờ bắt đầu nghỉ trưa phải trước giờ kết thúc" };
  if (lStartMin < wStartMin || lEndMin > wEndMin) return { error: "Giờ nghỉ trưa phải nằm trong giờ làm việc" };

  const timezone = typeof b.timezone === "string" && (CALENDAR_TIMEZONES as readonly string[]).includes(b.timezone)
    ? b.timezone
    : null;
  if (!timezone) return { error: "Múi giờ không hợp lệ" };

  const bufferMinutes = Number(b.bufferMinutes);
  if (!Number.isFinite(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 30) {
    return { error: "Buffer giữa các slot phải từ 0 đến 30 phút" };
  }

  return {
    data: { workDays, workStart, workEnd, lunchStart, lunchEnd, timezone, bufferMinutes },
  };
}

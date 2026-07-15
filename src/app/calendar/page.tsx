"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, User, ExternalLink } from "lucide-react";
import { useTranslation } from "@/lib/i18n-context";

type Interview = {
  id: string;
  candidate_id: string;
  start_time: string;
  end_time: string;
  status: string;
  interviewer_name: string;
  meet_link: string | null;
  candidates: { name: string; jobs: { title: string } | null } | null;
};

const STATUS_COLOR: Record<string, string> = {
  Scheduled:   "bg-blue-500/20 border-blue-500/40 text-blue-300",
  Completed:   "bg-green-500/20 border-green-500/40 text-green-300",
  Cancelled:   "bg-red-500/20 border-red-500/40 text-red-300",
  Rescheduled: "bg-amber-500/20 border-amber-500/40 text-amber-300",
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function buildCalendarDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const startDow = first.getDay();
  const days: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

export default function CalendarPage() {
  const { t, lang } = useTranslation();
  const locale = lang === "en" ? "en-US" : "vi-VN";

  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Date | null>(null);

  // Generate locale-aware short weekday names starting from Sunday
  const DOW = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2023, 0, i + 1); // Jan 1 2023 is Sunday
    return d.toLocaleDateString(locale, { weekday: "short" });
  });

  const statusLabels: Record<string, string> = {
    Scheduled:   t("interviews.status.scheduled"),
    Completed:   t("interviews.status.completed"),
    Cancelled:   t("interviews.status.cancelled"),
    Rescheduled: t("interviews.status.rescheduled"),
  };

  useEffect(() => {
    fetch("/api/interviews")
      .then((r) => r.json())
      .then(({ data }) => setInterviews(data ?? []))
      .finally(() => setLoading(false));
  }, []);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(null);
  }

  const days = buildCalendarDays(year, month);

  function interviewsOnDay(d: Date) {
    return interviews.filter(iv => isSameDay(new Date(iv.start_time), d));
  }

  const selectedDayInterviews = selected ? interviewsOnDay(selected) : [];
  const upcomingCount = interviews.filter(iv => iv.status === "Scheduled" && new Date(iv.start_time) >= today).length;

  const monthLabel = new Date(year, month, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{t("calendar.title")}</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {loading ? t("common.loading") : `${upcomingCount} ${t("calendar.upcomingSuffix")}`}
          </p>
        </div>
        <Link
          href="/interviews"
          className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition-colors"
        >
          {t("calendar.viewList")}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 glass-card overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-semibold text-white capitalize">{monthLabel}</h2>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-white/[0.06]">
            {DOW.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="min-h-[72px] border-b border-r border-white/[0.04]" />;
              }
              const ivs = interviewsOnDay(day);
              const isToday = isSameDay(day, today);
              const isSelected = selected ? isSameDay(day, selected) : false;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelected(isSelected ? null : day)}
                  className={`min-h-[72px] p-1.5 border-b border-r border-white/[0.04] text-left align-top transition-colors
                    ${isSelected ? "bg-indigo-500/10" : "hover:bg-white/[0.02]"}`}
                >
                  <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-semibold mb-1
                    ${isToday ? "bg-indigo-600 text-white" : isSelected ? "text-indigo-300" : "text-zinc-400"}`}>
                    {day.getDate()}
                  </span>
                  <div className="space-y-0.5">
                    {ivs.slice(0, 2).map(iv => (
                      <div
                        key={iv.id}
                        className={`text-[10px] leading-tight px-1 py-0.5 rounded border truncate ${STATUS_COLOR[iv.status] ?? STATUS_COLOR.Scheduled}`}
                      >
                        {new Date(iv.start_time).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                        {" "}{iv.candidates?.name ?? "—"}
                      </div>
                    ))}
                    {ivs.length > 2 && (
                      <div className="text-[10px] text-zinc-500 px-1">+{ivs.length - 2} {t("calendar.more")}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Legend */}
          <div className="glass-card p-4 space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">{t("calendar.legend")}</p>
            {(["Scheduled", "Completed", "Cancelled", "Rescheduled"] as const).map((status) => (
              <div key={status} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded border ${STATUS_COLOR[status]}`} />
                <span className="text-xs text-zinc-400">{statusLabels[status]}</span>
              </div>
            ))}
          </div>

          {/* Selected day detail */}
          {selected ? (
            <div className="glass-card overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-sm font-semibold text-white capitalize">
                  {selected.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {selectedDayInterviews.length === 0
                    ? t("calendar.noSchedule")
                    : `${selectedDayInterviews.length} ${t("interviews.interviewCount")}`}
                </p>
              </div>

              {selectedDayInterviews.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-zinc-600">{t("calendar.emptyDay")}</p>
                </div>
              ) : (
                <ul className="divide-y divide-white/[0.04]">
                  {selectedDayInterviews.map(iv => {
                    const start = new Date(iv.start_time);
                    const end   = new Date(iv.end_time);
                    return (
                      <li key={iv.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-white">{iv.candidates?.name ?? "—"}</p>
                            <p className="text-xs text-zinc-500">{iv.candidates?.jobs?.title ?? "—"}</p>
                          </div>
                          <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded border ${STATUS_COLOR[iv.status] ?? STATUS_COLOR.Scheduled}`}>
                            {statusLabels[iv.status] ?? iv.status}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })} –{" "}
                            {end.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3" />
                            {iv.interviewer_name}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Link
                            href={`/candidates/${iv.candidate_id}`}
                            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> {t("interviews.candidateProfile")}
                          </Link>
                          {iv.meet_link && (
                            <a
                              href={iv.meet_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" /> Meet
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <div className="glass-card p-6 text-center">
              <p className="text-sm text-zinc-500">{t("calendar.selectDay")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, User, ExternalLink } from "lucide-react";

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

const DOW = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function buildCalendarDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const startDow = first.getDay(); // 0=Sun
  const days: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Date | null>(null);

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Lịch phỏng vấn</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {loading ? "Đang tải..." : `${interviews.filter(iv => iv.status === "Scheduled").length} buổi sắp tới`}
          </p>
        </div>
        <Link
          href="/interviews"
          className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition-colors"
        >
          Xem danh sách →
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
            <h2 className="text-sm font-semibold text-white">
              Tháng {month + 1} / {year}
            </h2>
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
                        {new Date(iv.start_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        {" "}{iv.candidates?.name ?? "—"}
                      </div>
                    ))}
                    {ivs.length > 2 && (
                      <div className="text-[10px] text-zinc-500 px-1">+{ivs.length - 2} nữa</div>
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
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Chú thích</p>
            {[
              ["Scheduled",   "Đã lên lịch"],
              ["Completed",   "Đã hoàn thành"],
              ["Cancelled",   "Đã hủy"],
              ["Rescheduled", "Đổi lịch"],
            ].map(([status, label]) => (
              <div key={status} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded border ${STATUS_COLOR[status]}`} />
                <span className="text-xs text-zinc-400">{label}</span>
              </div>
            ))}
          </div>

          {/* Selected day detail */}
          {selected ? (
            <div className="glass-card overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-sm font-semibold text-white">
                  {selected.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {selectedDayInterviews.length === 0 ? "Không có lịch" : `${selectedDayInterviews.length} buổi phỏng vấn`}
                </p>
              </div>

              {selectedDayInterviews.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-zinc-600">Ngày trống</p>
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
                            {iv.status === "Scheduled" ? "Đã lên lịch"
                              : iv.status === "Completed" ? "Hoàn thành"
                              : iv.status === "Cancelled" ? "Đã hủy"
                              : "Đổi lịch"}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} –{" "}
                            {end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
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
                            <ExternalLink className="w-3 h-3" /> Hồ sơ
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
              <p className="text-sm text-zinc-500">Chọn một ngày để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
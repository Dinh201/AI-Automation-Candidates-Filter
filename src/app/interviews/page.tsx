"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, User, ExternalLink, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type Interview = {
  id: string;
  candidate_id: string;
  start_time: string;
  end_time: string;
  status: string;
  interviewer_name: string;
  interviewer_email: string;
  meet_link: string | null;
  google_event_id: string | null;
  notes: string | null;
  candidates: {
    name: string;
    email: string;
    jobs: { title: string } | null;
  } | null;
};

function statusConfig(status: string) {
  switch (status) {
    case "Scheduled":    return { label: "Đã lên lịch", className: "bg-blue-500/15 text-blue-400", icon: <Clock className="w-3 h-3" /> };
    case "Completed":    return { label: "Đã hoàn thành", className: "bg-green-500/15 text-green-400", icon: <CheckCircle2 className="w-3 h-3" /> };
    case "Cancelled":    return { label: "Đã hủy", className: "bg-red-500/15 text-red-400", icon: <XCircle className="w-3 h-3" /> };
    case "Rescheduled":  return { label: "Đổi lịch", className: "bg-amber-500/15 text-amber-400", icon: <AlertCircle className="w-3 h-3" /> };
    default:             return { label: status, className: "bg-zinc-700/40 text-zinc-400", icon: null };
  }
}

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarStatus, setCalendarStatus] = useState<"connected" | "disconnected" | "unknown">("unknown");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar_connected") === "1") {
      setCalendarStatus("connected");
      window.history.replaceState({}, "", "/interviews");
    } else if (params.get("calendar_error")) {
      setCalendarStatus("disconnected");
    }

    fetch("/api/interviews")
      .then((r) => r.json())
      .then(({ data }) => setInterviews(data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = interviews.filter(
    (i) => i.status === "Scheduled" && new Date(i.start_time) >= new Date()
  );
  const past = interviews.filter(
    (i) => i.status !== "Scheduled" || new Date(i.start_time) < new Date()
  );

  function InterviewCard({ iv }: { iv: Interview }) {
    const statusCfg = statusConfig(iv.status);
    const start = new Date(iv.start_time);
    const end = new Date(iv.end_time);

    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-white">{iv.candidates?.name ?? "—"}</p>
            <p className="text-xs text-zinc-400">{iv.candidates?.jobs?.title ?? "—"}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusCfg.className}`}>
            {statusCfg.icon}
            {statusCfg.label}
          </span>
        </div>

        <div className="space-y-1.5 text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            {start.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} –{" "}
            {end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 shrink-0" />
            {iv.interviewer_name} ({iv.interviewer_email})
          </div>
        </div>

        {iv.notes && (
          <p className="text-xs text-zinc-500 border-t border-zinc-800 pt-3 line-clamp-2">{iv.notes}</p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Link
            href={`/candidates/${iv.candidate_id}`}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> Hồ sơ ứng viên
          </Link>
          <Link
            href={`/interview-brief/${iv.id}`}
            target="_blank"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> Interview Kit
          </Link>
          {iv.meet_link && (
            <a
              href={iv.meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Meet
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Lịch phỏng vấn</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {loading ? "Đang tải..." : `${interviews.length} buổi phỏng vấn`}
          </p>
        </div>
        <a
          href="/api/calendar/connect"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm font-medium text-zinc-200 transition-colors"
        >
          <Calendar className="w-4 h-4 text-indigo-400" />
          {calendarStatus === "connected" ? "✓ Google Calendar đã kết nối" : "Kết nối Google Calendar"}
        </a>
      </div>

      {calendarStatus === "connected" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Google Calendar đã kết nối thành công!
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-zinc-500 mt-3">Đang tải lịch phỏng vấn...</p>
        </div>
      ) : interviews.length === 0 ? (
        <div className="py-24 text-center bg-zinc-900 border border-zinc-800 rounded-xl">
          <Calendar className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-400">Chưa có lịch phỏng vấn nào</p>
          <p className="text-xs text-zinc-600 mt-1">Lên lịch từ trang chi tiết ứng viên</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Sắp diễn ra ({upcoming.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {upcoming.map((iv) => <InterviewCard key={iv.id} iv={iv} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Đã qua ({past.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-70">
                {past.map((iv) => <InterviewCard key={iv.id} iv={iv} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

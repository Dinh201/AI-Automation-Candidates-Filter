"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, User, ExternalLink, CheckCircle2, XCircle, AlertCircle, UserCheck, UserX, X } from "lucide-react";

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
    status: string | null;
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
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const justConnected = params.get("calendar_connected") === "1";
    const hasError = !!params.get("calendar_error");

    if (justConnected || hasError) {
      window.history.replaceState({}, "", "/interviews");
    }

    if (justConnected) {
      setCalendarStatus("connected");
      setShowSuccessBanner(true);
    } else if (hasError) {
      setCalendarStatus("disconnected");
    } else {
      fetch("/api/calendar/status")
        .then((r) => r.json())
        .then(({ connected }) => setCalendarStatus(connected ? "connected" : "disconnected"))
        .catch(() => setCalendarStatus("disconnected"));
    }

    fetch("/api/interviews")
      .then((r) => r.json())
      .then(({ data }) => setInterviews(data ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!showSuccessBanner) return;
    const timer = setTimeout(() => setShowSuccessBanner(false), 3000);
    return () => clearTimeout(timer);
  }, [showSuccessBanner]);

  const upcoming = interviews.filter(
    (i) => i.status === "Scheduled" && new Date(i.start_time) >= new Date()
  );
  const past = interviews.filter(
    (i) => i.status !== "Scheduled" || new Date(i.start_time) < new Date()
  );

  async function recordOutcome(interviewId: string, outcome: "Hired" | "Rejected") {
    setSubmitting(interviewId + outcome);
    try {
      await fetch(`/api/interviews/${interviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed", outcome }),
      });
      setInterviews((prev) =>
        prev.map((i) =>
          i.id === interviewId
            ? { ...i, status: "Completed", candidates: i.candidates ? { ...i.candidates, status: outcome } : null }
            : i
        )
      );
    } finally {
      setSubmitting(null);
    }
  }

  async function cancelInterview(interviewId: string) {
    if (!confirm("Bạn có chắc muốn hủy buổi phỏng vấn này? Sự kiện trên Google Calendar cũng sẽ bị xóa.")) return;
    setSubmitting(interviewId + "Cancel");
    try {
      await fetch(`/api/interviews/${interviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Cancelled" }),
      });
      setInterviews((prev) =>
        prev.map((i) => (i.id === interviewId ? { ...i, status: "Cancelled" } : i))
      );
    } finally {
      setSubmitting(null);
    }
  }

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
          <div className="flex flex-col items-end gap-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusCfg.className}`}>
              {statusCfg.icon}
              {statusCfg.label}
            </span>
            {iv.status === "Completed" && iv.candidates?.status === "Hired" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <UserCheck className="w-3 h-3" /> Đã tuyển
              </span>
            )}
            {iv.status === "Completed" && iv.candidates?.status === "Rejected" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
                <UserX className="w-3 h-3" /> Từ chối
              </span>
            )}
          </div>
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

        <div className="flex items-center gap-3 pt-1 flex-wrap">
          <Link
            href={`/candidates/${iv.candidate_id}`}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> Hồ sơ ứng viên
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

        {/* Hủy lịch — chỉ hiện cho interview sắp tới chưa qua */}
        {iv.status === "Scheduled" && new Date(iv.start_time) >= new Date() && (
          <div className="border-t border-zinc-800 pt-3">
            <button
              onClick={() => cancelInterview(iv.id)}
              disabled={submitting === iv.id + "Cancel"}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              {submitting === iv.id + "Cancel" ? "Đang hủy..." : "Hủy lịch phỏng vấn"}
            </button>
          </div>
        )}

        {/* Outcome buttons — chỉ hiện cho interview đã qua và chưa ghi kết quả */}
        {iv.status === "Scheduled" && new Date(iv.start_time) < new Date() && (
          <div className="border-t border-zinc-800 pt-3 space-y-2">
            <p className="text-xs text-zinc-500">Ghi kết quả phỏng vấn:</p>
            <div className="flex gap-2">
              <button
                onClick={() => recordOutcome(iv.id, "Hired")}
                disabled={submitting === iv.id + "Hired"}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
              >
                <UserCheck className="w-3.5 h-3.5" />
                {submitting === iv.id + "Hired" ? "Đang lưu..." : "Đã tuyển"}
              </button>
              <button
                onClick={() => recordOutcome(iv.id, "Rejected")}
                disabled={submitting === iv.id + "Rejected"}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-medium hover:bg-red-500/25 transition-colors disabled:opacity-50"
              >
                <UserX className="w-3.5 h-3.5" />
                {submitting === iv.id + "Rejected" ? "Đang lưu..." : "Từ chối"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Lịch phỏng vấn</h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          {loading ? "Đang tải..." : `${interviews.length} buổi phỏng vấn`}
        </p>
      </div>

      {/* Chưa kết nối → CTA nổi bật */}
      {calendarStatus === "disconnected" && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-indigo-300">Kết nối Google Calendar</p>
              <p className="text-xs text-indigo-400/70 mt-0.5">
                Kết nối để tự động tạo lịch phỏng vấn và kiểm tra xung đột thời gian.
              </p>
            </div>
          </div>
          <a
            href="/api/calendar/connect"
            className="shrink-0 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            Kết nối ngay
          </a>
        </div>
      )}

      {/* Vừa kết nối xong → success toast tự mất sau 3s */}
      {showSuccessBanner && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Google Calendar đã kết nối thành công!
          </div>
          <button onClick={() => setShowSuccessBanner(false)} className="text-green-500/60 hover:text-green-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
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

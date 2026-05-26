"use client";

import { useState } from "react";
import { Calendar, Clock, User, Mail, FileText, Loader2, CheckCircle2, ExternalLink, AlertCircle, X } from "lucide-react";

interface Props {
  candidateId: string;
  candidateName: string;
  jobTitle: string | null;
  jobId: string | null;
  calendarConnected: boolean;
}

type Result = {
  meet_link?: string;
  interview_brief_url?: string;
  email_sent?: boolean;
  calendar_connected?: boolean;
};

export function ScheduleInterviewModal({ candidateId, candidateName, jobTitle, jobId, calendarConnected }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    interviewer_name: "",
    interviewer_email: "",
    date: "",
    time: "",
    duration: "45",
    notes: "",
  });

  function onChange(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date || !form.time) return;

    setSubmitting(true);
    setError("");

    const startTime = new Date(`${form.date}T${form.time}:00+07:00`).toISOString();

    try {
      const res = await fetch("/api/interviews/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidateId,
          job_id: jobId,
          interviewer_name: form.interviewer_name,
          interviewer_email: form.interviewer_email,
          start_time: startTime,
          duration_minutes: Number(form.duration),
          notes: form.notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi không xác định");

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  }

  function closeReset() {
    setOpen(false);
    setResult(null);
    setError("");
    setForm({ interviewer_name: "", interviewer_email: "", date: "", time: "", duration: "45", notes: "" });
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
      >
        Lên lịch phỏng vấn
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70" onClick={closeReset} />

          {/* Modal */}
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-semibold text-white">Lên lịch phỏng vấn</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {candidateName} · {jobTitle ?? "—"}
                </p>
              </div>
              <button onClick={closeReset} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {result ? (
              /* Success state */
              <div className="px-6 py-8 space-y-5 text-center">
                <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Đã đặt lịch thành công!</h3>
                  <p className="text-sm text-zinc-400 mt-1">Trạng thái ứng viên đã cập nhật sang "Phỏng vấn".</p>
                </div>

                <div className="space-y-2 text-left">
                  {result.calendar_connected && (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Sự kiện đã tạo trên Google Calendar
                    </div>
                  )}
                  {result.email_sent && (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Email mời đã gửi cho ứng viên & interviewer
                    </div>
                  )}
                  {result.meet_link && (
                    <a
                      href={result.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 shrink-0" />
                      Google Meet link
                    </a>
                  )}
                  {result.interview_brief_url && (
                    <a
                      href={result.interview_brief_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      Xem Interview Kit (gửi cho interviewer)
                    </a>
                  )}
                </div>

                <button
                  onClick={closeReset}
                  className="w-full py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                {!calendarConnected && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      Google Calendar chưa kết nối — lịch sẽ không được tạo tự động.{" "}
                      <a href="/api/calendar/connect" className="underline hover:text-amber-200">
                        Kết nối ngay
                      </a>
                    </div>
                  </div>
                )}

                {/* Interviewer */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                      <User className="w-3 h-3" /> Tên interviewer *
                    </label>
                    <input
                      required
                      value={form.interviewer_name}
                      onChange={(e) => onChange("interviewer_name", e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                      <Mail className="w-3 h-3" /> Email interviewer *
                    </label>
                    <input
                      required
                      type="email"
                      value={form.interviewer_email}
                      onChange={(e) => onChange("interviewer_email", e.target.value)}
                      placeholder="hr@company.com"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Date + Time + Duration */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Ngày *
                    </label>
                    <input
                      required
                      type="date"
                      min={today}
                      value={form.date}
                      onChange={(e) => onChange("date", e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Giờ *
                    </label>
                    <input
                      required
                      type="time"
                      value={form.time}
                      onChange={(e) => onChange("time", e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Thời lượng</label>
                  <div className="flex gap-2">
                    {["30", "45", "60"].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onChange("duration", d)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          form.duration === d
                            ? "bg-indigo-600/20 border-indigo-600/50 text-indigo-300"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {d} phút
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Ghi chú cho interviewer (tùy chọn)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => onChange("notes", e.target.value)}
                    placeholder="Ví dụ: Tập trung vào kinh nghiệm React, hỏi về dự án X..."
                    rows={3}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={closeReset}
                    className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</>
                    ) : (
                      "Xác nhận lịch phỏng vấn"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
<<<<<<< HEAD
import {
  Calendar,
  Clock,
  User,
  Mail,
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  X,
  ChevronLeft,
} from "lucide-react";
=======
import { Calendar, Clock, User, Mail, FileText, Loader2, CheckCircle2, ExternalLink, AlertCircle, X } from "lucide-react";
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88

interface Props {
  candidateId: string;
  candidateName: string;
  jobTitle: string | null;
  jobId: string | null;
  calendarConnected: boolean;
<<<<<<< HEAD
  returnPath?: string;
}

type Slot = { start_time: string; end_time: string };

type ScheduleResult = {
  meet_link?: string;
  email_sent?: boolean;
  calendar_connected?: boolean;
  calendar_error?: string;
};

type Step = "form" | "slots" | "success";

export function ScheduleInterviewModal({
  candidateId,
  candidateName,
  jobTitle,
  jobId,
  calendarConnected,
  returnPath,
}: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("form");
=======
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
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88

  const [form, setForm] = useState({
    interviewer_name: "",
    interviewer_email: "",
<<<<<<< HEAD
=======
    date: "",
    time: "",
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
    duration: "45",
    notes: "",
  });

<<<<<<< HEAD
  const [findingSlots, setFindingSlots] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [scheduling, setScheduling] = useState(false);

  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState("");
  const [slotsError, setSlotsError] = useState("");

=======
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
  function onChange(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

<<<<<<< HEAD
  async function handleFindSlots(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setFindingSlots(true);
    setSlotsError("");

    try {
      const res = await fetch("/api/interviews/available-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration_minutes: Number(form.duration) }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSlotsError(data.error ?? "Không thể tìm khung giờ. Vui lòng thử lại.");
        return;
      }

      if (!data.slots || data.slots.length === 0) {
        setSlotsError(
          "Không tìm được khung giờ trống trong 14 ngày tới. Vui lòng thử lại sau."
        );
        return;
      }

      setSlots(data.slots);
      setSelectedSlot(data.slots[0]);
      setStep("slots");
    } catch (err) {
      setSlotsError(err instanceof Error ? err.message : "Có lỗi xảy ra khi tìm khung giờ");
    } finally {
      setFindingSlots(false);
    }
  }

  async function handleSchedule() {
    if (!selectedSlot) return;

    setScheduling(true);
    setError("");
    setConflict("");
=======
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date || !form.time) return;

    setSubmitting(true);
    setError("");

    const startTime = new Date(`${form.date}T${form.time}:00+07:00`).toISOString();
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88

    try {
      const res = await fetch("/api/interviews/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidateId,
          job_id: jobId,
          interviewer_name: form.interviewer_name,
          interviewer_email: form.interviewer_email,
<<<<<<< HEAD
          start_time: selectedSlot.start_time,
=======
          start_time: startTime,
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
          duration_minutes: Number(form.duration),
          notes: form.notes || undefined,
        }),
      });

      const data = await res.json();
<<<<<<< HEAD

      if (!res.ok) {
        if (data.code === "SLOT_NOT_AVAILABLE") {
          // Race condition: slot was just taken — remove it and show warning
          setSlots((prev) => prev.filter((s) => s.start_time !== selectedSlot.start_time));
          setSelectedSlot(null);
          setConflict(
            data.error ?? "Khung giờ vừa bị đặt bởi người khác. Vui lòng chọn khung giờ khác."
          );
        } else {
          setError(data.error ?? "Lỗi không xác định");
        }
        return;
      }

      setResult(data);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setScheduling(false);
=======
      if (!res.ok) throw new Error(data.error ?? "Lỗi không xác định");

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
    }
  }

  function closeReset() {
    setOpen(false);
<<<<<<< HEAD
    setStep("form");
    setSlots([]);
    setSelectedSlot(null);
    setResult(null);
    setError("");
    setConflict("");
    setSlotsError("");
    setForm({ interviewer_name: "", interviewer_email: "", duration: "45", notes: "" });
  }

  function formatSlot(slot: Slot) {
    const start = new Date(slot.start_time);
    const end = new Date(slot.end_time);
    const tz = "Asia/Ho_Chi_Minh";

    const dayName = start.toLocaleDateString("vi-VN", { weekday: "long", timeZone: tz });
    const date = start.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: tz,
    });
    const startTime = start.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    });
    const endTime = end.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    });

    return { dayName, date, time: `${startTime} – ${endTime}` };
  }

  const calendarHref = `/api/calendar/connect${
    returnPath ? `?return_to=${encodeURIComponent(returnPath)}` : ""
  }`;
=======
    setResult(null);
    setError("");
    setForm({ interviewer_name: "", interviewer_email: "", date: "", time: "", duration: "45", notes: "" });
  }

  const today = new Date().toISOString().split("T")[0];
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88

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
<<<<<<< HEAD
          <div className="absolute inset-0 bg-black/70" onClick={closeReset} />

          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                {step === "slots" && (
                  <button
                    onClick={() => { setStep("form"); setConflict(""); setError(""); }}
                    className="text-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <div>
                  <h2 className="text-base font-semibold text-white">
                    {step === "form" && "Lên lịch phỏng vấn"}
                    {step === "slots" && "Chọn khung giờ phỏng vấn"}
                    {step === "success" && "Đặt lịch thành công"}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {candidateName} · {jobTitle ?? "—"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeReset}
                className="text-zinc-500 hover:text-zinc-200 transition-colors"
              >
=======
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
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
                <X className="w-5 h-5" />
              </button>
            </div>

<<<<<<< HEAD
            {/* ── Step 1: Form ── */}
            {step === "form" && (
              <form onSubmit={handleFindSlots} className="px-6 py-5 space-y-4">
=======
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
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
                {!calendarConnected && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
<<<<<<< HEAD
                      Google Calendar chưa kết nối — khung giờ gợi ý chỉ dựa trên lịch nội bộ.{" "}
                      <a href={calendarHref} className="underline hover:text-amber-200 font-medium">
                        Kết nối ngay →
=======
                      Google Calendar chưa kết nối — lịch sẽ không được tạo tự động.{" "}
                      <a href="/api/calendar/connect" className="underline hover:text-amber-200">
                        Kết nối ngay
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
                      </a>
                    </div>
                  </div>
                )}

<<<<<<< HEAD
=======
                {/* Interviewer */}
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
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

<<<<<<< HEAD
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Thời lượng phỏng vấn
                  </label>
=======
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
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
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

<<<<<<< HEAD
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">
                    Ghi chú cho interviewer (tùy chọn)
                  </label>
=======
                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Ghi chú cho interviewer (tùy chọn)</label>
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
                  <textarea
                    value={form.notes}
                    onChange={(e) => onChange("notes", e.target.value)}
                    placeholder="Ví dụ: Tập trung vào kinh nghiệm React, hỏi về dự án X..."
<<<<<<< HEAD
                    rows={2}
=======
                    rows={3}
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

<<<<<<< HEAD
                {slotsError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {slotsError}
                  </div>
                )}

=======
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Actions */}
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
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
<<<<<<< HEAD
                    disabled={findingSlots}
                    className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {findingSlots ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang tìm lịch...
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4" /> Tìm khung giờ
                      </>
=======
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</>
                    ) : (
                      "Xác nhận lịch phỏng vấn"
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
                    )}
                  </button>
                </div>
              </form>
            )}
<<<<<<< HEAD

            {/* ── Step 2: Slot selection ── */}
            {step === "slots" && (
              <div className="px-6 py-5 space-y-4">
                <p className="text-xs text-zinc-500">
                  {calendarConnected
                    ? "Các khung giờ dưới đây đã được kiểm tra với Google Calendar và lịch nội bộ."
                    : "Các khung giờ dưới đây đã được kiểm tra với lịch nội bộ."}
                </p>

                <div className="space-y-2">
                  {slots.map((slot, i) => {
                    const fmt = formatSlot(slot);
                    const isSelected = selectedSlot?.start_time === slot.start_time;
                    return (
                      <button
                        key={slot.start_time}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-indigo-600/15 border-indigo-600/50"
                            : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            isSelected ? "border-indigo-400" : "border-zinc-600"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-indigo-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold capitalize ${isSelected ? "text-white" : "text-zinc-200"}`}>
                            {fmt.dayName}, {fmt.date}
                          </p>
                          <p className={`text-xs mt-0.5 ${isSelected ? "text-indigo-300" : "text-zinc-500"}`}>
                            {fmt.time} · {form.duration} phút
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md shrink-0 ${
                            i === 0
                              ? "bg-green-500/15 text-green-400"
                              : "bg-zinc-700/50 text-zinc-400"
                          }`}
                        >
                          {i === 0 ? "Sớm nhất" : `Phương án ${i + 1}`}
                        </span>
                      </button>
                    );
                  })}

                  {slots.length === 0 && (
                    <div className="text-center py-6 text-sm text-zinc-500">
                      Tất cả khung giờ đã bị đặt. Vui lòng quay lại và thử lại.
                    </div>
                  )}
                </div>

                {conflict && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Khung giờ vừa bị đặt</p>
                      <p className="mt-0.5 text-amber-400/80">{conflict}</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setStep("form"); setConflict(""); setError(""); }}
                    className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
                  >
                    ← Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={handleSchedule}
                    disabled={scheduling || !selectedSlot || slots.length === 0}
                    className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {scheduling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang đặt lịch...
                      </>
                    ) : (
                      "Xác nhận đặt lịch"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ── Success ── */}
            {step === "success" && result && (
              <div className="px-6 py-8 space-y-5 text-center">
                <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Đã đặt lịch thành công!</h3>
                  {selectedSlot && (() => {
                    const fmt = formatSlot(selectedSlot);
                    return (
                      <p className="text-sm text-zinc-400 mt-1 capitalize">
                        {fmt.dayName}, {fmt.date} · {fmt.time}
                      </p>
                    );
                  })()}
                  <p className="text-xs text-zinc-500 mt-1">
                    Trạng thái ứng viên đã cập nhật sang &quot;Phỏng vấn&quot;.
                  </p>
                </div>

                <div className="space-y-2 text-left">
                  {result.calendar_connected ? (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Sự kiện đã tạo trên Google Calendar
                    </div>
                  ) : result.calendar_error ? (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm">
                      <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Chưa tạo được sự kiện Google Calendar
                      </div>
                      <p className="text-red-300/80 ml-6">{result.calendar_error}</p>
                      <a
                        href={calendarHref}
                        className="ml-6 mt-2 inline-flex items-center gap-1 text-red-300 underline hover:text-red-200 font-medium"
                      >
                        Kết nối lại Google Calendar →
                      </a>
                    </div>
                  ) : null}

                  {result.email_sent && (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Email mời đã gửi cho ứng viên &amp; interviewer
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
                </div>

                <button
                  onClick={closeReset}
                  className="w-full py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors"
                >
                  Đóng
                </button>
              </div>
            )}
=======
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
          </div>
        </div>
      )}
    </>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88

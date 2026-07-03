"use client";

import { useState } from "react";
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

interface Props {
  candidateId: string;
  candidateName: string;
  jobTitle: string | null;
  jobId: string | null;
  calendarConnected: boolean;
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

  const [form, setForm] = useState({
    interviewer_name: "",
    interviewer_email: "",
    duration: "45",
    notes: "",
  });

  const [findingSlots, setFindingSlots] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [scheduling, setScheduling] = useState(false);

  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState("");
  const [slotsError, setSlotsError] = useState("");

  function onChange(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

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

    try {
      const res = await fetch("/api/interviews/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidateId,
          job_id: jobId,
          interviewer_name: form.interviewer_name,
          interviewer_email: form.interviewer_email,
          start_time: selectedSlot.start_time,
          duration_minutes: Number(form.duration),
          notes: form.notes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "SLOT_NOT_AVAILABLE") {
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
    }
  }

  function closeReset() {
    setOpen(false);
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
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Step 1: Form ── */}
            {step === "form" && (
              <form onSubmit={handleFindSlots} className="px-6 py-5 space-y-4">
                {!calendarConnected && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      Google Calendar chưa kết nối — khung giờ gợi ý chỉ dựa trên lịch nội bộ.{" "}
                      <a href={calendarHref} className="underline hover:text-amber-200 font-medium">
                        Kết nối ngay →
                      </a>
                    </div>
                  </div>
                )}

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

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Thời lượng phỏng vấn
                  </label>
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

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">
                    Ghi chú cho interviewer (tùy chọn)
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => onChange("notes", e.target.value)}
                    placeholder="Ví dụ: Tập trung vào kinh nghiệm React, hỏi về dự án X..."
                    rows={2}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                {slotsError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {slotsError}
                  </div>
                )}

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
                    )}
                  </button>
                </div>
              </form>
            )}

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
          </div>
        </div>
      )}
    </>
  );
}
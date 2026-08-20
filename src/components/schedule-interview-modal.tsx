"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  X,
  ChevronLeft,
} from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { isMissingCandidateEmail, isValidEmailFormat } from "@/lib/candidate-email";
import { RichTextEditor } from "@/components/rich-text-editor";

interface Props {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string | null;
  jobId: string | null;
  calendarConnected: boolean;
  returnPath?: string;
}

type Slot = { start_time: string; end_time: string };
type DaySlots = { date: string; slots: Slot[] };

type ScheduleResult = {
  meet_link?: string;
  calendar_connected?: boolean;
  calendar_error?: string;
};

type Branch = "hcm" | "hanoi";

type Step = "form" | "slots" | "compose" | "success";

export function ScheduleInterviewModal({
  candidateId,
  candidateName,
  candidateEmail,
  jobTitle,
  jobId,
  calendarConnected,
  returnPath,
}: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [emailInput, setEmailInput] = useState(candidateEmail);
  const [savingEmail, setSavingEmail] = useState(false);
  // Cố định theo email GỐC của ứng viên lúc mở modal — không được tính lại
  // từ emailInput đang gõ dở, nếu không ô nhập sẽ tự ẩn ngay khi gõ ký tự
  // đầu tiên (vì lúc đó emailInput không còn "trông thiếu" nữa).
  const needsEmail = isMissingCandidateEmail(candidateEmail);

  const [form, setForm] = useState({
    interviewer_name: "",
    interviewer_email: "",
    duration: "45",
    notes: "",
  });
  const [branch, setBranch] = useState<Branch>("hcm");

  const [findingSlots, setFindingSlots] = useState(false);
  const [days, setDays] = useState<DaySlots[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [scheduling, setScheduling] = useState(false);

  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState("");
  const [slotsError, setSlotsError] = useState("");

  // ── Step "compose": draft + send the candidate-facing invite email ──
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [composeError, setComposeError] = useState("");

  function onChange(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    // getSession() đọc từ local storage — gần như tức thì, không chờ round-trip mạng.
    // Điền tạm ngay để tránh race condition khi HR thao tác nhanh trước khi getUser() xong.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      const email = session.user.email ?? "";
      const name = session.user.email?.split("@")[0] || "HR";
      setForm((f) => ({
        ...f,
        interviewer_name: f.interviewer_name || name,
        interviewer_email: f.interviewer_email || email,
      }));
    });

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      let fullName: string | null = null;
      try {
        const { data } = await supabase
          .from("user_profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        fullName = data?.full_name ?? null;
      } catch {
        // Bỏ qua — vẫn fallback về email bên dưới để không để trống interviewer_name/email
      }
      const name = fullName || user.email?.split("@")[0] || "HR";
      setForm((f) => ({ ...f, interviewer_name: name, interviewer_email: user.email ?? "" }));
    });
  }, []);

  async function handleFindSlots(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSlotsError("");

    if (!form.interviewer_name || !form.interviewer_email) {
      setSlotsError(
        "Chưa xác định được thông tin người phỏng vấn (tài khoản đăng nhập). Vui lòng tải lại trang và thử lại."
      );
      return;
    }

    if (needsEmail) {
      if (!isValidEmailFormat(emailInput)) {
        setSlotsError("Vui lòng nhập email hợp lệ của ứng viên trước khi lên lịch.");
        return;
      }
      setSavingEmail(true);
      try {
        const res = await fetch(`/api/candidates/${candidateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailInput.trim() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setSlotsError(data.error ?? "Không thể lưu email ứng viên. Vui lòng thử lại.");
          return;
        }
      } catch (err) {
        setSlotsError(err instanceof Error ? err.message : "Không thể lưu email ứng viên");
        return;
      } finally {
        setSavingEmail(false);
      }
    }

    setFindingSlots(true);

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

      const fetchedDays: DaySlots[] = data.days ?? [];
      const totalSlots = fetchedDays.reduce((sum, d) => sum + d.slots.length, 0);

      if (fetchedDays.length === 0 || totalSlots === 0) {
        setSlotsError(
          "Không tìm được khung giờ trống trong 3 tuần tới. Vui lòng thử lại sau."
        );
        return;
      }

      const firstDayWithSlots = fetchedDays.find((d) => d.slots.length > 0) ?? fetchedDays[0];
      setDays(fetchedDays);
      setSelectedDate(firstDayWithSlots.date);
      setSelectedSlot(firstDayWithSlots.slots[0] ?? null);
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
          setDays((prev) =>
            prev.map((d) =>
              d.date === selectedDate
                ? { ...d, slots: d.slots.filter((s) => s.start_time !== selectedSlot.start_time) }
                : d
            )
          );
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
      setInterviewId(data.interview.id);
      setStep("compose");
      void loadDraft(data.interview.id, branch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setScheduling(false);
    }
  }

  async function loadDraft(id: string, b: Branch) {
    setLoadingDraft(true);
    setComposeError("");
    try {
      const res = await fetch(`/api/interviews/${id}/invite-draft?branch=${b}`);
      const data = await res.json();
      if (!res.ok) {
        setComposeError(data.error ?? "Không tạo được nội dung mail mẫu.");
        return;
      }
      setComposeSubject(data.subject);
      setComposeBody(data.body);
    } catch (err) {
      setComposeError(err instanceof Error ? err.message : "Có lỗi xảy ra khi tạo nội dung mail");
    } finally {
      setLoadingDraft(false);
    }
  }

  function switchBranch(b: Branch) {
    setBranch(b);
    if (interviewId) void loadDraft(interviewId, b);
  }

  async function handleSendInvite() {
    if (!interviewId) return;
    setSendingInvite(true);
    setComposeError("");
    try {
      const res = await fetch(`/api/interviews/${interviewId}/send-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: composeSubject, body: composeBody }),
      });
      const data = await res.json();
      if (!res.ok) {
        setComposeError(data.error ?? "Không gửi được mail. Vui lòng thử lại.");
        return;
      }
      setInviteSent(true);
      setStep("success");
    } catch (err) {
      setComposeError(err instanceof Error ? err.message : "Có lỗi xảy ra khi gửi mail");
    } finally {
      setSendingInvite(false);
    }
  }

  function closeReset() {
    setOpen(false);
    setStep("form");
    setDays([]);
    setSelectedDate(null);
    setSelectedSlot(null);
    setResult(null);
    setError("");
    setConflict("");
    setSlotsError("");
    setForm({ interviewer_name: "", interviewer_email: "", duration: "45", notes: "" });
    setBranch("hcm");
    setEmailInput(candidateEmail);
    setInterviewId(null);
    setComposeSubject("");
    setComposeBody("");
    setInviteSent(false);
    setComposeError("");
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

  // "YYYY-MM-DD" → short tab label, e.g. { weekday: "Th 3", dayMonth: "13/08" }
  function formatDayTab(dateStr: string) {
    const d = new Date(`${dateStr}T12:00:00`);
    const tz = "Asia/Ho_Chi_Minh";
    const weekday = d.toLocaleDateString("vi-VN", { weekday: "short", timeZone: tz });
    const dayMonth = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", timeZone: tz });
    return { weekday, dayMonth };
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh",
    });
  }

  // Zero-padded "HH:mm" in the configured timezone — used as the grid row key
  // so the same time-of-day lines up across every day column.
  function timeKey(iso: string) {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh",
      hourCycle: "h23",
    });
  }

  const timeRows = Array.from(
    new Set(days.flatMap((d) => d.slots.map((s) => timeKey(s.start_time))))
  ).sort();

  function slotAt(date: string, time: string): Slot | undefined {
    return days.find((d) => d.date === date)?.slots.find((s) => timeKey(s.start_time) === time);
  }

  const calendarHref = `/api/calendar/connect${
    returnPath ? `?return_to=${encodeURIComponent(returnPath)}` : ""
  }`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg border text-sm font-semibold transition-colors hover:opacity-80"
        style={{
          background: "var(--pipe-ai-bg)",
          borderColor: "var(--pipe-ai-border)",
          color: "var(--pipe-ai-text)",
        }}
      >
        Lên lịch phỏng vấn
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeReset} />

          <div className={`relative w-full ${step === "slots" ? "max-w-3xl" : "max-w-lg"} bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden`}>
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
                    {step === "compose" && "Soạn mail mời ứng viên"}
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
                {needsEmail && (
                  <div className="space-y-1.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <label className="text-xs font-medium text-amber-300 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> Ứng viên chưa có email — nhập trước khi lên lịch
                    </label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="email@ungvien.com"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

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
                  <label className="text-xs font-medium text-zinc-400">Chi nhánh phỏng vấn</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBranch("hcm")}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        branch === "hcm"
                          ? "bg-indigo-600/20 border-indigo-600/50 text-indigo-300"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Hồ Chí Minh
                    </button>
                    <button
                      type="button"
                      onClick={() => setBranch("hanoi")}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        branch === "hanoi"
                          ? "bg-indigo-600/20 border-indigo-600/50 text-indigo-300"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Hà Nội
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    {branch === "hcm"
                      ? "Mail mời phỏng vấn trực tiếp tại văn phòng."
                      : "Mail trao đổi cơ hội qua Zalo, phỏng vấn online qua Google Meet."}
                  </p>
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
                    disabled={findingSlots || savingEmail}
                    className="flex-1 py-2.5 rounded-lg border disabled:opacity-50 text-sm font-semibold transition-colors flex items-center justify-center gap-2 hover:opacity-80"
                    style={{
                      background: "var(--pipe-ai-bg)",
                      borderColor: "var(--pipe-ai-border)",
                      color: "var(--pipe-ai-text)",
                    }}
                  >
                    {savingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang lưu email...
                      </>
                    ) : findingSlots ? (
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
              <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
                <p className="text-xs text-zinc-500">
                  {calendarConnected
                    ? "Các khung giờ dưới đây đã được kiểm tra với Google Calendar và lịch nội bộ. Bấm trực tiếp vào ô giờ trống bạn muốn chọn."
                    : "Các khung giờ dưới đây đã được kiểm tra với lịch nội bộ. Bấm trực tiếp vào ô giờ trống bạn muốn chọn."}
                </p>

                {/* Weekly grid — days as columns, time-of-day as rows */}
                <div className="overflow-x-auto -mx-1 px-1">
                  <table className="border-separate border-spacing-1 text-xs mx-auto">
                    <thead>
                      <tr>
                        <th className="w-12" />
                        {days.map((d) => {
                          const tab = formatDayTab(d.date);
                          const hasSlots = d.slots.length > 0;
                          return (
                            <th key={d.date} className="min-w-[68px] px-1 py-1 font-medium">
                              <div className={`capitalize ${hasSlots ? "text-zinc-300" : "text-zinc-600"}`}>{tab.weekday}</div>
                              <div className={hasSlots ? "text-zinc-500" : "text-zinc-700"}>{tab.dayMonth}</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {timeRows.map((time) => (
                        <tr key={time}>
                          <td className="text-right pr-1.5 text-zinc-500 whitespace-nowrap align-middle">{time}</td>
                          {days.map((d) => {
                            const slot = slotAt(d.date, time);
                            const isSelected = !!slot && selectedSlot?.start_time === slot.start_time;
                            return (
                              <td key={d.date} className="p-0 align-middle">
                                {slot ? (
                                  <button
                                    type="button"
                                    title={formatTime(slot.start_time)}
                                    onClick={() => {
                                      setSelectedDate(d.date);
                                      setSelectedSlot(slot);
                                    }}
                                    className={`w-full h-7 rounded-md border transition-colors ${
                                      isSelected
                                        ? "bg-indigo-600 border-indigo-500"
                                        : "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/30"
                                    }`}
                                  />
                                ) : (
                                  <div className="w-full h-7 rounded-md bg-zinc-800/30" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/15 border border-emerald-500/30 inline-block" /> Còn trống</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-600 inline-block" /> Đang chọn</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-zinc-800/30 inline-block" /> Đã bận</span>
                </div>

                {selectedSlot && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-indigo-600/10 border border-indigo-600/25 text-xs text-indigo-300">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="capitalize">
                      Đã chọn: <span className="font-semibold text-white">{formatSlot(selectedSlot).dayName}, {formatSlot(selectedSlot).date} · {formatSlot(selectedSlot).time}</span>
                    </span>
                  </div>
                )}

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
                    disabled={scheduling || !selectedSlot}
                    className="flex-1 py-2.5 rounded-lg border disabled:opacity-50 text-sm font-semibold transition-colors flex items-center justify-center gap-2 hover:opacity-80"
                    style={{
                      background: "var(--pipe-ai-bg)",
                      borderColor: "var(--pipe-ai-border)",
                      color: "var(--pipe-ai-text)",
                    }}
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

            {/* ── Step 3: Compose & send the candidate-facing invite ── */}
            {step === "compose" && (
              <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Đã tạo lịch phỏng vấn thành công. Chọn mẫu mail và chỉnh sửa trước khi gửi cho ứng viên.
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => switchBranch("hcm")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      branch === "hcm"
                        ? "bg-indigo-600/20 border-indigo-600/50 text-indigo-300"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Hồ Chí Minh
                  </button>
                  <button
                    type="button"
                    onClick={() => switchBranch("hanoi")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      branch === "hanoi"
                        ? "bg-indigo-600/20 border-indigo-600/50 text-indigo-300"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Hà Nội
                  </button>
                </div>

                {loadingDraft && (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tạo nội dung mail mẫu...
                  </div>
                )}

                {!loadingDraft && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">Tiêu đề</label>
                      <input
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">Nội dung</label>
                      <div className="dark">
                        <RichTextEditor key={branch} value={composeBody} onChange={setComposeBody} minHeight="260px" />
                      </div>
                    </div>
                  </>
                )}

                {composeError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {composeError}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep("success")}
                    className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
                  >
                    Bỏ qua, không gửi mail
                  </button>
                  <button
                    type="button"
                    onClick={handleSendInvite}
                    disabled={loadingDraft || sendingInvite || !composeSubject || !composeBody}
                    className="flex-1 py-2.5 rounded-lg border disabled:opacity-50 text-sm font-semibold transition-colors flex items-center justify-center gap-2 hover:opacity-80"
                    style={{
                      background: "var(--pipe-ai-bg)",
                      borderColor: "var(--pipe-ai-border)",
                      color: "var(--pipe-ai-text)",
                    }}
                  >
                    {sendingInvite ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...
                      </>
                    ) : (
                      "Gửi mail mời"
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

                  {inviteSent ? (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Email mời đã gửi cho ứng viên
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Chưa gửi mail mời cho ứng viên (đã bỏ qua)
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
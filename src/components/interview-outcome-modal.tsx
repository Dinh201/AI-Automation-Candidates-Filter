"use client";

import { useState } from "react";
import { Mail, Loader2, AlertCircle, X, UserCheck, UserX, Send } from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";

interface Props {
  interviewId: string;
  candidateName: string;
  jobTitle: string | null;
  onSent: (outcome: "Hired" | "Rejected") => void;
}

type Outcome = "Hired" | "Rejected";

export function InterviewOutcomeModal({ interviewId, candidateName, jobTitle, onSent }: Props) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setOpen(false);
    setOutcome(null);
    setSubject("");
    setBody("");
    setError("");
  }

  async function pickOutcome(next: Outcome) {
    setOutcome(next);
    setError("");
    setLoadingDraft(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/outcome-draft?outcome=${next}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Không tạo được nội dung mail mẫu.");
        return;
      }
      setSubject(data.subject);
      setBody(data.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi tạo nội dung mail");
    } finally {
      setLoadingDraft(false);
    }
  }

  async function handleSend() {
    if (!outcome) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/interviews/${interviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, email_subject: subject, email_body: body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Không gửi được mail. Vui lòng thử lại.");
        return;
      }
      onSent(outcome);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi gửi mail");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-xs font-medium hover:bg-indigo-500/25 transition-colors"
      >
        <Mail className="w-3.5 h-3.5" />
        Kết quả / Gửi mail
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={reset} />

          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-semibold text-white">Gửi kết quả phỏng vấn</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {candidateName} · {jobTitle ?? "—"}
                </p>
              </div>
              <button onClick={reset} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => pickOutcome("Hired")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    outcome === "Hired"
                      ? "bg-emerald-600/20 border-emerald-600/50 text-emerald-300"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <UserCheck className="w-4 h-4" /> Trúng tuyển
                </button>
                <button
                  type="button"
                  onClick={() => pickOutcome("Rejected")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    outcome === "Rejected"
                      ? "bg-red-600/20 border-red-600/50 text-red-300"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <UserX className="w-4 h-4" /> Từ chối
                </button>
              </div>

              {loadingDraft && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang tạo nội dung mail mẫu...
                </div>
              )}

              {outcome && !loadingDraft && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Tiêu đề</label>
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Nội dung</label>
                    {/* RichTextEditor uses theme CSS vars (light/dark) — this modal is always
                        dark regardless of the app's theme setting, so force the vars here too. */}
                    <div className="dark">
                      <RichTextEditor key={outcome} value={body} onChange={setBody} minHeight="220px" />
                    </div>
                  </div>
                </>
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
                  onClick={reset}
                  className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!outcome || loadingDraft || sending || !subject || !body}
                  className="flex-1 py-2.5 rounded-lg border border-indigo-600/50 bg-indigo-600/20 text-indigo-300 disabled:opacity-50 text-sm font-semibold transition-colors flex items-center justify-center gap-2 hover:bg-indigo-600/30"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Gửi mail
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

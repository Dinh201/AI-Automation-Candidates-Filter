"use client";

import { useState } from "react";
import { Mail, Loader2, AlertCircle, X, Send } from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";

interface Props {
  interviewId: string;
  candidateName: string;
  onSent?: () => void;
}

type Branch = "hcm" | "hanoi";

// Soạn/gửi lại mail mời ứng viên cho 1 lịch phỏng vấn ĐÃ TỒN TẠI — dùng khi
// bước "soạn mail mời" trong ScheduleInterviewModal bị lỡ (đóng popup, mất
// mạng, Gmail token hết hạn...) sau khi lịch đã tạo thành công. Không tạo
// lại lịch, chỉ dùng lại /invite-draft + /send-invite trên interview có sẵn.
export function ResendInviteModal({ interviewId, candidateName, onSent }: Props) {
  const [open, setOpen] = useState(false);
  const [branch, setBranch] = useState<Branch>("hcm");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function loadDraft(b: Branch) {
    setLoadingDraft(true);
    setError("");
    try {
      const res = await fetch(`/api/interviews/${interviewId}/invite-draft?branch=${b}`);
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

  function openModal() {
    setOpen(true);
    setSent(false);
    void loadDraft(branch);
  }

  function switchBranch(b: Branch) {
    setBranch(b);
    void loadDraft(b);
  }

  async function handleSend() {
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/interviews/${interviewId}/send-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Không gửi được mail. Vui lòng thử lại.");
        return;
      }
      setSent(true);
      onSent?.();
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
        onClick={openModal}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-xs font-medium hover:bg-indigo-500/25 transition-colors"
      >
        <Mail className="w-3.5 h-3.5" />
        Gửi lại mail mời
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => !sending && setOpen(false)} />

          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-semibold text-white">Gửi lại mail mời</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{candidateName}</p>
              </div>
              <button onClick={() => !sending && setOpen(false)} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {sent ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300">
                  <Mail className="w-4 h-4 shrink-0" />
                  Đã gửi mail mời thành công.
                </div>
              ) : (
                <>
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

                  {loadingDraft ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang tạo nội dung mail mẫu...
                    </div>
                  ) : (
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
                        <div className="dark">
                          <RichTextEditor key={branch} value={body} onChange={setBody} minHeight="260px" />
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
                      onClick={() => !sending && setOpen(false)}
                      disabled={sending}
                      className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={loadingDraft || sending || !subject || !body}
                      className="flex-1 py-2.5 rounded-lg bg-indigo-600/20 border border-indigo-600/50 text-indigo-300 disabled:opacity-50 text-sm font-semibold transition-colors flex items-center justify-center gap-2 hover:bg-indigo-600/30"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Gửi mail mời
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

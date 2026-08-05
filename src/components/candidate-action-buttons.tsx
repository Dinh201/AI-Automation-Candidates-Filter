"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, AlertCircle, Pencil, Send, X } from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";

interface Props {
  candidateId: string;
  currentStatus: string;
}

type Outcome = "Hired" | "Rejected";

const OUTCOME_META: Record<Outcome, { title: string; sendLabel: string; sendClass: string }> = {
  Hired: {
    title: "Xác nhận mail thông báo trúng tuyển",
    sendLabel: "Gửi mail & Tuyển dụng",
    sendClass: "bg-emerald-600 hover:bg-emerald-500 text-white",
  },
  Rejected: {
    title: "Xác nhận mail từ chối",
    sendLabel: "Gửi mail & Từ chối",
    sendClass: "bg-red-600 hover:bg-red-500 text-white",
  },
};

export function CandidateActionButtons({ candidateId, currentStatus }: Props) {
  const router = useRouter();

  // Popup xác nhận mail Hired/Rejected — HR xem lại nội dung trước khi gửi,
  // có thể bấm "Chỉnh sửa" để sửa trực tiếp, hoặc Hủy để không đổi gì cả.
  // Mặc định (không bấm "Chỉnh sửa") PHẢI gửi đúng mẫu offer/reject chính
  // thức (sendHiredNotification/sendRejectedNotification) — nội dung xem
  // trước ở đây chỉ để tham khảo, không phải nội dung sẽ gửi. Chỉ khi HR
  // chủ động bấm "Chỉnh sửa" (hasEdited=true) mới gửi kèm email_subject/
  // email_body để route dùng nội dung tùy chỉnh (xem candidates/[id]/route.ts).
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState(false);
  const [hasEdited, setHasEdited] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHired = currentStatus === "Hired";
  const isRejected = currentStatus === "Rejected";

  function closeOutcome() {
    setOutcome(null);
    setSubject("");
    setBody("");
    setEditing(false);
    setHasEdited(false);
    setError(null);
  }

  async function openOutcome(next: Outcome) {
    setOutcome(next);
    setEditing(false);
    setHasEdited(false);
    setError(null);
    setLoadingDraft(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/outcome-draft?outcome=${next}`);
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

  async function sendOutcome() {
    if (!outcome) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          hasEdited ? { status: outcome, email_subject: subject, email_body: body } : { status: outcome }
        ),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Lỗi không xác định");
      }
      closeOutcome();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Reject */}
        {!isRejected && (
          <button
            onClick={() => openOutcome("Rejected")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            Từ chối
          </button>
        )}

        {/* Hire */}
        {!isHired && (
          <button
            onClick={() => openOutcome("Hired")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Tuyển dụng
          </button>
        )}
      </div>

      {/* Popup xem lại / chỉnh sửa / gửi mail Hired-Rejected */}
      {outcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => !sending && closeOutcome()} />

          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
              <h2 className="text-base font-semibold text-white">{OUTCOME_META[outcome].title}</h2>
              <button onClick={() => !sending && closeOutcome()} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {loadingDraft && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang tạo nội dung mail mẫu...
                </div>
              )}

              {!loadingDraft && (
                <>
                  {!editing && (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-zinc-500">
                        Mẫu mặc định của công ty — sẽ gửi nguyên văn nếu không chỉnh sửa.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(true);
                          setHasEdited(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-xs font-medium hover:bg-indigo-500/25 transition-colors shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Chỉnh sửa nội dung
                      </button>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Tiêu đề</label>
                    {editing ? (
                      <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                      />
                    ) : (
                      <p className="text-sm text-zinc-200 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-800">{subject}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Nội dung</label>
                    {editing ? (
                      <div className="dark">
                        <RichTextEditor key={outcome} value={body} onChange={setBody} minHeight="220px" />
                      </div>
                    ) : (
                      <div
                        className="text-sm text-zinc-300 leading-relaxed px-4 py-3 rounded-lg bg-zinc-800/60 border border-zinc-800 max-h-[280px] overflow-y-auto [&_p]:mb-2 [&_p]:last:mb-0"
                        dangerouslySetInnerHTML={{ __html: body }}
                      />
                    )}
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
                  onClick={() => !sending && closeOutcome()}
                  disabled={sending}
                  className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={sendOutcome}
                  disabled={loadingDraft || sending || !subject || !body}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${OUTCOME_META[outcome].sendClass}`}
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> {OUTCOME_META[outcome].sendLabel}
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

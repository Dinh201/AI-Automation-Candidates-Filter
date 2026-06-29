"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, RotateCcw, AlertCircle } from "lucide-react";

interface Props {
  candidateId: string;
  currentStatus: string;
}

type ConfirmDialog = {
  action: "hire" | "reject" | "reset";
  label: string;
  description: string;
  confirmLabel: string;
  confirmClass: string;
};

const DIALOG: Record<"hire" | "reject" | "reset", ConfirmDialog> = {
  hire: {
    action: "hire",
    label: "Xác nhận tuyển dụng",
    description: "Ứng viên sẽ được chuyển sang trạng thái Đã tuyển. Hành động này có thể hoàn tác.",
    confirmLabel: "Tuyển dụng",
    confirmClass: "bg-emerald-600 hover:bg-emerald-500 text-white",
  },
  reject: {
    action: "reject",
    label: "Xác nhận từ chối",
    description: "Ứng viên sẽ được đánh dấu Từ chối. Hành động này có thể hoàn tác.",
    confirmLabel: "Từ chối",
    confirmClass: "bg-red-600 hover:bg-red-500 text-white",
  },
  reset: {
    action: "reset",
    label: "Đặt lại trạng thái",
    description: "Ứng viên sẽ được chuyển về trạng thái Đã chấm điểm để xem xét lại.",
    confirmLabel: "Đặt lại",
    confirmClass: "bg-zinc-600 hover:bg-zinc-500 text-white",
  },
};

const STATUS_MAP: Record<ConfirmDialog["action"], string> = {
  hire: "Hired",
  reject: "Rejected",
  reset: "Scored",
};

export function CandidateActionButtons({ candidateId, currentStatus }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<ConfirmDialog | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHired = currentStatus === "Hired";
  const isRejected = currentStatus === "Rejected";
  const isDone = isHired || isRejected;

  async function confirm() {
    if (!dialog) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: STATUS_MAP[dialog.action] }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Lỗi không xác định");
      }
      setDialog(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Reject */}
        {!isRejected && (
          <button
            onClick={() => setDialog(DIALOG.reject)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            Từ chối
          </button>
        )}

        {/* Hire */}
        {!isHired && (
          <button
            onClick={() => setDialog(DIALOG.hire)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Tuyển dụng
          </button>
        )}

        {/* Reset (only when terminal state) */}
        {isDone && (
          <button
            onClick={() => setDialog(DIALOG.reset)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700/40 border border-zinc-700/40 text-zinc-400 text-xs font-medium hover:bg-zinc-700/60 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Xem xét lại
          </button>
        )}
      </div>

      {/* Confirm dialog */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => !loading && setDialog(null)} />
          <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">{dialog.label}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{dialog.description}</p>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => !loading && setDialog(null)}
                disabled={loading}
                className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={confirm}
                disabled={loading}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${dialog.confirmClass}`}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</> : dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
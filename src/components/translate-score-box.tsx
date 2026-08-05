"use client";

import { useState } from "react";
import { Languages, Loader2, AlertCircle } from "lucide-react";
import { CandidateScoringTranslation } from "@/services/ai/schema";

function TagList({ items, color }: { items: string[]; color: string }) {
  if (!items.length) return <p className="text-sm text-zinc-600 italic">Không có dữ liệu</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${color}`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function TranslateScoreBox({ candidateId }: { candidateId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [translation, setTranslation] = useState<CandidateScoringTranslation | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !translation && !loading) {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/candidates/${candidateId}/translate-score`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Không dịch được kết quả.");
          return;
        }
        setTranslation(data.translation);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi dịch");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-600/30 flex items-center justify-center">
            <Languages className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Xem bản dịch tiếng Việt</p>
            <p className="text-xs text-zinc-500">Dịch kết quả đánh giá AI (nếu CV gốc là tiếng Anh)</p>
          </div>
        </div>
        <span className="text-zinc-500 text-xs">{open ? "Thu gọn ▲" : "Mở rộng ▼"}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-800 px-5 py-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang dịch...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {!loading && translation && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Tóm tắt ứng viên</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{translation.candidate_summary}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Lý do đánh giá</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{translation.evaluation_reason}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-green-400 mb-1.5 uppercase tracking-wide">Điểm mạnh</p>
                  <TagList items={translation.strengths} color="bg-green-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-1.5 uppercase tracking-wide">Điểm yếu</p>
                  <TagList items={translation.weaknesses} color="bg-red-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-1.5 uppercase tracking-wide">Rủi ro tuyển dụng</p>
                  <TagList items={translation.hiring_risks} color="bg-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Thông tin còn thiếu</p>
                  <TagList items={translation.missing_information} color="bg-zinc-500" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-400 mb-1.5 uppercase tracking-wide">Câu hỏi phỏng vấn đề xuất</p>
                <TagList items={translation.recommended_interview_questions} color="bg-indigo-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wide">Bằng chứng & Dẫn chứng</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-blue-400 mb-1.5 uppercase tracking-wide">Kỹ năng</p>
                    <TagList items={translation.evidence.skills_evidence} color="bg-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-purple-400 mb-1.5 uppercase tracking-wide">Kinh nghiệm</p>
                    <TagList items={translation.evidence.experience_evidence} color="bg-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-400 mb-1.5 uppercase tracking-wide">Văn hóa</p>
                    <TagList items={translation.evidence.culture_evidence} color="bg-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-400 mb-1.5 uppercase tracking-wide">Tiềm năng</p>
                    <TagList items={translation.evidence.potential_evidence} color="bg-emerald-500" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

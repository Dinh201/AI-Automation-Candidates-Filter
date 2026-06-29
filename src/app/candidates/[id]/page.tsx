import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Brain,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  MessageSquare,
  Shield,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { CandidateScoringResult } from "@/services/ai/schema";
import { ScheduleInterviewModal } from "@/components/schedule-interview-modal";
import { AskAIPanel } from "@/components/ask-ai-panel";
import { CandidateActionButtons } from "@/components/candidate-action-buttons";

type Job = {
  id: string;
  title: string;
  description: string;
  required_skills: string;
  experience_requirement: string;
};

type Candidate = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  total_score: number | null;
  ai_score_result: CandidateScoringResult | null;
  cv_url: string;
  form_answers: string | null;
  created_at: string;
  jobs: Job | null;
};

async function getCandidate(id: string): Promise<Candidate | null> {
  const { data, error } = await supabase
    .from("candidates")
    .select("*, jobs(*)")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Candidate;
}

async function isCalendarConnected(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("hr_calendar_tokens")
    .select("id, expiry, refresh_token")
    .eq("id", "default")
    .single();
  if (!data) return false;
  // Connected if token is still valid OR can be refreshed
  return data.expiry > Date.now() || !!data.refresh_token;
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  const pct = Math.min(Math.max((score / 10) * 100, 0), 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        <span className="text-sm font-bold text-white">
          {score.toFixed(1)}<span className="text-zinc-500 text-xs font-normal">/10</span>
        </span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function decisionConfig(decision?: string) {
  switch (decision) {
    case "STRONG HIRE":
      return { label: "Strong Hire", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: <CheckCircle className="w-4 h-4" /> };
    case "HIRE":
      return { label: "Hire", className: "bg-blue-500/15 text-blue-300 border-blue-500/30", icon: <CheckCircle className="w-4 h-4" /> };
    case "CONSIDER":
      return { label: "Cân nhắc", className: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: <HelpCircle className="w-4 h-4" /> };
    case "REJECT":
      return { label: "Từ chối", className: "bg-red-500/15 text-red-300 border-red-500/30", icon: <XCircle className="w-4 h-4" /> };
    default:
      return { label: "Chưa có", className: "bg-zinc-700/40 text-zinc-400 border-zinc-700/40", icon: <HelpCircle className="w-4 h-4" /> };
  }
}

function statusConfig(status: string) {
  switch (status) {
    case "Scored":       return { label: "Đã chấm điểm",  className: "bg-green-500/15 text-green-400" };
    case "Scoring":      return { label: "Đang chấm...",   className: "bg-blue-500/15 text-blue-400" };
    case "New":          return { label: "Mới nộp",        className: "bg-zinc-700/40 text-zinc-400" };
    case "Interviewing": return { label: "Phỏng vấn",      className: "bg-purple-500/15 text-purple-400" };
    case "Hired":        return { label: "Đã tuyển",       className: "bg-emerald-500/15 text-emerald-400" };
    case "Rejected":     return { label: "Từ chối",        className: "bg-red-500/15 text-red-400" };
    default:             return { label: status,            className: "bg-zinc-700/40 text-zinc-400" };
  }
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <span className="text-zinc-400">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

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

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [candidate, calendarConnected] = await Promise.all([
    getCandidate(id),
    isCalendarConnected(),
  ]);

  if (!candidate) notFound();

  const ai = candidate.ai_score_result;
  const decisionCfg = decisionConfig(ai?.final_decision);
  const statusCfg = statusConfig(candidate.status);

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {/* Back */}
      <Link
        href="/candidates"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Danh sách ứng viên
      </Link>

      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white">{candidate.name}</h1>
            <p className="text-sm text-zinc-400">{candidate.email}</p>
            {candidate.phone && <p className="text-sm text-zinc-500">{candidate.phone}</p>}
            <p className="text-xs text-zinc-600">
              Ứng tuyển: <span className="text-zinc-400">{candidate.jobs?.title ?? "—"}</span>
              &ensp;·&ensp;{new Date(candidate.created_at).toLocaleDateString("vi-VN")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
            <a
              href={candidate.cv_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/15 border border-indigo-600/20 text-indigo-400 text-xs font-medium hover:bg-indigo-600/25 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> Xem CV
            </a>
            {ai && (
              <CandidateActionButtons
                candidateId={id}
                currentStatus={candidate.status}
              />
            )}
          </div>
        </div>

        {/* Score summary */}
        {ai && (
          <div className="mt-5 pt-5 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <ScoreBar label="Job Fit" score={ai.job_fit_score} color="bg-blue-500" />
              <ScoreBar label="Potential" score={ai.potential_score} color="bg-purple-500" />
              <ScoreBar label="Cultural Fit" score={ai.cultural_fit_score} color="bg-amber-500" />
            </div>
            <div className="flex flex-col justify-center items-center gap-3">
              <div className="text-center">
                <p className="text-4xl font-black text-white">{ai.total_score.toFixed(1)}</p>
                <p className="text-xs text-zinc-500 mt-0.5">Tổng điểm / 10</p>
              </div>
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold ${decisionCfg.className}`}>
                {decisionCfg.icon}
                {decisionCfg.label}
              </span>
              <div className="text-xs text-zinc-500">
                Độ tin cậy AI:{" "}
                <span className={ai.confidence_level === "High" ? "text-green-400" : ai.confidence_level === "Medium" ? "text-amber-400" : "text-red-400"}>
                  {ai.confidence_level}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {!ai ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
          <Brain className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">Chưa có kết quả chấm điểm AI</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SectionCard title="Tóm tắt ứng viên" icon={<Brain className="w-4 h-4" />}>
            <p className="text-sm text-zinc-300 leading-relaxed">{ai.candidate_summary}</p>
          </SectionCard>

          <SectionCard title="Lý do đánh giá" icon={<MessageSquare className="w-4 h-4" />}>
            <p className="text-sm text-zinc-300 leading-relaxed">{ai.evaluation_reason}</p>
          </SectionCard>

          <SectionCard title="Điểm mạnh" icon={<CheckCircle className="w-4 h-4 text-green-400" />}>
            <TagList items={ai.strengths} color="bg-green-500" />
          </SectionCard>

          <SectionCard title="Điểm yếu / Kỹ năng còn thiếu" icon={<XCircle className="w-4 h-4 text-red-400" />}>
            <TagList items={ai.weaknesses} color="bg-red-500" />
          </SectionCard>

          <SectionCard title="Rủi ro tuyển dụng" icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}>
            <TagList items={ai.hiring_risks} color="bg-amber-500" />
          </SectionCard>

          <SectionCard title="Thông tin còn thiếu" icon={<HelpCircle className="w-4 h-4 text-zinc-400" />}>
            <TagList items={ai.missing_information} color="bg-zinc-500" />
          </SectionCard>

          {/* Evidence — full width */}
          <div className="lg:col-span-2">
            <SectionCard title="Bằng chứng & Dẫn chứng" icon={<Shield className="w-4 h-4 text-indigo-400" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wide">Kỹ năng</p>
                  <TagList items={ai.evidence.skills_evidence} color="bg-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-purple-400 mb-2 uppercase tracking-wide">Kinh nghiệm</p>
                  <TagList items={ai.evidence.experience_evidence} color="bg-purple-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-2 uppercase tracking-wide">Văn hóa</p>
                  <TagList items={ai.evidence.culture_evidence} color="bg-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wide">Tiềm năng</p>
                  <TagList items={ai.evidence.potential_evidence} color="bg-emerald-500" />
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Interview questions — full width */}
          <div className="lg:col-span-2">
            <SectionCard title="Câu hỏi phỏng vấn gợi ý" icon={<TrendingUp className="w-4 h-4 text-indigo-400" />}>
              {ai.recommended_interview_questions.length === 0 ? (
                <p className="text-sm text-zinc-600 italic">Không có gợi ý</p>
              ) : (
                <ol className="space-y-2">
                  {ai.recommended_interview_questions.map((q, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-600/20 border border-indigo-600/30 text-indigo-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      {q}
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>
          </div>

          {/* Ask AI — full width */}
          <div className="lg:col-span-2">
            <AskAIPanel candidateId={id} />
          </div>

          {/* Schedule Interview — full width */}
          <div className="lg:col-span-2">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-600/20 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Lên lịch phỏng vấn</p>
                  {calendarConnected ? (
                    <p className="text-xs text-zinc-500">Google Calendar đã kết nối — lịch sẽ được tạo tự động</p>
                  ) : (
                    <p className="text-xs text-amber-400/80">
                      Google Calendar chưa kết nối —{" "}
                      <a
                        href={`/api/calendar/connect?return_to=${encodeURIComponent(`/candidates/${id}`)}`}
                        className="underline hover:text-amber-300"
                      >
                        Kết nối ngay
                      </a>
                    </p>
                  )}
                </div>
              </div>
              <ScheduleInterviewModal
                candidateId={id}
                candidateName={candidate.name}
                jobTitle={candidate.jobs?.title ?? null}
                jobId={candidate.jobs?.id ?? null}
                calendarConnected={calendarConnected}
                returnPath={`/candidates/${id}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { supabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";
import { Calendar, Clock, User, Mail, AlertTriangle, CheckCircle, TrendingUp, Zap } from "lucide-react";
import { CandidateScoringResult } from "@/services/ai/schema";

type InterviewWithDetails = {
  id: string;
  start_time: string;
  end_time: string;
  interviewer_name: string;
  interviewer_email: string;
  meet_link: string | null;
  notes: string | null;
  status: string;
  candidates: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    total_score: number | null;
    ai_score_result: CandidateScoringResult | null;
    jobs: {
      title: string;
      description: string;
      required_skills: string;
      experience_requirement: string;
    } | null;
  } | null;
};

async function getInterview(id: string): Promise<InterviewWithDetails | null> {
  const { data, error } = await supabaseAdmin
    .from("interviews")
    .select("*, candidates(id, name, email, phone, total_score, ai_score_result, jobs(title, description, required_skills, experience_requirement))")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as InterviewWithDetails;
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  const pct = Math.min(Math.max((score / 10) * 100, 0), 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className="text-xs font-semibold text-zinc-300">{score.toFixed(1)}/10</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function InterviewBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const interview = await getInterview(id);

  if (!interview) notFound();

  const candidate = interview.candidates;
  const ai = candidate?.ai_score_result;
  const job = candidate?.jobs;

  const startDate = new Date(interview.start_time);
  const endDate = new Date(interview.end_time);

  const decisionColor = (d?: string) => {
    if (d === "STRONG HIRE") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    if (d === "HIRE") return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    if (d === "CONSIDER") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    if (d === "REJECT") return "bg-red-500/15 text-red-300 border-red-500/30";
    return "bg-zinc-700/40 text-zinc-400 border-zinc-700/40";
  };

  return (
    <div className="min-h-screen bg-[#09090b] py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Brand header */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white">AutoFilter</span>
            <span className="text-xs text-zinc-500 ml-1.5">Interview Kit</span>
          </div>
        </div>

        {/* Interview info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div>
              <h1 className="text-xl font-bold text-white">{candidate?.name ?? "—"}</h1>
              <p className="text-sm text-zinc-400 mt-0.5">{job?.title ?? "—"}</p>
            </div>
            {ai && (
              <div className="text-center">
                <p className="text-3xl font-black text-white">{ai.total_score.toFixed(1)}</p>
                <p className="text-xs text-zinc-500">/ 10</p>
                {ai.final_decision && (
                  <span className={`inline-block mt-1 px-3 py-1 rounded-lg border text-xs font-semibold ${decisionColor(ai.final_decision)}`}>
                    {ai.final_decision.replace("_", " ")}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-zinc-400">
              <Calendar className="w-4 h-4 shrink-0" />
              {startDate.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Clock className="w-4 h-4 shrink-0" />
              {startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} –{" "}
              {endDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <User className="w-4 h-4 shrink-0" />
              Interviewer: <span className="text-zinc-300">{interview.interviewer_name}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Mail className="w-4 h-4 shrink-0" />
              <span className="text-zinc-300">{interview.interviewer_email}</span>
            </div>
          </div>

          {interview.meet_link && (
            <a
              href={interview.meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
            >
              Tham gia Google Meet →
            </a>
          )}
        </div>

        {/* HR Notes */}
        {interview.notes && (
          <div className="bg-indigo-600/10 border border-indigo-600/20 rounded-xl p-4">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">Ghi chú từ HR</p>
            <p className="text-sm text-indigo-200 leading-relaxed">{interview.notes}</p>
          </div>
        )}

        {ai ? (
          <>
            {/* Score breakdown */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Điểm AI</h2>
              <div className="space-y-3">
                <ScoreBar label="Job Fit (Phù hợp công việc)" score={ai.job_fit_score} color="bg-blue-500" />
                <ScoreBar label="Potential (Tiềm năng)" score={ai.potential_score} color="bg-purple-500" />
                <ScoreBar label="Cultural Fit (Văn hóa)" score={ai.cultural_fit_score} color="bg-amber-500" />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Tóm tắt ứng viên</h2>
              <p className="text-sm text-zinc-300 leading-relaxed">{ai.candidate_summary}</p>
            </div>

            {/* Strengths + Weaknesses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <h2 className="text-sm font-semibold text-white">Điểm mạnh</h2>
                </div>
                <ul className="space-y-1.5">
                  {ai.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-white">Rủi ro / Điểm yếu</h2>
                </div>
                <ul className="space-y-1.5">
                  {[...ai.weaknesses, ...ai.hiring_risks].slice(0, 6).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recommended questions */}
            {ai.recommended_interview_questions.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm font-semibold text-white">Câu hỏi phỏng vấn gợi ý</h2>
                </div>
                <ol className="space-y-3">
                  {ai.recommended_interview_questions.map((q, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-600/20 border border-indigo-600/30 text-indigo-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      {q}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-sm text-zinc-500">Chưa có kết quả AI scoring cho ứng viên này.</p>
          </div>
        )}

        <p className="text-xs text-zinc-700 text-center pb-6">
          Tài liệu này được tạo tự động bởi AutoFilter AI Recruitment · Chỉ dùng nội bộ
        </p>
      </div>
    </div>
  );
}

import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { Users, Briefcase, CheckCircle, TrendingUp, ArrowRight, Clock, Activity } from "lucide-react";
import { CandidateScoringResult } from "@/services/ai/schema";

type AuditLog = {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

type CandidateRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  total_score: number | null;
  ai_score_result: CandidateScoringResult | null;
  created_at: string;
  jobs: { title: string } | null;
};

async function getDashboardData() {
  const [
    { count: openJobsCount },
    { count: totalCandidates },
    { count: scoredCount },
    { data: recentCandidates },
    { data: scoredForDecision },
    { data: auditLogs },
  ] = await Promise.all([
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "Open"),
    supabase.from("candidates").select("*", { count: "exact", head: true }),
    supabase.from("candidates").select("*", { count: "exact", head: true }).eq("status", "Scored"),
    supabase
      .from("candidates")
      .select("id, name, email, status, total_score, ai_score_result, created_at, jobs(title)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("candidates")
      .select("ai_score_result")
      .eq("status", "Scored"),
    supabaseAdmin
      .from("audit_logs")
      .select("id, entity_type, entity_id, entity_name, action, details, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const strongHireCount =
    scoredForDecision?.filter(
      (c) => (c.ai_score_result as CandidateScoringResult | null)?.final_decision === "STRONG HIRE"
    ).length ?? 0;

  return {
    openJobsCount: openJobsCount ?? 0,
    totalCandidates: totalCandidates ?? 0,
    scoredCount: scoredCount ?? 0,
    strongHireCount,
    recentCandidates: (recentCandidates ?? []) as unknown as CandidateRow[],
    auditLogs: (auditLogs ?? []) as AuditLog[],
  };
}

function decisionConfig(decision: string | undefined) {
  switch (decision) {
    case "STRONG HIRE":
      return { label: "Strong Hire", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" };
    case "HIRE":
      return { label: "Hire", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" };
    case "CONSIDER":
      return { label: "Consider", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" };
    case "REJECT":
      return { label: "Reject", className: "bg-red-500/15 text-red-400 border-red-500/20" };
    default:
      return { label: "—", className: "bg-slate-500/15 text-slate-400 border-slate-500/20" };
  }
}

function statusConfig(status: string) {
  switch (status) {
    case "Scored":
      return { label: "Đã chấm điểm", className: "bg-green-500/15 text-green-400" };
    case "Scoring":
      return { label: "Đang chấm...", className: "bg-blue-500/15 text-blue-400" };
    case "New":
      return { label: "Mới", className: "bg-slate-500/15 text-slate-400" };
    case "Interviewing":
      return { label: "Phỏng vấn", className: "bg-purple-500/15 text-purple-400" };
    case "Hired":
      return { label: "Đã tuyển", className: "bg-emerald-500/15 text-emerald-400" };
    case "Rejected":
      return { label: "Từ chối", className: "bg-red-500/15 text-red-400" };
    default:
      return { label: status, className: "bg-slate-500/15 text-slate-400" };
  }
}

function auditActionLabel(action: string, details: Record<string, unknown>): string {
  switch (action) {
    case "candidate_applied":   return `Nộp CV cho vị trí ${details.job_title ?? ""}`;
    case "candidate_scored":    return `AI chấm điểm: ${details.total_score ?? "?"}/10 — ${details.final_decision ?? ""}`;
    case "candidate_status_changed": return `Trạng thái → ${details.new_status ?? ""}`;
    case "interview_scheduled": return `Lên lịch phỏng vấn với ${details.interviewer ?? ""}`;
    case "interview_outcome":   return `Kết quả: ${details.outcome === "Hired" ? "Đã tuyển" : "Từ chối"}`;
    default: return action;
  }
}

function auditDot(action: string): string {
  switch (action) {
    case "candidate_applied":        return "bg-blue-500";
    case "candidate_scored":         return "bg-indigo-500";
    case "candidate_status_changed": return "bg-amber-500";
    case "interview_scheduled":      return "bg-purple-500";
    case "interview_outcome":        return "bg-emerald-500";
    default: return "bg-zinc-500";
  }
}

export default async function DashboardPage() {
  const { openJobsCount, totalCandidates, scoredCount, strongHireCount, recentCandidates, auditLogs } =
    await getDashboardData();

  const stats = [
    {
      label: "Vị trí đang tuyển",
      value: openJobsCount,
      icon: Briefcase,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/20",
    },
    {
      label: "Tổng ứng viên",
      value: totalCandidates,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Đã chấm điểm AI",
      value: scoredCount,
      icon: CheckCircle,
      color: "text-green-400",
      bg: "bg-green-500/10 border-green-500/20",
    },
    {
      label: "Strong Hire",
      value: strongHireCount,
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-0.5">Tổng quan hệ thống tuyển dụng AI</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="glass-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">{label}</p>
                <p className="text-2xl font-bold text-white mt-1">{value}</p>
              </div>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Candidates */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-white">Ứng viên gần đây</h2>
          </div>
          <Link
            href="/candidates"
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Xem tất cả <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentCandidates.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Chưa có ứng viên nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Ứng viên", "Vị trí", "Trạng thái", "Tổng điểm", "Quyết định AI", "Ngày nộp"].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-5 py-3 text-left text-xs font-medium text-slate-500 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {recentCandidates.map((c) => {
                  const decision = c.ai_score_result?.final_decision;
                  const decisionCfg = decisionConfig(decision);
                  const statusCfg = statusConfig(c.status);
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/candidates/${c.id}`} className="hover:text-indigo-300 transition-colors">
                          <p className="font-medium text-white">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.email}</p>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-300 whitespace-nowrap">
                        {c.jobs?.title ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {c.total_score != null ? (
                          <span className="font-semibold text-white">
                            {c.total_score.toFixed(1)}
                            <span className="text-slate-500 font-normal text-xs">/10</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${decisionCfg.className}`}>
                          {decisionCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap text-xs">
                        {new Date(c.created_at).toLocaleDateString("vi-VN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Audit Log — Hoạt động gần đây */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
          <Activity className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-white">Hoạt động gần đây</h2>
        </div>

        {auditLogs.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-500">Chưa có hoạt động nào được ghi lại</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {auditLogs.map((log) => (
              <li key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${auditDot(log.action)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">
                    {log.entity_name ?? log.entity_id}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {auditActionLabel(log.action, log.details)}
                  </p>
                </div>
                <time className="text-xs text-slate-600 shrink-0 mt-0.5 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString("vi-VN", {
                    day: "2-digit", month: "2-digit",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import {
  Users,
  Briefcase,
  TrendingUp,
  ArrowRight,
  Clock,
  Activity,
  Calendar,
  Target,
  BarChart2,
  Video,
  ChevronRight,
} from "lucide-react";
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

type TodayInterview = {
  id: string;
  start_time: string;
  end_time: string;
  interviewer_name: string;
  meet_link: string | null;
  candidates: { name: string; jobs: { title: string } | null } | null;
};

async function getDashboardData() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Start of current ISO week (Monday UTC)
  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay() + 1);
  weekStart.setUTCHours(0, 0, 0, 0);

  // 6 days ago (for 7-day trend)
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  sixDaysAgo.setUTCHours(0, 0, 0, 0);

  const [
    { count: openJobsCount },
    { count: totalCandidates },
    { count: scoredCount },
    { data: recentCandidates },
    { data: scoredForDecision },
    { data: auditLogs },
    { count: weekInterviewsCount },
    { data: todayInterviewsRaw },
    { data: weekCandidatesRaw },
  ] = await Promise.all([
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "Open"),
    supabase.from("candidates").select("*", { count: "exact", head: true }),
    supabase.from("candidates").select("*", { count: "exact", head: true }).eq("status", "Scored"),
    supabase
      .from("candidates")
      .select("id, name, email, status, total_score, ai_score_result, created_at, jobs(title)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("candidates").select("ai_score_result").eq("status", "Scored"),
    supabaseAdmin
      .from("audit_logs")
      .select("id, entity_type, entity_id, entity_name, action, details, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    supabaseAdmin
      .from("interviews")
      .select("*", { count: "exact", head: true })
      .gte("start_time", weekStart.toISOString())
      .neq("status", "Cancelled"),
    supabaseAdmin
      .from("interviews")
      .select(
        "id, start_time, end_time, interviewer_name, meet_link, candidates(name, jobs(title))"
      )
      .gte("start_time", `${todayStr}T00:00:00`)
      .lt("start_time", `${tomorrowStr}T00:00:00`)
      .neq("status", "Cancelled")
      .order("start_time", { ascending: true })
      .limit(6),
    supabase
      .from("candidates")
      .select("created_at")
      .gte("created_at", sixDaysAgo.toISOString()),
  ]);

  const strongHireCount =
    scoredForDecision?.filter(
      (c) =>
        (c.ai_score_result as CandidateScoringResult | null)?.final_decision === "STRONG HIRE"
    ).length ?? 0;

  // Build 7-day trend (count candidates per day)
  const trendDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    const count = (weekCandidatesRaw ?? []).filter(
      (c) => c.created_at.slice(0, 10) === dateStr
    ).length;
    return {
      label: d.toLocaleDateString("vi-VN", { weekday: "narrow" }),
      count,
    };
  });

  const conversionRate =
    totalCandidates && totalCandidates > 0
      ? Math.round((strongHireCount / totalCandidates) * 100)
      : 0;

  return {
    openJobsCount: openJobsCount ?? 0,
    totalCandidates: totalCandidates ?? 0,
    scoredCount: scoredCount ?? 0,
    strongHireCount,
    conversionRate,
    recentCandidates: (recentCandidates ?? []) as unknown as CandidateRow[],
    auditLogs: (auditLogs ?? []) as AuditLog[],
    weekInterviewsCount: weekInterviewsCount ?? 0,
    todayInterviews: (todayInterviewsRaw ?? []) as unknown as TodayInterview[],
    trendDays,
  };
}

/* ── Helpers ── */
function decisionConfig(decision: string | undefined) {
  switch (decision) {
    case "STRONG HIRE":
      return { label: "Strong Hire", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" };
    case "HIRE":
      return { label: "Hire", cls: "bg-blue-500/15 text-blue-400 border-blue-500/20" };
    case "CONSIDER":
      return { label: "Consider", cls: "bg-amber-500/15 text-amber-400 border-amber-500/20" };
    case "REJECT":
      return { label: "Reject", cls: "bg-red-500/15 text-red-400 border-red-500/20" };
    default:
      return { label: "—", cls: "bg-slate-500/15 text-slate-400 border-slate-500/20" };
  }
}

function statusConfig(status: string) {
  switch (status) {
    case "Scored":
      return { label: "Đã chấm điểm", cls: "bg-green-500/15 text-green-400" };
    case "Scoring":
      return { label: "Đang chấm...", cls: "bg-blue-500/15 text-blue-400" };
    case "New":
      return { label: "Mới", cls: "bg-slate-500/15 text-slate-400" };
    case "Interviewing":
      return { label: "Phỏng vấn", cls: "bg-purple-500/15 text-purple-400" };
    case "Hired":
      return { label: "Đã tuyển", cls: "bg-emerald-500/15 text-emerald-400" };
    case "Rejected":
      return { label: "Từ chối", cls: "bg-red-500/15 text-red-400" };
    default:
      return { label: status, cls: "bg-slate-500/15 text-slate-400" };
  }
}

function auditActionLabel(action: string, details: Record<string, unknown>): string {
  switch (action) {
    case "candidate_applied":
      return `Nộp CV — ${details.job_title ?? ""}`;
    case "candidate_scored":
      return `AI chấm: ${details.total_score ?? "?"}/10 · ${details.final_decision ?? ""}`;
    case "candidate_status_changed":
      return `Trạng thái → ${details.new_status ?? ""}`;
    case "interview_scheduled":
      return `Lên lịch PV với ${details.interviewer ?? ""}`;
    case "interview_outcome":
      return `Kết quả: ${details.outcome === "Hired" ? "Đã tuyển ✓" : "Từ chối"}`;
    default:
      return action;
  }
}

function auditDot(action: string): string {
  switch (action) {
    case "candidate_applied":        return "bg-blue-500";
    case "candidate_scored":         return "bg-violet-500";
    case "candidate_status_changed": return "bg-amber-500";
    case "interview_scheduled":      return "bg-purple-500";
    case "interview_outcome":        return "bg-emerald-500";
    default:                         return "bg-slate-600";
  }
}

/* ── Trend chart (pure CSS) ── */
function TrendChart({ days }: { days: { label: string; count: number }[] }) {
  const maxCount = Math.max(...days.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1.5 h-20 mt-2">
      {days.map((d, i) => {
        const pct = Math.max((d.count / maxCount) * 100, d.count > 0 ? 8 : 3);
        const isLast = i === days.length - 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
            <div
              className="w-full rounded-t-md transition-all duration-300 relative overflow-hidden"
              style={{
                height: `${pct}%`,
                background: isLast
                  ? "linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)"
                  : "rgba(37,99,235,0.35)",
                boxShadow: isLast ? "0 0 8px rgba(59,130,246,0.4)" : undefined,
              }}
            >
              {d.count > 0 && isLast && (
                <div className="absolute inset-0 bg-white/5" />
              )}
            </div>
            <span className="text-[9px]" style={{ color: isLast ? "#93c5fd" : "rgba(71,85,105,0.9)" }}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main dashboard page ── */
export default async function DashboardPage() {
  const {
    openJobsCount,
    totalCandidates,
    scoredCount,
    strongHireCount,
    conversionRate,
    weekInterviewsCount,
    recentCandidates,
    auditLogs,
    todayInterviews,
    trendDays,
  } = await getDashboardData();

  const stats = [
    {
      label: "Tổng ứng viên",
      value: totalCandidates,
      icon: Users,
      iconCls: "text-blue-400",
      cardCls: "stat-blue",
      href: "/candidates",
      note: `${scoredCount} đã chấm điểm`,
    },
    {
      label: "PV tuần này",
      value: weekInterviewsCount,
      icon: Calendar,
      iconCls: "text-violet-400",
      cardCls: "stat-violet",
      href: "/interviews",
      note: `${todayInterviews.length} hôm nay`,
    },
    {
      label: "Vị trí đang tuyển",
      value: openJobsCount,
      icon: Briefcase,
      iconCls: "text-amber-400",
      cardCls: "stat-amber",
      href: "/jobs",
      note: "Job đang mở",
    },
    {
      label: "Strong Hire",
      value: strongHireCount,
      icon: TrendingUp,
      iconCls: "text-emerald-400",
      cardCls: "stat-emerald",
      href: "/candidates",
      note: `${conversionRate}% tỷ lệ convert`,
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Recruiting Operations
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(100,116,139,0.9)" }}>
            Tổng quan hệ thống tuyển dụng AI — cập nhật realtime
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: "rgba(37,99,235,0.10)",
              border: "1px solid rgba(37,99,235,0.2)",
              color: "#93c5fd",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Live
          </div>
          <Link
            href="/cv-analyzer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
              boxShadow: "0 2px 8px rgba(37,99,235,0.35)",
            }}
          >
            Phân tích CV mới
          </Link>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, iconCls, cardCls, href, note }) => (
          <Link key={label} href={href} className="glass-card p-4 group hover:scale-[1.01] transition-transform duration-200 block">
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center ${cardCls}`}
              >
                <Icon className={`w-4 h-4 ${iconCls}`} />
              </div>
              <ChevronRight
                className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity"
                style={{ color: "#60a5fa" }}
              />
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: "rgba(148,163,184,0.8)" }}>
              {label}
            </p>
            <p className="text-[11px] mt-1.5 font-medium badge-up px-1.5 py-0.5 rounded-md inline-block">
              {note}
            </p>
          </Link>
        ))}
      </div>

      {/* ── Middle row: Trend chart + Today's interviews ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Trend chart (3/5 width) */}
        <div className="glass-card p-5 lg:col-span-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4" style={{ color: "#60a5fa" }} />
              <h2 className="text-sm font-semibold text-white">Xu hướng ứng viên</h2>
            </div>
            <span className="text-xs" style={{ color: "rgba(100,116,139,0.8)" }}>7 ngày qua</span>
          </div>
          <p className="text-xs mb-3" style={{ color: "rgba(100,116,139,0.7)" }}>
            Số ứng viên nộp hồ sơ mỗi ngày trong tuần qua
          </p>
          <TrendChart days={trendDays} />
          <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(100,116,139,0.8)" }}>
              <div className="w-3 h-2 rounded-sm" style={{ background: "linear-gradient(90deg, #3b82f6, #1d4ed8)" }} />
              Hôm nay
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(100,116,139,0.8)" }}>
              <div className="w-3 h-2 rounded-sm" style={{ background: "rgba(37,99,235,0.35)" }} />
              Ngày khác
            </div>
          </div>
        </div>

        {/* Today's interviews (2/5 width) */}
        <div className="glass-card lg:col-span-2 flex flex-col">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: "#60a5fa" }} />
              <h2 className="text-sm font-semibold text-white">Phỏng vấn hôm nay</h2>
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: "rgba(37,99,235,0.12)",
                color: "#93c5fd",
                border: "1px solid rgba(37,99,235,0.22)",
              }}
            >
              {todayInterviews.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll">
            {todayInterviews.length === 0 ? (
              <div className="py-10 text-center">
                <Calendar className="w-7 h-7 mx-auto mb-2" style={{ color: "rgba(71,85,105,0.8)" }} />
                <p className="text-sm" style={{ color: "rgba(100,116,139,0.7)" }}>
                  Không có lịch hôm nay
                </p>
                <Link
                  href="/interviews"
                  className="mt-3 inline-block text-xs"
                  style={{ color: "#60a5fa" }}
                >
                  Xem tất cả lịch →
                </Link>
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                {todayInterviews.map((iv) => {
                  const time = new Date(iv.start_time).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const endTime = new Date(iv.end_time).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <li key={iv.id} className="flex items-start gap-3 px-5 py-3">
                      <div
                        className="mt-0.5 text-[10px] font-bold tabular-nums px-1.5 py-1 rounded-md shrink-0"
                        style={{
                          background: "rgba(37,99,235,0.12)",
                          color: "#93c5fd",
                          minWidth: "44px",
                          textAlign: "center",
                        }}
                      >
                        {time}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {iv.candidates?.name ?? "—"}
                        </p>
                        <p className="text-xs truncate mt-0.5" style={{ color: "rgba(100,116,139,0.8)" }}>
                          {iv.candidates?.jobs?.title ?? "Chưa rõ vị trí"} · đến {endTime}
                        </p>
                        {iv.meet_link && (
                          <a
                            href={iv.meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium"
                            style={{ color: "#60a5fa" }}
                          >
                            <Video className="w-3 h-3" /> Meet link
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div
            className="px-5 py-2.5"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <Link
              href="/interviews"
              className="flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg w-full transition-colors"
              style={{
                color: "#93c5fd",
                background: "rgba(37,99,235,0.07)",
              }}
            >
              Quản lý lịch phỏng vấn <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Recent candidates table ── */}
      <div className="glass-card overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: "#60a5fa" }} />
            <h2 className="text-sm font-semibold text-white">Ứng viên gần đây</h2>
          </div>
          <Link
            href="/candidates"
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: "#60a5fa" }}
          >
            Xem tất cả <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentCandidates.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(71,85,105,0.7)" }} />
            <p className="text-sm" style={{ color: "rgba(100,116,139,0.7)" }}>
              Chưa có ứng viên nào
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {["Ứng viên", "Vị trí", "Trạng thái", "Tổng điểm", "Quyết định AI", "Ngày nộp"].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-5 py-3 text-left text-xs font-semibold whitespace-nowrap uppercase tracking-wide"
                        style={{ color: "rgba(71,85,105,0.9)" }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {recentCandidates.map((c) => {
                  const decision = c.ai_score_result?.final_decision;
                  const dcfg = decisionConfig(decision);
                  const scfg = statusConfig(c.status);
                  return (
                    <tr
                      key={c.id}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                    >
                      <td className="px-5 py-3">
                        <Link href={`/candidates/${c.id}`} className="group">
                          <p className="font-medium text-white group-hover:text-blue-300 transition-colors">
                            {c.name}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(100,116,139,0.7)" }}>
                            {c.email}
                          </p>
                        </Link>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap" style={{ color: "rgba(203,213,225,0.9)" }}>
                        {c.jobs?.title ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${scfg.cls}`}
                        >
                          {scfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {c.total_score != null ? (
                          <span
                            className={`font-bold tabular-nums ${
                              c.total_score >= 7
                                ? "text-emerald-400"
                                : c.total_score >= 5
                                ? "text-amber-400"
                                : "text-red-400"
                            }`}
                          >
                            {c.total_score.toFixed(1)}
                            <span className="text-xs font-normal" style={{ color: "rgba(100,116,139,0.7)" }}>
                              /10
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: "rgba(71,85,105,0.8)" }}>—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${dcfg.cls}`}
                        >
                          {dcfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-xs" style={{ color: "rgba(71,85,105,0.9)" }}>
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

      {/* ── Activity feed ── */}
      <div className="glass-card overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: "#60a5fa" }} />
            <h2 className="text-sm font-semibold text-white">Hoạt động gần đây</h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(100,116,139,0.7)" }}>
            <Target className="w-3 h-3" />
            Audit log
          </div>
        </div>

        {auditLogs.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm" style={{ color: "rgba(100,116,139,0.7)" }}>
              Chưa có hoạt động nào được ghi lại
            </p>
          </div>
        ) : (
          <ul>
            {auditLogs.map((log, i) => (
              <li
                key={log.id}
                className="flex items-start gap-3 px-5 py-3 transition-colors"
                style={{
                  borderBottom:
                    i < auditLogs.length - 1 ? "1px solid rgba(255,255,255,0.03)" : undefined,
                }}
              >
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${auditDot(log.action)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {log.entity_name ?? log.entity_id}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(100,116,139,0.8)" }}>
                    {auditActionLabel(log.action, log.details)}
                  </p>
                </div>
                <time className="text-xs shrink-0 mt-0.5 whitespace-nowrap" style={{ color: "rgba(71,85,105,0.9)" }}>
                  {new Date(log.created_at).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
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
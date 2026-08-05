import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CandidateScoringResult } from "@/services/ai/schema";
import { DashboardClient } from "@/components/dashboard-client";

// Dashboard đọc dữ liệu ứng viên/phỏng vấn thay đổi liên tục (quét mail, ứng
// viên nộp CV...) — không được cache tĩnh, mỗi lần vào phải render lại mới.
export const dynamic = "force-dynamic";

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

const STATUS_KEYS = ["New", "Scoring", "Scored", "Interviewing", "Hired", "Rejected"] as const;
const DECISION_KEYS = ["STRONG HIRE", "HIRE", "CONSIDER", "REJECT"] as const;

export type JobChartBucket = {
  jobTitle: string;
  total: number;
  status: Record<string, number>;
  decision: Record<string, number>;
};

export type CandidateChartData = {
  overall: { total: number; status: Record<string, number>; decision: Record<string, number> };
  byJob: JobChartBucket[];
};

function emptyCounter(keys: readonly string[]): Record<string, number> {
  return Object.fromEntries(keys.map((k) => [k, 0]));
}

function buildChartData(
  rows: { status: string; ai_score_result: CandidateScoringResult | null; jobs: { title: string } | null }[]
): CandidateChartData {
  const overallStatus = emptyCounter(STATUS_KEYS);
  const overallDecision = emptyCounter(DECISION_KEYS);
  const byJobMap = new Map<string, JobChartBucket>();

  for (const row of rows) {
    const jobTitle = row.jobs?.title ?? "Chưa gán vị trí";
    const decision = row.ai_score_result?.final_decision;

    if (row.status in overallStatus) overallStatus[row.status]++;
    if (decision && decision in overallDecision) overallDecision[decision]++;

    if (!byJobMap.has(jobTitle)) {
      byJobMap.set(jobTitle, { jobTitle, total: 0, status: emptyCounter(STATUS_KEYS), decision: emptyCounter(DECISION_KEYS) });
    }
    const bucket = byJobMap.get(jobTitle)!;
    bucket.total++;
    if (row.status in bucket.status) bucket.status[row.status]++;
    if (decision && decision in bucket.decision) bucket.decision[decision]++;
  }

  return {
    overall: { total: rows.length, status: overallStatus, decision: overallDecision },
    byJob: Array.from(byJobMap.values()).sort((a, b) => b.total - a.total),
  };
}

async function getDashboardData() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay() + 1);
  weekStart.setUTCHours(0, 0, 0, 0);

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
    { data: chartRowsRaw },
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
      .select("id, start_time, end_time, interviewer_name, meet_link, candidates(name, jobs(title))")
      .gte("start_time", `${todayStr}T00:00:00`)
      .lt("start_time", `${tomorrowStr}T00:00:00`)
      .neq("status", "Cancelled")
      .order("start_time", { ascending: true })
      .limit(6),
    supabase
      .from("candidates")
      .select("created_at")
      .gte("created_at", sixDaysAgo.toISOString()),
    supabase
      .from("candidates")
      .select("status, ai_score_result, jobs(title)"),
  ]);

  const strongHireCount =
    scoredForDecision?.filter(
      (c) =>
        (c.ai_score_result as CandidateScoringResult | null)?.final_decision === "STRONG HIRE"
    ).length ?? 0;

  const trendDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
    const dateIso = d.toISOString().slice(0, 10);
    const count = (weekCandidatesRaw ?? []).filter(
      (c) => c.created_at.slice(0, 10) === dateIso
    ).length;
    return { dateIso, count };
  });

  const conversionRate =
    totalCandidates && totalCandidates > 0
      ? Math.round((strongHireCount / totalCandidates) * 100)
      : 0;

  const chartData = buildChartData(
    (chartRowsRaw ?? []) as unknown as { status: string; ai_score_result: CandidateScoringResult | null; jobs: { title: string } | null }[]
  );

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
    chartData,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <DashboardClient data={data} />;
}
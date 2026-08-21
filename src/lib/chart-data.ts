import { CandidateScoringResult } from "@/services/ai/schema";

// Dùng chung giữa page.tsx (server, tính all-time) và candidate-status-chart.tsx
// (client, lọc lại theo tháng) — tách riêng để component client không phải
// import từ page.tsx (kéo theo code server-only).

export const STATUS_KEYS = ["New", "Scored", "Interviewing", "Hired", "Rejected"] as const;
export const DECISION_KEYS = ["STRONG HIRE", "HIRE", "CONSIDER", "REJECT"] as const;

export type ChartCandidateRow = {
  status: string;
  ai_score_result: CandidateScoringResult | null;
  jobs: { title: string } | null;
  created_at: string;
};

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

export function buildChartData(rows: ChartCandidateRow[]): CandidateChartData {
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

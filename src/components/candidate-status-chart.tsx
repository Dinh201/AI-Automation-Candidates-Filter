"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart2 } from "lucide-react";
import type { CandidateChartData } from "@/app/page";

type Metric = "status" | "decision";
const ALL_JOBS = "__all__";

// Đã chạy scripts/validate_palette.js (skill dataviz) — tất cả pass CVD/contrast
// cho cả light & dark surface của app (--ats-surface). Thứ tự cố định, không
// đổi khi filter/metric thay đổi (color theo entity, không theo rank).
const STATUS_META: { key: string; label: string; color: string }[] = [
  { key: "New", label: "Mới", color: "#d97706" },
  { key: "Scoring", label: "Đang chấm điểm", color: "#3b82f6" },
  { key: "Scored", label: "Đã chấm điểm", color: "#16a34a" },
  { key: "Interviewing", label: "Đang phỏng vấn", color: "#a855f7" },
  { key: "Hired", label: "Đã tuyển", color: "#059669" },
  { key: "Rejected", label: "Từ chối", color: "#ef4444" },
];

// Riêng "Consider" dùng 2 sắc thái khác nhau giữa light/dark để tách biệt đủ
// xa khỏi "Reject" (đỏ) qua kiểm tra CVD — xem ghi chú trong palette.md.
const DECISION_META: { key: string; label: string; color: string; colorDark: string }[] = [
  { key: "STRONG HIRE", label: "Strong Hire", color: "#059669", colorDark: "#059669" },
  { key: "HIRE", label: "Hire", color: "#3b82f6", colorDark: "#3b82f6" },
  { key: "CONSIDER", label: "Consider", color: "#854d0e", colorDark: "#d97706" },
  { key: "REJECT", label: "Reject", color: "#ef4444", colorDark: "#db2777" },
];

function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    setIsDark(root.classList.contains("dark"));
    const observer = new MutationObserver(() => setIsDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

const CHART_HEIGHT = 176; // px — chiều cao vùng cột (bao gồm cả chỗ cho label số liệu)
const LABEL_SPACE = 22; // px — khoảng dành riêng phía trên đỉnh cột cho số liệu, để label luôn nằm trong CHART_HEIGHT
const BAR_MAX = CHART_HEIGHT - LABEL_SPACE;

function ColumnChart({
  total,
  counts,
  meta,
}: {
  total: number;
  counts: Record<string, number>;
  meta: { key: string; label: string; color: string }[];
}) {
  const [hover, setHover] = useState<string | null>(null);
  const maxCount = Math.max(...meta.map((m) => counts[m.key] ?? 0), 1);

  return (
    <div className="py-2">
      <div className="flex items-end justify-center gap-4 sm:gap-6">
        {meta.map((m) => {
          const count = counts[m.key] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          const barHeight = count > 0 ? Math.max((count / maxCount) * BAR_MAX, 6) : 0;
          const isHover = hover === m.key;
          return (
            <div
              key={m.key}
              onMouseEnter={() => setHover(m.key)}
              onMouseLeave={() => setHover(null)}
              className="flex flex-col items-center flex-1 max-w-[84px] min-w-0 cursor-default"
              title={`${m.label}: ${count} (${pct.toFixed(0)}%)`}
            >
              {/* Vùng cột — số liệu định vị tuyệt đối ngay trên đỉnh cột, luôn nằm trong CHART_HEIGHT */}
              <div className="relative w-full" style={{ height: CHART_HEIGHT }}>
                <span
                  className="absolute left-1/2 -translate-x-1/2 text-sm font-bold tabular-nums ats-text-h whitespace-nowrap"
                  style={{ bottom: barHeight + 6 }}
                >
                  {count}
                </span>
                <div
                  className="absolute left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[40px] rounded-t-md transition-all duration-150"
                  style={{
                    height: count > 0 ? barHeight : 4,
                    background: count > 0 ? m.color : "var(--ats-surface-2)",
                    opacity: hover && !isHover ? 0.4 : 1,
                    boxShadow: isHover ? `0 0 0 1px ${m.color}` : undefined,
                  }}
                />
              </div>
              {/* Vùng tên — chiều cao cố định, tối đa 2 dòng */}
              <div className="h-8 flex items-start justify-center mt-2">
                <span className="text-[11px] ats-text-muted text-center leading-tight px-0.5 line-clamp-2">{m.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CandidateStatusChart({ data }: { data: CandidateChartData }) {
  const [metric, setMetric] = useState<Metric>("status");
  const [jobFilter, setJobFilter] = useState(ALL_JOBS);
  const isDark = useIsDark();

  const meta = useMemo(() => {
    if (metric === "status") return STATUS_META;
    return DECISION_META.map((m) => ({ key: m.key, label: m.label, color: isDark ? m.colorDark : m.color }));
  }, [metric, isDark]);

  const scope = useMemo(() => {
    if (jobFilter === ALL_JOBS) return { total: data.overall.total, counts: metric === "status" ? data.overall.status : data.overall.decision };
    const job = data.byJob.find((j) => j.jobTitle === jobFilter);
    if (!job) return { total: 0, counts: {} as Record<string, number> };
    return { total: job.total, counts: metric === "status" ? job.status : job.decision };
  }, [data, jobFilter, metric]);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          <h2 className="text-base font-bold tracking-tight ats-accent-text">Thống kê ứng viên theo vị trí</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none"
            style={{ background: "var(--ats-surface-2)", color: "var(--ats-text-h)", border: "1px solid var(--ats-border)" }}
          >
            <option value={ALL_JOBS}>Tất cả vị trí</option>
            {data.byJob.map((j) => (
              <option key={j.jobTitle} value={j.jobTitle}>{j.jobTitle}</option>
            ))}
          </select>
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "var(--ats-surface-2)" }}>
            {(["status", "decision"] as Metric[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                style={
                  metric === m
                    ? { background: "var(--ats-surface)", color: "var(--ats-accent-text)", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }
                    : { color: "var(--ats-text-muted)" }
                }
              >
                {m === "status" ? "Theo trạng thái" : "Theo quyết định AI"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {data.overall.total === 0 ? (
        <p className="text-sm text-center py-8 ats-text-muted">Chưa có dữ liệu ứng viên.</p>
      ) : (
        <ColumnChart total={scope.total} counts={scope.counts} meta={meta} />
      )}
    </div>
  );
}

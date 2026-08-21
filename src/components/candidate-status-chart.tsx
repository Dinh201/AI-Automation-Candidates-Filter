"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart2 } from "lucide-react";
import type { CandidateChartData, JobChartBucket } from "@/app/page";

type Metric = "status" | "decision";

const STATUS_META: { key: string; label: string }[] = [
  { key: "New", label: "Mới" },
  { key: "Scored", label: "Đã chấm điểm" },
  { key: "Interviewing", label: "Đang phỏng vấn" },
  { key: "Hired", label: "Đã tuyển" },
  { key: "Rejected", label: "Từ chối" },
];

const DECISION_META: { key: string; label: string }[] = [
  { key: "STRONG HIRE", label: "Strong Hire" },
  { key: "HIRE", label: "Hire" },
  { key: "CONSIDER", label: "Consider" },
  { key: "REJECT", label: "Reject" },
];

// Màu giờ gắn theo VỊ TRÍ (job) chứ không theo trạng thái/quyết định nữa —
// mỗi cột giờ là 1 stacked bar gộp tất cả vị trí. Tối đa 6 vị trí có màu
// riêng (theo tổng ứng viên toàn hệ thống, thứ tự cố định không đổi khi đổi
// metric), các vị trí còn lại gộp vào "Khác" (xám trung tính, không tính là
// 1 hue categorical). Đã chạy scripts/validate_palette.js (skill dataviz) —
// PASS lightness/chroma/contrast, CVD ở mức WARN (6–8) được bù bằng legend +
// tooltip trực tiếp (secondary encoding) cho cả light & dark surface của app.
const MAX_FEATURED_JOBS = 6;
const JOB_COLOR_SLOTS: { light: string; dark: string }[] = [
  { light: "#2563eb", dark: "#3b82f6" }, // blue
  { light: "#ea580c", dark: "#ea580c" }, // orange
  { light: "#0d9488", dark: "#0d9488" }, // teal
  { light: "#ca8a04", dark: "#a16207" }, // yellow
  { light: "#db2777", dark: "#ec4899" }, // pink
  { light: "#16a34a", dark: "#16a34a" }, // green
];
const OTHER_JOB_COLOR = { light: "#94a3b8", dark: "#64748b" };
const OTHER_JOB_KEY = "__other__";

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

type JobColorEntry = { jobTitle: string; colorKey: string; color: string };

function useJobColors(byJob: JobChartBucket[], isDark: boolean) {
  return useMemo(() => {
    const featured = byJob.slice(0, MAX_FEATURED_JOBS);
    const rest = byJob.slice(MAX_FEATURED_JOBS);
    const entries: JobColorEntry[] = featured.map((j, i) => ({
      jobTitle: j.jobTitle,
      colorKey: j.jobTitle,
      color: isDark ? JOB_COLOR_SLOTS[i].dark : JOB_COLOR_SLOTS[i].light,
    }));
    const byTitle = new Map(entries.map((e) => [e.jobTitle, e]));
    return { featured, rest, entries, byTitle };
  }, [byJob, isDark]);
}

type Segment = { key: string; label: string; count: number; color: string };

const CHART_HEIGHT = 176; // px — chiều cao vùng cột (bao gồm cả chỗ cho label tổng)
const LABEL_SPACE = 22; // px — khoảng dành riêng phía trên đỉnh cột cho số liệu
const BAR_MAX = CHART_HEIGHT - LABEL_SPACE;
const BAR_WIDTH = 24; // px — theo mark spec (bar/column ≤24px thick)
const SEGMENT_GAP = 2; // px — surface gap giữa các segment trong 1 stacked bar

function StackedBarChart({
  categories,
  segmentsByCategory,
  overallCounts,
  hoverJob,
  onHoverJob,
  tooltip,
  onShowTooltip,
  onHideTooltip,
}: {
  categories: { key: string; label: string }[];
  segmentsByCategory: Record<string, Segment[]>;
  overallCounts: Record<string, number>;
  hoverJob: string | null;
  onHoverJob: (job: string | null) => void;
  tooltip: string | null;
  onShowTooltip: (id: string) => void;
  onHideTooltip: () => void;
}) {
  const maxCount = Math.max(...categories.map((c) => overallCounts[c.key] ?? 0), 1);

  return (
    <div className="py-2">
      <div className="flex items-end justify-center gap-4 sm:gap-6">
        {categories.map((cat) => {
          const total = overallCounts[cat.key] ?? 0;
          const segments = segmentsByCategory[cat.key] ?? [];
          const stackHeight = total > 0 ? Math.max((total / maxCount) * BAR_MAX, 6) : 0;

          return (
            <div key={cat.key} className="flex flex-col items-center flex-1 max-w-[84px] min-w-0 cursor-default">
              <div className="relative w-full" style={{ height: CHART_HEIGHT }}>
                <span
                  className="absolute left-1/2 -translate-x-1/2 text-sm font-bold tabular-nums ats-text-h whitespace-nowrap"
                  style={{ bottom: stackHeight + 6 }}
                >
                  {total}
                </span>

                {total === 0 ? (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 bottom-0 rounded-t-md"
                    style={{ height: 4, width: BAR_WIDTH, background: "var(--ats-surface-2)" }}
                  />
                ) : (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 bottom-0 flex flex-col-reverse rounded-t-md overflow-hidden"
                    style={{ width: BAR_WIDTH, height: stackHeight }}
                  >
                    {(() => {
                      // Gap giữa các segment cộng thêm chiều cao ngoài stackHeight —
                      // trừ trước tổng gap (co giãn khi cột thấp/nhiều segment) để
                      // tổng chiều cao luôn khớp đúng stackHeight, không tràn/bị cắt.
                      const rawGapTotal = (segments.length - 1) * SEGMENT_GAP;
                      const gapTotal = Math.min(rawGapTotal, stackHeight * 0.3);
                      const gapPerSeg = segments.length > 1 ? gapTotal / (segments.length - 1) : 0;
                      const usableHeight = stackHeight - gapTotal;

                      return segments.map((seg, i) => {
                        const segHeight = (seg.count / total) * usableHeight;
                        const tooltipId = `${cat.key}::${seg.key}`;
                        const isDimmed = hoverJob !== null && hoverJob !== seg.key;
                        return (
                          <div
                            key={seg.key}
                            className="relative w-full"
                            style={{
                              height: segHeight,
                              marginTop: i === 0 ? 0 : gapPerSeg,
                              background: seg.color,
                              opacity: isDimmed ? 0.35 : 1,
                              transition: "opacity 150ms",
                              boxShadow: hoverJob === seg.key ? `0 0 0 1px ${seg.color}` : undefined,
                            }}
                            onMouseEnter={() => {
                              onHoverJob(seg.key);
                              onShowTooltip(tooltipId);
                            }}
                            onMouseLeave={() => {
                              onHoverJob(null);
                              onHideTooltip();
                            }}
                          >
                            {tooltip === tooltipId && (
                              <div
                                className="absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-2 px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none"
                                style={{ background: "var(--ats-surface)", border: "1px solid var(--ats-border)" }}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-bold tabular-nums ats-text-h">{seg.count}</span>
                                  <span className="text-[11px] ats-text-muted">
                                    ({((seg.count / total) * 100).toFixed(0)}%)
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                                  <span className="text-[11px] ats-text-body">{seg.label}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              <div className="h-8 flex items-start justify-center mt-2">
                <span className="text-[11px] ats-text-muted text-center leading-tight px-0.5 line-clamp-2">{cat.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function JobLegend({
  entries,
  otherTotal,
  hoverJob,
  onHoverJob,
}: {
  entries: JobColorEntry[];
  otherTotal: number;
  hoverJob: string | null;
  onHoverJob: (job: string | null) => void;
}) {
  const items = [
    ...entries,
    ...(otherTotal > 0 ? [{ jobTitle: "Khác", colorKey: OTHER_JOB_KEY, color: "" }] : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t" style={{ borderColor: "var(--ats-border)" }}>
      {items.map((it) => {
        const isOther = it.colorKey === OTHER_JOB_KEY;
        const isDimmed = hoverJob !== null && hoverJob !== it.colorKey;
        return (
          <div
            key={it.colorKey}
            onMouseEnter={() => onHoverJob(it.colorKey)}
            onMouseLeave={() => onHoverJob(null)}
            className="flex items-center gap-1.5 max-w-[220px] cursor-default transition-opacity"
            style={{ opacity: isDimmed ? 0.45 : 1 }}
            title={it.jobTitle}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: isOther ? "var(--ats-text-muted)" : it.color }}
            />
            <span className="text-[11px] ats-text-body truncate">{it.jobTitle}</span>
          </div>
        );
      })}
    </div>
  );
}

export function CandidateStatusChart({ data }: { data: CandidateChartData }) {
  const [metric, setMetric] = useState<Metric>("status");
  const [hoverJob, setHoverJob] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const isDark = useIsDark();

  const categories = metric === "status" ? STATUS_META : DECISION_META;
  const overallCounts = metric === "status" ? data.overall.status : data.overall.decision;
  const { featured, rest, entries, byTitle } = useJobColors(data.byJob, isDark);
  const otherColor = isDark ? OTHER_JOB_COLOR.dark : OTHER_JOB_COLOR.light;

  const segmentsByCategory = useMemo(() => {
    const result: Record<string, Segment[]> = {};
    for (const cat of categories) {
      const segs: Segment[] = [];
      for (const job of featured) {
        const count = (metric === "status" ? job.status : job.decision)[cat.key] ?? 0;
        if (count > 0) {
          segs.push({ key: job.jobTitle, label: job.jobTitle, count, color: byTitle.get(job.jobTitle)!.color });
        }
      }
      const otherCount = rest.reduce((sum, job) => sum + ((metric === "status" ? job.status : job.decision)[cat.key] ?? 0), 0);
      if (otherCount > 0) {
        segs.push({ key: OTHER_JOB_KEY, label: "Khác", count: otherCount, color: otherColor });
      }
      result[cat.key] = segs;
    }
    return result;
  }, [categories, featured, rest, byTitle, metric, otherColor]);

  const otherTotal = rest.reduce((sum, j) => sum + j.total, 0);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          <h2 className="text-base font-bold tracking-tight ats-accent-text">Thống kê ứng viên theo vị trí</h2>
        </div>
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

      {data.overall.total === 0 ? (
        <p className="text-sm text-center py-8 ats-text-muted">Chưa có dữ liệu ứng viên.</p>
      ) : (
        <>
          <StackedBarChart
            categories={categories}
            segmentsByCategory={segmentsByCategory}
            overallCounts={overallCounts}
            hoverJob={hoverJob}
            onHoverJob={setHoverJob}
            tooltip={tooltip}
            onShowTooltip={setTooltip}
            onHideTooltip={() => setTooltip(null)}
          />
          <JobLegend entries={entries} otherTotal={otherTotal} hoverJob={hoverJob} onHoverJob={setHoverJob} />
        </>
      )}
    </div>
  );
}

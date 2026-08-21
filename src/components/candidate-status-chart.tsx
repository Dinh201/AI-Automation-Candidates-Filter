"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { PieChart } from "lucide-react";
import { buildChartData, type ChartCandidateRow, type JobChartBucket } from "@/lib/chart-data";

type Metric = "status" | "decision";
const ALL_TIME = "all";
const ALL_CATEGORIES = "all";

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

// Màu gắn theo VỊ TRÍ (job) — mỗi lát cắt donut là 1 vị trí. Tối đa 6 vị trí
// có màu riêng (xếp theo tổng ứng viên TOÀN THỜI GIAN — không đổi khi lọc
// theo tháng/trạng thái, tránh "recolor-on-filter"), các vị trí còn lại gộp
// vào "Khác" (xám trung tính, không tính là 1 hue categorical). Đã chạy
// scripts/validate_palette.js (skill dataviz) — PASS lightness/chroma/
// contrast, CVD ở mức WARN (6–8) được bù bằng legend + tooltip trực tiếp
// (secondary encoding) cho cả light & dark surface của app.
const MAX_FEATURED_JOBS = 6;
const JOB_COLOR_SLOTS: { light: string; dark: string }[] = [
  { light: "#2563eb", dark: "#3b82f6" }, // blue
  { light: "#ea580c", dark: "#ea580c" }, // orange
  { light: "#0891b2", dark: "#0891b2" }, // cyan — tách biệt rõ với slot xanh lá bên dưới
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

type JobColor = { jobTitle: string; color: string };

function useJobColors(byJob: JobChartBucket[], isDark: boolean) {
  return useMemo(() => {
    const featured = byJob.slice(0, MAX_FEATURED_JOBS);
    const featuredTitles = new Set(featured.map((j) => j.jobTitle));
    const colors: JobColor[] = featured.map((j, i) => ({
      jobTitle: j.jobTitle,
      color: isDark ? JOB_COLOR_SLOTS[i].dark : JOB_COLOR_SLOTS[i].light,
    }));
    const byTitle = new Map(colors.map((c) => [c.jobTitle, c.color]));
    return { featuredTitles, byTitle };
  }, [byJob, isDark]);
}

function monthKey(iso: string): string {
  return iso.slice(0, 7); // "YYYY-MM"
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `Tháng ${parseInt(m, 10)}/${y}`;
}

type Segment = { key: string; label: string; color: string; value: number };
type Point = { x: number; y: number };

// ─── Hình học donut "explode" — mỗi lát cắt tách nhẹ ra khỏi tâm theo phân
// giác góc của chính nó, có khoảng hở giữa các lát (thay cho border) ───────
const DONUT_SIZE = 224;
const CENTER = DONUT_SIZE / 2;
const OUTER_R = 98;
const INNER_R = 60;
const GAP_DEG = 2.4;
const EXPLODE = 6;
const EXPLODE_HOVER = 13;

function polarPoint(r: number, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + r * Math.sin(rad), y: CENTER - r * Math.cos(rad) };
}

function slicePath(startAngle: number, endAngle: number): string {
  const large = endAngle - startAngle > 180 ? 1 : 0;
  const p1 = polarPoint(OUTER_R, startAngle);
  const p2 = polarPoint(OUTER_R, endAngle);
  const p3 = polarPoint(INNER_R, endAngle);
  const p4 = polarPoint(INNER_R, startAngle);
  return `M ${p1.x},${p1.y} A ${OUTER_R},${OUTER_R} 0 ${large} 1 ${p2.x},${p2.y} L ${p3.x},${p3.y} A ${INNER_R},${INNER_R} 0 ${large} 0 ${p4.x},${p4.y} Z`;
}

function DonutChart({
  segments,
  total,
  totalLabel,
  hoverJob,
  onHoverJob,
}: {
  segments: Segment[];
  total: number;
  totalLabel: string;
  hoverJob: string | null;
  onHoverJob: (job: string | null) => void;
}) {
  const arcs = segments.reduce<Array<Segment & { start: number; end: number }>>((acc, seg) => {
    const cursor = acc.length > 0 ? acc[acc.length - 1].end : 0;
    const span = total > 0 ? (seg.value / total) * 360 : 0;
    acc.push({ ...seg, start: cursor, end: cursor + span });
    return acc;
  }, []);

  return (
    <div className="relative shrink-0 mx-auto" style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
      <svg width={DONUT_SIZE} height={DONUT_SIZE} viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`} style={{ overflow: "visible" }}>
        {arcs.map((arc) => {
          const span = arc.end - arc.start;
          const pad = Math.min(GAP_DEG / 2, Math.max(span / 2 - 0.1, 0));
          const start = arc.start + pad;
          const end = arc.end - pad;
          const mid = (start + end) / 2;
          const isHover = hoverJob === arc.key;
          const isDimmed = hoverJob !== null && !isHover;
          const explode = isHover ? EXPLODE_HOVER : EXPLODE;
          const rad = (mid * Math.PI) / 180;
          const dx = Math.sin(rad) * explode;
          const dy = -Math.cos(rad) * explode;
          return (
            <path
              key={arc.key}
              d={slicePath(start, end)}
              fill={arc.color}
              transform={`translate(${dx},${dy})`}
              style={{ opacity: isDimmed ? 0.4 : 1, transition: "transform 150ms, opacity 150ms", cursor: "default" }}
              onMouseEnter={() => onHoverJob(arc.key)}
              onMouseLeave={() => onHoverJob(null)}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[11px] ats-text-muted">{totalLabel}</span>
        <span className="text-2xl font-bold tabular-nums ats-text-h">{total}</span>
      </div>
    </div>
  );
}

function DonutLegend({
  segments,
  total,
  hoverJob,
  onHoverJob,
}: {
  segments: Segment[];
  total: number;
  hoverJob: string | null;
  onHoverJob: (job: string | null) => void;
}) {
  return (
    <div className="grid gap-x-4 gap-y-2.5 mt-5 max-w-sm mx-auto" style={{ gridTemplateColumns: "auto 1fr auto auto" }}>
      {segments.map((seg) => {
        const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
        const isDimmed = hoverJob !== null && hoverJob !== seg.key;
        const handlers = {
          onMouseEnter: () => onHoverJob(seg.key),
          onMouseLeave: () => onHoverJob(null),
        };
        const rowStyle = { opacity: isDimmed ? 0.45 : 1, transition: "opacity 150ms", cursor: "default" } as const;
        return (
          <Fragment key={seg.key}>
            <span className="w-2.5 h-2.5 rounded-full self-center" style={{ background: seg.color, ...rowStyle }} {...handlers} />
            <span className="text-xs ats-text-h truncate self-center" style={rowStyle} {...handlers}>{seg.label}</span>
            <span className="text-xs ats-text-muted tabular-nums self-center" style={rowStyle} {...handlers}>{pct}%</span>
            <span className="text-xs font-semibold ats-text-h tabular-nums self-center" style={rowStyle} {...handlers}>{seg.value}</span>
          </Fragment>
        );
      })}
    </div>
  );
}

export function CandidateStatusChart({ rows }: { rows: ChartCandidateRow[] }) {
  const [metric, setMetric] = useState<Metric>("status");
  const [monthFilter, setMonthFilter] = useState<string>(ALL_TIME);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES);
  const [hoverJob, setHoverJob] = useState<string | null>(null);
  const isDark = useIsDark();

  const categories = metric === "status" ? STATUS_META : DECISION_META;

  function selectMetric(m: Metric) {
    setMetric(m);
    setCategoryFilter(ALL_CATEGORIES); // đổi trạng thái/quyết định AI thì reset bộ lọc mốc cụ thể (2 tập key khác nhau)
  }

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.created_at) set.add(monthKey(r.created_at));
    }
    return Array.from(set).sort().reverse();
  }, [rows]);

  // Xếp hạng/màu vị trí luôn tính trên TOÀN BỘ dữ liệu (không lọc theo
  // tháng/trạng thái) để giữ màu ổn định — đổi bộ lọc không được đổi màu 1
  // vị trí đã "học" (xem anti-pattern "recolor-on-filter" trong skill dataviz).
  const allTimeData = useMemo(() => buildChartData(rows), [rows]);
  const { featuredTitles, byTitle } = useJobColors(allTimeData.byJob, isDark);
  const otherColor = isDark ? OTHER_JOB_COLOR.dark : OTHER_JOB_COLOR.light;

  const filteredRows = useMemo(() => {
    let result = monthFilter === ALL_TIME ? rows : rows.filter((r) => monthKey(r.created_at) === monthFilter);
    if (categoryFilter !== ALL_CATEGORIES) {
      result = result.filter((r) =>
        metric === "status" ? r.status === categoryFilter : r.ai_score_result?.final_decision === categoryFilter
      );
    }
    return result;
  }, [rows, monthFilter, categoryFilter, metric]);

  const data = useMemo(() => buildChartData(filteredRows), [filteredRows]);

  const segments = useMemo(() => {
    const filteredTotalByTitle = new Map(data.byJob.map((j) => [j.jobTitle, j.total]));
    const result: Segment[] = [];
    for (const jobTitle of featuredTitles) {
      const value = filteredTotalByTitle.get(jobTitle) ?? 0;
      if (value > 0) result.push({ key: jobTitle, label: jobTitle, color: byTitle.get(jobTitle)!, value });
    }
    const otherValue = data.byJob
      .filter((j) => !featuredTitles.has(j.jobTitle))
      .reduce((sum, j) => sum + j.total, 0);
    if (otherValue > 0) result.push({ key: OTHER_JOB_KEY, label: "Khác", color: otherColor, value: otherValue });
    return result;
  }, [data.byJob, featuredTitles, byTitle, otherColor]);

  const emptyMessage =
    monthFilter === ALL_TIME && categoryFilter === ALL_CATEGORIES
      ? "Chưa có dữ liệu ứng viên."
      : "Không có ứng viên nào khớp bộ lọc hiện tại.";

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          <h2 className="text-base font-bold tracking-tight ats-accent-text">Thống kê ứng viên theo vị trí</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none"
            style={{ background: "var(--ats-surface-2)", color: "var(--ats-text-h)", border: "1px solid var(--ats-border)" }}
          >
            <option value={ALL_TIME}>Tất cả thời gian</option>
            {monthOptions.map((ym) => (
              <option key={ym} value={ym}>{formatMonthLabel(ym)}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none"
            style={{ background: "var(--ats-surface-2)", color: "var(--ats-text-h)", border: "1px solid var(--ats-border)" }}
          >
            <option value={ALL_CATEGORIES}>{metric === "status" ? "Tất cả trạng thái" : "Tất cả quyết định"}</option>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "var(--ats-surface-2)" }}>
            {(["status", "decision"] as Metric[]).map((m) => (
              <button
                key={m}
                onClick={() => selectMetric(m)}
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
        <p className="text-sm text-center py-8 ats-text-muted">{emptyMessage}</p>
      ) : (
        <>
          <DonutChart
            segments={segments}
            total={data.overall.total}
            totalLabel="Tổng"
            hoverJob={hoverJob}
            onHoverJob={setHoverJob}
          />
          <DonutLegend segments={segments} total={data.overall.total} hoverJob={hoverJob} onHoverJob={setHoverJob} />
        </>
      )}
    </div>
  );
}

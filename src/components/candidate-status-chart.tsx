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

// Màu gắn theo VỊ TRÍ (job) — mỗi lớp trong biểu đồ miền xếp chồng là 1 vị
// trí, chồng lên nhau qua các mốc trạng thái/quyết định. Tối đa 6 vị trí có
// màu riêng (xếp theo tổng ứng viên toàn hệ thống, thứ tự cố định không đổi
// khi đổi metric), các vị trí còn lại gộp vào "Khác" (xám trung tính, không
// tính là 1 hue categorical). Đã chạy scripts/validate_palette.js (skill
// dataviz) — PASS lightness/chroma/contrast, CVD ở mức WARN (6–8) được bù
// bằng legend + tooltip trực tiếp (secondary encoding) cho cả light & dark
// surface của app.
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

// Làm tròn trục Y lên mốc đẹp (0/20/40...) tương tự Google Sheets, tối đa
// ~6 vạch chia.
function niceTicks(max: number, targetCount = 6): { niceMax: number; ticks: number[] } {
  if (max <= 0) return { niceMax: 1, ticks: [0, 1] };
  const rawStep = max / targetCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;
  let step: number;
  if (residual > 5) step = 10 * magnitude;
  else if (residual > 2) step = 5 * magnitude;
  else if (residual > 1) step = 2 * magnitude;
  else step = magnitude;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= niceMax + 1e-9; v += step) ticks.push(Math.round(v));
  return { niceMax, ticks };
}

type Layer = { key: string; label: string; color: string; values: number[] };
type Point = { x: number; y: number };

// Cardinal spline (Catmull-Rom, tension mặc định) — chuyển 1 dãy điểm thành
// các đoạn cubic Bézier để đường/miền uốn mượt qua từng mốc thay vì gãy khúc
// nhọn như polyline thẳng.
function smoothSegments(pts: Point[]): string[] {
  if (pts.length < 2) return [];
  const segs: string[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    segs.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
  }
  return segs;
}

function smoothPath(pts: Point[]): string {
  if (pts.length === 0) return "";
  return `M ${pts[0].x},${pts[0].y} ${smoothSegments(pts).join(" ")}`;
}

const SVG_W = 640;
const SVG_H = 280;
const MARGIN = { top: 22, right: 12, bottom: 30, left: 32 };
const PLOT_W = SVG_W - MARGIN.left - MARGIN.right;
const PLOT_H = SVG_H - MARGIN.top - MARGIN.bottom;

function StackedAreaChart({
  categories,
  layers,
  hoverJob,
  onHoverJob,
  isDark,
}: {
  categories: { key: string; label: string }[];
  layers: Layer[];
  hoverJob: string | null;
  onHoverJob: (job: string | null) => void;
  isDark: boolean;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const n = categories.length;

  const totals = categories.map((_, i) => layers.reduce((sum, l) => sum + l.values[i], 0));
  const { niceMax, ticks } = niceTicks(Math.max(...totals, 0));

  const xAt = (i: number) => MARGIN.left + (n > 1 ? (i / (n - 1)) * PLOT_W : PLOT_W / 2);
  const yAt = (v: number) => MARGIN.top + PLOT_H - (v / niceMax) * PLOT_H;

  // Baseline/top tích lũy theo thứ tự lớp cố định (bottom → top).
  const cumulative = layers.reduce<{ base: number[][]; top: number[][] }>(
    (acc, layer) => {
      const prevTop = acc.top.length > 0 ? acc.top[acc.top.length - 1] : categories.map(() => 0);
      const top = layer.values.map((v, i) => prevTop[i] + v);
      acc.base.push(prevTop);
      acc.top.push(top);
      return acc;
    },
    { base: [], top: [] }
  );

  // Gridline nhẹ, lùi hẳn so với border card (border card đậm hơn vì dùng cho
  // viền cấu trúc, không hợp làm gridline nền — mark spec cần hairline recessive).
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)";
  const surfaceColor = "var(--ats-surface)";

  return (
    <div className="relative w-full select-none">
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto" style={{ overflow: "visible" }}>
        <defs>
          {layers.map((layer, li) => (
            <linearGradient key={li} id={`csc-grad-${li}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={layer.color} stopOpacity={0.75} />
              <stop offset="100%" stopColor={layer.color} stopOpacity={0.4} />
            </linearGradient>
          ))}
        </defs>

        {/* Gridlines + nhãn trục Y — hairline, lùi hẳn so với surface */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={MARGIN.left} x2={SVG_W - MARGIN.right} y1={yAt(t)} y2={yAt(t)} stroke={gridColor} strokeWidth={1} />
            <text x={MARGIN.left - 8} y={yAt(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--ats-text-muted)">
              {t}
            </text>
          </g>
        ))}

        {/* Các lớp miền xếp chồng — đường cong mượt (Catmull-Rom), gradient nhạt
            dần xuống đáy, viền trên nét liền màu gốc */}
        {layers.map((layer, li) => {
          const base = cumulative.base[li];
          const top = cumulative.top[li];
          const topPts = top.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
          const basePts = base.map((v, i) => ({ x: xAt(i), y: yAt(v) })).reverse();
          const topCurve = smoothPath(topPts);
          const baseCurve = `L ${basePts[0].x},${basePts[0].y} ${smoothSegments(basePts).join(" ")}`;
          const isDimmed = hoverJob !== null && hoverJob !== layer.key;
          return (
            <g key={layer.key} style={{ opacity: isDimmed ? 0.3 : 1, transition: "opacity 150ms" }}>
              <path d={`${topCurve} ${baseCurve} Z`} fill={`url(#csc-grad-${li})`} />
              <path d={topCurve} fill="none" stroke={layer.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              {hoverIndex !== null && layer.values[hoverIndex] > 0 && (
                <circle
                  cx={xAt(hoverIndex)}
                  cy={yAt(top[hoverIndex])}
                  r={4}
                  fill={layer.color}
                  stroke={surfaceColor}
                  strokeWidth={1.5}
                />
              )}
            </g>
          );
        })}

        {/* Crosshair + hit zones theo từng mốc trục X */}
        {hoverIndex !== null && (
          <line
            x1={xAt(hoverIndex)}
            x2={xAt(hoverIndex)}
            y1={MARGIN.top}
            y2={SVG_H - MARGIN.bottom}
            stroke="var(--ats-text-muted)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}
        {categories.map((cat, i) => (
          <rect
            key={cat.key}
            x={xAt(i) - PLOT_W / n / 2}
            y={MARGIN.top}
            width={PLOT_W / n}
            height={PLOT_H}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
          />
        ))}

        {/* Nhãn trục X */}
        {categories.map((cat, i) => (
          <text key={cat.key} x={xAt(i)} y={SVG_H - MARGIN.bottom + 18} textAnchor="middle" fontSize={11} fill="var(--ats-text-muted)">
            {cat.label}
          </text>
        ))}
      </svg>

      {hoverIndex !== null && (
        <div
          className="absolute z-10 px-2.5 py-2 rounded-lg shadow-lg pointer-events-none"
          style={{
            background: "var(--ats-surface)",
            border: "1px solid var(--ats-border)",
            left: `${(xAt(hoverIndex) / SVG_W) * 100}%`,
            top: `${(Math.max(yAt(totals[hoverIndex]) - 10, MARGIN.top - 10) / SVG_H) * 100}%`,
            transform: `translate(${hoverIndex === 0 ? "0%" : hoverIndex === n - 1 ? "-100%" : "-50%"}, -100%)`,
            minWidth: 140,
          }}
        >
          <p className="text-[11px] font-semibold ats-text-h mb-1">{categories[hoverIndex].label}</p>
          <div className="space-y-0.5">
            {[...layers].reverse().map((layer) => {
              const v = layer.values[hoverIndex];
              if (v === 0) return null;
              return (
                <div
                  key={layer.key}
                  className="flex items-center gap-1.5"
                  onMouseEnter={() => onHoverJob(layer.key)}
                  onMouseLeave={() => onHoverJob(null)}
                >
                  <span className="w-2 h-0.5 rounded-full shrink-0" style={{ background: layer.color }} />
                  <span className="text-xs font-bold tabular-nums ats-text-h">{v}</span>
                  <span className="text-[11px] ats-text-muted truncate">{layer.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mb-3">
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
  const isDark = useIsDark();

  const categories = metric === "status" ? STATUS_META : DECISION_META;
  const { featured, rest, entries, byTitle } = useJobColors(data.byJob, isDark);
  const otherColor = isDark ? OTHER_JOB_COLOR.dark : OTHER_JOB_COLOR.light;

  const layers = useMemo(() => {
    const result: Layer[] = [];
    for (const job of featured) {
      const values = categories.map((cat) => (metric === "status" ? job.status : job.decision)[cat.key] ?? 0);
      if (values.some((v) => v > 0)) {
        result.push({ key: job.jobTitle, label: job.jobTitle, color: byTitle.get(job.jobTitle)!.color, values });
      }
    }
    const otherValues = categories.map((cat) =>
      rest.reduce((sum, job) => sum + ((metric === "status" ? job.status : job.decision)[cat.key] ?? 0), 0)
    );
    if (otherValues.some((v) => v > 0)) {
      result.push({ key: OTHER_JOB_KEY, label: "Khác", color: otherColor, values: otherValues });
    }
    return result;
  }, [categories, featured, rest, byTitle, metric, otherColor]);

  const otherTotal = rest.reduce((sum, j) => sum + j.total, 0);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
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
          <JobLegend entries={entries} otherTotal={otherTotal} hoverJob={hoverJob} onHoverJob={setHoverJob} />
          <StackedAreaChart categories={categories} layers={layers} hoverJob={hoverJob} onHoverJob={setHoverJob} isDark={isDark} />
        </>
      )}
    </div>
  );
}

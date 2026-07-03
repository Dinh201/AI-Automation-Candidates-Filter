"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  UploadCloud, FileText, CheckCircle2, AlertCircle,
  ChevronDown, TrendingUp, Shield, Star,
  AlertTriangle, MessageSquare, BookOpen, RotateCcw, ExternalLink,
  Briefcase, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CandidateScoringResult } from "@/services/ai/schema";
import Link from "next/link";

type Job = { id: string; title: string };
type Phase = "upload" | "analyzing" | "result";

const DECISION_CONFIG = {
  "STRONG HIRE": { label: "Đề xuất mạnh",   bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  "HIRE":        { label: "Nên tuyển",       bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/30"    },
  "CONSIDER":    { label: "Cân nhắc",        bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-500/30"   },
  "REJECT":      { label: "Không phù hợp",   bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/30"     },
};

const CONFIDENCE_CONFIG = {
  High:   { label: "Cao",        color: "text-emerald-400", dot: "bg-emerald-400" },
  Medium: { label: "Trung bình", color: "text-amber-400",   dot: "bg-amber-400"   },
  Low:    { label: "Thấp",       color: "text-red-400",     dot: "bg-red-400"     },
};

const RING_COLORS = {
  job:       "#6366f1",
  potential: "#8b5cf6",
  culture:   "#06b6d4",
};

const C = 2 * Math.PI * 40;

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t); }, []);
  const offset = animated ? C * (1 - score / 10) : C;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white leading-none">{score.toFixed(1)}</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">/ 10</span>
        </div>
      </div>
      <span className="text-xs font-medium text-zinc-400 text-center">{label}</span>
    </div>
  );
}

function ScoreBar({ label, score, max = 10 }: { label: string; score: number; max?: number }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t); }, []);
  const pct = (score / max) * 100;
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-indigo-500" : pct >= 30 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-400 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-1000`}
          style={{ width: animated ? `${pct}%` : "0%" }} />
      </div>
      <span className="text-xs font-semibold text-white w-6 text-right">{score.toFixed(1)}</span>
    </div>
  );
}

function Collapsible({ icon: Icon, title, defaultOpen = true, children }: {
  icon: React.ElementType; title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900 hover:bg-zinc-800/60 transition-colors">
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-zinc-100">{title}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-3 bg-zinc-900/40">{children}</div>}
    </div>
  );
}

function BulletList({ items, dotColor }: { items: string[]; dotColor: string }) {
  if (!items.length) return <p className="text-xs text-zinc-600 italic">Không có</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className={`mt-[7px] w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
          <span className="text-sm text-zinc-300 leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ────────────────────────────────────────────────── */

function CvAnalyzerContent() {
  const searchParams = useSearchParams();
  const presetJobId = searchParams.get("job_id") || "";

  const [phase, setPhase]                   = useState<Phase>("upload");
  const [jobs, setJobs]                     = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId]   = useState(presetJobId);
  const [file, setFile]                     = useState<File | null>(null);
  const [candidateName, setCandidateName]   = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [showOptional, setShowOptional]     = useState(false);
  const [isDragging, setIsDragging]         = useState(false);
  const [error, setError]                   = useState("");
  const [result, setResult]                 = useState<CandidateScoringResult | null>(null);
  const [jobTitle, setJobTitle]             = useState("");
  const [candidateId, setCandidateId]       = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then(({ jobs: data }) => {
        setJobs(data || []);
        if (!presetJobId && data?.length) setSelectedJobId(data[0].id);
      })
      .catch(() => {});
  }, [presetJobId]);

  const selectedJob = jobs.find((j) => j.id === selectedJobId);
  // Show compact badge instead of dropdown when job is pre-determined
  const isJobLocked = !!presetJobId || jobs.length === 1;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") { setFile(dropped); setError(""); }
    else setError("Chỉ chấp nhận file PDF");
  }, []);

  const handleAnalyze = async () => {
    if (!file || !selectedJobId) return;
    setError("");
    setPhase("analyzing");
    try {
      const fd = new FormData();
      fd.append("cv", file);
      fd.append("job_id", selectedJobId);
      if (candidateName.trim())  fd.append("name", candidateName.trim());
      if (candidateEmail.trim()) fd.append("email", candidateEmail.trim());

      const res  = await fetch("/api/cv-analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra");

      setResult(data.result);
      setJobTitle(data.jobTitle);
      setCandidateId(data.candidateId);
      if (data.candidateName && !candidateName.trim()) setCandidateName(data.candidateName);
      setPhase("result");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      setPhase("upload");
    }
  };

  const reset = () => {
    setPhase("upload"); setFile(null); setResult(null);
    setError(""); setJobTitle(""); setCandidateId("");
    setCandidateName(""); setCandidateEmail("");
  };

  /* ── Upload ── */
  if (phase === "upload") {
    return (
      <div className="max-w-2xl mx-auto py-10 px-4 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Phân tích CV nhanh</h1>
          <p className="text-sm text-zinc-400 mt-1">Upload CV (PDF) để AI chấm điểm · Kết quả được lưu vào hệ thống</p>
        </div>

        {/* Job selector */}
        {jobs.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">
              Chưa có vị trí tuyển dụng nào.{" "}
              <Link href="/jobs" className="underline hover:text-amber-200">Tạo vị trí mới</Link> trước.
            </p>
          </div>
        ) : isJobLocked ? (
          /* Compact badge — single job or URL-preset */
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <Briefcase className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-sm text-indigo-300 font-medium flex-1">
              {selectedJob?.title ?? "Đang tải..."}
            </span>
            {jobs.length > 1 && (
              <button
                onClick={() => { setSelectedJobId(""); }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Đổi
              </button>
            )}
          </div>
        ) : (
          /* Full dropdown — multiple jobs, no URL preset */
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300">Vị trí ứng tuyển <span className="text-red-400">*</span></Label>
              <Link href="/jobs" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                + Tạo vị trí mới
              </Link>
            </div>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
            >
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
        )}

        {/* Drop zone */}
        <div
          className={`rounded-xl border-2 border-dashed px-8 py-14 text-center transition-all cursor-pointer
            ${isDragging ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]" : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/20"}
            ${file ? "border-emerald-500/60 bg-emerald-500/5" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {file ? (
            <div className="space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="font-semibold text-emerald-300 text-sm">{file.name}</p>
              <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(0)} KB · Click để đổi file</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mx-auto w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <UploadCloud className="w-7 h-7 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-300">
                  <span className="text-indigo-400 font-semibold">Kéo thả file CV</span> vào đây
                </p>
                <p className="text-xs text-zinc-600 mt-1">hoặc click để chọn · Chỉ PDF · Tối đa 10MB</p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setError(""); } }}
          />
        </div>

        {/* Optional candidate info — collapsible */}
        <div>
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            {showOptional ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Thêm tên / email ứng viên{" "}
            <span className="text-zinc-600">(tuỳ chọn — AI tự trích xuất từ CV)</span>
          </button>

          {showOptional && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Tên ứng viên</Label>
                <Input
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="bg-zinc-900 border-zinc-700 text-white text-sm focus-visible:ring-indigo-500/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Email</Label>
                <Input
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="bg-zinc-900 border-zinc-700 text-white text-sm focus-visible:ring-indigo-500/50"
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-sm text-red-300">{error}</span>
          </div>
        )}

        <Button
          onClick={handleAnalyze}
          disabled={!file || !selectedJobId || jobs.length === 0}
          className="w-full py-5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40"
        >
          Phân tích với AI →
        </Button>
      </div>
    );
  }

  /* ── Analyzing ── */
  if (phase === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-zinc-800 border-t-indigo-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="w-7 h-7 text-indigo-400" />
          </div>
        </div>
        <div className="text-center space-y-1.5">
          <p className="font-semibold text-white">AI đang phân tích CV...</p>
          <p className="text-sm text-zinc-500">Quá trình này mất khoảng 20–40 giây</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  /* ── Result ── */
  if (!result) return null;

  const dec  = DECISION_CONFIG[result.final_decision] ?? DECISION_CONFIG["CONSIDER"];
  const conf = CONFIDENCE_CONFIG[result.confidence_level];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-4">

      {/* Header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-0.5">
          <p className="text-xs text-zinc-500">
            Vị trí: <span className="text-zinc-300">{jobTitle}</span>
            {candidateName && <> · <span className="text-zinc-300">{candidateName}</span></>}
          </p>
          <p className="text-sm text-zinc-500 truncate max-w-xs">{file?.name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {candidateId && (
            <Link href={`/candidates/${candidateId}`}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-400/50 px-3 py-1.5 rounded-lg transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Xem hồ sơ
            </Link>
          )}
          <button onClick={reset}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Phân tích lại
          </button>
        </div>
      </div>

      {/* Decision banner */}
      <div className={`rounded-xl border p-5 flex items-center justify-between gap-4 flex-wrap ${dec.bg} ${dec.border}`}>
        <div className="space-y-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${dec.bg} ${dec.border} ${dec.text}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> {dec.label}
          </span>
          <p className="text-sm text-zinc-300 leading-relaxed max-w-sm">{result.candidate_summary}</p>
        </div>
        <div className="text-center shrink-0">
          <p className="text-6xl font-black text-white tabular-nums">{result.total_score.toFixed(1)}</p>
          <p className="text-xs text-zinc-500 mt-1">tổng điểm / 10</p>
        </div>
      </div>

      {/* Score rings */}
      <div className="glass-card p-6 space-y-5">
        <div className="flex justify-around gap-4 flex-wrap">
          <ScoreRing score={result.job_fit_score}      label="Job Fit"   color={RING_COLORS.job}       />
          <ScoreRing score={result.potential_score}    label="Tiềm năng" color={RING_COLORS.potential}  />
          <ScoreRing score={result.cultural_fit_score} label="Văn hóa"   color={RING_COLORS.culture}    />
        </div>
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <ScoreBar label="Job Fit"    score={result.job_fit_score} />
          <ScoreBar label="Tiềm năng"  score={result.potential_score} />
          <ScoreBar label="Văn hóa"    score={result.cultural_fit_score} />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className={`w-2 h-2 rounded-full ${conf.dot}`} />
          <span className="text-xs text-zinc-500">Độ tin cậy AI:</span>
          <span className={`text-xs font-semibold ${conf.color}`}>{conf.label}</span>
        </div>
      </div>

      {/* Evaluation reason */}
      <div className="glass-card p-4">
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Lý do đánh giá</p>
        <p className="text-sm text-zinc-300 leading-relaxed">{result.evaluation_reason}</p>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Collapsible icon={Star} title={`Điểm mạnh (${result.strengths.length})`}>
          <BulletList items={result.strengths} dotColor="bg-emerald-400" />
        </Collapsible>
        <Collapsible icon={TrendingUp} title={`Điểm yếu (${result.weaknesses.length})`}>
          <BulletList items={result.weaknesses} dotColor="bg-amber-400" />
        </Collapsible>
      </div>

      {/* Hiring risks */}
      {result.hiring_risks.length > 0 && (
        <Collapsible icon={AlertTriangle} title={`Rủi ro tuyển dụng (${result.hiring_risks.length})`}>
          <ul className="space-y-2">
            {result.hiring_risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                <span className="text-sm text-zinc-300">{r}</span>
              </li>
            ))}
          </ul>
        </Collapsible>
      )}

      {/* Missing info */}
      {result.missing_information.length > 0 && (
        <Collapsible icon={Shield} title={`Thông tin còn thiếu (${result.missing_information.length})`} defaultOpen={false}>
          <BulletList items={result.missing_information} dotColor="bg-zinc-500" />
        </Collapsible>
      )}

      {/* Interview questions */}
      <Collapsible icon={MessageSquare}
        title={`Câu hỏi phỏng vấn gợi ý (${result.recommended_interview_questions.length})`}
        defaultOpen={false}>
        <ol className="space-y-2">
          {result.recommended_interview_questions.map((q, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-zinc-300 leading-snug">{q}</span>
            </li>
          ))}
        </ol>
      </Collapsible>

      {/* Evidence */}
      <Collapsible icon={BookOpen} title="Bằng chứng từ CV" defaultOpen={false}>
        <div className="space-y-4">
          {([
            ["skills_evidence",     "Kỹ năng"],
            ["experience_evidence", "Kinh nghiệm"],
            ["culture_evidence",    "Văn hóa"],
            ["potential_evidence",  "Tiềm năng"],
          ] as const).map(([key, label]) => {
            const items = result.evidence[key];
            if (!items.length) return null;
            return (
              <div key={key}>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{label}</p>
                <BulletList items={items} dotColor="bg-indigo-400" />
              </div>
            );
          })}
        </div>
      </Collapsible>

      <div className="h-6" />
    </div>
  );
}

export default function CvAnalyzerPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto py-10 px-4 space-y-5">
        <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
        <div className="h-4 w-72 bg-zinc-800/60 rounded animate-pulse" />
        <div className="h-10 bg-zinc-800/40 rounded-lg animate-pulse" />
        <div className="h-52 bg-zinc-800/40 rounded-xl animate-pulse" />
      </div>
    }>
      <CvAnalyzerContent />
    </Suspense>
  );
}
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
import { useTranslation } from "@/lib/i18n-context";

type Job = { id: string; title: string };
type Phase = "upload" | "analyzing" | "result";

const DECISION_CONFIG = {
  "STRONG HIRE": { labelKey: "cvAnalyzer.decision.strongHire", bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  "HIRE":        { labelKey: "cvAnalyzer.decision.hire",       bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/30"    },
  "CONSIDER":    { labelKey: "cvAnalyzer.decision.consider",   bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-500/30"   },
  "REJECT":      { labelKey: "cvAnalyzer.decision.reject",     bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/30"     },
};

const CONFIDENCE_CONFIG = {
  High:   { labelKey: "cvAnalyzer.confidence.high",   color: "text-emerald-400", dot: "bg-emerald-400" },
  Medium: { labelKey: "cvAnalyzer.confidence.medium", color: "text-amber-400",   dot: "bg-amber-400"   },
  Low:    { labelKey: "cvAnalyzer.confidence.low",    color: "text-red-400",     dot: "bg-red-400"     },
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
          <span className="text-2xl font-black leading-none" style={{ color: "var(--ats-text-h)" }}>{score.toFixed(1)}</span>
          <span className="text-[10px] mt-0.5" style={{ color: "var(--ats-text-muted)" }}>/ 10</span>
        </div>
      </div>
      <span className="text-xs font-medium text-center" style={{ color: "var(--ats-text-body)" }}>{label}</span>
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
      <span className="text-xs w-24 shrink-0" style={{ color: "var(--ats-text-body)" }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--ats-border)" }}>
        <div className={`h-full ${color} rounded-full transition-all duration-1000`}
          style={{ width: animated ? `${pct}%` : "0%" }} />
      </div>
      <span className="text-xs font-semibold w-6 text-right" style={{ color: "var(--ats-text-h)" }}>{score.toFixed(1)}</span>
    </div>
  );
}

function Collapsible({ icon: Icon, title, defaultOpen = true, children }: {
  icon: React.ElementType; title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl overflow-hidden" style={{ borderColor: "var(--ats-border)" }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:opacity-80"
        style={{ background: "var(--ats-surface)" }}>
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold" style={{ color: "var(--ats-text-h)" }}>{title}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--ats-text-muted)" }}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3" style={{ background: "var(--ats-surface-2)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function BulletList({ items, dotColor }: { items: string[]; dotColor: string }) {
  const { t } = useTranslation();
  if (!items.length) return <p className="text-xs italic" style={{ color: "var(--ats-text-muted)" }}>{t("cvAnalyzer.none")}</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className={`mt-[7px] w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
          <span className="text-sm leading-snug" style={{ color: "var(--ats-text-body)" }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ────────────────────────────────────────────────── */

function CvAnalyzerContent() {
  const { t } = useTranslation();
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
    else setError(t("cvAnalyzer.pdfOnlyError"));
  }, [t]);

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
      if (!res.ok) throw new Error(data.error || t("cvAnalyzer.genericError"));

      setResult(data.result);
      setJobTitle(data.jobTitle);
      setCandidateId(data.candidateId);
      if (data.candidateName && !candidateName.trim()) setCandidateName(data.candidateName);
      setPhase("result");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("cvAnalyzer.genericError"));
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
          <h1 className="text-2xl font-bold text-[var(--ats-text-h)]">{t("cvAnalyzer.title")}</h1>
          <p className="text-sm text-[var(--ats-text-muted)] mt-1">{t("cvAnalyzer.subtitle")}</p>
        </div>

        {/* Job selector */}
        {jobs.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">
              {t("cvAnalyzer.noJobsWarning")}{" "}
              <Link href="/jobs" className="underline hover:text-amber-200">{t("cvAnalyzer.createPositionLink")}</Link>{t("cvAnalyzer.noJobsSuffix")}
            </p>
          </div>
        ) : isJobLocked ? (
          /* Compact badge — single job or URL-preset */
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <Briefcase className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-sm text-indigo-300 font-medium flex-1">
              {selectedJob?.title ?? t("cvAnalyzer.loadingJob")}
            </span>
            {jobs.length > 1 && (
              <button
                onClick={() => { setSelectedJobId(""); }}
                className="text-xs text-[var(--ats-text-muted)] hover:text-[var(--ats-text-body)] transition-colors"
              >
                {t("cvAnalyzer.changeJob")}
              </button>
            )}
          </div>
        ) : (
          /* Full dropdown — multiple jobs, no URL preset */
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[var(--ats-text-body)]">{t("cvAnalyzer.positionLabel")} <span className="text-red-400">*</span></Label>
              <Link href="/jobs" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                {t("cvAnalyzer.newPosition")}
              </Link>
            </div>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full bg-[var(--ats-surface)] border border-[var(--ats-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--ats-text-h)] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
            >
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
        )}

        {/* Drop zone */}
        <div
          className={`rounded-xl border-2 border-dashed px-8 py-14 text-center transition-all cursor-pointer
            ${isDragging ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]" : "border-[var(--ats-border)] hover:border-indigo-400 hover:bg-[var(--ats-surface-2)]"}
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
              <p className="text-xs text-[var(--ats-text-muted)]">{(file.size / 1024).toFixed(0)} KB · {t("cvAnalyzer.changeFileHint")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mx-auto w-14 h-14 rounded-full bg-[var(--ats-surface-2)] border border-[var(--ats-border)] flex items-center justify-center">
                <UploadCloud className="w-7 h-7 text-[var(--ats-text-muted)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--ats-text-body)]">
                  <span className="text-indigo-400 font-semibold">{t("cvAnalyzer.dropzoneDrag")}</span>{t("cvAnalyzer.dropzoneDragSuffix")}
                </p>
                <p className="text-xs text-[var(--ats-text-muted)] mt-1">{t("cvAnalyzer.dropzoneHint")}</p>
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
            className="flex items-center gap-1.5 text-xs text-[var(--ats-text-muted)] hover:text-[var(--ats-text-body)] transition-colors"
          >
            {showOptional ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {t("cvAnalyzer.addCandidateInfo")}{" "}
            <span className="text-[var(--ats-text-muted)]">{t("cvAnalyzer.addCandidateInfoHint")}</span>
          </button>

          {showOptional && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-1.5">
                <Label className="text-[var(--ats-text-muted)] text-xs">{t("cvAnalyzer.candidateName")}</Label>
                <Input
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder={t("cvAnalyzer.candidateNamePlaceholder")}
                  className="bg-[var(--ats-surface)] border-[var(--ats-border)] text-[var(--ats-text-h)] text-sm focus-visible:ring-indigo-500/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[var(--ats-text-muted)] text-xs">{t("cvAnalyzer.email")}</Label>
                <Input
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="bg-[var(--ats-surface)] border-[var(--ats-border)] text-[var(--ats-text-h)] text-sm focus-visible:ring-indigo-500/50"
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
          {t("cvAnalyzer.analyzeBtn")}
        </Button>
      </div>
    );
  }

  /* ── Analyzing ── */
  if (phase === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-t-indigo-500 animate-spin" style={{ borderColor: "var(--ats-border)", borderTopColor: "#6366f1" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="w-7 h-7 text-indigo-400" />
          </div>
        </div>
        <div className="text-center space-y-1.5">
          <p className="font-semibold text-[var(--ats-text-h)]">{t("cvAnalyzer.analyzing")}</p>
          <p className="text-sm text-[var(--ats-text-muted)]">{t("cvAnalyzer.analyzingHint")}</p>
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
          <p className="text-xs" style={{ color: "var(--ats-text-muted)" }}>
            {t("cvAnalyzer.resultPositionLabel")} <span style={{ color: "var(--ats-text-body)" }}>{jobTitle}</span>
            {candidateName && <> · <span style={{ color: "var(--ats-text-body)" }}>{candidateName}</span></>}
          </p>
          <p className="text-sm truncate max-w-xs" style={{ color: "var(--ats-text-muted)" }}>{file?.name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {candidateId && (
            <Link href={`/candidates/${candidateId}`}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-400/50 px-3 py-1.5 rounded-lg transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> {t("cvAnalyzer.viewProfile")}
            </Link>
          )}
          <button onClick={reset}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
            style={{ color: "var(--ats-text-muted)", borderColor: "var(--ats-border)" }}>
            <RotateCcw className="w-3.5 h-3.5" /> {t("cvAnalyzer.reanalyze")}
          </button>
        </div>
      </div>

      {/* Decision banner */}
      <div className={`rounded-xl border p-5 flex items-center justify-between gap-4 flex-wrap ${dec.bg} ${dec.border}`}>
        <div className="space-y-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${dec.bg} ${dec.border} ${dec.text}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> {t(dec.labelKey)}
          </span>
          <p className="text-sm leading-relaxed max-w-sm" style={{ color: "var(--ats-text-body)" }}>{result.candidate_summary}</p>
        </div>
        <div className="text-center shrink-0">
          <p className="text-6xl font-black tabular-nums" style={{ color: "var(--ats-text-h)" }}>{result.total_score.toFixed(1)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--ats-text-muted)" }}>{t("cvAnalyzer.totalScoreSuffix")}</p>
        </div>
      </div>

      {/* Score rings */}
      <div className="glass-card p-6 space-y-5">
        <div className="flex justify-around gap-4 flex-wrap">
          <ScoreRing score={result.job_fit_score}      label="Job Fit"                    color={RING_COLORS.job}       />
          <ScoreRing score={result.potential_score}    label={t("cvAnalyzer.potential")}  color={RING_COLORS.potential}  />
          <ScoreRing score={result.cultural_fit_score} label={t("cvAnalyzer.culture")}    color={RING_COLORS.culture}    />
        </div>
        <div className="space-y-2 pt-2 border-t" style={{ borderColor: "var(--ats-border)" }}>
          <ScoreBar label="Job Fit"                   score={result.job_fit_score} />
          <ScoreBar label={t("cvAnalyzer.potential")} score={result.potential_score} />
          <ScoreBar label={t("cvAnalyzer.culture")}   score={result.cultural_fit_score} />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className={`w-2 h-2 rounded-full ${conf.dot}`} />
          <span className="text-xs" style={{ color: "var(--ats-text-muted)" }}>{t("cvAnalyzer.aiConfidence")}</span>
          <span className={`text-xs font-semibold ${conf.color}`}>{t(conf.labelKey)}</span>
        </div>
      </div>

      {/* Evaluation reason */}
      <div className="glass-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ats-text-muted)" }}>{t("cvAnalyzer.evaluationReason")}</p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--ats-text-body)" }}>{result.evaluation_reason}</p>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Collapsible icon={Star} title={`${t("cvAnalyzer.strengths")} (${result.strengths.length})`}>
          <BulletList items={result.strengths} dotColor="bg-emerald-400" />
        </Collapsible>
        <Collapsible icon={TrendingUp} title={`${t("cvAnalyzer.weaknesses")} (${result.weaknesses.length})`}>
          <BulletList items={result.weaknesses} dotColor="bg-amber-400" />
        </Collapsible>
      </div>

      {/* Hiring risks */}
      {result.hiring_risks.length > 0 && (
        <Collapsible icon={AlertTriangle} title={`${t("cvAnalyzer.hiringRisks")} (${result.hiring_risks.length})`}>
          <ul className="space-y-2">
            {result.hiring_risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                <span className="text-sm" style={{ color: "var(--ats-text-body)" }}>{r}</span>
              </li>
            ))}
          </ul>
        </Collapsible>
      )}

      {/* Missing info */}
      {result.missing_information.length > 0 && (
        <Collapsible icon={Shield} title={`${t("cvAnalyzer.missingInfo")} (${result.missing_information.length})`} defaultOpen={false}>
          <BulletList items={result.missing_information} dotColor="bg-zinc-500" />
        </Collapsible>
      )}

      {/* Interview questions */}
      <Collapsible icon={MessageSquare}
        title={`${t("cvAnalyzer.interviewQuestions")} (${result.recommended_interview_questions.length})`}
        defaultOpen={false}>
        <ol className="space-y-2">
          {result.recommended_interview_questions.map((q, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm leading-snug" style={{ color: "var(--ats-text-body)" }}>{q}</span>
            </li>
          ))}
        </ol>
      </Collapsible>

      {/* Evidence */}
      <Collapsible icon={BookOpen} title={t("cvAnalyzer.evidence")} defaultOpen={false}>
        <div className="space-y-4">
          {([
            ["skills_evidence",     t("cvAnalyzer.skillsEvidence")],
            ["experience_evidence", t("cvAnalyzer.experienceEvidence")],
            ["culture_evidence",    t("cvAnalyzer.cultureEvidence")],
            ["potential_evidence",  t("cvAnalyzer.potentialEvidence")],
          ] as const).map(([key, label]) => {
            const items = result.evidence[key];
            if (!items.length) return null;
            return (
              <div key={key}>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--ats-text-muted)" }}>{label}</p>
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
        <div className="h-8 w-48 bg-[var(--ats-surface-2)] rounded animate-pulse" />
        <div className="h-4 w-72 bg-[var(--ats-surface-2)] rounded animate-pulse" />
        <div className="h-10 bg-[var(--ats-surface-2)] rounded-lg animate-pulse" />
        <div className="h-52 bg-[var(--ats-surface-2)] rounded-xl animate-pulse" />
      </div>
    }>
      <CvAnalyzerContent />
    </Suspense>
  );
}
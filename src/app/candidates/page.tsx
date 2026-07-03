"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Users, Search, Filter, ArrowUpDown, ExternalLink, Trash2, Mail, CheckCircle2, AlertCircle, RefreshCw, X } from "lucide-react";

import { CandidateScoringResult } from "@/services/ai/schema";

type Candidate = {
  id: string;
  name: string;
  email: string;
  status: string;
  total_score: number | null;
  ai_score_result: CandidateScoringResult | null;
  created_at: string;
  jobs: { title: string } | null;
};

const DECISION_OPTIONS = ["Tất cả", "STRONG HIRE", "HIRE", "CONSIDER", "REJECT"];
const STATUS_OPTIONS = ["Tất cả", "New", "Scoring", "Scored", "Interviewing", "Hired", "Rejected"];

function decisionConfig(decision?: string) {
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
      return { label: "—", className: "bg-slate-700/40 text-slate-500 border-slate-700/40" };
  }
}

function statusConfig(status: string) {
  switch (status) {
    case "Scored":       return { label: "Đã chấm điểm", className: "bg-green-500/15 text-green-400" };
    case "Scoring":      return { label: "Đang chấm...",  className: "bg-blue-500/15 text-blue-400" };
    case "New":          return { label: "Mới",            className: "bg-slate-500/15 text-slate-400" };
    case "Interviewing": return { label: "Phỏng vấn",     className: "bg-purple-500/15 text-purple-400" };
    case "Hired":        return { label: "Đã tuyển",      className: "bg-emerald-500/15 text-emerald-400" };
    case "Rejected":     return { label: "Từ chối",       className: "bg-red-500/15 text-red-400" };
    default:             return { label: status,           className: "bg-slate-500/15 text-slate-400" };
  }
}

function confidenceConfig(level?: string) {
  switch (level) {
    case "High":   return "text-green-400";
    case "Medium": return "text-amber-400";
    case "Low":    return "text-red-400";
    default:       return "text-slate-500";
  }
}

function ScoreCell({ score }: { score: number | null }) {
  if (score == null) return <span className="text-slate-600">—</span>;
  const color = score >= 7 ? "text-emerald-400" : score >= 5 ? "text-amber-400" : "text-red-400";
  return (
    <span className={`font-semibold ${color}`}>
      {score.toFixed(1)}<span className="text-slate-600 font-normal text-xs">/10</span>
    </span>
  );
}

type GmailStatus = "connected_oauth" | "connected_env" | "disconnected" | "unknown";
type ScanResult = { processed: number; created: number } | null;

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [decisionFilter, setDecisionFilter] = useState("Tất cả");
  const [sortBy, setSortBy] = useState<"created_at" | "total_score">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [gmailStatus, setGmailStatus] = useState<GmailStatus>("unknown");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [scanError, setScanError] = useState("");
  const [showGmailBanner, setShowGmailBanner] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail_connected") === "1") {
      setShowGmailBanner("success");
      window.history.replaceState({}, "", "/candidates");
    } else if (params.get("gmail_error")) {
      setShowGmailBanner("error");
      window.history.replaceState({}, "", "/candidates");
    }

    fetch("/api/gmail/status")
      .then((r) => r.json())
      .then(({ connected, source }) => {
        if (!connected) setGmailStatus("disconnected");
        else setGmailStatus(source === "oauth" ? "connected_oauth" : "connected_env");
      })
      .catch(() => setGmailStatus("disconnected"));
  }, []);

  useEffect(() => {
    if (!showGmailBanner) return;
    const t = setTimeout(() => setShowGmailBanner(null), 4000);
    return () => clearTimeout(t);
  }, [showGmailBanner]);

  useEffect(() => {
    fetch("/api/candidates")
      .then((r) => r.json())
      .then(({ data }) => setCandidates(data ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleScanGmail() {
    setScanning(true);
    setScanResult(null);
    setScanError("");
    try {
      const res = await fetch("/api/gmail/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setScanError(data.error ?? "Quét Gmail thất bại");
      } else {
        setScanResult({ processed: data.processed ?? 0, created: data.created ?? 0 });
        if ((data.created ?? 0) > 0) {
          const r = await fetch("/api/candidates");
          const j = await r.json();
          setCandidates(j.data ?? []);
        }
      }
    } catch {
      setScanError("Không kết nối được với server");
    } finally {
      setScanning(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Xóa ứng viên "${name}"?\nHành động này không thể hoàn tác.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/candidates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCandidates((prev) => prev.filter((c) => c.id !== id));
        setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (!confirm(`Xóa ${ids.length} ứng viên đã chọn?\nHành động này không thể hoàn tác.`)) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/candidates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setCandidates((prev) => prev.filter((c) => !selectedIds.has(c.id)));
        setSelectedIds(new Set());
      }
    } finally {
      setBulkDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    let list = candidates;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.jobs?.title?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "Tất cả") {
      list = list.filter((c) => c.status === statusFilter);
    }

    if (decisionFilter !== "Tất cả") {
      list = list.filter((c) => c.ai_score_result?.final_decision === decisionFilter);
    }

    list = [...list].sort((a, b) => {
      const valA = sortBy === "total_score" ? (a.total_score ?? -1) : new Date(a.created_at).getTime();
      const valB = sortBy === "total_score" ? (b.total_score ?? -1) : new Date(b.created_at).getTime();
      return sortDir === "desc" ? valB - valA : valA - valB;
    });

    return list;
  }, [candidates, search, statusFilter, decisionFilter, sortBy, sortDir]);

  function toggleSort(col: "created_at" | "total_score") {
    if (sortBy === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortBy(col); setSortDir("desc"); }
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const s = new Set(prev);
        filtered.forEach((c) => s.delete(c.id));
        return s;
      });
    } else {
      setSelectedIds((prev) => {
        const s = new Set(prev);
        filtered.forEach((c) => s.add(c.id));
        return s;
      });
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  // Pipeline stage counts (computed from all candidates, not just filtered)
  const pipelineCounts = {
    new: candidates.filter((c) => c.status === "New" || c.status === "Scoring").length,
    scored: candidates.filter((c) => c.status === "Scored").length,
    interviewing: candidates.filter((c) => c.status === "Interviewing").length,
    closed: candidates.filter((c) => c.status === "Hired" || c.status === "Rejected").length,
  };

  const PIPELINE_STAGES = [
    { key: "new",         label: "Nhận CV",    count: pipelineCounts.new,         color: "#60a5fa", accent: "rgba(37,99,235,0.12)",  border: "rgba(37,99,235,0.22)" },
    { key: "scored",      label: "Sàng lọc AI",count: pipelineCounts.scored,      color: "#a78bfa", accent: "rgba(124,58,237,0.12)", border: "rgba(124,58,237,0.22)" },
    { key: "interviewing",label: "Phỏng vấn",  count: pipelineCounts.interviewing, color: "#fb923c", accent: "rgba(234,88,12,0.12)",  border: "rgba(234,88,12,0.22)" },
    { key: "closed",      label: "Kết quả",    count: pipelineCounts.closed,      color: "#34d399", accent: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.22)" },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Ứng viên</h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(100,116,139,0.9)" }}>
            {loading ? "Đang tải..." : `${filtered.length} / ${candidates.length} ứng viên`}
          </p>
        </div>
        <Link
          href="/cv-analyzer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
          style={{
            background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
            boxShadow: "0 2px 8px rgba(37,99,235,0.35)",
          }}
        >
          + Phân tích CV mới
        </Link>
      </div>

      {/* ── Kanban pipeline overview ── */}
      {!loading && candidates.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PIPELINE_STAGES.map((stage, i) => (
            <div
              key={stage.key}
              className="relative rounded-xl p-4"
              style={{ background: stage.accent, border: `1px solid ${stage.border}` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: stage.color, opacity: 0.85 }}
                  >
                    {stage.label}
                  </p>
                  <p className="text-2xl font-bold text-white mt-1 tabular-nums">
                    {stage.count}
                  </p>
                </div>
                <div
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums"
                  style={{ color: stage.color, background: `${stage.border}` }}
                >
                  #{i + 1}
                </div>
              </div>
              {/* Mini progress bar */}
              {candidates.length > 0 && (
                <div className="mt-3 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((stage.count / candidates.length) * 100)}%`,
                      background: stage.color,
                      opacity: 0.7,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}


      {/* Gmail banner */}
      {showGmailBanner === "success" && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Gmail đã kết nối thành công! Bạn có thể quét hộp thư ngay bây giờ.
          </div>
          <button onClick={() => setShowGmailBanner(null)} className="text-green-500/60 hover:text-green-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {showGmailBanner === "error" && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Kết nối Gmail thất bại. Vui lòng thử lại.
          </div>
          <button onClick={() => setShowGmailBanner(null)} className="text-red-500/60 hover:text-red-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Gmail integration bar */}
      {gmailStatus === "disconnected" && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-zinc-200">Kết nối Gmail để quét CV tự động</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Hệ thống sẽ đọc hộp thư, tìm email có đính kèm CV (PDF) và tạo ứng viên tự động.
              </p>
            </div>
          </div>
          <a
            href="/api/gmail/connect?return_to=/candidates"
            className="shrink-0 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium transition-colors whitespace-nowrap"
          >
            Kết nối Gmail
          </a>
        </div>
      )}

      {(gmailStatus === "connected_oauth" || gmailStatus === "connected_env") && (
        <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-700/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              <span className="text-sm text-zinc-300 font-medium">Gmail đã kết nối</span>
            </div>
            {gmailStatus === "connected_env" && (
              <span className="text-xs text-zinc-600">(qua env)</span>
            )}
            {scanResult && (
              <span className="text-xs text-zinc-400">
                — Vừa quét: {scanResult.processed} email, tạo mới {scanResult.created} ứng viên
              </span>
            )}
            {scanError && (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {scanError}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {gmailStatus === "connected_oauth" && (
              <a
                href="/api/gmail/connect?return_to=/candidates"
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Kết nối lại
              </a>
            )}
            <button
              onClick={handleScanGmail}
              disabled={scanning}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Đang quét..." : "Quét Gmail ngay"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, vị trí..."
            className="w-full pl-9 pr-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm text-slate-200 px-3 py-2 focus:outline-none focus:border-indigo-500/50"
          >
            {STATUS_OPTIONS.map((o) => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
          </select>
        </div>
        <select
          value={decisionFilter}
          onChange={(e) => setDecisionFilter(e.target.value)}
          className="bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm text-slate-200 px-3 py-2 focus:outline-none focus:border-indigo-500/50"
        >
          {DECISION_OPTIONS.map((o) => (
            <option key={o} value={o} className="bg-slate-900">
              {o === "Tất cả" ? "Quyết định: Tất cả" : o}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
          <span className="text-sm text-indigo-300">
            Đã chọn <span className="font-semibold">{selectedIds.size}</span> ứng viên
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Bỏ chọn tất cả
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 text-xs font-medium hover:bg-red-500/25 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {bulkDeleting ? "Đang xóa..." : `Xóa ${selectedIds.size} ứng viên`}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500 mt-3">Đang tải dữ liệu...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Không tìm thấy ứng viên nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="pl-5 pr-2 py-3">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500">Ứng viên</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500">Vị trí</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500">Trạng thái</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500">
                    <button onClick={() => toggleSort("total_score")} className="flex items-center gap-1 hover:text-slate-300 transition-colors">
                      Tổng điểm <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500">Job Fit</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500">Potential</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500">Cultural</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500">Quyết định</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500">Độ tin cậy</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-500">
                    <button onClick={() => toggleSort("created_at")} className="flex items-center gap-1 hover:text-slate-300 transition-colors">
                      Ngày <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((c) => {
                  const ai = c.ai_score_result;
                  const decisionCfg = decisionConfig(ai?.final_decision);
                  const statusCfg = statusConfig(c.status);
                  const isSelected = selectedIds.has(c.id);
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-white/[0.02] transition-colors group ${isSelected ? "bg-indigo-500/[0.06]" : ""}`}
                    >
                      <td className="pl-5 pr-2 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(c.id)}
                          className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-white">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.email}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-300 whitespace-nowrap text-xs">{c.jobs?.title ?? "—"}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-3"><ScoreCell score={c.total_score} /></td>
                      <td className="px-3 py-3"><ScoreCell score={ai?.job_fit_score ?? null} /></td>
                      <td className="px-3 py-3"><ScoreCell score={ai?.potential_score ?? null} /></td>
                      <td className="px-3 py-3"><ScoreCell score={ai?.cultural_fit_score ?? null} /></td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${decisionCfg.className}`}>
                          {decisionCfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-xs font-medium ${confidenceConfig(ai?.confidence_level)}`}>
                          {ai?.confidence_level ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-3 py-3">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-3">
                          <Link
                            href={`/candidates/${c.id}`}
                            className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                          >
                            <ExternalLink className="w-3 h-3" /> Chi tiết
                          </Link>
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
                            disabled={deletingId === c.id}
                            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-400 disabled:opacity-40"
                          >
                            <Trash2 className="w-3 h-3" />
                            {deletingId === c.id ? "Đang xóa..." : "Xóa"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
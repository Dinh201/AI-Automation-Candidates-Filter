"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Users, Search, Filter, ArrowUpDown, ExternalLink } from "lucide-react";
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
    case "Scored":   return { label: "Đã chấm điểm", className: "bg-green-500/15 text-green-400" };
    case "Scoring":  return { label: "Đang chấm...",  className: "bg-blue-500/15 text-blue-400" };
    case "New":      return { label: "Mới",            className: "bg-slate-500/15 text-slate-400" };
    case "Interviewing": return { label: "Phỏng vấn", className: "bg-purple-500/15 text-purple-400" };
    case "Hired":    return { label: "Đã tuyển",      className: "bg-emerald-500/15 text-emerald-400" };
    case "Rejected": return { label: "Từ chối",       className: "bg-red-500/15 text-red-400" };
    default:         return { label: status,           className: "bg-slate-500/15 text-slate-400" };
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

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [decisionFilter, setDecisionFilter] = useState("Tất cả");
  const [sortBy, setSortBy] = useState<"created_at" | "total_score">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetch("/api/candidates")
      .then((r) => r.json())
      .then(({ data }) => setCandidates(data ?? []))
      .finally(() => setLoading(false));
  }, []);

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
      list = list.filter(
        (c) => c.ai_score_result?.final_decision === decisionFilter
      );
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

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Ứng viên</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {loading ? "Đang tải..." : `${filtered.length} / ${candidates.length} ứng viên`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, vị trí..."
            className="w-full pl-9 pr-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        {/* Status filter */}
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

        {/* Decision filter */}
        <select
          value={decisionFilter}
          onChange={(e) => setDecisionFilter(e.target.value)}
          className="bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm text-slate-200 px-3 py-2 focus:outline-none focus:border-indigo-500/50"
        >
          {DECISION_OPTIONS.map((o) => <option key={o} value={o} className="bg-slate-900">{o === "Tất cả" ? "Quyết định: Tất cả" : o}</option>)}
        </select>
      </div>

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
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">Ứng viên</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">Vị trí</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">Trạng thái</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                    <button
                      onClick={() => toggleSort("total_score")}
                      className="flex items-center gap-1 hover:text-slate-300 transition-colors"
                    >
                      Tổng điểm <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">Job Fit</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">Potential</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">Cultural</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">Quyết định</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">Độ tin cậy</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500">
                    <button
                      onClick={() => toggleSort("created_at")}
                      className="flex items-center gap-1 hover:text-slate-300 transition-colors"
                    >
                      Ngày <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((c) => {
                  const ai = c.ai_score_result;
                  const decisionCfg = decisionConfig(ai?.final_decision);
                  const statusCfg = statusConfig(c.status);
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-5 py-3">
                        <p className="font-medium text-white">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.email}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-300 whitespace-nowrap text-xs">{c.jobs?.title ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3"><ScoreCell score={c.total_score} /></td>
                      <td className="px-5 py-3"><ScoreCell score={ai?.job_fit_score ?? null} /></td>
                      <td className="px-5 py-3"><ScoreCell score={ai?.potential_score ?? null} /></td>
                      <td className="px-5 py-3"><ScoreCell score={ai?.cultural_fit_score ?? null} /></td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${decisionCfg.className}`}>
                          {decisionCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium ${confidenceConfig(ai?.confidence_level)}`}>
                          {ai?.confidence_level ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/candidates/${c.id}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          <ExternalLink className="w-3 h-3" /> Chi tiết
                        </Link>
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

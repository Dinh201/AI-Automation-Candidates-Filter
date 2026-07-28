"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, Search } from "lucide-react";
import { useTranslation } from "@/lib/i18n-context";
import { ViewCvLink } from "@/components/view-cv-link";

type Candidate = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  jobs: { title: string } | null;
};

export default function CvLibraryPage() {
  const { t, lang } = useTranslation();
  const locale = lang === "en" ? "en-US" : "vi-VN";

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("");

  useEffect(() => {
    fetch("/api/candidates")
      .then((r) => r.json())
      .then(({ data }) => setCandidates(data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const jobTitles = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => {
      if (c.jobs?.title) set.add(c.jobs.title);
    });
    return Array.from(set).sort();
  }, [candidates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => {
      const matchesSearch =
        !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
      const matchesJob = !jobFilter || c.jobs?.title === jobFilter;
      return matchesSearch && matchesJob;
    });
  }, [candidates, search, jobFilter]);

  return (
    <div className="p-6 space-y-5">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2">
          <Archive className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          <h1 className="text-2xl font-bold tracking-tight ats-text-h">{t("cvLibrary.title")}</h1>
        </div>
        <p className="text-sm mt-0.5 ats-text-muted">{t("cvLibrary.subtitle")}</p>
      </div>

      {/* ── Filters ── */}
      <div className="glass-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("cvLibrary.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 dark:bg-white/[0.05] dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50"
          />
        </div>
        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 dark:bg-white/[0.05] dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50"
        >
          <option value="">{t("cvLibrary.allPositions")}</option>
          {jobTitles.map((title) => (
            <option key={title} value={title}>
              {title}
            </option>
          ))}
        </select>
      </div>

      {/* ── Table ── */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm ats-text-muted">{t("common.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm ats-text-muted">
            {candidates.length === 0 ? t("cvLibrary.empty") : t("cvLibrary.noMatch")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                  <th className="px-5 py-3 text-left text-xs font-medium ats-text-muted">
                    {t("cvLibrary.colCandidate")}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium ats-text-muted">
                    {t("cvLibrary.colPosition")}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium ats-text-muted">
                    {t("cvLibrary.colDate")}
                  </th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/candidates/${c.id}`}
                        className="font-medium text-slate-900 dark:text-white hover:underline"
                      >
                        {c.name}
                      </Link>
                      <p className="text-xs text-slate-500">{c.email}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap text-xs">
                      {c.jobs?.title ?? "—"}
                    </td>
                    <td className="px-3 py-3 ats-text-muted text-xs whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString(locale)}
                    </td>
                    <td className="px-3 py-3">
                      <ViewCvLink
                        candidateId={c.id}
                        label={t("cvLibrary.viewCv")}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/15 border border-indigo-600/20 text-indigo-400 text-xs font-medium hover:bg-indigo-600/25 transition-colors"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

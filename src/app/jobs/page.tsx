"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  Briefcase,
  Plus,
  Pencil,
  X,
  Copy,
  Check,
  ChevronDown,
  Users,
  ExternalLink,
  Gift,
  ClipboardList,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { RichTextEditor } from "@/components/rich-text-editor";

type Rubric = {
  job_fit_weight: number;
  potential_weight: number;
  cultural_fit_weight: number;
  notes: string;
};

type Job = {
  id: string;
  title: string;
  description: string;
  required_skills: string;
  preferred_skills: string;
  experience_requirement: string;
  benefits: string;
  rubric: Rubric;
  status: "Open" | "Closed";
  created_at: string;
};

type FormState = {
  title: string;
  description: string;
  required_skills: string;
  preferred_skills: string;
  experience_requirement: string;
  benefits: string;
  job_fit_weight: number;
  potential_weight: number;
  cultural_fit_weight: number;
  rubric_notes: string;
  status: "Open" | "Closed";
};

const DEFAULT_FORM: FormState = {
  title: "",
  description: "",
  required_skills: "",
  preferred_skills: "",
  experience_requirement: "",
  benefits: "",
  job_fit_weight: 50,
  potential_weight: 30,
  cultural_fit_weight: 20,
  rubric_notes: "",
  status: "Open",
};

const TABS: { label: string; value: string }[] = [
  { label: "Đang tuyển", value: "Open" },
  { label: "Đã đóng", value: "Closed" },
];

function statusConfig(status: string) {
  switch (status) {
    case "Open":
      return { label: "Đang tuyển", className: "bg-green-500/15 text-green-400 border-green-500/20" };
    case "Closed":
      return { label: "Đã đóng", className: "bg-red-500/15 text-red-400 border-red-500/20" };
    default:
      return { label: status, className: "bg-zinc-600/30 text-zinc-400 border-zinc-600/30" };
  }
}

function WeightBar({ weights }: { weights: { job_fit: number; potential: number; cultural: number } }) {
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden gap-px w-24">
      <div className="bg-blue-500" style={{ width: `${weights.job_fit}%` }} />
      <div className="bg-purple-500" style={{ width: `${weights.potential}%` }} />
      <div className="bg-amber-500" style={{ width: `${weights.cultural}%` }} />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={handleCopy}
      title="Copy link ứng tuyển"
      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function SectionLabel({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      {icon && <span className="text-indigo-400">{icon}</span>}
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{children}</p>
      <span className="flex-1 h-px bg-zinc-800" />
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").trim();
}

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`resize-none overflow-hidden ${className ?? ""}`}
    />
  );
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Open");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    setLoading(true);
    const res = await fetch("/api/jobs?status=all");
    const { jobs: data } = await res.json();
    setJobs(data ?? []);
    setLoading(false);
  }

  const filtered = useMemo(() => jobs.filter((j) => j.status === activeTab), [jobs, activeTab]);

  function openCreate() {
    setEditingJob(null);
    setForm(DEFAULT_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(job: Job) {
    setEditingJob(job);
    const rubric = job.rubric ?? {};
    setForm({
      title: job.title,
      description: job.description,
      required_skills: job.required_skills,
      preferred_skills: job.preferred_skills ?? "",
      experience_requirement: job.experience_requirement ?? "",
      benefits: job.benefits ?? "",
      job_fit_weight: Math.round((rubric.job_fit_weight ?? 0.5) * 100),
      potential_weight: Math.round((rubric.potential_weight ?? 0.3) * 100),
      cultural_fit_weight: Math.round((rubric.cultural_fit_weight ?? 0.2) * 100),
      rubric_notes: rubric.notes ?? "",
      status: job.status === "Closed" ? "Closed" : "Open",
    });
    setFormError("");
    setModalOpen(true);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function weightSum() {
    return form.job_fit_weight + form.potential_weight + form.cultural_fit_weight;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    if (!form.title.trim()) {
      setFormError("Vui lòng nhập tên vị trí tuyển dụng (*)");
      return;
    }
    if (!stripHtml(form.description)) {
      setFormError("Vui lòng nhập mô tả công việc (*)");
      return;
    }
    if (!stripHtml(form.required_skills)) {
      setFormError("Vui lòng nhập kỹ năng / yêu cầu công việc (*)");
      return;
    }
    if (weightSum() !== 100) {
      setFormError(`Tổng trọng số rubric phải bằng 100% (hiện tại: ${weightSum()}%)`);
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description,
      required_skills: form.required_skills,
      preferred_skills: form.preferred_skills,
      experience_requirement: form.experience_requirement.trim(),
      benefits: form.benefits,
      status: form.status,
      rubric: {
        job_fit_weight: form.job_fit_weight / 100,
        potential_weight: form.potential_weight / 100,
        cultural_fit_weight: form.cultural_fit_weight / 100,
        notes: form.rubric_notes,
      },
    };

    const url = editingJob ? `/api/jobs/${editingJob.id}` : "/api/jobs";
    const method = editingJob ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      const err = await res.json();
      setFormError(err.error ?? "Có lỗi xảy ra");
      return;
    }
    setModalOpen(false);
    fetchJobs();
  }

  async function handleClose(jobId: string) {
    if (!confirm("Đóng vị trí này? Ứng viên đã nộp sẽ không bị ảnh hưởng.")) return;
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Closed" }),
    });
    fetchJobs();
  }

  async function handleReopen(jobId: string) {
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Open" }),
    });
    fetchJobs();
  }

  const applyUrl = (id: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/jobs/${id}/apply` : `/jobs/${id}/apply`;

  const tabCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const j of jobs) map[j.status] = (map[j.status] ?? 0) + 1;
    return map;
  }, [jobs]);

  return (
    <div className="p-6 space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Vị trí tuyển dụng</h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(100,116,139,0.9)" }}>
            Quản lý JD và cấu hình rubric chấm điểm AI
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ats-btn-primary"
        >
          <Plus className="w-4 h-4" /> New position
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${activeTab === value ? "text-white" : "hover:text-slate-300"
              }`}
            style={{ color: activeTab === value ? "white" : "rgba(100,116,139,0.85)" }}
          >
            {label}
            {tabCounts[value] !== undefined && (
              <span
                className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                style={
                  activeTab === value
                    ? { background: "rgba(37,99,235,0.18)", color: "#93c5fd" }
                    : { background: "rgba(255,255,255,0.06)", color: "rgba(100,116,139,0.8)" }
                }
              >
                {tabCounts[value]}
              </span>
            )}
            {activeTab === value && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: "#2563eb" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Jobs list */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-zinc-500 mt-3">Đang tải...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card py-16 text-center">
          <Briefcase className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">Chưa có vị trí nào trong mục này</p>
          {activeTab === "Open" && (
            <button
              onClick={openCreate}
              className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              + Tạo vị trí đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => {
            const rubric = job.rubric ?? {};
            const jfw = Math.round((rubric.job_fit_weight ?? 0.5) * 100);
            const pw = Math.round((rubric.potential_weight ?? 0.3) * 100);
            const cfw = Math.round((rubric.cultural_fit_weight ?? 0.2) * 100);
            const isExpanded = expandedId === job.id;
            const statusCfg = statusConfig(job.status);

            return (
              <div key={job.id} className="glass-card overflow-hidden">
                {/* Card header row */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-white truncate">{job.title}</h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusCfg.className}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      {job.experience_requirement && (
                        <span className="text-xs text-zinc-500">{job.experience_requirement}</span>
                      )}
                      <div className="flex items-center gap-2">
                        <WeightBar weights={{ job_fit: jfw, potential: pw, cultural: cfw }} />
                        <span className="text-[10px] text-zinc-600">
                          JF {jfw}% · P {pw}% · CF {cfw}%
                        </span>
                      </div>
                      <span className="text-xs text-zinc-600">
                        {new Date(job.created_at).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <CopyButton text={applyUrl(job.id)} />
                    <Link
                      href={`/candidates?job=${job.id}`}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                      title="Xem ứng viên"
                    >
                      <Users className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => openEdit(job)}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {job.status === "Closed" ? (
                      <button
                        onClick={() => handleReopen(job.id)}
                        className="px-2.5 py-1 rounded-lg text-xs text-green-400 hover:bg-green-500/10 transition-colors"
                      >
                        Mở lại
                      </button>
                    ) : (
                      <button
                        onClick={() => handleClose(job.id)}
                        className="px-2.5 py-1 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Đóng
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : job.id)}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 px-5 py-5 space-y-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* Mô tả công việc */}
                      <div>
                        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <FileText className="w-3 h-3" /> Mô tả công việc
                        </p>
                        <div className="job-html" dangerouslySetInnerHTML={{ __html: job.description }} />
                      </div>

                      {/* Yêu cầu công việc */}
                      <div className="space-y-3">
                        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
                          <ClipboardList className="w-3 h-3" /> Yêu cầu công việc
                        </p>
                        {job.experience_requirement && (
                          <div>
                            <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1">Kinh nghiệm</p>
                            <p className="text-sm text-zinc-300">{job.experience_requirement}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1">Kỹ năng bắt buộc</p>
                          <div className="job-html" dangerouslySetInnerHTML={{ __html: job.required_skills }} />
                        </div>
                        {job.preferred_skills && (
                          <div>
                            <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1">Kỹ năng ưu tiên</p>
                            <div className="job-html" dangerouslySetInnerHTML={{ __html: job.preferred_skills }} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Phúc lợi */}
                    {job.benefits && (
                      <div>
                        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Gift className="w-3 h-3" /> Phúc lợi
                        </p>
                        <div className="job-html" dangerouslySetInnerHTML={{ __html: job.benefits }} />
                      </div>
                    )}

                    {/* Rubric AI notes */}
                    {rubric.notes && (
                      <div>
                        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3 h-3" /> Hướng dẫn AI
                        </p>
                        <div className="job-html italic" dangerouslySetInnerHTML={{ __html: rubric.notes }} />
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
                      <a
                        href={applyUrl(job.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" /> Xem trang ứng tuyển
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL
      ══════════════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setModalOpen(false)} />

          <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">

            {/* ── Modal header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {editingJob ? "Chỉnh sửa thông tin JD" : "Tạo JD mới"}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {editingJob ? `ID: ${editingJob.id.slice(0, 8)}…` : "Điền đầy đủ thông tin để tạo JD"}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Scrollable form ── */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-7">

              {/* ════════════════════════════════
                  1. TÊN VỊ TRÍ
              ════════════════════════════════ */}
              <div className="space-y-4">
                <SectionLabel icon={<Briefcase className="w-3.5 h-3.5" />}>Tên vị trí</SectionLabel>

                <div>
                  <FieldLabel required>Tên vị trí tuyển dụng</FieldLabel>
                  <input
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="VD: Frontend Developer, Product Manager, Data Analyst..."
                    className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
                  />
                </div>

                {/* Trạng thái Open / Close */}
                <div>
                  <FieldLabel>Trạng thái đăng tuyển</FieldLabel>
                  <div className="flex gap-2">
                    {([
                      { value: "Open", label: "Open — Đang tuyển", desc: "Ứng viên có thể nộp hồ sơ" },
                      { value: "Closed", label: "Close — Đã đóng", desc: "Ngừng nhận hồ sơ" },
                    ] as const).map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => set("status", s.value)}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-left border transition-colors ${form.status === s.value
                            ? s.value === "Open"
                              ? "bg-green-500/10 border-green-500/30 text-green-300"
                              : "bg-red-500/10 border-red-500/30 text-red-300"
                            : "border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                          }`}
                      >
                        <p className="text-xs font-semibold">{s.label}</p>
                        <p className="text-[10px] opacity-60 mt-0.5">{s.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ════════════════════════════════
                  2. MÔ TẢ CÔNG VIỆC
              ════════════════════════════════ */}
              <div className="space-y-4">
                <SectionLabel icon={<FileText className="w-3.5 h-3.5" />}>Mô tả công việc</SectionLabel>

                <div>
                  <FieldLabel required>Nội dung mô tả</FieldLabel>
                  <RichTextEditor
                    value={form.description}
                    onChange={(v) => set("description", v)}
                    placeholder="Mô tả tổng quan vị trí, trách nhiệm chính, môi trường làm việc..."
                    minHeight="150px"
                  />
                </div>
              </div>

              {/* ════════════════════════════════
                  3. YÊU CẦU CÔNG VIỆC
              ════════════════════════════════ */}
              <div className="space-y-4">
                <SectionLabel icon={<ClipboardList className="w-3.5 h-3.5" />}>Yêu cầu công việc</SectionLabel>
                <div>
                  <FieldLabel>Kinh nghiệm yêu cầu</FieldLabel>
                  <RichTextEditor
                    value={form.required_skills}
                    onChange={(v) => set("required_skills", v)}
                    placeholder="VD: React, TypeScript, REST API, Git... (dùng bullet để liệt kê rõ hơn)"
                    minHeight="110px"
                  />
                </div>
              </div>

              {/* ════════════════════════════════
                  4. PHÚC LỢI
              ════════════════════════════════ */}
              <div className="space-y-4">
                <SectionLabel icon={<Gift className="w-3.5 h-3.5" />}>Phúc lợi</SectionLabel>

                <div>
                  <FieldLabel>Chế độ đãi ngộ & Phúc lợi <span className="text-zinc-600 font-normal">(không bắt buộc)</span></FieldLabel>
                  <RichTextEditor
                    value={form.benefits}
                    onChange={(v) => set("benefits", v)}
                    placeholder="VD: Lương thỏa thuận theo năng lực, thưởng KPI, BHXH đầy đủ, làm việc hybrid..."
                    minHeight="110px"
                  />
                </div>
              </div>

              {/* ════════════════════════════════
                  5. RUBRIC CHẤM ĐIỂM AI
              ════════════════════════════════ */}
              <div className="space-y-4">
                <SectionLabel icon={<SlidersHorizontal className="w-3.5 h-3.5" />}>Rubric chấm điểm AI</SectionLabel>

                <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-400">Tổng trọng số phải bằng 100%</p>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg ${weightSum() === 100
                          ? "bg-green-500/15 text-green-400"
                          : "bg-red-500/15 text-red-400"
                        }`}
                    >
                      Tổng: {weightSum()}%
                    </span>
                  </div>

                  {[
                    {
                      key: "job_fit_weight" as const,
                      label: "Job Fit",
                      desc: "Phù hợp kỹ năng & kinh nghiệm",
                      color: "text-blue-400",
                      bar: "bg-blue-500",
                    },
                    {
                      key: "potential_weight" as const,
                      label: "Potential",
                      desc: "Tiềm năng phát triển",
                      color: "text-purple-400",
                      bar: "bg-purple-500",
                    },
                    {
                      key: "cultural_fit_weight" as const,
                      label: "Cultural Fit",
                      desc: "Phù hợp văn hóa công ty",
                      color: "text-amber-400",
                      bar: "bg-amber-500",
                    },
                  ].map(({ key, label, desc, color, bar }) => (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`text-xs font-semibold ${color}`}>{label}</span>
                          <span className="text-xs text-zinc-600 ml-2">{desc}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={form[key]}
                            onChange={(e) => set(key, Number(e.target.value))}
                            className="w-14 text-center px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500/60"
                          />
                          <span className="text-xs text-zinc-500">%</span>
                        </div>
                      </div>
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${bar}`}
                          style={{ width: `${form[key]}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <FieldLabel>Hướng dẫn bổ sung cho AI <span className="text-zinc-600 font-normal">(không bắt buộc)</span></FieldLabel>
                  <RichTextEditor
                    value={form.rubric_notes}
                    onChange={(v) => set("rubric_notes", v)}
                    placeholder="VD: Ưu tiên ứng viên có kinh nghiệm startup, cần tiếng Anh tốt..."
                    minHeight="80px"
                  />
                </div>
              </div>

              {/* Error */}
              {formError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                  <span className="shrink-0 mt-0.5">⚠</span>
                  {formError}
                </div>
              )}

              {/* Submit row */}
              <div className="flex gap-3 pt-1 pb-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-medium hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Đang lưu..." : editingJob ? "Cập nhật vị trí" : "Tạo vị trí"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

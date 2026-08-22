"use client";

import { useState, useRef, use, useEffect } from "react";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { Plus_Jakarta_Sans } from "next/font/google";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Briefcase,
  ChevronDown,
  FileText,
} from "lucide-react";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

type Job = {
  id: string;
  title: string;
  description: string;
  required_skills: string;
  experience_requirement: string;
  benefits: string;
};

// CV được upload thẳng từ trình duyệt lên Supabase Storage (qua signed
// upload URL, xem handleSubmit) thay vì gửi qua serverless function — Vercel
// giới hạn cứng 4.5MB/request cho function. 50MB khớp với fileSizeLimit của
// bucket cv_uploads.
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function parseTitle(rawTitle: string) {
  const match = rawTitle.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!match) return { mainTitle: rawTitle, category: null as string | null };
  return { mainTitle: match[1].trim(), category: match[2].trim() };
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

/**
 * `benefits`/`description` có thể là văn bản thuần (mỗi dòng 1 ý) hoặc HTML
 * từ rich-text editor (vd `<p>&nbsp;&nbsp;Thu nhập...</p>`). Tách theo khối
 * `<p>/<li>/<div>` khi phát hiện HTML, ngược lại tách theo dòng như cũ.
 */
function stripLeadingBullet(text: string) {
  return text.replace(/^[-•*·o]\s*/, "").trim();
}

function parseRichParagraphs(raw: string) {
  if (!raw) return [];

  const hasHtml = /<[a-z][\s\S]*>/i.test(raw);
  if (hasHtml) {
    return raw
      .split(/<\/(?:p|li|div)>/i)
      .map((chunk) =>
        stripLeadingBullet(decodeHtmlEntities(chunk.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim())
      )
      .filter(Boolean);
  }

  return raw
    .split(/\r?\n/)
    .map((line) => stripLeadingBullet(line))
    .filter(Boolean);
}

function VaconsMark() {
  return (
    <Image
      src="/vacons-logo.png"
      alt="VACONS"
      width={270}
      height={100}
      priority
      className="w-[130px] h-auto"
    />
  );
}

export default function CandidateApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const jobId = unwrappedParams.id;

  const [job, setJob] = useState<Job | null>(null);
  const [jobNotFound, setJobNotFound] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showJD, setShowJD] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState(5);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const HOME_URL = "https://vacons.com.vn";

  function goHomeNow() {
    if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
    window.location.href = HOME_URL;
  }

  useEffect(() => {
    if (submitStatus !== "success") return;

    redirectTimerRef.current = setInterval(() => {
      setRedirectSeconds((s) => {
        if (s <= 1) {
          if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
          window.location.href = HOME_URL;
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
    };
  }, [submitStatus]);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then(({ job: data }) => {
        if (!data) setJobNotFound(true);
        else setJob(data);
      })
      .catch(() => setJobNotFound(true));
  }, [jobId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const acceptFile = (picked: File) => {
    if (picked.type !== "application/pdf") {
      alert("Vui lòng chỉ upload file PDF");
      return;
    }
    if (picked.size > MAX_FILE_SIZE_BYTES) {
      alert("File CV quá lớn (tối đa 50MB). Vui lòng nén hoặc xuất lại file PDF nhỏ hơn.");
      return;
    }
    setFile(picked);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      acceptFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      alert("Vui lòng upload CV của bạn");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      // Bước 1: xin signed upload URL rồi upload CV thẳng lên Supabase
      // Storage — không đi qua serverless function nên không bị giới hạn
      // 4.5MB/request của Vercel.
      const urlRes = await fetch("/api/candidates/apply/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, file_name: file.name }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error || "Có lỗi xảy ra khi tải CV lên");

      const supabase = createSupabaseBrowser();
      const { error: uploadError } = await supabase.storage
        .from("cv_uploads")
        .uploadToSignedUrl(urlData.path, urlData.token, file, { contentType: "application/pdf" });
      if (uploadError) throw new Error(uploadError.message || "Có lỗi xảy ra khi tải CV lên");

      // Bước 2: gửi thông tin ứng viên — chỉ JSON nhỏ (đường dẫn file), file
      // đã nằm sẵn trên Storage nên server tự đọc lại từ đó.
      const formData = new FormData(e.currentTarget);
      const res = await fetch("/api/candidates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          cv_path: urlData.path,
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          form_answers: formData.get("form_answers"),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra khi nộp hồ sơ");
      }

      setSubmitStatus("success");
    } catch (error: unknown) {
      setSubmitStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (jobNotFound) {
    return (
      <div className={`${jakarta.className} min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4`}>
        <div className="max-w-md w-full rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] space-y-4">
          <Briefcase className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="text-xl font-bold text-[#0F172A]">Vị trí không tồn tại</h2>
          <p className="text-[#475569] text-sm">Link ứng tuyển không hợp lệ hoặc vị trí đã đóng.</p>
        </div>
      </div>
    );
  }

  if (submitStatus === "success") {
    return (
      <div className={`${jakarta.className} min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4`}>
        <div className="max-w-md w-full rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] space-y-5">
          <div className="mx-auto w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-teal-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">Nộp hồ sơ thành công!</h2>
          <p className="text-[#475569] text-sm leading-relaxed">
            Cảm ơn bạn đã ứng tuyển{job ? ` vị trí ${job.title}` : ""} tại VACONS. Đội ngũ tuyển dụng
            sẽ xem xét hồ sơ và liên hệ với bạn trong thời gian sớm nhất.
          </p>

          <div className="space-y-2 pt-1">
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0D9488]"
                style={{ animation: "vaconsRedirectBar 5s linear forwards" }}
              />
            </div>
            <p className="text-xs text-[#94A3B8]">
              Tự động chuyển về trang chủ VACONS sau {redirectSeconds}s...
            </p>
          </div>

          <button
            onClick={goHomeNow}
            className="w-full py-3 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-semibold transition-colors"
          >
            Về Trang chủ
          </button>
        </div>

        <style>{`
          @keyframes vaconsRedirectBar {
            from { width: 100%; }
            to { width: 0%; }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes vaconsRedirectBar {
              from { width: 0%; }
              to { width: 0%; }
            }
          }
        `}</style>
      </div>
    );
  }

  const { mainTitle, category } = job ? parseTitle(job.title) : { mainTitle: "", category: null };
  const benefits = job ? parseRichParagraphs(job.benefits) : [];
  const descriptionParagraphs = job ? parseRichParagraphs(job.description) : [];

  return (
    <div className={`${jakarta.className} min-h-screen bg-[#F8FAFC]`}>
      <div className="grid lg:grid-cols-2">
        {/* ── LEFT — Role context & brand ── */}
        <div className="relative overflow-hidden bg-[#0F172A] px-6 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20 lg:min-h-screen flex flex-col justify-center">
          <div
            className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-teal-500/20 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative">
            <VaconsMark />

            {job ? (
              <div className="mt-12">
                {category && (
                  <span className="inline-flex items-center rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-300">
                    {category}
                  </span>
                )}
                <h1
                  className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-white text-balance"
                  style={{
                    textShadow: [
                      "-0.6px -0.6px 0 rgba(45,212,191,0.85)",
                      "0.6px -0.6px 0 rgba(45,212,191,0.85)",
                      "-0.6px 0.6px 0 rgba(45,212,191,0.85)",
                      "0.6px 0.6px 0 rgba(45,212,191,0.85)",
                      "0 0 10px rgba(45,212,191,0.55)",
                      "0 0 32px rgba(45,212,191,0.35)",
                    ].join(", "),
                  }}
                >
                  {mainTitle}
                </h1>
                {job.experience_requirement && (
                  <p className="mt-3 text-sm text-slate-400">
                    Yêu cầu kinh nghiệm: {job.experience_requirement}
                  </p>
                )}

                {benefits.length > 0 && (
                  <div className="mt-9">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                      Quyền lợi nổi bật
                    </p>
                    <ul className="space-y-2.5">
                      {benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-slate-200">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 text-teal-400 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {job.description && (
                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={() => setShowJD((v) => !v)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-300 hover:text-teal-200 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Xem chi tiết JD
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${showJD ? "rotate-180" : ""}`}
                      />
                    </button>
                    <div
                      className={`grid transition-all duration-300 ease-in-out ${showJD ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0"
                        }`}
                    >
                      <div className="overflow-hidden">
                        <ul className="space-y-2.5 text-sm leading-relaxed text-slate-300 max-h-64 overflow-y-auto pr-2 border-l-2 border-white/10 pl-4">
                          {descriptionParagraphs.map((line, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-teal-400/80 shrink-0">–</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-12 space-y-3">
                <div className="h-5 w-40 rounded-full bg-white/10 animate-pulse" />
                <div className="h-9 w-72 rounded-full bg-white/10 animate-pulse" />
                <div className="h-4 w-52 rounded-full bg-white/10 animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT — Application form ── */}
        <div className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16 lg:min-h-screen">
          <div className="w-full max-w-md">
            <h2 className="text-xl font-bold text-[#0F172A] mb-1">Gửi hồ sơ ứng tuyển</h2>
            <p className="text-sm text-[#475569] mb-7">
              Điền thông tin bên dưới, đội ngũ VACONS sẽ liên hệ sớm nhất.
            </p>

            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-7 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] space-y-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Họ và tên" required>
                  <input
                    id="name"
                    name="name"
                    required
                    placeholder="Nguyễn Văn A"
                    className="form-input"
                  />
                </Field>
                <Field label="Số điện thoại" required>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="090 123 4567"
                    className="form-input"
                  />
                </Field>
              </div>

              <Field label="Email" required>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="email@example.com"
                  className="form-input"
                />
              </Field>

              <Field label="Giới thiệu bản thân" hint="tùy chọn">
                <textarea
                  id="form_answers"
                  name="form_answers"
                  rows={3}
                  placeholder="Mục tiêu nghề nghiệp, mức lương mong muốn..."
                  className="form-input resize-none"
                />
              </Field>

              <Field label="CV (PDF)" required>
                <div
                  className={`flex justify-center rounded-xl border-2 border-dashed px-6 py-9 cursor-pointer transition-colors duration-150 ${file
                    ? "border-teal-400 bg-teal-50/60"
                    : isDragging
                      ? "border-[#0D9488] bg-[#0D9488]/[0.04]"
                      : "border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#94A3B8] hover:bg-slate-50"
                    }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-center">
                    {file ? (
                      <div className="space-y-1.5">
                        <CheckCircle2 className="mx-auto h-9 w-9 text-teal-500" />
                        <div className="text-sm text-[#0F172A] font-semibold">{file.name}</div>
                        <p className="text-xs text-[#475569]">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB · bấm để chọn file khác
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="mx-auto h-11 w-11 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center">
                          <UploadCloud className="h-5 w-5 text-[#0D9488]" />
                        </div>
                        <div className="text-sm text-[#0F172A]">
                          <span className="font-semibold text-[#0D9488]">Tải file lên</span> hoặc kéo
                          thả vào đây
                        </div>
                        <p className="text-xs text-[#94A3B8]">Chỉ chấp nhận PDF, tối đa 50MB</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        acceptFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              </Field>

              {submitStatus === "error" && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="text-sm text-red-700">{errorMessage}</div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !file}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0D9488] py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0F766E] hover:shadow-md active:scale-[0.99] disabled:bg-[#94A3B8] disabled:text-white disabled:cursor-not-allowed disabled:shadow-none disabled:hover:bg-[#94A3B8]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xử lý hồ sơ...
                  </>
                ) : (
                  "Nộp hồ sơ ngay"
                )}
              </button>

              <p className="text-xs text-[#94A3B8] text-center">
                Thông tin của bạn được bảo mật bởi VACONS.
              </p>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        .form-input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #CBD5E1;
          background: #ffffff;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: #0F172A;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .form-input::placeholder { color: #94A3B8; }
        .form-input:focus {
          outline: none;
          border-color: #0D9488;
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.14);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-[#475569] mb-1.5">
        {label}
        {required && <span className="text-[#0D9488]"> *</span>}
        {hint && <span className="normal-case font-normal text-[#94A3B8]"> · {hint}</span>}
      </label>
      {children}
    </div>
  );
}

"use client";

import { useState, useRef, use, useEffect } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Job = {
  id: string;
  title: string;
  experience_requirement: string;
  required_skills: string;
};

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

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
      } else {
        alert("Vui lòng chỉ upload file PDF");
      }
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
      const formData = new FormData(e.currentTarget);
      formData.append("job_id", jobId);
      formData.append("cv", file);

      const res = await fetch("/api/candidates/apply", {
        method: "POST",
        body: formData,
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 text-center space-y-4">
          <Briefcase className="w-10 h-10 text-slate-600 mx-auto" />
          <h2 className="text-xl font-bold text-white">Vị trí không tồn tại</h2>
          <p className="text-slate-400 text-sm">Link ứng tuyển không hợp lệ hoặc vị trí đã đóng.</p>
        </div>
      </div>
    );
  }

  if (submitStatus === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 text-center space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Nộp hồ sơ thành công!</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Cảm ơn bạn đã ứng tuyển{job ? ` vị trí <strong>${job.title}</strong>` : ""}. Hệ thống AI đang phân tích CV của bạn — chúng tôi sẽ liên hệ sớm nhất!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl opacity-50 mix-blend-screen pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          {job ? (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-4">
                <Briefcase className="w-3 h-3" /> {job.title}
              </div>
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight mb-3">
                Ứng tuyển ngay
              </h1>
              {job.experience_requirement && (
                <p className="text-slate-400 text-sm">Yêu cầu kinh nghiệm: {job.experience_requirement}</p>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="h-4 w-32 bg-white/[0.06] rounded-full mx-auto animate-pulse" />
              <div className="h-8 w-64 bg-white/[0.06] rounded-full mx-auto animate-pulse" />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8 space-y-6">
          {/* Basic info */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-200">Họ và tên *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="Nguyễn Văn A"
                  className="bg-slate-950/50 border-slate-700/50 focus-visible:ring-primary/50 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="email@example.com"
                  className="bg-slate-950/50 border-slate-700/50 focus-visible:ring-primary/50 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-200">Số điện thoại</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="090 123 4567"
                className="bg-slate-950/50 border-slate-700/50 focus-visible:ring-primary/50 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="form_answers" className="text-slate-200">
                Giới thiệu bản thân (mục tiêu, mức lương mong muốn...)
              </Label>
              <Textarea
                id="form_answers"
                name="form_answers"
                placeholder="Tôi đang tìm kiếm cơ hội..."
                className="min-h-[100px] bg-slate-950/50 border-slate-700/50 focus-visible:ring-primary/50 text-white resize-y"
              />
            </div>
          </div>

          {/* CV Upload */}
          <div className="space-y-2">
            <Label className="text-slate-200">Upload CV (PDF) *</Label>
            <div
              className={`mt-2 flex justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-all duration-200 ease-in-out cursor-pointer
                ${isDragging ? "border-primary bg-primary/10 scale-[1.02]" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/30"}
                ${file ? "border-green-500/50 bg-green-500/5" : ""}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center">
                {file ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-green-400" />
                    <div className="text-sm text-green-300 font-medium">{file.name}</div>
                    <p className="text-xs text-slate-400">Click để chọn file khác</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="mx-auto h-12 w-12 rounded-full bg-slate-800/50 flex items-center justify-center ring-1 ring-white/10">
                      <UploadCloud className="h-6 w-6 text-slate-300" />
                    </div>
                    <div className="text-sm leading-6 text-slate-300">
                      <span className="font-semibold text-primary hover:text-primary-foreground transition-colors">
                        Tải file lên
                      </span>{" "}
                      hoặc kéo thả vào đây
                    </div>
                    <p className="text-xs text-slate-500">Chỉ chấp nhận file PDF (tối đa 10MB)</p>
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
                    setFile(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>

          {/* Error */}
          {submitStatus === "error" && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div className="text-sm text-red-200">{errorMessage}</div>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting || !file}
            className="w-full py-6 text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 hover:scale-[1.01] active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Đang xử lý hồ sơ...
              </>
            ) : (
              "Nộp hồ sơ ngay"
            )}
          </Button>

          <p className="text-xs text-slate-600 text-center">
            Thông tin của bạn sẽ được VACONS ghi nhận.
            <br/>Chân thành cảm ơn sự quan tâm của bạn đến VACONS!
          </p>
        </form>
      </div>
    </div>
  );
}

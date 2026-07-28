"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";

export function ViewCvLink({
  candidateId,
  className,
  label = "Xem CV",
}: {
  candidateId: string;
  className?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/cv-url`);
      const data = await res.json();
      if (!res.ok || !data.url) {
        alert(data.error || "Không mở được CV. Vui lòng thử lại.");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      alert("Không mở được CV. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={loading} className={className}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

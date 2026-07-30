"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

const DROPDOWN_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .filter-select-panel {
    animation: filterSelectIn 0.14s ease-out;
    transform-origin: top;
  }
}
@keyframes filterSelectIn {
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
`;

export type FilterOption = {
  value: string;
  label: string;
  // Tailwind bg/text(/border) classes — reuse the same color mapping the table uses
  // for status/decision, so the dropdown stays visually consistent with the rows it filters.
  colorClassName?: string;
  // "badge": full colored pill (used for Decision, where the color carries meaning).
  // "dot": a small colored dot next to plain text (used for Status, a lighter touch).
  variant?: "badge" | "dot";
};

type FilterSelectProps = {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  className?: string;
};

export function FilterSelect({ label, value, options, onChange, className = "" }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <style dangerouslySetInnerHTML={{ __html: DROPDOWN_CSS }} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 pl-3 pr-2.5 py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.05] text-sm hover:bg-slate-50 dark:hover:bg-white/[0.08] focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50 transition-colors whitespace-nowrap"
      >
        <span className="text-slate-400 dark:text-slate-500">{label}:</span>
        {selected?.colorClassName && (
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selected.colorClassName}`} />
        )}
        <span className="font-medium text-slate-800 dark:text-slate-200">{selected?.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="filter-select-panel absolute z-30 mt-1.5 min-w-[13rem] max-h-72 overflow-auto rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900 py-1 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08)]"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-sm text-left transition-colors ${
                  active ? "bg-slate-100 dark:bg-white/[0.06]" : "hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                }`}
              >
                {opt.colorClassName && opt.variant === "badge" ? (
                  <span className={`px-1.5 py-0.5 rounded-md text-xs font-medium border ${opt.colorClassName}`}>
                    {opt.label}
                  </span>
                ) : (
                  <>
                    {opt.colorClassName && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${opt.colorClassName}`} />}
                    <span className="text-slate-700 dark:text-slate-200">{opt.label}</span>
                  </>
                )}
                {active && <Check className="w-3.5 h-3.5 text-indigo-500 ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

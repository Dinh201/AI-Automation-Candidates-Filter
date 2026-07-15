"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { vi } from "@/locales/vi";
import { en } from "@/locales/en";

export type Lang = "vi" | "en";

const bundles: Record<Lang, Record<string, unknown>> = {
  vi: vi as unknown as Record<string, unknown>,
  en: en as unknown as Record<string, unknown>,
};

function resolve(obj: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return key;
    }
  }
  return typeof cur === "string" ? cur : key;
}

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "vi",
  setLang: () => {},
  t: (key) => resolve(bundles.vi, key),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("vi");

  useEffect(() => {
    const saved = localStorage.getItem("ats_lang") as Lang | null;
    if (saved === "vi" || saved === "en") setLangState(saved);

    function onStorage() {
      const updated = localStorage.getItem("ats_lang") as Lang | null;
      if (updated === "vi" || updated === "en") setLangState(updated);
    }
    window.addEventListener("ats_lang_updated", onStorage);
    return () => window.removeEventListener("ats_lang_updated", onStorage);
  }, []);

  function setLang(newLang: Lang) {
    setLangState(newLang);
    localStorage.setItem("ats_lang", newLang);
    window.dispatchEvent(new Event("ats_lang_updated"));
  }

  function t(key: string): string {
    return resolve(bundles[lang], key);
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
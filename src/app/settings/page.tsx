"use client";

import { useState, useEffect, useRef } from "react";
import {
  User, Palette, Bell, CalendarDays, Mail,
  Sun, Moon, Monitor, Clock,
  Eye, EyeOff, Save, Check,
  Lock, X, Upload,
} from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useTranslation } from "@/lib/i18n-context";

/* ─── CSS ─────────────────────────────────────────────────────────── */
const PAGE_CSS = `
  input[type="range"] { -webkit-appearance: none; appearance: none; }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 16px; height: 16px; border-radius: 50%;
    background: #06b6d4; cursor: pointer;
    border: 2px solid rgba(6,182,212,0.4);
    box-shadow: 0 0 8px rgba(6,182,212,0.35);
  }
  input[type="range"]::-moz-range-thumb {
    width: 16px; height: 16px; border-radius: 50%;
    background: #06b6d4; cursor: pointer; border: none;
  }
  .stg-scroll::-webkit-scrollbar { width: 4px; }
  .stg-scroll::-webkit-scrollbar-track { background: transparent; }
  .stg-scroll::-webkit-scrollbar-thumb { background: var(--stg-scroll-thumb, rgba(255,255,255,0.08)); border-radius: 4px; }
  .stg-tab:hover { background: var(--stg-tab-hover, rgba(255,255,255,0.04)) !important; }
  .stg-btn-icon:hover { color: #94a3b8 !important; }
  select.stg-select { color-scheme: inherit; }
`;

/* ─── Toggle ──────────────────────────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 42, height: 22, borderRadius: 11, flexShrink: 0,
        background: checked ? "#06b6d4" : "rgba(255,255,255,0.1)",
        border: `1px solid ${checked ? "rgba(6,182,212,0.5)" : "rgba(255,255,255,0.08)"}`,
        cursor: "pointer", position: "relative",
        transition: "background 0.2s, border-color 0.2s", outline: "none",
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: checked ? 21 : 2,
        width: 16, height: 16, borderRadius: "50%", background: "white",
        transition: "left 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
      }} />
    </button>
  );
}

/* ─── SettingInput ────────────────────────────────────────────────── */
function SettingInput({
  label, value, onChange, type = "text", placeholder, disabled, hint, suffix,
}: {
  label?: string; value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean;
  hint?: string; suffix?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 600, color: "var(--stg-text-label)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "var(--stg-input-bg)",
            border: `1px solid ${focused ? "rgba(6,182,212,0.45)" : "var(--stg-input-border)"}`,
            borderRadius: 8, padding: suffix ? "9px 40px 9px 12px" : "9px 12px",
            fontSize: 14, color: disabled ? "var(--stg-input-disabled-color)" : "var(--stg-input-color)",
            outline: "none", transition: "border-color 0.15s", fontFamily: "inherit",
          }}
        />
        {suffix && (
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
            {suffix}
          </div>
        )}
      </div>
      {hint && <p style={{ fontSize: 11, color: "var(--stg-text-hint)", margin: 0 }}>{hint}</p>}
    </div>
  );
}

/* ─── Card ────────────────────────────────────────────────────────── */
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--stg-card-bg)",
      border: "1px solid var(--stg-card-border)",
      borderRadius: 12, padding: "20px 22px", ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── SectionTitle ────────────────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, color: "var(--stg-text-label)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 14px" }}>
      {children}
    </p>
  );
}

/* ─── ToggleRow ───────────────────────────────────────────────────── */
function ToggleRow({
  icon: Icon, label, description, checked, onChange,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "13px 0", borderBottom: "1px solid var(--stg-divider)",
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: "var(--stg-row-icon-bg)", border: "1px solid var(--stg-row-icon-border)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={14} style={{ color: "#22d3ee" }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--stg-text-body)", margin: "0 0 2px" }}>{label}</p>
        <p style={{ fontSize: 11.5, color: "var(--stg-text-dim)", margin: 0 }}>{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

/* ─── SaveBar ─────────────────────────────────────────────────────── */
function SaveBar({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  const { t } = useTranslation();
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8 }}>
      <button
        onClick={onSave}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "9px 20px", borderRadius: 8,
          background: saved ? "rgba(34,197,94,0.1)" : "rgba(6,182,212,0.1)",
          border: `1px solid ${saved ? "rgba(34,197,94,0.25)" : "rgba(6,182,212,0.25)"}`,
          color: saved ? "#4ade80" : "#22d3ee",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
          transition: "all 0.2s", fontFamily: "inherit",
        }}
      >
        {saved ? <Check size={14} /> : <Save size={14} />}
        {saved ? t("settings.saved") : t("settings.save")}
      </button>
    </div>
  );
}

/* ══════════════════════ PANELS ══════════════════════════════════════ */

function ProfilePanel({ initials, name: initName, email }: { initials: string; name: string; email: string }) {
  const { t } = useTranslation();
  const [name, setName] = useState(initName);
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCnf, setShowCnf] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [cnfPw, setCnfPw] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<File | null>(null);

  useEffect(() => { setName(initName); }, [initName]);

  useEffect(() => {
    // Hiển thị cache ngay lập tức, sau đó load từ DB
    const cached = localStorage.getItem("ats_avatar");
    if (cached) setAvatarUrl(cached);

    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("user_profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
        localStorage.setItem("ats_avatar", data.avatar_url);
      }
    });
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError(t("settings.profile.avatarTypeError"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError(t("settings.profile.avatarSizeError"));
      return;
    }
    setAvatarError(null);
    avatarFileRef.current = file;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    setSaveError(null);

    // Validate password fields nếu có nhập
    if (curPw || newPw || cnfPw) {
      if (!curPw) { setSaveError(t("settings.profile.currentPasswordRequired")); return; }
      if (newPw.length < 8) { setSaveError(t("settings.profile.passwordTooShort")); return; }
      if (newPw !== cnfPw) { setSaveError(t("settings.profile.passwordMismatch")); return; }
    }

    const supabase = createSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaveError(t("settings.profile.sessionExpired")); return; }

    // Upload ảnh mới lên Supabase Storage (thực hiện trước, độc lập với profile update)
    if (avatarFileRef.current) {
      const file = avatarFileRef.current;
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) {
        setSaveError(t("settings.profile.avatarUploadError"));
        return;
      }
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);
      const avatarWithCacheBust = `${publicUrl}?v=${Date.now()}`;
      await supabase
        .from("user_profiles")
        .upsert({ id: user.id, avatar_url: avatarWithCacheBust }, { onConflict: "id" });
      setAvatarUrl(avatarWithCacheBust);
      localStorage.setItem("ats_avatar", avatarWithCacheBust);
      window.dispatchEvent(new Event("ats_avatar_updated"));
      avatarFileRef.current = null;
    }

    // Lưu họ tên vào user_profiles (dùng upsert để tạo row nếu chưa có)
    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert({ id: user.id, full_name: name.trim() }, { onConflict: "id" });
    if (profileError) { setSaveError(t("settings.profile.saveError")); return; }
    window.dispatchEvent(new CustomEvent("ats_profile_updated", { detail: { name: name.trim() } }));

    // Đổi mật khẩu nếu có nhập
    if (newPw) {
      const { error: pwError } = await supabase.auth.updateUser({ password: newPw });
      if (pwError) { setSaveError(pwError.message); return; }
      setCurPw(""); setNewPw(""); setCnfPw("");
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const pwToggleBtn = (show: boolean, setShow: (v: boolean) => void) => (
    <button onClick={() => setShow(!show)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
      {show ? <EyeOff size={14} style={{ color: "#475569" }} /> : <Eye size={14} style={{ color: "#475569" }} />}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <SectionTitle>{t("settings.profile.avatar")}</SectionTitle>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={handleAvatarChange}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: avatarUrl ? "transparent" : "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, fontWeight: 700, color: "white",
              border: "2px solid rgba(6,182,212,0.3)",
              overflow: "hidden",
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials}
            </div>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: "absolute", bottom: 0, right: 0,
                width: 24, height: 24, borderRadius: "50%",
                background: "#0a1628", border: "2px solid rgba(6,182,212,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}
            >
              <Upload size={11} style={{ color: "#22d3ee" }} />
            </div>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--stg-text-body)", margin: "0 0 3px" }}>{initName}</p>
            <p style={{ fontSize: 11.5, color: "var(--stg-text-dim)", margin: "0 0 10px" }}>{t("settings.profile.avatarHint")}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 7,
                border: "1px solid var(--stg-btn-border)", background: "var(--stg-btn-bg)",
                color: "var(--stg-text-label)", cursor: "pointer", fontFamily: "inherit",
              }}
            >{t("settings.profile.selectImage")}</button>
            {avatarError && (
              <p style={{ fontSize: 11, color: "#f87171", margin: "6px 0 0" }}>{avatarError}</p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>{t("settings.profile.basicInfo")}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SettingInput label={t("settings.profile.displayName")} value={name} onChange={setName} placeholder={t("settings.profile.namePlaceholder")} />
          <SettingInput label={t("settings.profile.email")} value={email} disabled hint={t("settings.profile.emailHint")} />
        </div>
      </Card>

      <Card>
        <SectionTitle>{t("settings.profile.changePassword")}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SettingInput label={t("settings.profile.currentPassword")} type={showCur ? "text" : "password"} value={curPw} onChange={setCurPw} placeholder="••••••••" suffix={pwToggleBtn(showCur, setShowCur)} />
          <SettingInput label={t("settings.profile.newPassword")} type={showNew ? "text" : "password"} value={newPw} onChange={setNewPw} placeholder={t("settings.profile.newPasswordPlaceholder")} suffix={pwToggleBtn(showNew, setShowNew)} />
          <SettingInput label={t("settings.profile.confirmPassword")} type={showCnf ? "text" : "password"} value={cnfPw} onChange={setCnfPw} placeholder={t("settings.profile.confirmPasswordPlaceholder")} suffix={pwToggleBtn(showCnf, setShowCnf)} />
        </div>
      </Card>

      {saveError && (
        <p style={{ fontSize: 12, color: "#f87171", margin: "0 0 4px", textAlign: "right" }}>{saveError}</p>
      )}
      <SaveBar onSave={handleSave} saved={saved} />
    </div>
  );
}

function AppearancePanel() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("dark");
  const { lang, setLang, t: tr } = useTranslation();
  const [saved, setSaved] = useState(false);

  const applyTheme = (t: "light" | "dark" | "system") => {
    const html = document.documentElement;
    if (t === "light") {
      html.classList.remove("dark");
    } else if (t === "dark") {
      html.classList.add("dark");
    } else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
    }
  };

  useEffect(() => {
    const t = (localStorage.getItem("ats_theme") as "light" | "dark" | "system") || "dark";
    setTheme(t);
    applyTheme(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleThemeChange = (t: "light" | "dark" | "system") => {
    setTheme(t);
  };

  const handleSave = () => {
    localStorage.setItem("ats_theme", theme);
    applyTheme(theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const themes = [
    { id: "light" as const, label: tr("settings.appearance.light"), icon: Sun, desc: tr("settings.appearance.lightDesc") },
    { id: "dark" as const, label: tr("settings.appearance.dark"), icon: Moon, desc: tr("settings.appearance.darkDesc") },
    { id: "system" as const, label: tr("settings.appearance.system"), icon: Monitor, desc: tr("settings.appearance.systemDesc") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <SectionTitle>{tr("settings.appearance.displayMode")}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {themes.map(t => (
            <button key={t.id} onClick={() => handleThemeChange(t.id)} style={{
              padding: "16px 10px",
              background: theme === t.id ? "rgba(6,182,212,0.08)" : "var(--stg-btn-bg)",
              border: `1px solid ${theme === t.id ? "rgba(6,182,212,0.4)" : "var(--stg-btn-border)"}`,
              borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 9,
              transition: "all 0.15s",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: theme === t.id ? "rgba(6,182,212,0.1)" : "var(--stg-btn-bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <t.icon size={16} style={{ color: theme === t.id ? "#22d3ee" : "#64748b" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: theme === t.id ? "#22d3ee" : "var(--stg-text-label)", margin: "0 0 2px" }}>{t.label}</p>
                <p style={{ fontSize: 10.5, color: "var(--stg-text-dim)", margin: 0 }}>{t.desc}</p>
              </div>
              {theme === t.id && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#06b6d4" }} />}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>{tr("settings.appearance.language")}</SectionTitle>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { id: "vi" as const, label: "Tiếng Việt", flag: "🇻🇳" },
            { id: "en" as const, label: "English", flag: "🇺🇸" },
          ].map(l => (
            <button key={l.id} onClick={() => setLang(l.id)} style={{
              flex: 1, padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 10,
              background: lang === l.id ? "rgba(6,182,212,0.08)" : "var(--stg-btn-bg)",
              border: `1px solid ${lang === l.id ? "rgba(6,182,212,0.35)" : "var(--stg-btn-border)"}`,
              borderRadius: 9, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 20 }}>{l.flag}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: lang === l.id ? "#22d3ee" : "var(--stg-text-label)" }}>{l.label}</span>
              {lang === l.id && <Check size={13} style={{ color: "#22d3ee", marginLeft: "auto" }} />}
            </button>
          ))}
        </div>
      </Card>

      <SaveBar onSave={handleSave} saved={saved} />
    </div>
  );
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

async function registerPushSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY,
  });
}

async function unregisterPushSubscription(): Promise<string | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!reg) return null;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    return endpoint;
  }
  return null;
}

type NotifState = { emailApplicant: boolean; emailInterview: boolean; pushApplicant: boolean; pushInterview: boolean };

function NotificationsPanel() {
  const { t } = useTranslation();
  const [state, setState] = useState<NotifState>({
    emailApplicant: true, emailInterview: true,
    pushApplicant: false, pushInterview: true,
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pushSupported, setPushSupported] = useState(true);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    setPushSupported("serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY);
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("user_profiles")
        .select("notification_prefs")
        .eq("id", user.id)
        .single();
      if (data?.notification_prefs) {
        setState(data.notification_prefs as NotifState);
      }
      setLoading(false);
    });
  }, []);

  const handleToggle = async (key: keyof NotifState, value: boolean) => {
    setState(p => ({ ...p, [key]: value }));

    // Đăng ký / hủy push ngay khi bật/tắt
    if ((key === "pushApplicant" || key === "pushInterview") && !pushError) {
      const newPushState = { ...state, [key]: value };
      const anyPushOn = newPushState.pushApplicant || newPushState.pushInterview;

      if (anyPushOn) {
        try {
          const sub = await registerPushSubscription();
          if (sub) {
            await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ subscription: sub }),
            });
            setPushError(null);
          } else {
            setPushError(t("settings.notifications.pushPermissionDenied"));
            setState(p => ({ ...p, [key]: false }));
          }
        } catch {
          setPushError(t("settings.notifications.pushSubscribeError"));
          setState(p => ({ ...p, [key]: false }));
        }
      } else {
        // Tắt tất cả push → hủy subscription
        try {
          const endpoint = await unregisterPushSubscription();
          if (endpoint) {
            await fetch("/api/push/subscribe", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endpoint }),
            });
          }
          setPushError(null);
        } catch {
          // Không block UI nếu unsubscribe lỗi
        }
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("user_profiles")
        .update({ notification_prefs: state })
        .eq("id", user.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) {
    return <div style={{ color: "var(--stg-text-dim)", fontSize: 13 }}>{t("settings.notifications.loading")}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <SectionTitle>{t("settings.notifications.emailSection")}</SectionTitle>
        <ToggleRow icon={User} label={t("settings.notifications.newApplicant")} description={t("settings.notifications.newApplicantEmailDesc")} checked={state.emailApplicant} onChange={(v) => handleToggle("emailApplicant", v)} />
        <ToggleRow icon={CalendarDays} label={t("settings.notifications.interviewSchedule")} description={t("settings.notifications.interviewScheduleDesc")} checked={state.emailInterview} onChange={(v) => handleToggle("emailInterview", v)} />
      </Card>

      <Card>
        <SectionTitle>{t("settings.notifications.pushSection")}</SectionTitle>
        {!pushSupported && (
          <p style={{ fontSize: 12, color: "#f87171", margin: "0 0 12px" }}>
            {t("settings.notifications.pushUnsupported")}
          </p>
        )}
        {pushError && (
          <p style={{ fontSize: 12, color: "#f87171", margin: "0 0 12px" }}>{pushError}</p>
        )}
        <ToggleRow icon={Bell} label={t("settings.notifications.newApplicant")} description={t("settings.notifications.newApplicantPushDesc")} checked={state.pushApplicant} onChange={(v) => pushSupported && handleToggle("pushApplicant", v)} />
        <ToggleRow icon={Clock} label={t("settings.notifications.interviewReminder")} description={t("settings.notifications.interviewReminderDesc")} checked={state.pushInterview} onChange={(v) => pushSupported && handleToggle("pushInterview", v)} />
      </Card>

      <SaveBar onSave={handleSave} saved={saved || saving} />
    </div>
  );
}


const CALENDAR_LS_KEY = "ats_calendar_settings";

type CalendarSettings = {
  workDays: number[];
  wStart: string;
  wEnd: string;
  lStart: string;
  lEnd: string;
  tz: string;
  buffer: number;
};

const CALENDAR_DEFAULTS: CalendarSettings = {
  workDays: [1, 2, 3, 4, 5],
  wStart: "08:00",
  wEnd: "17:30",
  lStart: "12:00",
  lEnd: "13:30",
  tz: "Asia/Ho_Chi_Minh",
  buffer: 15,
};

function CalendarPanel() {
  const { t } = useTranslation();
  const DAYS = [
    { id: 1, label: t("settings.calendar.dayMon") }, { id: 2, label: t("settings.calendar.dayTue") }, { id: 3, label: t("settings.calendar.dayWed") },
    { id: 4, label: t("settings.calendar.dayThu") }, { id: 5, label: t("settings.calendar.dayFri") }, { id: 6, label: t("settings.calendar.daySat") }, { id: 0, label: t("settings.calendar.daySun") },
  ];
  const [workDays, setWorkDays] = useState(CALENDAR_DEFAULTS.workDays);
  const [wStart, setWStart] = useState(CALENDAR_DEFAULTS.wStart);
  const [wEnd, setWEnd] = useState(CALENDAR_DEFAULTS.wEnd);
  const [lStart, setLStart] = useState(CALENDAR_DEFAULTS.lStart);
  const [lEnd, setLEnd] = useState(CALENDAR_DEFAULTS.lEnd);
  const [tz, setTz] = useState(CALENDAR_DEFAULTS.tz);
  const [buffer, setBuffer] = useState(CALENDAR_DEFAULTS.buffer);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CALENDAR_LS_KEY);
      if (stored) {
        const s: CalendarSettings = JSON.parse(stored);
        setWorkDays(s.workDays ?? CALENDAR_DEFAULTS.workDays);
        setWStart(s.wStart ?? CALENDAR_DEFAULTS.wStart);
        setWEnd(s.wEnd ?? CALENDAR_DEFAULTS.wEnd);
        setLStart(s.lStart ?? CALENDAR_DEFAULTS.lStart);
        setLEnd(s.lEnd ?? CALENDAR_DEFAULTS.lEnd);
        setTz(s.tz ?? CALENDAR_DEFAULTS.tz);
        setBuffer(s.buffer ?? CALENDAR_DEFAULTS.buffer);
      }
    } catch { /* ignore corrupt storage */ }
  }, []);

  const toggleDay = (id: number) =>
    setWorkDays(p => p.includes(id) ? p.filter(d => d !== id) : [...p, id]);

  const handleSave = () => {
    const settings: CalendarSettings = { workDays, wStart, wEnd, lStart, lEnd, tz, buffer };
    localStorage.setItem(CALENDAR_LS_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <SectionTitle>{t("settings.calendar.workDays")}</SectionTitle>
        <div style={{ display: "flex", gap: 7 }}>
          {DAYS.map(d => {
            const on = workDays.includes(d.id);
            return (
              <button key={d.id} onClick={() => toggleDay(d.id)} style={{
                flex: 1, padding: "10px 4px", borderRadius: 9,
                border: `1px solid ${on ? "rgba(6,182,212,0.4)" : "var(--stg-btn-border)"}`,
                background: on ? "rgba(6,182,212,0.1)" : "var(--stg-btn-bg)",
                color: on ? "#22d3ee" : "var(--stg-text-label)",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.15s",
              }}>{d.label}</button>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle>{t("settings.calendar.workHours")}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <SettingInput label={t("settings.calendar.start")} type="time" value={wStart} onChange={setWStart} />
          <SettingInput label={t("settings.calendar.end")} type="time" value={wEnd} onChange={setWEnd} />
        </div>
        <div style={{ height: 1, background: "var(--stg-divider)", margin: "16px 0" }} />
        <SectionTitle>{t("settings.calendar.lunchBreak")}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <SettingInput label={t("settings.calendar.start")} type="time" value={lStart} onChange={setLStart} />
          <SettingInput label={t("settings.calendar.end")} type="time" value={lEnd} onChange={setLEnd} />
        </div>
      </Card>

      <Card>
        <SectionTitle>{t("settings.calendar.schedulingConfig")}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--stg-text-label)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>{t("settings.calendar.timezone")}</label>
            <select className="stg-select" value={tz} onChange={e => setTz(e.target.value)} style={{
              width: "100%", padding: "9px 12px",
              background: "var(--stg-input-bg)", border: "1px solid var(--stg-input-border)",
              borderRadius: 8, fontSize: 14, color: "var(--stg-input-color)",
              outline: "none", fontFamily: "inherit", cursor: "pointer",
            }}>
              <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (UTC+7)</option>
              <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
              <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
            </select>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--stg-text-label)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{t("settings.calendar.bufferBetweenSlots")}</label>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#22d3ee" }}>{buffer} {t("settings.calendar.minutesUnit")}</span>
            </div>
            <input type="range" min={0} max={30} step={5} value={buffer}
              onChange={e => setBuffer(+e.target.value)}
              style={{
                width: "100%", appearance: "none", height: 4, borderRadius: 4, outline: "none", cursor: "pointer",
                background: `linear-gradient(to right, #06b6d4 ${(buffer / 30) * 100}%, rgba(255,255,255,0.1) ${(buffer / 30) * 100}%)`,
              }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: "var(--stg-text-dim)" }}>0{t("settings.calendar.minutesShort")}</span>
              <span style={{ fontSize: 10, color: "var(--stg-text-dim)" }}>30{t("settings.calendar.minutesShort")}</span>
            </div>
          </div>
        </div>
      </Card>

      <SaveBar onSave={handleSave} saved={saved} />
    </div>
  );
}

const EMAIL_TMPL_LS_KEY = "ats_email_templates";

const EMAIL_TMPL_DEFAULTS: Record<string, { subject: string; body: string }> = {
  interview: {
    subject: "Thư mời phỏng vấn — {{position}} tại ATS Internal",
    body: `Kính gửi {{candidate_name}},

Cảm ơn bạn đã ứng tuyển vị trí {{position}}.

Chúng tôi vui mừng mời bạn tham gia buổi phỏng vấn:
📅 Thời gian: {{interview_date}} lúc {{interview_time}}
🔗 Link tham gia: {{meeting_link}}

Vui lòng xác nhận trong vòng 24 giờ.

Trân trọng,
{{hr_name}} — Bộ phận Nhân sự`,
  },
  rejection: {
    subject: "Kết quả ứng tuyển — {{position}}",
    body: `Kính gửi {{candidate_name}},

Cảm ơn bạn đã dành thời gian ứng tuyển vị trí {{position}}.

Sau khi xem xét kỹ lưỡng, chúng tôi rất tiếc thông báo rằng hồ sơ của bạn chưa phù hợp với yêu cầu hiện tại. Chúng tôi sẽ lưu hồ sơ cho các cơ hội trong tương lai.

Trân trọng,
{{hr_name}}`,
  },
  approval: {
    subject: "Yêu cầu phê duyệt tuyển dụng — {{position}}",
    body: `Kính gửi {{approver_name}},

Bộ phận HR kính trình để phê duyệt ứng viên sau:

👤 Ứng viên: {{candidate_name}}
💼 Vị trí: {{position}}
⭐ Điểm AI: {{ai_score}}/10 ({{ai_decision}})

Vui lòng xem xét và phê duyệt trong hệ thống ATS.

Trân trọng,
{{hr_name}}`,
  },
};

function EmailTemplatesPanel() {
  const { t } = useTranslation();
  const TMPL_TABS = [
    { id: "interview", label: t("settings.emailTemplates.tabInterview"), icon: CalendarDays },
    { id: "rejection", label: t("settings.emailTemplates.tabRejection"), icon: X },
    { id: "approval", label: t("settings.emailTemplates.tabApproval"), icon: Check },
  ];

  const [active, setActive] = useState("interview");
  const [templates, setTemplates] = useState(EMAIL_TMPL_DEFAULTS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(EMAIL_TMPL_LS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTemplates(prev => ({ ...prev, ...parsed }));
      }
    } catch { /* ignore corrupt storage */ }
  }, []);
  const [saved, setSaved] = useState(false);
  const [taFocused, setTaFocused] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const VARS = [
    "candidate_name", "position", "hr_name", "interview_date",
    "interview_time", "meeting_link", "ai_score", "ai_decision", "approver_name",
  ];

  const insertVar = (v: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const ins = `{{${v}}}`;
    const updated = templates[active].body.substring(0, s) + ins + templates[active].body.substring(e);
    setTemplates(p => ({ ...p, [active]: { ...p[active], body: updated } }));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + ins.length, s + ins.length); }, 0);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {TMPL_TABS.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)} style={{
            flex: 1, padding: "10px 12px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            background: active === t.id ? "rgba(6,182,212,0.1)" : "var(--stg-btn-bg)",
            border: `1px solid ${active === t.id ? "rgba(6,182,212,0.35)" : "var(--stg-btn-border)"}`,
            borderRadius: 9, cursor: "pointer", fontFamily: "inherit",
            color: active === t.id ? "#22d3ee" : "var(--stg-text-label)",
            fontSize: 12, fontWeight: 500, transition: "all 0.15s",
          }}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SettingInput
            label={t("settings.emailTemplates.emailSubject")}
            value={templates[active].subject}
            onChange={v => setTemplates(p => ({ ...p, [active]: { ...p[active], subject: v } }))}
          />
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--stg-text-label)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>{t("settings.emailTemplates.emailBody")}</label>
            <textarea
              ref={taRef}
              value={templates[active].body}
              onChange={e => setTemplates(p => ({ ...p, [active]: { ...p[active], body: e.target.value } }))}
              rows={13}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "var(--stg-input-bg)",
                border: `1px solid ${taFocused ? "rgba(6,182,212,0.4)" : "var(--stg-input-border)"}`,
                borderRadius: 8, padding: 12, fontSize: 13, color: "var(--stg-input-color)",
                lineHeight: 1.7, outline: "none", resize: "vertical",
                fontFamily: "ui-monospace, 'Cascadia Code', monospace",
                transition: "border-color 0.15s",
              }}
              onFocus={() => setTaFocused(true)}
              onBlur={() => setTaFocused(false)}
            />
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>{t("settings.emailTemplates.variablesHint")}</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {VARS.map(v => (
            <button key={v} onClick={() => insertVar(v)} style={{
              padding: "4px 10px", borderRadius: 20,
              background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
              color: "#a5b4fc", fontSize: 11.5, fontWeight: 500, cursor: "pointer",
              fontFamily: "ui-monospace, monospace",
            }}>{`{{${v}}}`}</button>
          ))}
        </div>
      </Card>

      <SaveBar onSave={() => {
        localStorage.setItem(EMAIL_TMPL_LS_KEY, JSON.stringify(templates));
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }} saved={saved} />
    </div>
  );
}

/* ══════════════════════ MAIN PAGE ═══════════════════════════════════ */

type TabDef = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  adminOnly?: boolean;
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState({ name: "...", email: "...", initials: "··" });
  const { t } = useTranslation();

  const PERSONAL_TABS: TabDef[] = [
    { id: "profile",       label: t("settings.nav.profile"),       icon: User },
    { id: "appearance",    label: t("settings.nav.appearance"),     icon: Palette },
    { id: "notifications", label: t("settings.nav.notifications"),  icon: Bell },
  ];

  const ADMIN_TABS: TabDef[] = [
    { id: "calendar",        label: t("settings.nav.calendar"),         icon: CalendarDays, adminOnly: true },
    { id: "email-templates", label: t("settings.nav.emailTemplates"),   icon: Mail,        adminOnly: true },
  ];

  const TITLES: Record<string, { title: string; desc: string }> = {
    "profile":         { title: t("settings.nav.profile"),       desc: t("settings.profile.subtitle") },
    "appearance":      { title: t("settings.appearance.title"),   desc: t("settings.appearance.subtitle") },
    "notifications":   { title: t("settings.nav.notifications"),  desc: t("settings.notifications.subtitle") },
    "calendar":        { title: t("settings.nav.calendar"),       desc: t("settings.calendar.subtitle") },
    "email-templates": { title: t("settings.nav.emailTemplates"), desc: t("settings.emailTemplates.subtitle") },
  };

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("user_profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();
      const name = data?.full_name || user.email?.split("@")[0] || "User";
      const email = user.email || "";
      const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
      setProfile({ name, email, initials });
      setIsAdmin(data?.role === "hr_admin");
    });
  }, []);

  const tabStyle = (id: string, disabled = false): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 10,
    width: "100%", padding: "9px 12px",
    background: activeTab === id ? "rgba(6,182,212,0.08)" : "transparent",
    border: "none",
    borderLeft: `2px solid ${activeTab === id ? "#06b6d4" : "transparent"}`,
    borderRadius: activeTab === id ? "0 8px 8px 0" : "0",
    color: activeTab === id ? "#22d3ee" : disabled ? "var(--stg-text-disabled)" : "var(--stg-text-label)",
    fontSize: 13, fontWeight: activeTab === id ? 500 : 400,
    cursor: disabled ? "not-allowed" : "pointer",
    textAlign: "left", fontFamily: "inherit",
    transition: "all 0.15s", opacity: disabled ? 0.45 : 1,
  });

  const renderPanel = () => {
    switch (activeTab) {
      case "profile":          return <ProfilePanel initials={profile.initials} name={profile.name} email={profile.email} />;
      case "appearance":       return <AppearancePanel />;
      case "notifications":    return <NotificationsPanel />;
case "calendar":         return <CalendarPanel />;
      case "email-templates":  return <EmailTemplatesPanel />;
      default:                 return null;
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      <div style={{
        display: "flex", height: "100vh",
        background: "var(--stg-page-bg)",
        overflow: "hidden",
      }}>
        {/* ── Left tab nav ── */}
        <div className="stg-scroll" style={{
          width: 220, flexShrink: 0, overflowY: "auto",
          borderRight: "1px solid var(--stg-nav-border)",
          display: "flex", flexDirection: "column",
          padding: "24px 0 16px",
        }}>
          <div style={{ padding: "0 16px 20px" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--stg-text-h)", margin: "0 0 2px" }}>{t("settings.title")}</h2>
            <p style={{ fontSize: 11, color: "var(--stg-text-dim)", margin: 0 }}>{t("settings.subtitle")}</p>
          </div>

          {/* Personal */}
          <p style={{ fontSize: 9.5, fontWeight: 700, color: "var(--stg-nav-section-label)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 16px", marginBottom: 4 }}>
            {t("settings.personalSection")}
          </p>
          <div style={{ marginBottom: 20 }}>
            {PERSONAL_TABS.map(t => (
              <button key={t.id} className="stg-tab" style={tabStyle(t.id)} onClick={() => setActiveTab(t.id)}>
                <t.icon size={14} style={{ flexShrink: 0 }} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Workspace/Admin */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 16px", marginBottom: 4 }}>
            <p style={{ fontSize: 9.5, fontWeight: 700, color: "var(--stg-nav-section-label)", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
              {t("settings.workspaceSection")}
            </p>
            {isAdmin && (
              <span style={{
                fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 4,
                background: "rgba(99,102,241,0.15)", color: "#a5b4fc",
                border: "1px solid rgba(99,102,241,0.2)", letterSpacing: "0.05em",
              }}>ADMIN</span>
            )}
          </div>
          <div>
            {ADMIN_TABS.map(t => (
              <button
                key={t.id}
                className={isAdmin ? "stg-tab" : ""}
                style={tabStyle(t.id, !isAdmin)}
                onClick={() => isAdmin && setActiveTab(t.id)}
                disabled={!isAdmin}
              >
                {isAdmin
                  ? <t.icon size={14} style={{ flexShrink: 0 }} />
                  : <Lock size={13} style={{ flexShrink: 0, color: "#334155" }} />}
                {t.label}
              </button>
            ))}
            {!isAdmin && (
              <p style={{ fontSize: 10.5, color: "var(--stg-text-dim)", padding: "8px 16px 0", lineHeight: 1.5 }}>
                {t("settings.workspaceAdminOnly")}
              </p>
            )}
          </div>
        </div>

        {/* ── Right content ── */}
        <div className="stg-scroll" style={{ flex: 1, overflowY: "auto", padding: "28px 36px 48px" }}>
          <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontSize: 19, fontWeight: 700, color: "var(--stg-text-h)", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
              {TITLES[activeTab]?.title}
            </h1>
            <p style={{ fontSize: 13, color: "var(--stg-text-label)", margin: 0 }}>
              {TITLES[activeTab]?.desc}
            </p>
          </div>
          <div style={{ height: 1, background: "var(--stg-divider)", marginBottom: 24 }} />
          <div style={{ maxWidth: 600 }}>
            {renderPanel()}
          </div>
        </div>
      </div>
    </>
  );
}
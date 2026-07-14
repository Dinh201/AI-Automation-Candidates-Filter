"use client";

import { useState, useEffect, useRef } from "react";
import {
  User, Palette, Bell, Brain, CalendarDays, Mail,
  Sun, Moon, Monitor, Clock,
  Eye, EyeOff, Save, Plus, Check,
  Lock, Link2, X, Upload,
} from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

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
        {saved ? "Đã lưu" : "Lưu thay đổi"}
      </button>
    </div>
  );
}

/* ══════════════════════ PANELS ══════════════════════════════════════ */

function ProfilePanel({ initials, name: initName, email }: { initials: string; name: string; email: string }) {
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
      setAvatarError("Chỉ chấp nhận file ảnh (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Ảnh quá lớn. Tối đa 2MB.");
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
      if (!curPw) { setSaveError("Vui lòng nhập mật khẩu hiện tại."); return; }
      if (newPw.length < 8) { setSaveError("Mật khẩu mới phải có ít nhất 8 ký tự."); return; }
      if (newPw !== cnfPw) { setSaveError("Mật khẩu xác nhận không khớp."); return; }
    }

    const supabase = createSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaveError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."); return; }

    // Upload ảnh mới lên Supabase Storage (thực hiện trước, độc lập với profile update)
    if (avatarFileRef.current) {
      const file = avatarFileRef.current;
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) {
        setSaveError("Không thể tải ảnh lên. Vui lòng thử lại.");
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
    if (profileError) { setSaveError("Không thể lưu thông tin. Vui lòng thử lại."); return; }

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
        <SectionTitle>Ảnh đại diện</SectionTitle>
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
            <p style={{ fontSize: 11.5, color: "var(--stg-text-dim)", margin: "0 0 10px" }}>JPG, PNG · Tối đa 2MB</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 7,
                border: "1px solid var(--stg-btn-border)", background: "var(--stg-btn-bg)",
                color: "var(--stg-text-label)", cursor: "pointer", fontFamily: "inherit",
              }}
            >Chọn ảnh</button>
            {avatarError && (
              <p style={{ fontSize: 11, color: "#f87171", margin: "6px 0 0" }}>{avatarError}</p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Thông tin cơ bản</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SettingInput label="Họ và tên" value={name} onChange={setName} placeholder="Nhập họ và tên" />
          <SettingInput label="Email" value={email} disabled hint="Email không thể thay đổi — liên hệ admin nếu cần." />
        </div>
      </Card>

      <Card>
        <SectionTitle>Đổi mật khẩu</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SettingInput label="Mật khẩu hiện tại" type={showCur ? "text" : "password"} value={curPw} onChange={setCurPw} placeholder="••••••••" suffix={pwToggleBtn(showCur, setShowCur)} />
          <SettingInput label="Mật khẩu mới" type={showNew ? "text" : "password"} value={newPw} onChange={setNewPw} placeholder="Tối thiểu 8 ký tự" suffix={pwToggleBtn(showNew, setShowNew)} />
          <SettingInput label="Xác nhận mật khẩu mới" type={showCnf ? "text" : "password"} value={cnfPw} onChange={setCnfPw} placeholder="Nhập lại mật khẩu" suffix={pwToggleBtn(showCnf, setShowCnf)} />
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
  const [lang, setLang] = useState<"vi" | "en">("vi");
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
    const l = (localStorage.getItem("ats_lang") as "vi" | "en") || "vi";
    setTheme(t);
    setLang(l);
    applyTheme(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleThemeChange = (t: "light" | "dark" | "system") => {
    setTheme(t);
  };

  const handleSave = () => {
    localStorage.setItem("ats_theme", theme);
    localStorage.setItem("ats_lang", lang);
    applyTheme(theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const themes = [
    { id: "light" as const, label: "Sáng", icon: Sun, desc: "Giao diện màu sáng" },
    { id: "dark" as const, label: "Tối", icon: Moon, desc: "Giao diện màu tối" },
    { id: "system" as const, label: "Hệ thống", icon: Monitor, desc: "Theo thiết bị" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <SectionTitle>Chế độ hiển thị</SectionTitle>
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
        <SectionTitle>Ngôn ngữ</SectionTitle>
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
            setPushError("Trình duyệt chưa cấp quyền thông báo.");
            setState(p => ({ ...p, [key]: false }));
          }
        } catch {
          setPushError("Không thể đăng ký push notification.");
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
    return <div style={{ color: "var(--stg-text-dim)", fontSize: 13 }}>Đang tải...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <SectionTitle>Thông báo Email</SectionTitle>
        <ToggleRow icon={User} label="Ứng viên mới" description="Nhận email khi có ứng viên mới nộp đơn" checked={state.emailApplicant} onChange={(v) => handleToggle("emailApplicant", v)} />
        <ToggleRow icon={CalendarDays} label="Lịch phỏng vấn" description="Email xác nhận khi lịch phỏng vấn được tạo hoặc cập nhật" checked={state.emailInterview} onChange={(v) => handleToggle("emailInterview", v)} />
      </Card>

      <Card>
        <SectionTitle>Thông báo Trình duyệt (Push)</SectionTitle>
        {!pushSupported && (
          <p style={{ fontSize: 12, color: "#f87171", margin: "0 0 12px" }}>
            Trình duyệt chưa hỗ trợ push notification hoặc VAPID key chưa được cấu hình.
          </p>
        )}
        {pushError && (
          <p style={{ fontSize: 12, color: "#f87171", margin: "0 0 12px" }}>{pushError}</p>
        )}
        <ToggleRow icon={Bell} label="Ứng viên mới" description="Thông báo tức thì khi có CV mới" checked={state.pushApplicant} onChange={(v) => pushSupported && handleToggle("pushApplicant", v)} />
        <ToggleRow icon={Clock} label="Nhắc nhở phỏng vấn" description="Push notification 30 phút trước lịch phỏng vấn" checked={state.pushInterview} onChange={(v) => pushSupported && handleToggle("pushInterview", v)} />
      </Card>

      <SaveBar onSave={handleSave} saved={saved || saving} />
    </div>
  );
}


function AIConfigPanel() {
  const [thresh, setThresh] = useState({ strongHire: 8, hire: 6, maybe: 4 });
  const [weights, setWeights] = useState({ jobFit: 50, potential: 30, cultureFit: 20 });
  const [keywords, setKeywords] = useState(["React", "TypeScript", "Node.js", "Python", "AWS"]);
  const [newKw, setNewKw] = useState("");
  const [autoTag, setAutoTag] = useState(true);
  const [github, setGithub] = useState(true);
  const [saved, setSaved] = useState(false);

  const addKw = () => {
    const k = newKw.trim();
    if (k && !keywords.includes(k)) { setKeywords(p => [...p, k]); setNewKw(""); }
  };

  const trackStyle = (val: number, max: number): React.CSSProperties => ({
    width: "100%", appearance: "none", height: 4, borderRadius: 4, outline: "none", cursor: "pointer",
    background: `linear-gradient(to right, #06b6d4 ${(val / max) * 100}%, rgba(255,255,255,0.1) ${(val / max) * 100}%)`,
  });

  const totalW = weights.jobFit + weights.potential + weights.cultureFit;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <SectionTitle>Ngưỡng quyết định (thang 10)</SectionTitle>
        {([
          { key: "strongHire" as const, label: "Strong Hire", color: "#4ade80" },
          { key: "hire" as const, label: "Hire", color: "#22d3ee" },
          { key: "maybe" as const, label: "Consider / Maybe", color: "#fbbf24" },
        ]).map(({ key, label, color }) => (
          <div key={key} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#cbd5e1" }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color }}>{thresh[key]}</span>
            </div>
            <input type="range" min={1} max={10} value={thresh[key]}
              onChange={e => setThresh(p => ({ ...p, [key]: +e.target.value }))}
              style={trackStyle(thresh[key], 10)} />
          </div>
        ))}
      </Card>

      <Card>
        <SectionTitle>Trọng số chấm điểm (%)</SectionTitle>
        {([
          { key: "jobFit" as const, label: "Job Fit", desc: "Kỹ năng & kinh nghiệm" },
          { key: "potential" as const, label: "Potential", desc: "Tiềm năng phát triển" },
          { key: "cultureFit" as const, label: "Cultural Fit", desc: "Phù hợp văn hóa" },
        ]).map(({ key, label, desc }) => (
          <div key={key} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#cbd5e1" }}>{label}</span>
                <span style={{ fontSize: 11, color: "#475569", marginLeft: 8 }}>{desc}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#22d3ee" }}>{weights[key]}%</span>
            </div>
            <input type="range" min={0} max={100} step={5} value={weights[key]}
              onChange={e => setWeights(p => ({ ...p, [key]: +e.target.value }))}
              style={trackStyle(weights[key], 100)} />
          </div>
        ))}
        <p style={{ fontSize: 12, fontWeight: 600, color: totalW === 100 ? "#4ade80" : "#f87171", margin: "4px 0 0" }}>
          Tổng: {totalW}% {totalW === 100 ? "✓" : `— còn thiếu ${100 - totalW}%`}
        </p>
      </Card>

      <Card>
        <SectionTitle>Tùy chọn AI</SectionTitle>
        <ToggleRow icon={Brain} label="Tự động gắn nhãn quyết định" description="AI tự gắn nhãn Strong Hire / Hire / Reject theo ngưỡng điểm" checked={autoTag} onChange={setAutoTag} />
        <ToggleRow icon={Link2} label="Phân tích GitHub Portfolio" description="Bổ sung bằng chứng kỹ năng từ profile GitHub của ứng viên" checked={github} onChange={setGithub} />
      </Card>

      <Card>
        <SectionTitle>Từ khóa ưu tiên</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
          {keywords.map(kw => (
            <span key={kw} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 20,
              background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)",
              fontSize: 12, color: "#67e8f9",
            }}>
              {kw}
              <button onClick={() => setKeywords(p => p.filter(k => k !== kw))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "#475569" }}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newKw} onChange={e => setNewKw(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKw(); } }}
            placeholder="Thêm từ khóa... (Enter để thêm)"
            style={{
              flex: 1, background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7,
              padding: "8px 12px", fontSize: 13, color: "#e2e8f0",
              outline: "none", fontFamily: "inherit",
            }} />
          <button onClick={addKw} style={{
            padding: "8px 14px", borderRadius: 7, display: "flex", alignItems: "center", gap: 5,
            border: "1px solid rgba(6,182,212,0.25)", background: "rgba(6,182,212,0.07)",
            color: "#22d3ee", cursor: "pointer", fontFamily: "inherit",
          }}><Plus size={13} /></button>
        </div>
      </Card>

      <SaveBar onSave={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }} saved={saved} />
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
  const DAYS = [
    { id: 1, label: "T2" }, { id: 2, label: "T3" }, { id: 3, label: "T4" },
    { id: 4, label: "T5" }, { id: 5, label: "T6" }, { id: 6, label: "T7" }, { id: 0, label: "CN" },
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
        <SectionTitle>Ngày làm việc</SectionTitle>
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
        <SectionTitle>Giờ làm việc</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <SettingInput label="Bắt đầu" type="time" value={wStart} onChange={setWStart} />
          <SettingInput label="Kết thúc" type="time" value={wEnd} onChange={setWEnd} />
        </div>
        <div style={{ height: 1, background: "var(--stg-divider)", margin: "16px 0" }} />
        <SectionTitle>Giờ nghỉ trưa</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <SettingInput label="Bắt đầu" type="time" value={lStart} onChange={setLStart} />
          <SettingInput label="Kết thúc" type="time" value={lEnd} onChange={setLEnd} />
        </div>
      </Card>

      <Card>
        <SectionTitle>Cấu hình đặt lịch</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--stg-text-label)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Múi giờ</label>
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
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--stg-text-label)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Buffer giữa các slot</label>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#22d3ee" }}>{buffer} phút</span>
            </div>
            <input type="range" min={0} max={30} step={5} value={buffer}
              onChange={e => setBuffer(+e.target.value)}
              style={{
                width: "100%", appearance: "none", height: 4, borderRadius: 4, outline: "none", cursor: "pointer",
                background: `linear-gradient(to right, #06b6d4 ${(buffer / 30) * 100}%, rgba(255,255,255,0.1) ${(buffer / 30) * 100}%)`,
              }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: "var(--stg-text-dim)" }}>0p</span>
              <span style={{ fontSize: 10, color: "var(--stg-text-dim)" }}>30p</span>
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
  const TMPL_TABS = [
    { id: "interview", label: "Mời phỏng vấn", icon: CalendarDays },
    { id: "rejection", label: "Từ chối", icon: X },
    { id: "approval", label: "Phê duyệt nội bộ", icon: Check },
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
            label="Tiêu đề email"
            value={templates[active].subject}
            onChange={v => setTemplates(p => ({ ...p, [active]: { ...p[active], subject: v } }))}
          />
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--stg-text-label)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Nội dung email</label>
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
        <SectionTitle>Biến — click để chèn vào nội dung</SectionTitle>
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

const PERSONAL_TABS: TabDef[] = [
  { id: "profile",       label: "Hồ sơ tài khoản",    icon: User },
  { id: "appearance",    label: "Giao diện & Hiển thị", icon: Palette },
  { id: "notifications", label: "Thông báo",            icon: Bell },
];

const ADMIN_TABS: TabDef[] = [
  { id: "ai-config",        label: "Cấu hình AI",          icon: Brain,       adminOnly: true },
  { id: "calendar",         label: "Lịch & Giờ làm việc", icon: CalendarDays, adminOnly: true },
  { id: "email-templates",  label: "Mẫu Email",            icon: Mail,        adminOnly: true },
];

const TITLES: Record<string, { title: string; desc: string }> = {
  "profile":          { title: "Hồ sơ tài khoản",     desc: "Quản lý thông tin cá nhân và bảo mật tài khoản" },
  "appearance":       { title: "Giao diện & Hiển thị", desc: "Tùy chỉnh chế độ sáng/tối và ngôn ngữ hiển thị" },
  "notifications":    { title: "Thông báo",            desc: "Cài đặt kênh và loại thông báo muốn nhận" },
"ai-config":        { title: "Cấu hình AI",          desc: "Điều chỉnh ngưỡng điểm và trọng số chấm điểm AI" },
  "calendar":         { title: "Lịch & Giờ làm việc",  desc: "Cấu hình giờ làm việc và quy tắc đặt lịch phỏng vấn" },
  "email-templates":  { title: "Mẫu Email",            desc: "Chỉnh sửa nội dung email tự động của hệ thống" },
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState({ name: "...", email: "...", initials: "··" });

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
case "ai-config":        return <AIConfigPanel />;
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
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--stg-text-h)", margin: "0 0 2px" }}>Cài đặt</h2>
            <p style={{ fontSize: 11, color: "var(--stg-text-dim)", margin: 0 }}>Workspace & tài khoản</p>
          </div>

          {/* Personal */}
          <p style={{ fontSize: 9.5, fontWeight: 700, color: "var(--stg-nav-section-label)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 16px", marginBottom: 4 }}>
            Cá nhân
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
              Workspace
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
                Chỉ Admin mới có thể truy cập mục Workspace.
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
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  CalendarDays,
  ScanSearch,
  Settings,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { StarLogo } from "./star-logo";
import { useTranslation } from "@/lib/i18n-context";

const AVATAR_CSS = `
  @keyframes av-spin { to { transform: rotate(360deg); } }
  @keyframes dot-pulse {
    0%   { box-shadow: 0 0 0 0   rgba(34,197,94,0.5); }
    55%  { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
    100% { box-shadow: 0 0 0 0   rgba(34,197,94,0); }
  }
  .av-ring {
    position:absolute; inset:0; border-radius:50%;
    background: conic-gradient(#6366f1 0deg,#3b82f6 110deg,#06b6d4 200deg,#8b5cf6 290deg,#6366f1 360deg);
    animation: av-spin 3s linear infinite;
  }
  .av-halo {
    position:absolute; inset:-5px; border-radius:50%;
    background: conic-gradient(#6366f1 0deg,#3b82f6 110deg,#06b6d4 200deg,#8b5cf6 290deg,#6366f1 360deg);
    animation: av-spin 3s linear infinite;
    filter: blur(12px); opacity: 0;
    transition: opacity 0.38s ease;
  }
  .profile-widget:hover .av-halo { opacity: 0.42; }
  .online-dot { animation: dot-pulse 2.4s ease-out infinite; }
  @media (prefers-reduced-motion: reduce) {
    .av-ring,.av-halo,.online-dot { animation:none!important; }
    .av-halo { display:none!important; }
  }
`;

type UserProfile = {
  name: string;
  role: string;
  initials: string;
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const prevPathRef = useRef<string>("/");
  const isSettings = pathname === "/settings";

  const navGroups = [
    {
      label: t("sidebar.overview"),
      items: [
        { href: "/", label: t("sidebar.dashboard"), icon: LayoutDashboard, exact: true },
      ],
    },
    {
      label: t("sidebar.recruitment"),
      items: [
        { href: "/candidates",  label: t("sidebar.candidates"),    icon: Users,        exact: false },
        { href: "/jobs",        label: t("sidebar.jobPositions"),  icon: Briefcase,    exact: false },
        { href: "/cv-analyzer", label: t("sidebar.cvAnalysis"),    icon: ScanSearch,   exact: false },
      ],
    },
    {
      label: t("sidebar.scheduling"),
      items: [
        { href: "/interviews", label: t("sidebar.interviews"), icon: Calendar,    exact: false },
        { href: "/calendar",   label: t("sidebar.calendar"),   icon: CalendarDays, exact: false },
      ],
    },
  ];
  const [profileHover, setProfileHover] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: "...",
    role: "...",
    initials: "··",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Ghi nhớ trang trước khi vào settings
  useEffect(() => {
    if (pathname !== "/settings") {
      prevPathRef.current = pathname;
    }
  }, [pathname]);

  function handleSettingsToggle() {
    if (isSettings) {
      router.push(prevPathRef.current);
    } else {
      router.push("/settings");
    }
  }

  useEffect(() => {
    setAvatarUrl(localStorage.getItem("ats_avatar"));
    const refresh = () => setAvatarUrl(localStorage.getItem("ats_avatar"));
    window.addEventListener("ats_avatar_updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("ats_avatar_updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    const onProfileUpdated = (e: Event) => {
      const name = (e as CustomEvent<{ name: string }>).detail?.name;
      if (!name) return;
      const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
      setProfile((p) => ({ ...p, name, initials }));
    };
    window.addEventListener("ats_profile_updated", onProfileUpdated);
    return () => window.removeEventListener("ats_profile_updated", onProfileUpdated);
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("user_profiles")
        .select("full_name, role, avatar_url")
        .eq("id", user.id)
        .single();
      const name =
        data?.full_name || user.email?.split("@")[0] || "User";
      const role = data?.role === "hr_admin" ? "HR Admin" : "HR Staff";
      const initials = name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      setProfile({ name, role, initials });
      // Ưu tiên avatar từ DB (đồng bộ giữa các thiết bị)
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
        localStorage.setItem("ats_avatar", data.avatar_url);
      }
    });
  }, []);

  async function handleSignOut() {
    // Dùng server-side logout để Set-Cookie headers xóa cookie đúng cách
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // fallback nếu fetch lỗi
      const supabase = createSupabaseBrowser();
      await supabase.auth.signOut();
    }
    // Hard redirect — đảm bảo browser gửi request mới không có auth cookie
    window.location.replace("/login");
  }

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside
      className="w-[232px] shrink-0 h-screen sticky top-0 flex flex-col"
      style={{
        background: "var(--sb-bg)",
        borderRight: "1px solid var(--sb-border)",
      }}
    >
      {/* ── Brand / Logo ── */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: "1px solid var(--sb-border)" }}>
        <div className="flex items-center gap-3">
          {/* Vacons logo */}
          <Link href="/" aria-label="Dashboard">
            <StarLogo size={44} />
          </Link>
          <div>
            <p className="font-bold text-sm leading-none" style={{
              letterSpacing: "0.01em",
              color: "var(--sb-brand)",
            }}>ATS Internal</p>
            <p className="text-[10px] mt-0.5 font-medium" style={{ color: "var(--sb-brand-sub)" }}>
              HR workspace only
            </p>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto custom-scroll">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p
              className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--sb-section-label)" }}
            >
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, exact }) => {
                const active = isActive(href, exact);
                return (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group"
                    style={
                      active
                        ? {
                            background: "var(--sb-nav-active-bg)",
                            borderLeft: "2px solid var(--sb-nav-active-border)",
                            color: "var(--sb-nav-active-text)",
                            paddingLeft: "10px",
                          }
                        : {
                            color: "var(--sb-nav-text)",
                            borderLeft: "2px solid transparent",
                          }
                    }
                  >
                    <Icon
                      className="w-4 h-4 shrink-0 transition-colors"
                      style={{ color: active ? "var(--sb-nav-active-icon)" : "rgba(100,116,139,1)" }}
                    />
                    <span className="flex-1">{label}</span>
                    {active && (
                      <ChevronRight className="w-3 h-3 opacity-50" style={{ color: "var(--sb-nav-active-icon)" }} />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom section ── */}
      <div className="px-3 py-3 space-y-2" style={{ borderTop: "1px solid var(--sb-border)" }}>
        {/* Keyframe CSS for avatar animation */}
        <style dangerouslySetInnerHTML={{ __html: AVATAR_CSS }} />

        {/* Settings toggle */}
        <button
          onClick={handleSettingsToggle}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150"
          style={
            isSettings
              ? {
                  background: "var(--sb-nav-active-bg)",
                  borderLeft: "2px solid var(--sb-nav-active-border)",
                  color: "var(--sb-nav-active-text)",
                  paddingLeft: "10px",
                }
              : {
                  color: "var(--sb-settings-text)",
                  borderLeft: "2px solid transparent",
                }
          }
        >
          <Settings
            className="w-4 h-4 shrink-0 transition-colors"
            style={{ color: isSettings ? "var(--sb-nav-active-icon)" : "rgba(100,116,139,1)" }}
          />
          <span className="flex-1 text-left">{t("sidebar.settings")}</span>
          {isSettings && (
            <ChevronRight className="w-3 h-3 opacity-50" style={{ color: "var(--sb-nav-active-icon)" }} />
          )}
        </button>

        {/* Avatar Card Flip + Glow */}
        <div
          className="profile-widget"
          onMouseEnter={() => setProfileHover(true)}
          onMouseLeave={() => setProfileHover(false)}
          style={{ perspective: "900px", height: "50px", cursor: "pointer" }}
        >
          <div
            style={{
              position: "relative", width: "100%", height: "100%",
              transformStyle: "preserve-3d",
              transition: "transform 0.52s cubic-bezier(0.34,1.38,0.64,1)",
              transform: profileHover ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* Front */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: 10,
              backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
              display: "flex", alignItems: "center", gap: 10,
              padding: "0 10px 0 8px",
              background: "var(--sb-profile-bg)",
              border: "1px solid var(--sb-profile-border)",
              pointerEvents: profileHover ? "none" : "auto",
            }}>
              <div style={{ position: "relative", width: 34, height: 34, flexShrink: 0 }}>
                <div className="av-halo" />
                <div className="av-ring" />
                <div style={{
                  position: "absolute", inset: 2.5, borderRadius: "50%",
                  background: "var(--sb-avatar-inner)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, color: "var(--sb-avatar-text)",
                  letterSpacing: "0.03em", zIndex: 1, userSelect: "none",
                  overflow: "hidden",
                }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                    : profile.initials
                  }
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--sb-profile-name)", lineHeight: "1.35", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.name}</p>
                <p style={{ fontSize: 9.5, color: "var(--sb-profile-role)", lineHeight: "1.3" }}>{profile.role}</p>
              </div>
              <div className="online-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
            </div>

            {/* Back */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: 10,
              backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              display: "flex", alignItems: "center", gap: 10,
              padding: "0 10px 0 8px",
              background: "rgba(99,102,241,0.07)",
              border: "1px solid rgba(99,102,241,0.18)",
              pointerEvents: profileHover ? "auto" : "none",
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg,#6366f1,#3b82f6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700, color: "white",
                overflow: "hidden",
              }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                  : profile.initials
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--sb-back-name)", lineHeight: "1.35", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.name}</p>
                <p style={{ fontSize: 9.5, color: "#22c55e", lineHeight: "1.3" }}>● Online</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleSignOut(); }}
                title="Đăng xuất"
                style={{
                  width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.18)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  pointerEvents: "auto",
                }}
              >
                <LogOut size={11} style={{ color: "#f87171" }} />
              </button>
            </div>
          </div>
        </div>

        <p className="px-3 text-[10px]" style={{ color: "var(--sb-version)" }}>
          v0.1.0 · MVP Build
        </p>
      </div>
    </aside>
  );
}
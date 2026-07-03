"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  CalendarDays,
  ScanSearch,
  Settings,
  ChevronRight,
  UserCog,
} from "lucide-react";

const navGroups = [
  {
    label: "Tổng quan",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Tuyển dụng",
    items: [
      { href: "/candidates", label: "Ứng viên",          icon: Users,        exact: false },
      { href: "/jobs",       label: "Vị trí tuyển dụng", icon: Briefcase,    exact: false },
      { href: "/cv-analyzer",label: "Phân tích CV",      icon: ScanSearch,   exact: false },
    ],
  },
  {
    label: "Lịch hẹn",
    items: [
      { href: "/interviews", label: "Phỏng vấn",  icon: Calendar,    exact: false },
      { href: "/calendar",   label: "Xem lịch",   icon: CalendarDays, exact: false },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside
      className="w-[232px] shrink-0 h-screen sticky top-0 flex flex-col"
      style={{
        background: "linear-gradient(180deg, #060d1e 0%, #060b19 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* ── Brand / Logo ── */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3">
          {/* Round logo */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative"
            style={{
              background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
              boxShadow: "0 0 16px rgba(37,99,235,0.35), 0 2px 6px rgba(0,0,0,0.5)",
            }}
          >
            <span className="text-white font-black text-xs tracking-tight select-none">ATS</span>
          </div>
          <div>
            <p className="font-bold text-sm text-white leading-none tracking-tight">ATS Internal</p>
            <p className="text-[10px] mt-0.5 font-medium" style={{ color: "rgba(96,165,250,0.7)" }}>
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
              style={{ color: "rgba(100,116,139,0.8)" }}
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
                            background: "rgba(37,99,235,0.14)",
                            borderLeft: "2px solid #2563eb",
                            color: "#93c5fd",
                            paddingLeft: "10px",
                          }
                        : {
                            color: "rgba(148,163,184,0.85)",
                            borderLeft: "2px solid transparent",
                          }
                    }
                  >
                    <Icon
                      className="w-4 h-4 shrink-0 transition-colors"
                      style={{ color: active ? "#60a5fa" : "rgba(100,116,139,1)" }}
                    />
                    <span className="flex-1">{label}</span>
                    {active && (
                      <ChevronRight className="w-3 h-3 opacity-50" style={{ color: "#60a5fa" }} />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom section ── */}
      <div className="px-3 py-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {/* Settings link */}
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: "rgba(100,116,139,0.85)" }}
        >
          <Settings className="w-4 h-4" />
          <span>Cài đặt</span>
        </Link>

        {/* HR Admin user widget */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
            style={{
              background: "rgba(37,99,235,0.18)",
              border: "1px solid rgba(37,99,235,0.3)",
              color: "#60a5fa",
            }}
          >
            <UserCog className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">Tran Dinh</p>
            <p className="text-[10px] truncate" style={{ color: "rgba(100,116,139,0.8)" }}>
              HR Admin
            </p>
          </div>
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.6)" }}
            title="Online"
          />
        </div>

        <p className="px-3 text-[10px]" style={{ color: "rgba(71,85,105,0.7)" }}>
          v0.1.0 · MVP Build
        </p>
      </div>
    </aside>
  );
}
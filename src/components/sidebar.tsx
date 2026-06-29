"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
<<<<<<< HEAD
  CalendarDays,
  Zap,
  ScanSearch,
=======
  Zap,
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/candidates", label: "Ứng viên", icon: Users, exact: false },
  { href: "/jobs", label: "Vị trí tuyển dụng", icon: Briefcase, exact: false },
  { href: "/interviews", label: "Phỏng vấn", icon: Calendar, exact: false },
<<<<<<< HEAD
  { href: "/calendar", label: "Xem lịch", icon: CalendarDays, exact: false },
  { href: "/cv-analyzer", label: "Phân tích CV", icon: ScanSearch, exact: false },
=======
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 h-screen sticky top-0 flex flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm text-white leading-none">AutoFilter</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">AI Recruitment</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-600/20"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-zinc-800">
        <p className="text-[10px] text-zinc-600">v0.1.0 · MVP</p>
      </div>
    </aside>
  );
}

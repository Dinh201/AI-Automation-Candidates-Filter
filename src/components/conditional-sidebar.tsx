"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

export function ConditionalSidebar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  if (pathname.startsWith("/jobs/")) return null;
  return <Sidebar />;
}
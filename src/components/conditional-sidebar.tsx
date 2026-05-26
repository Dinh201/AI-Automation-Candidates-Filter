"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

export function ConditionalSidebar() {
  const pathname = usePathname();
  if (pathname.startsWith("/jobs/") || pathname.startsWith("/interview-brief/")) return null;
  return <Sidebar />;
}

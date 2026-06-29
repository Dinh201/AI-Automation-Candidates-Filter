"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

export function ConditionalSidebar() {
  const pathname = usePathname();
<<<<<<< HEAD
  if (pathname.startsWith("/jobs/")) return null;
=======
  if (pathname.startsWith("/jobs/") || pathname.startsWith("/interview-brief/")) return null;
>>>>>>> b9b0b3d85f16a8e5c6e69e442cab98e01a07ca88
  return <Sidebar />;
}

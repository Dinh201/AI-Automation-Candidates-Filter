"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import "@/styles/route-loader.css";

const MIN_VISIBLE_MS = 2000;

export function RouteLoadingOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const prevPathname = useRef(pathname);
  const shownAt = useRef<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) return;
      if (href.split("?")[0] === pathname) return;

      if (hideTimer.current) clearTimeout(hideTimer.current);
      shownAt.current = Date.now();
      setVisible(true);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    const elapsed = shownAt.current ? Date.now() - shownAt.current : MIN_VISIBLE_MS;
    const remaining = Math.max(MIN_VISIBLE_MS - elapsed, 0);

    hideTimer.current = setTimeout(() => setVisible(false), remaining);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="route-loadd" role="status" aria-live="polite" aria-label="Đang tải">
      <div className="progress-loader">
        <div className="progress"></div>
      </div>
    </div>
  );
}

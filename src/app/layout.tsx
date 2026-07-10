

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConditionalSidebar } from "@/components/conditional-sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AutoFilter CV — AI Recruitment",
  description: "Hệ thống tuyển dụng thông minh với AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      {/* Đọc theme từ localStorage trước khi React hydrate để tránh flash */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          try {
            var t = localStorage.getItem('ats_theme');
            var html = document.documentElement;
            if (t === 'light') {
              html.classList.remove('dark');
            } else if (t === 'system') {
              if (!window.matchMedia('(prefers-color-scheme: dark)').matches) {
                html.classList.remove('dark');
              }
            }
          } catch(e) {}
        })();
      `}} />
      <body className="min-h-full flex">
        <ConditionalSidebar />
        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      </body>
    </html>
  );
}

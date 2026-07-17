import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ConditionalSidebar } from "@/components/conditional-sidebar";
import { LanguageProvider } from "@/lib/i18n-context";

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

const themeInitScript = `(function(){try{var t=localStorage.getItem('ats_theme')||'dark';if(t==='dark'){document.documentElement.classList.add('dark')}else if(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark')}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex" suppressHydrationWarning>
        <LanguageProvider>
          <ConditionalSidebar />
          <main className="flex-1 min-w-0 overflow-auto">{children}</main>
        </LanguageProvider>
      </body>
    </html>
  );
}
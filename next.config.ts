import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse, pdfjs-dist: dùng require() động theo file/tuỳ chọn runtime.
  // @napi-rs/canvas: load native binary (.node) qua js-binding.js — Turbopack
  // không bundle được asset native này ("non-ecmascript placeable asset").
  // Đánh dấu external để Next.js để nguyên, resolve qua node_modules lúc chạy.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  devIndicators: false,
  // pdfjs-dist tự require pdf.worker.mjs bằng đường dẫn tính động lúc chạy (fake
  // worker trong Node) — file tracing của Next.js không thấy được nên bị loại
  // khỏi output khi deploy lên Vercel, gây lỗi "Cannot find module ...pdf.worker.mjs".
  // Khai báo thủ công để đưa file này vào bundle của route dùng OCR.
  outputFileTracingIncludes: {
    "/api/cv-analyze": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.*"],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse, pdfjs-dist: dùng require() động theo file/tuỳ chọn runtime.
  // @napi-rs/canvas: load native binary (.node) qua js-binding.js — Turbopack
  // không bundle được asset native này ("non-ecmascript placeable asset").
  // Đánh dấu external để Next.js để nguyên, resolve qua node_modules lúc chạy.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  devIndicators: false,
};

export default nextConfig;

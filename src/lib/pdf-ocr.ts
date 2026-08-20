import { createCanvas } from "@napi-rs/canvas";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key",
});

// CV thường chỉ 1-2 trang — giới hạn thấp để tránh vượt maxDuration của
// route (chạy OCR các trang song song nhưng vẫn cần giới hạn tổng số call).
const MAX_OCR_PAGES = 3;
const RENDER_SCALE = 2.0;

const OCR_SYSTEM_PROMPT =
  "Bạn là công cụ OCR. Nhiệm vụ duy nhất: trích xuất TOÀN BỘ chữ nhìn thấy được " +
  "trong ảnh, theo đúng thứ tự đọc tự nhiên (trên xuống dưới, trái sang phải, " +
  "theo từng cột nếu ảnh chia cột). Giữ nguyên xuống dòng giữa các mục/đoạn. " +
  "Chỉ trả về phần chữ đã trích xuất — không thêm giải thích, không thêm " +
  "markdown, không tóm tắt hay diễn giải lại nội dung.";

/**
 * Fallback khi extractTextFromPDF() không lấy được chữ (PDF dạng ảnh scan,
 * hoặc chữ bị "vẽ" thành đường nét/outline thay vì chữ mã hóa — vd một số
 * file xuất từ Canva/Illustrator). Render từng trang PDF thành ảnh PNG rồi
 * dùng model vision của OpenAI để đọc chữ trong ảnh (OCR).
 */
export async function extractTextFromPdfViaOCR(fileBuffer: Buffer): Promise<string> {
  // pdfjs-dist chỉ ship ESM — dùng dynamic import để tương thích với
  // Next.js/CommonJS build của route handler.
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const data = new Uint8Array(fileBuffer);
  const doc = await pdfjsLib.getDocument({ data, disableFontFace: true }).promise;
  const pageCount = Math.min(doc.numPages, MAX_OCR_PAGES);

  // Render tuần tự (dùng chung 1 pdf document instance) rồi mới gọi OCR
  // song song cho tất cả trang — giảm tổng thời gian chờ so với làm tuần tự
  // toàn bộ, quan trọng vì route có giới hạn thời gian chạy.
  const pageImages: string[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @napi-rs/canvas's Canvas/CanvasRenderingContext2D are structurally compatible with what pdfjs-dist needs at runtime but aren't the DOM types it declares
    await page.render({ canvas: canvas as any, canvasContext: ctx as any, viewport }).promise;

    const pngBuffer = await canvas.encode("png");
    pageImages.push(pngBuffer.toString("base64"));
  }

  const pageTexts = await Promise.all(
    pageImages.map(async (base64, idx) => {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0,
        messages: [
          { role: "system", content: OCR_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: `Trích xuất toàn bộ chữ trong ảnh trang ${idx + 1}/${pageCount} của CV này.` },
              { type: "image_url", image_url: { url: `data:image/png;base64,${base64}` } },
            ],
          },
        ],
      });
      return response.choices[0]?.message?.content?.trim() || "";
    })
  );

  const combined = pageTexts.filter(Boolean).join("\n\n").trim();
  if (!combined) {
    throw new Error("Không đọc được chữ trong file dù đã thử OCR. File có thể trống hoặc bị lỗi.");
  }
  return combined;
}

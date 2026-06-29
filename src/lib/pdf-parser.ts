/* eslint-disable @typescript-eslint/no-require-imports */
const pdfParse = require("pdf-parse");

/**
 * Hàm phân tích file PDF và trả về nội dung text thô.
 * @param fileBuffer - Buffer của file PDF (từ request upload).
 * @returns {Promise<string>} - Nội dung text được trích xuất.
 */
export async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(fileBuffer);
    
    // data.text chứa toàn bộ text thô
    if (!data.text || data.text.trim() === "") {
      throw new Error("Không thể trích xuất chữ từ PDF. File có thể là ảnh quét (scanned image).");
    }
    
    // Xóa bớt khoảng trắng thừa và ký tự xuống dòng liên tiếp
    const cleanedText = data.text.replace(/\n\s*\n/g, '\n').trim();
    
    return cleanedText;
  } catch (error: unknown) {
    console.error("Lỗi khi parse PDF:", (error as Error).message);
    throw new Error(`PDF Parsing Error: ${(error as Error).message}`);
  }
}

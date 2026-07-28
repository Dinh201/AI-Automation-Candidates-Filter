export const CV_BUCKET = "cv_uploads";
export const CV_SIGNED_URL_TTL_SECONDS = 60 * 24 * 60 * 60; // 60 ngày

/**
 * `candidates.cv_url` lưu 1 signed URL (có thể đã hết hạn) hoặc — nếu tạo
 * signed URL lúc upload bị lỗi — lưu thẳng path tương đối trong bucket.
 * Hàm này trích ra path thật trong bucket bất kể cv_url còn hạn hay không,
 * để có thể tạo lại signed URL mới bất cứ lúc nào.
 */
export function extractCvStoragePath(cvUrl: string | null | undefined): string | null {
  if (!cvUrl) return null;
  const match = cvUrl.match(/\/object\/sign\/cv_uploads\/([^?]+)/);
  if (match) return decodeURIComponent(match[1]);
  if (!cvUrl.startsWith("http")) return cvUrl;
  return null;
}

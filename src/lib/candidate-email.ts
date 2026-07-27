/**
 * `candidates.email` là NOT NULL trong DB, nhưng luồng "Quét CV nhanh" đôi khi
 * không có email ứng viên (HR không nhập, AI cũng không trích xuất được từ CV).
 * Khi đó lưu tạm placeholder này thay vì để trống, và các nơi cần gửi mail thật
 * (mời phỏng vấn, thông báo...) phải kiểm tra qua `isMissingCandidateEmail`
 * trước khi dùng.
 */
export const MISSING_EMAIL_PLACEHOLDER = "unknown@quickscan.local";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isMissingCandidateEmail(email: string | null | undefined): boolean {
  if (!email) return true;
  const trimmed = email.trim();
  return trimmed === "" || trimmed === MISSING_EMAIL_PLACEHOLDER || trimmed.endsWith("@quickscan.local");
}

export function isValidEmailFormat(email: string | null | undefined): boolean {
  return !!email && EMAIL_REGEX.test(email.trim());
}

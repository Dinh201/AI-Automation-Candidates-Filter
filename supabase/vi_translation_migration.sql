-- Thêm cột lưu bản dịch tiếng Việt của kết quả chấm điểm AI (cache, tránh gọi
-- lại AI mỗi lần HR mở box "Xem bản dịch tiếng Việt" trên trang chi tiết ứng viên).
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS ai_score_result_vi JSONB;

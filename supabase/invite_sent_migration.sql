-- Thêm cột đánh dấu đã gửi mail mời phỏng vấn cho ứng viên chưa.
-- Dùng để chỉ hiện nút "Gửi lại mail mời" ở trang /interviews khi CHƯA gửi
-- (bất kể gửi lần đầu lúc đặt lịch hay gửi lại sau đó).
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS invite_sent BOOLEAN NOT NULL DEFAULT false;

-- Chạy lệnh này trong Supabase SQL Editor
-- Tạo bảng lưu cấu hình "Lịch làm việc" (Cài đặt → Workspace → Lịch làm việc)
-- Trước đây cấu hình này chỉ lưu ở localStorage nên server (API tìm slot phỏng
-- vấn) không đọc được. Bảng này cho phép cấu hình thực sự điều khiển việc gợi ý
-- slot phỏng vấn trong /api/interviews/available-slots.

CREATE TABLE IF NOT EXISTS public.calendar_settings (
  id             TEXT        PRIMARY KEY DEFAULT 'default',
  work_days      INTEGER[]   NOT NULL DEFAULT '{1,2,3,4,5}', -- 0=CN, 1=T2 ... 6=T7
  work_start     TEXT        NOT NULL DEFAULT '08:00',
  work_end       TEXT        NOT NULL DEFAULT '17:30',
  lunch_start    TEXT        NOT NULL DEFAULT '12:00',
  lunch_end      TEXT        NOT NULL DEFAULT '13:30',
  timezone       TEXT        NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  buffer_minutes INTEGER     NOT NULL DEFAULT 15,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.calendar_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_settings_all" ON public.calendar_settings
  FOR ALL USING (true) WITH CHECK (true);

-- Chạy lệnh này trong Supabase SQL Editor
-- Tạo bảng lưu Gmail OAuth tokens (kết nối qua giao diện thay vì env var)

CREATE TABLE IF NOT EXISTS public.hr_gmail_tokens (
  id            TEXT        PRIMARY KEY DEFAULT 'default',
  access_token  TEXT        NOT NULL,
  refresh_token TEXT,
  expiry        BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hr_gmail_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_gmail_tokens_all" ON public.hr_gmail_tokens
  FOR ALL USING (true) WITH CHECK (true);
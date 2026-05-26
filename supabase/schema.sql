-- ==========================================
-- SCHEMA HOÀN CHỈNH: AI Recruitment System
-- Chạy toàn bộ file này trong Supabase SQL Editor
-- (Xóa tất cả table cũ trước khi chạy nếu cần)
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. BẢNG JOBS (Vị trí tuyển dụng)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                 TEXT        NOT NULL,
  description           TEXT        NOT NULL DEFAULT '',
  required_skills       TEXT        NOT NULL DEFAULT '',
  preferred_skills      TEXT        NOT NULL DEFAULT '',
  experience_requirement TEXT       NOT NULL DEFAULT '',
  benefits              TEXT        NOT NULL DEFAULT '',
  rubric                JSONB       NOT NULL DEFAULT '{
    "job_fit_weight": 0.5,
    "potential_weight": 0.3,
    "cultural_fit_weight": 0.2,
    "notes": ""
  }'::JSONB,
  status                TEXT        NOT NULL DEFAULT 'Open'
                                    CHECK (status IN ('Open', 'Closed')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Cho phép anon đọc jobs (trang apply công khai)
CREATE POLICY "jobs_select_all" ON public.jobs
  FOR SELECT USING (true);

-- Cho phép tạo / sửa jobs (chưa có auth, dùng service role)
CREATE POLICY "jobs_insert_all" ON public.jobs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "jobs_update_all" ON public.jobs
  FOR UPDATE USING (true);

CREATE POLICY "jobs_delete_all" ON public.jobs
  FOR DELETE USING (true);


-- ==========================================
-- 2. BẢNG CANDIDATES (Ứng viên)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.candidates (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id              UUID          NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  name                TEXT          NOT NULL,
  email               TEXT          NOT NULL,
  phone               TEXT,
  form_answers        TEXT          NOT NULL DEFAULT '',
  cv_url              TEXT          NOT NULL,

  -- Kết quả AI
  ai_score_result     JSONB,
  total_score         NUMERIC(4, 2),
  missing_information BOOLEAN       NOT NULL DEFAULT FALSE,

  status              TEXT          NOT NULL DEFAULT 'New'
                                    CHECK (status IN (
                                      'New', 'Scoring', 'Scored',
                                      'Interviewing', 'Rejected', 'Hired'
                                    )),

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Ứng viên có thể nộp đơn (anonymous INSERT)
CREATE POLICY "candidates_insert_public" ON public.candidates
  FOR INSERT WITH CHECK (true);

-- HR xem và cập nhật candidates
CREATE POLICY "candidates_select_all" ON public.candidates
  FOR SELECT USING (true);

CREATE POLICY "candidates_update_all" ON public.candidates
  FOR UPDATE USING (true);

CREATE POLICY "candidates_delete_all" ON public.candidates
  FOR DELETE USING (true);


-- ==========================================
-- 3. BẢNG INTERVIEWS (Lịch phỏng vấn)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.interviews (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id      UUID        NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id            UUID        NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,

  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ NOT NULL,
  interviewer_email TEXT,
  interviewer_name  TEXT,
  notes             TEXT,
  google_event_id   TEXT,
  meet_link         TEXT,

  status            TEXT        NOT NULL DEFAULT 'Scheduled'
                                CHECK (status IN (
                                  'Scheduled', 'Completed', 'Cancelled', 'Rescheduled'
                                )),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interviews_all" ON public.interviews
  FOR ALL USING (true) WITH CHECK (true);


-- ==========================================
-- 4. BẢNG HR_CALENDAR_TOKENS (Google OAuth tokens)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.hr_calendar_tokens (
  id            TEXT        PRIMARY KEY DEFAULT 'default',
  access_token  TEXT        NOT NULL,
  refresh_token TEXT,
  expiry        BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hr_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_calendar_tokens_all" ON public.hr_calendar_tokens
  FOR ALL USING (true) WITH CHECK (true);


-- ==========================================
-- 5. STORAGE BUCKET: cv_uploads
-- (Chạy riêng nếu bucket chưa tồn tại)
-- ==========================================
-- INSERT INTO storage.buckets (id, name, public, file_size_limit)
-- VALUES ('cv_uploads', 'cv_uploads', false, 10485760)
-- ON CONFLICT (id) DO NOTHING;

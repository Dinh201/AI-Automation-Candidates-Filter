-- Chạy trong Supabase SQL Editor
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT        NOT NULL,  -- 'candidate' | 'interview' | 'job'
  entity_id   TEXT        NOT NULL,
  entity_name TEXT,                  -- tên hiển thị (ứng viên, vị trí...)
  action      TEXT        NOT NULL,  -- xem AuditAction bên dưới
  details     JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx     ON audit_logs (entity_type, entity_id);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_open" ON audit_logs FOR ALL USING (true);

-- AuditAction values:
-- 'candidate_applied'         ứng viên nộp CV
-- 'candidate_scored'          AI chấm điểm xong
-- 'candidate_status_changed'  HR đổi trạng thái thủ công
-- 'interview_scheduled'       HR lên lịch phỏng vấn
-- 'interview_outcome'         ghi kết quả Hired / Rejected

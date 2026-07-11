-- 1. Thêm cột notification_prefs vào user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{"emailApplicant": true, "emailInterview": true, "pushApplicant": false, "pushInterview": true}'::jsonb;

-- 2. Tạo bảng lưu push subscriptions (Web Push)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- User chỉ quản lý subscription của chính mình
CREATE POLICY "Users can manage own push subscriptions"
ON public.push_subscriptions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
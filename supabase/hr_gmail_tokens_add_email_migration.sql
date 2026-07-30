-- Chạy lệnh này trong Supabase SQL Editor
-- Thêm cột lưu địa chỉ email của tài khoản Gmail đang kết nối (để hiển thị ở
-- trang Cài đặt — "Đã kết nối: xxx@..." — vì trước đây bảng chỉ lưu token, không
-- biết token đó thuộc tài khoản nào).

ALTER TABLE public.hr_gmail_tokens
  ADD COLUMN IF NOT EXISTS email TEXT;

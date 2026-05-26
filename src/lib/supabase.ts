import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Khởi tạo Supabase Client cơ bản (sử dụng ANON key)
// Trong thực tế với API Route bảo mật cao, có thể dùng Service Role Key
// hoặc dùng @supabase/ssr để truyền cookie.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

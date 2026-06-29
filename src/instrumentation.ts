export async function register() {
  // Chỉ chạy trên Node.js runtime (không chạy trên edge)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { createClient } = await import("@supabase/supabase-js");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!supabaseUrl || !serviceRoleKey) {
      console.warn("[startup] Thiếu Supabase env vars — bỏ qua clear calendar tokens");
      return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await supabase
      .from("hr_calendar_tokens")
      .delete()
      .eq("id", "default");

    if (error) {
      console.warn("[startup] Không thể xóa calendar tokens:", error.message);
    } else {
      console.log("[startup] Google Calendar tokens đã được xóa — yêu cầu kết nối lại");
    }
  } catch (err) {
    // Không để startup failure làm crash server
    console.warn("[startup] Lỗi khi clear calendar tokens:", err);
  }
}
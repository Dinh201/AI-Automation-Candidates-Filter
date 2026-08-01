"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { StarLogo } from "@/components/star-logo";

/* ── Shared input style helper ── */
const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#ffffff",
  outline: "none", transition: "border-color 0.15s",
};

function InputField({
  label, type = "text", value, onChange, placeholder, disabled, children,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  disabled?: boolean; children?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          className="lp-input"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          disabled={disabled}
          style={{
            ...inputStyle,
            borderColor: focused ? "#06b6d4" : "rgba(255,255,255,0.14)",
            paddingRight: children ? 40 : 14,
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {children}
      </div>
    </div>
  );
}

/* ── Form panel — isolated so useSearchParams can be Suspense-wrapped ── */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [tab, setTab]           = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  const supabase = createSupabaseBrowser();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(redirect);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function switchTab(next: "login" | "register") {
    setTab(next);
    setError(null);
    setSuccess(null);
    setPassword("");
    setConfirm("");
  }

  /** Sau khi đăng nhập thành công: nếu tài khoản chưa kết nối Google Calendar,
   *  tự chuyển sang màn hình cấp quyền Google luôn — không cần vào Settings bấm nút. */
  async function goToAppOrConnectCalendar() {
    try {
      const res = await fetch("/api/calendar/status");
      const { connected } = await res.json();
      if (!connected) {
        window.location.href = `/api/calendar/connect?return_to=${encodeURIComponent(redirect)}`;
        return;
      }
    } catch {
      // Không kiểm tra được trạng thái Calendar — vẫn cho vào app bình thường
    }
    router.replace(redirect);
    router.refresh();
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Email hoặc mật khẩu không đúng."
          : authError.message
      );
      setLoading(false);
      return;
    }

    await goToAppOrConnectCalendar();
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Email đã tồn tại — Supabase trả về user nhưng identities rỗng
    if (data.user && data.user.identities?.length === 0) {
      setError("Email này đã được đăng ký. Vui lòng đăng nhập.");
      setLoading(false);
      return;
    }

    // Nếu có session ngay (email confirmation tắt) → vào thẳng app
    if (data.session) {
      await goToAppOrConnectCalendar();
      return;
    }

    // Cần xác nhận email
    setSuccess("Đăng ký thành công! Kiểm tra hộp thư để xác nhận tài khoản, sau đó đăng nhập.");
    setLoading(false);
  }

  const EyeBtn = () => (
    <button
      type="button"
      onClick={() => setShowPw(!showPw)}
      style={{
        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
        background: "none", border: "none", color: "rgba(255,255,255,0.4)",
        cursor: "pointer", padding: 4, display: "flex",
      }}
    >
      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  return (
    <div style={{
      background: "rgba(4,8,22,0.62)",
      backdropFilter: "blur(36px)",
      WebkitBackdropFilter: "blur(36px)",
      borderLeft: "1px solid rgba(255,255,255,0.08)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "52px 44px",
      position: "relative",
    }}>
      {/* Logo */}
      <div style={{
        position: "absolute", top: 22, left: 0, right: 0,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
      }}>
        <StarLogo size={40} />
        <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em" }}>
          ATS Internal
        </span>
      </div>

      {/* Form body */}
      <div style={{ width: "100%", maxWidth: 300 }}>
        {/* Tab toggle */}
        <div style={{
          display: "flex", gap: 4, background: "rgba(255,255,255,0.07)",
          borderRadius: 10, padding: 4, marginBottom: 24,
        }}>
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              style={{
                flex: 1, padding: "7px 0", borderRadius: 7, border: "none",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "all 0.18s",
                background: tab === t ? "rgba(255,255,255,0.15)" : "transparent",
                color: tab === t ? "#ffffff" : "rgba(255,255,255,0.4)",
                boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
              }}
            >
              {t === "login" ? "Đăng nhập" : "Đăng ký"}
            </button>
          ))}
        </div>

        <h1 style={{
          fontSize: 22, fontWeight: 700, color: "#ffffff",
          fontFamily: "Georgia, 'Times New Roman', serif",
          letterSpacing: "-0.02em", textAlign: "center", margin: "0 0 6px",
        }}>
          {tab === "login" ? "Welcome Back" : "Tạo tài khoản"}
        </h1>
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: 13, margin: "0 0 22px" }}>
          {tab === "login" ? "Nhập thông tin để truy cập hệ thống" : "Điền thông tin để bắt đầu sử dụng"}
        </p>

        {error && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 8,
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 8, padding: "10px 12px", marginBottom: 16,
          }}>
            <AlertCircle size={14} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: "#fca5a5", fontSize: 13, margin: 0 }}>{error}</p>
          </div>
        )}

        {success && (
          <div style={{
            background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: 8, padding: "10px 12px", marginBottom: 16,
          }}>
            <p style={{ color: "#86efac", fontSize: 13, margin: 0 }}>{success}</p>
          </div>
        )}

        {tab === "login" ? (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" disabled={loading} />
            <InputField label="Mật khẩu" type={showPw ? "text" : "password"} value={password} onChange={setPassword} placeholder="••••••••" disabled={loading}>
              <EyeBtn />
            </InputField>

            <button
              className="lp-btn"
              type="submit"
              disabled={loading}
              style={{
                display: "block", width: "100%", padding: "11px",
                background: loading ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8,
                color: "white", fontSize: 14, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.15s", marginTop: 4,
              }}
            >
              {loading ? "Đang đăng nhập…" : "Đăng nhập"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <InputField label="Họ và tên" value={fullName} onChange={setFullName} placeholder="Nguyễn Văn A" disabled={loading} />
            <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" disabled={loading} />
            <InputField label="Mật khẩu" type={showPw ? "text" : "password"} value={password} onChange={setPassword} placeholder="Tối thiểu 6 ký tự" disabled={loading}>
              <EyeBtn />
            </InputField>
            <InputField label="Xác nhận mật khẩu" type={showPw ? "text" : "password"} value={confirm} onChange={setConfirm} placeholder="Nhập lại mật khẩu" disabled={loading} />

            <button
              className="lp-btn"
              type="submit"
              disabled={loading}
              style={{
                display: "block", width: "100%", padding: "11px",
                background: loading ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, rgba(6,182,212,0.3), rgba(99,102,241,0.3))",
                border: "1px solid rgba(6,182,212,0.35)", borderRadius: 8,
                color: "white", fontSize: 14, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.15s", marginTop: 4,
              }}
            >
              {loading ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", marginTop: 28, color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
          ATS Internal · v0.1.0 MVP Build
        </p>
      </div>
    </div>
  );
}

/* ── Login page ──────────────────────────────────────────────── */
export default function LoginPage() {
  return (
    <>
      <style>{`
        .lp-left { display: block; }
        @media (max-width: 640px) {
          .lp-left { display: none !important; }
          .lp-card { grid-template-columns: 1fr !important; }
        }
        .lp-input { box-sizing: border-box; display: block; width: 100%; }
        .lp-input::placeholder { color: rgba(255,255,255,0.35); }
        .lp-btn:hover:not(:disabled) { background: rgba(255,255,255,0.18) !important; }
      `}</style>

      {/* ── Full-page background image ── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: "url('/background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }} />
      <div style={{
        position: "fixed", inset: 0, zIndex: 1,
        background: "radial-gradient(ellipse at 60% 50%, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.62) 100%)",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "relative", zIndex: 2,
        minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}>
        <div
          className="lp-card"
          style={{
            width: "100%", maxWidth: 920,
            display: "grid", gridTemplateColumns: "1fr 1fr",
            minHeight: 560, borderRadius: 20, overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
          }}
        >
          {/* ── LEFT: transparent — full-page background image shows through ── */}
          <div className="lp-left" style={{ position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.08) 45%, rgba(0,0,0,0.12) 100%)",
              zIndex: 1,
            }} />
            <div style={{
              position: "absolute", inset: 0, zIndex: 2,
              padding: "28px 32px",
              display: "flex", flexDirection: "column", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  color: "rgba(255,255,255,0.5)",
                }}>
                  ATS Internal
                </span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.18)" }} />
              </div>
              <div>
                <h2 style={{
                  fontSize: 40, fontWeight: 700, lineHeight: 1.12, color: "#ffffff",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  margin: "0 0 14px", textShadow: "0 2px 28px rgba(0,0,0,0.6)",
                }}>
                  Tuyển đúng người,<br />
                  Đúng vị trí,<br />
                  Đúng thời điểm
                </h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.58)", lineHeight: 1.65, maxWidth: 260, margin: 0 }}>
                  Hệ thống ATS nội bộ giúp đội ngũ HR tuyển dụng hiệu quả và chính xác hơn.
                </p>
              </div>
            </div>
          </div>

          {/* ── RIGHT: frosted glass — Suspense wraps useSearchParams ── */}
          <Suspense fallback={
            <div style={{
              background: "rgba(4,8,22,0.62)",
              backdropFilter: "blur(36px)",
              WebkitBackdropFilter: "blur(36px)",
            }} />
          }>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </>
  );
}
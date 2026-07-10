"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { StarLogo } from "@/components/star-logo";

/* ── Animated fluid-ribbon canvas ───────────────────────────── */
function FluidCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const t0 = Date.now();
    let W = 0;
    let H = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      if (W > 0 && H > 0) {
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };
    resize();

    /* Ribbon definitions — hot pink → magenta → purple → blue → cyan */
    const bands = [
      { y: 0.06, a: 0.20, s: 0.22, ph: 0.0, c: "#ff0066" },
      { y: 0.19, a: 0.22, s: 0.27, ph: 1.2, c: "#e91e8c" },
      { y: 0.31, a: 0.18, s: 0.31, ph: 2.1, c: "#c2185b" },
      { y: 0.43, a: 0.20, s: 0.34, ph: 0.7, c: "#9c27b0" },
      { y: 0.55, a: 0.17, s: 0.29, ph: 3.2, c: "#7b1fa2" },
      { y: 0.66, a: 0.19, s: 0.37, ph: 1.9, c: "#3f51b5" },
      { y: 0.77, a: 0.21, s: 0.26, ph: 2.8, c: "#1565c0" },
      { y: 0.89, a: 0.18, s: 0.32, ph: 4.1, c: "#0097a7" },
    ];

    const N = 80;

    const render = () => {
      if (W === 0 || H === 0) {
        resize();
        raf = requestAnimationFrame(render);
        return;
      }
      const t = (Date.now() - t0) / 1000;

      ctx.fillStyle = "#06000f";
      ctx.fillRect(0, 0, W, H);

      for (const b of bands) {
        const thick = H * 0.18;
        const top: number[][] = [];
        const bot: number[][] = [];

        for (let i = 0; i <= N; i++) {
          const x = (i / N) * W;
          const p = i / N;
          const w1 = Math.sin(b.ph + p * Math.PI * 2.8 + t * b.s) * b.a * H;
          const w2 = Math.sin(b.ph * 1.6 + p * Math.PI * 4.8 + t * b.s * 0.7) * b.a * H * 0.38;
          const cy = b.y * H + w1 + w2;
          top.push([x, cy - thick / 2]);
          bot.push([x, cy + thick / 2]);
        }

        /* Ribbon body */
        const g = ctx.createLinearGradient(0, 0, W, 0);
        g.addColorStop(0,    b.c + "00");
        g.addColorStop(0.07, b.c + "e0");
        g.addColorStop(0.5,  b.c + "ff");
        g.addColorStop(0.93, b.c + "e0");
        g.addColorStop(1,    b.c + "00");

        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(top[0][0], top[0][1]);
        for (let i = 1; i <= N; i++) ctx.lineTo(top[i][0], top[i][1]);
        for (let i = N; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        /* Highlight streak near top edge */
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.28;
        const gh = ctx.createLinearGradient(0, 0, W, 0);
        gh.addColorStop(0,    "rgba(255,255,255,0)");
        gh.addColorStop(0.12, "rgba(255,255,255,1)");
        gh.addColorStop(0.55, "rgba(255,255,255,0.55)");
        gh.addColorStop(0.88, "rgba(255,255,255,0.35)");
        gh.addColorStop(1,    "rgba(255,255,255,0)");
        ctx.fillStyle = gh;
        const hs = thick * 0.1;
        ctx.beginPath();
        ctx.moveTo(top[0][0], top[0][1]);
        for (let i = 1; i <= N; i++) ctx.lineTo(top[i][0], top[i][1]);
        for (let i = N; i >= 0; i--) ctx.lineTo(top[i][0], top[i][1] + hs);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      raf = requestAnimationFrame(render);
    };

    render();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    />
  );
}

/* ── Login page ──────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const supabase = createSupabaseBrowser();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(redirect);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

    router.replace(redirect);
    router.refresh();
  }

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

      {/* ── Full-page animated background (single canvas, covers both panels) ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <FluidCanvas />
      </div>
      {/* Subtle dark vignette over the whole page */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1,
        background: "radial-gradient(ellipse at 60% 50%, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.55) 100%)",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "relative", zIndex: 2,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}>
        {/* Card */}
        <div
          className="lp-card"
          style={{
            width: "100%",
            maxWidth: 920,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            minHeight: 560,
            borderRadius: 20,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
          }}
        >
          {/* ── LEFT: transparent — background canvas shows through ── */}
          <div
            className="lp-left"
            style={{ position: "relative", overflow: "hidden" }}
          >
            {/* Gradient overlay for text legibility */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.08) 45%, rgba(0,0,0,0.12) 100%)",
              zIndex: 1,
            }} />

            {/* Text content */}
            <div style={{
              position: "absolute", inset: 0, zIndex: 2,
              padding: "28px 32px",
              display: "flex", flexDirection: "column", justifyContent: "space-between",
            }}>
              {/* Top badge */}
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

              {/* Bottom headline */}
              <div>
                <h2 style={{
                  fontSize: 40,
                  fontWeight: 700,
                  lineHeight: 1.12,
                  color: "#ffffff",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  margin: "0 0 14px",
                  textShadow: "0 2px 28px rgba(0,0,0,0.6)",
                }}>
                  Tuyển đúng người,<br />
                  Đúng vị trí,<br />
                  Đúng thời điểm
                </h2>
                <p style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.58)",
                  lineHeight: 1.65,
                  maxWidth: 260,
                  margin: 0,
                }}>
                  Hệ thống ATS nội bộ giúp đội ngũ HR tuyển dụng hiệu quả và chính xác hơn.
                </p>
              </div>
            </div>
          </div>

          {/* ── RIGHT: frosted glass — canvas background shows through ── */}
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
              <div style={{
                borderRadius: "50%",
                boxShadow: "0 0 14px rgba(0,200,255,0.22)",
                flexShrink: 0,
              }}>
                <StarLogo size={30} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em" }}>
                ATS Internal
              </span>
            </div>

            {/* Form body */}
            <div style={{ width: "100%", maxWidth: 300 }}>
              <h1 style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#ffffff",
                fontFamily: "Georgia, 'Times New Roman', serif",
                letterSpacing: "-0.02em",
                textAlign: "center",
                margin: "0 0 8px",
              }}>
                Welcome Back
              </h1>
              <p style={{
                textAlign: "center",
                color: "rgba(255,255,255,0.45)",
                fontSize: 13,
                margin: "0 0 28px",
              }}>
                Nhập thông tin để truy cập hệ thống
              </p>

              {/* Error */}
              {error && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 8, padding: "10px 12px", marginBottom: 16,
                }}>
                  <AlertCircle size={14} style={{ color: "#f87171", flexShrink: 0 }} />
                  <p style={{ color: "#fca5a5", fontSize: 13, margin: 0 }}>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Email */}
                <div>
                  <label style={{
                    display: "block", fontSize: 13,
                    fontWeight: 500, color: "rgba(255,255,255,0.7)", marginBottom: 6,
                  }}>
                    Email
                  </label>
                  <input
                    className="lp-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      borderRadius: 8,
                      padding: "10px 14px",
                      fontSize: 14,
                      color: "#ffffff",
                      outline: "none",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#06b6d4")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.14)")}
                  />
                </div>

                {/* Password */}
                <div>
                  <label style={{
                    display: "block", fontSize: 13,
                    fontWeight: 500, color: "rgba(255,255,255,0.7)", marginBottom: 6,
                  }}>
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="lp-input"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      disabled={loading}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        borderRadius: 8,
                        padding: "10px 40px 10px 14px",
                        fontSize: 14,
                        color: "#ffffff",
                        outline: "none",
                        transition: "border-color 0.15s",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#06b6d4")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.14)")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      style={{
                        position: "absolute", right: 10, top: "50%",
                        transform: "translateY(-50%)",
                        background: "none", border: "none",
                        color: "rgba(255,255,255,0.4)", cursor: "pointer",
                        padding: 4, display: "flex",
                      }}
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Forgot password */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -4 }}>
                  <button
                    type="button"
                    style={{
                      background: "none", border: "none",
                      fontSize: 13, color: "rgba(255,255,255,0.4)",
                      cursor: "pointer", padding: 0,
                    }}
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                {/* Sign in */}
                <button
                  className="lp-btn"
                  type="submit"
                  disabled={loading}
                  style={{
                    display: "block", width: "100%",
                    padding: "11px",
                    background: loading ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: 8,
                    color: "white", fontSize: 14, fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "background 0.15s",
                    marginTop: 4,
                  }}
                >
                  {loading ? "Đang đăng nhập…" : "Sign In"}
                </button>
              </form>

              <p style={{
                textAlign: "center", marginTop: 32,
                color: "rgba(255,255,255,0.25)", fontSize: 11,
              }}>
                ATS Internal · v0.1.0 MVP Build
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
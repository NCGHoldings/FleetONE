import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SLIDES = [
  "Elevating passenger experience with intelligent fleet management, seamless scheduling, and optimized transit operations.",
  "Real-time visibility across your entire fleet — from dispatch to destination — in one unified command center.",
  "Data-driven decisions, automated reporting, and zero-downtime deployments powering the future of transport.",
];

/* ─── inline SVGs so there's zero dependency on lucide sizing quirks ─── */
const IconEnvelope = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconEye = ({ off }: { off?: boolean }) => off ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconBus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 6v6" /><path d="M15 6v6" />
    <path d="M2 12h19.6" />
    <path d="M18 18h2a1 1 0 0 0 1-1v-5H3v5a1 1 0 0 0 1 1h2" />
    <path d="M8 18h8" />
    <circle cx="6.5" cy="18.5" r="1.5" /><circle cx="17.5" cy="18.5" r="1.5" />
    <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8H3V6Z" />
  </svg>
);
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconLoader = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin mr-2">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

/* ─────────────────────────────────────────────────── */
export default function Auth() {
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [error, setError]             = useState("");
  const [slide, setSlide]             = useState(0);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
  }, [navigate]);

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError("Enter your email first, then click Forgot password."); return; }
    setForgotLoading(true); setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) setError(error.message);
    else toast({ title: "Reset email sent", description: "Check your inbox." });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setError(error.message.includes("Invalid login credentials")
        ? "Invalid email or password."
        : error.message.includes("Email not confirmed")
          ? "Please confirm your email before signing in."
          : error.message);
      return;
    }
    toast({ title: "Welcome back!", description: "Signed in to FleetONE." });
    navigate((location.state as any)?.from?.pathname || "/");
  };

  /* ── palette ── */
  const BG   = "#1a1f2e";   /* left panel */
  const CARD = "#242938";   /* form card  */
  const CHIP = "#1e2538";   /* feature chips */
  const AMB  = "#f59e0b";   /* amber accent */

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* ════════ LEFT PANEL ════════ */}
      <div style={{
        width: "50%", minWidth: 420, background: BG,
        display: "flex", flexDirection: "column", padding: "40px 56px",
        boxSizing: "border-box",
      }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, background: AMB,
            display: "flex", alignItems: "center", justifyContent: "center", color: "#000",
          }}>
            <IconBus />
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>
            Fleet<span style={{ color: AMB }}>ONE</span>
          </span>
        </div>

        {/* Heading */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Welcome back</h1>
          <p style={{ fontSize: 13, color: "#8892a4", margin: 0 }}>Enter your credentials to access the workspace</p>
        </div>

        {/* Form card */}
        <div style={{ background: CARD, borderRadius: 16, padding: "24px 24px 20px", marginBottom: 16 }}>
          <form onSubmit={handleSignIn}>

            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12, color: "#8892a4", marginBottom: 6, fontWeight: 500 }}>
                Email Address
              </label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  color: "#9ca3af", display: "flex", alignItems: "center",
                }}>
                  <IconEnvelope />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="name@ncgholdings.com"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    height: 42, paddingLeft: 38, paddingRight: 12,
                    borderRadius: 10, border: "1px solid #e5e7eb",
                    fontSize: 13, color: "#111827", background: "#fff",
                    outline: "none", fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: error ? 14 : 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: 12, color: "#8892a4", fontWeight: 500 }}>Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading || forgotLoading}
                  style={{ fontSize: 12, color: AMB, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                >
                  {forgotLoading ? "Sending…" : "Forgot password?"}
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  color: "#9ca3af", display: "flex", alignItems: "center",
                }}>
                  <IconLock />
                </span>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="••••••••••"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    height: 42, paddingLeft: 38, paddingRight: 42,
                    borderRadius: 10, border: "1px solid #e5e7eb",
                    fontSize: 13, color: "#111827", background: "#fff",
                    outline: "none", fontFamily: "inherit",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "#9ca3af",
                    display: "flex", alignItems: "center", padding: 0,
                  }}
                >
                  <IconEye off={showPw} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginBottom: 14, padding: "10px 14px", borderRadius: 8,
                background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                fontSize: 12, color: "#fca5a5",
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", height: 42, background: AMB, color: "#000",
                border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", fontFamily: "inherit",
                boxShadow: "0 4px 16px rgba(245,158,11,0.35)",
                opacity: loading ? 0.8 : 1, transition: "opacity 0.15s",
              }}
            >
              {loading ? <><IconLoader />Signing in…</> : "Sign In"}
            </button>
          </form>
        </div>

        {/* Feature chips */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { icon: <IconBus />,    label: "Transit Operations",  desc: "Real-time fleet tracking & scheduling" },
            { icon: <IconShield />, label: "Smart Diagnostics",   desc: "AI-powered checks & quality control" },
          ].map(f => (
            <div key={f.label} style={{
              background: CHIP, borderRadius: 12, padding: "14px 14px 12px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ color: AMB, marginBottom: 8 }}>{f.icon}</div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", margin: "0 0 3px" }}>{f.label}</p>
              <p style={{ fontSize: 11, color: "#8892a4", margin: 0, lineHeight: 1.4 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ════════ RIGHT PANEL — amber ════════ */}
      <div style={{
        flex: 1, background: AMB, display: "flex", flexDirection: "column",
        position: "relative", overflow: "hidden",
      }}>
        {/* subtle dot pattern */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.07,
          backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
          backgroundSize: "28px 28px", pointerEvents: "none",
        }} />

        {/* Quote */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 64px", position: "relative", zIndex: 1,
        }}>
          <div style={{ maxWidth: 440, textAlign: "center" }}>
            {/* quotation mark */}
            <div style={{ fontSize: 64, lineHeight: 1, color: "rgba(0,0,0,0.18)", marginBottom: 16, fontFamily: "Georgia, serif" }}>"</div>

            {/* slides */}
            <div style={{ position: "relative", minHeight: 140 }}>
              {SLIDES.map((s, i) => (
                <p key={i} style={{
                  position: "absolute", inset: 0,
                  fontSize: 20, fontWeight: 600, lineHeight: 1.55,
                  color: "rgba(0,0,0,0.72)", margin: 0,
                  opacity: i === slide ? 1 : 0,
                  transition: "opacity 0.7s ease",
                  pointerEvents: i === slide ? "auto" : "none",
                }}>
                  "{s}"
                </p>
              ))}
            </div>

            {/* dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 28 }}>
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  style={{
                    height: 6, border: "none", cursor: "pointer", borderRadius: 3,
                    width: i === slide ? 28 : 8,
                    background: i === slide ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.2)",
                    transition: "all 0.3s ease", padding: 0,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          position: "relative", zIndex: 1, textAlign: "right",
          padding: "0 28px 20px", fontSize: 11, color: "rgba(0,0,0,0.42)",
        }}>
          Built with ♥ by <span style={{ color: "rgba(0,0,0,0.58)", fontWeight: 600 }}>NCG Tech</span>
          {"  "}<span style={{ color: "rgba(0,0,0,0.32)" }}>Build v3.35.0</span>
        </div>
      </div>
    </div>
  );
}

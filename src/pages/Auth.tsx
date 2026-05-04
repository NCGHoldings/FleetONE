import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, Bus, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CAROUSEL_SLIDES = [
  {
    quote:
      "Elevating passenger experience with intelligent fleet management, seamless scheduling, and optimized transit operations.",
  },
  {
    quote:
      "Real-time visibility across your entire fleet — from dispatch to destination — in one unified command center.",
  },
  {
    quote:
      "Data-driven decisions, automated reporting, and zero-downtime deployments powering the future of transport.",
  },
];

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [error, setError] = useState("");
  const [slide, setSlide] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate("/");
    };
    checkUser();
  }, [navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((s) => (s + 1) % CAROUSEL_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address first, then click Forgot Password.");
      return;
    }
    setForgotLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        toast({
          title: "Password reset email sent",
          description: "Check your inbox for a link to reset your password.",
        });
      }
    } catch {
      setError("Failed to send reset email. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please check your credentials and try again.");
        } else if (error.message.includes("Email not confirmed")) {
          setError("Please check your email and click the confirmation link before signing in.");
        } else {
          setError(error.message);
        }
        return;
      }
      toast({ title: "Welcome back!", description: "Successfully signed in to FleetONE." });
      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Sign in error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#1a1f2e" }}>

      {/* ── LEFT — Login Panel ─────────────────────────────────── */}
      <div
        className="flex flex-col justify-center items-center w-full lg:w-1/2 px-8 sm:px-12 lg:px-14 py-10"
        style={{ background: "#1a1f2e" }}
      >
        {/* Top: Logo + Form */}
        <div className="w-full max-w-[380px] mx-auto">

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "#f59e0b" }}
            >
              <Bus className="w-4.5 h-4.5 text-black w-[18px] h-[18px]" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              Fleet<span style={{ color: "#f59e0b" }}>ONE</span>
            </span>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-3xl font-bold text-white mb-1.5">Welcome back</h1>
            <p className="text-sm" style={{ color: "#8b9ab3" }}>
              Enter your credentials to access the workspace
            </p>
          </div>

          {/* Form card */}
          <div
            className="rounded-2xl p-6 mb-5"
            style={{ background: "#242938", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <form onSubmit={handleSignIn} className="space-y-5">

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="signin-email" className="text-xs font-medium" style={{ color: "#8b9ab3" }}>
                  Email Address
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8b9ab3" }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="name@ncgholdings.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 pl-9 text-sm rounded-xl border-0 text-white placeholder:text-gray-600
                               focus-visible:ring-1 focus-visible:ring-amber-500/50"
                    style={{ background: "#2e3548" }}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signin-password" className="text-xs font-medium" style={{ color: "#8b9ab3" }}>
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading || forgotLoading}
                    className="text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ color: "#f59e0b" }}
                  >
                    {forgotLoading ? "Sending..." : "Forgot password?"}
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8b9ab3" }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <Input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 pl-9 pr-10 text-sm rounded-xl border-0 text-white placeholder:text-gray-600
                               focus-visible:ring-1 focus-visible:ring-amber-500/50"
                    style={{ background: "#2e3548" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                    style={{ color: "#8b9ab3" }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="rounded-xl py-2.5 border-red-900/50 bg-red-950/40">
                  <AlertDescription className="text-red-400 text-xs">{error}</AlertDescription>
                </Alert>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 font-bold text-sm rounded-xl text-black transition-all
                           hover:opacity-90 active:scale-[0.98] shadow-lg"
                style={{ background: "#f59e0b", boxShadow: "0 4px 20px rgba(245,158,11,0.3)" }}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </div>

          {/* Feature chips — always visible, 2 items */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Bus, label: "Transit Operations", desc: "Real-time fleet tracking & scheduling" },
              { icon: Shield, label: "Smart Diagnostics", desc: "AI-powered checks & quality control" },
            ].map((f) => (
              <div
                key={f.label}
                className="p-4 rounded-xl"
                style={{ background: "#242938", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <f.icon className="w-5 h-5 mb-2.5" style={{ color: "#f59e0b" }} />
                <p className="text-xs font-bold text-white mb-1">{f.label}</p>
                <p className="text-[11px] leading-snug" style={{ color: "#8b9ab3" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Footer */}
        <div className="w-full max-w-[380px] mx-auto mt-8">
          {/* spacer on desktop */}
        </div>
      </div>

      {/* ── RIGHT — Quote Carousel ──────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col flex-1 relative overflow-hidden"
        style={{ background: "#f59e0b" }}
      >
        {/* Subtle pattern */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #000 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />

        {/* Centered quote */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-16">
          <div className="w-full max-w-[440px]">
            {/* Quote mark */}
            <div
              className="text-7xl font-serif leading-none mb-6 select-none"
              style={{ color: "rgba(0,0,0,0.18)" }}
            >
              "
            </div>

            {/* Slides */}
            <div className="relative min-h-[160px]">
              {CAROUSEL_SLIDES.map((s, i) => (
                <div
                  key={i}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    i === slide ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                >
                  <p
                    className="text-xl font-semibold leading-relaxed"
                    style={{ color: "rgba(0,0,0,0.75)" }}
                  >
                    "{s.quote}"
                  </p>
                </div>
              ))}
            </div>

            {/* Dot indicators */}
            <div className="flex gap-2 mt-8">
              {CAROUSEL_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === slide ? "true" : undefined}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === slide ? "2rem" : "0.75rem",
                    background: i === slide ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.2)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex justify-end px-8 pb-6">
          <p className="text-xs" style={{ color: "rgba(0,0,0,0.45)" }}>
            Built with ♥ by{" "}
            <span style={{ color: "rgba(0,0,0,0.6)" }} className="font-medium">NCG Tech</span>
            {"  "}
            <span style={{ color: "rgba(0,0,0,0.35)" }}>Build v3.35.0</span>
          </p>
        </div>
      </div>
    </div>
  );
}

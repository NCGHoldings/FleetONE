import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, Bus, BarChart3, Shield, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CAROUSEL_SLIDES = [
  {
    quote: "Elevating passenger experience with intelligent fleet management, seamless scheduling, and optimized transit operations.",
    author: "NCG Holdings",
    role: "Transport Excellence",
  },
  {
    quote: "Real-time visibility across your entire fleet — from dispatch to destination — in one unified command center.",
    author: "FleetONE Operations",
    role: "Live Fleet Intelligence",
  },
  {
    quote: "Data-driven decisions, automated reporting, and zero-downtime deployments powering the future of transport.",
    author: "NCG Tech Division",
    role: "Enterprise Platform",
  },
];

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((s) => (s + 1) % CAROUSEL_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const [forgotLoading, setForgotLoading] = useState(false);

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

      toast({
        title: "Welcome back!",
        description: "Successfully signed in to FleetONE.",
      });

      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Sign in error:", err);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Bus, label: "Transit Operations", description: "Real-time fleet tracking & scheduling" },
    { icon: Shield, label: "Smart Diagnostics", description: "AI-powered checks & quality control" },
    { icon: BarChart3, label: "Fleet Analytics", description: "Data-driven operational insights" },
    { icon: Zap, label: "Live Dispatch", description: "Instant driver & route coordination" },
  ];

  return (
    <div className="min-h-screen flex bg-[#0f0f0f] text-white overflow-hidden">

      {/* ── LEFT — Login Panel ───────────────────────────────────────── */}
      <div className="flex flex-col justify-center w-full lg:w-[42%] px-8 sm:px-12 lg:px-16 py-12 relative z-10">
        {/* Subtle background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-60 h-60 bg-amber-400/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative w-full max-w-[400px] mx-auto">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Bus className="w-5 h-5 text-black" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white">
              Fleet<span className="text-amber-400">ONE</span>
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
            <p className="text-gray-400 text-sm">Enter your credentials to access the workspace</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="signin-email" className="text-sm font-medium text-gray-300">
                Email Address
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
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
                  className="h-12 pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-600
                             focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 rounded-xl
                             transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="signin-password" className="text-sm font-medium text-gray-300">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading || forgotLoading}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors disabled:opacity-50"
                >
                  {forgotLoading ? "Sending..." : "Forgot password?"}
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
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
                  className="h-12 pl-10 pr-12 bg-white/5 border-white/10 text-white placeholder:text-gray-600
                             focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 rounded-xl
                             transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="bg-red-950/50 border-red-900/50 rounded-xl">
                <AlertDescription className="text-red-400 text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm
                         rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40
                         hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Feature chips — mobile only */}
          <div className="lg:hidden mt-8 grid grid-cols-2 gap-3">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-2.5 p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/90">{f.label}</p>
                  <p className="text-[10px] text-white/40 leading-tight">{f.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="mt-10 text-center text-xs text-gray-600">
            Built with ♥ by{" "}
            <span className="text-amber-500/70 font-medium">NCG Tech</span>
            {" · "}
            <span className="text-gray-700">Build v3.35.0</span>
          </p>
        </div>
      </div>

      {/* ── RIGHT — Carousel Panel ───────────────────────────────────── */}
      <div className="hidden lg:flex flex-col flex-1 bg-amber-500 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-amber-300/30 rounded-full blur-[80px]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-72 h-72 bg-amber-700/30 rounded-full blur-[80px]" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.3) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(0,0,0,0.3) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Feature grid — top */}
        <div className="relative z-10 p-12 grid grid-cols-2 gap-4 mt-auto">
          {features.map((f) => (
            <div
              key={f.label}
              className="flex items-start gap-3 p-4 bg-black/10 backdrop-blur-sm rounded-2xl border border-black/10 hover:bg-black/20 transition-all duration-300"
            >
              <div className="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center flex-shrink-0">
                <f.icon className="w-4 h-4 text-black" />
              </div>
              <div>
                <p className="text-sm font-bold text-black/90">{f.label}</p>
                <p className="text-xs text-black/60 leading-snug mt-0.5">{f.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quote carousel — bottom */}
        <div className="relative z-10 p-12 pt-6">
          <div className="relative min-h-[160px]">
            {CAROUSEL_SLIDES.map((s, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  i === slide ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              >
                <div className="text-6xl text-black/20 font-serif leading-none mb-4">"</div>
                <p className="text-black/80 text-lg font-medium leading-relaxed mb-5">
                  {s.quote}
                </p>
                <div>
                  <p className="text-black font-bold text-sm">{s.author}</p>
                  <p className="text-black/60 text-xs">{s.role}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Dot indicators */}
          <div className="flex gap-2 mt-6">
            {CAROUSEL_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === slide ? "w-8 bg-black" : "w-3 bg-black/30 hover:bg-black/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

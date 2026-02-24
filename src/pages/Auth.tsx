import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bus, Eye, EyeOff, Loader2, Shield, Mail, Lock, Quote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
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

      // Navigate to dashboard
      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Sign in error:", err);
    } finally {
      setLoading(false);
    }
  };

  const featureCards = [
    { icon: Bus, title: "Transit Operations", desc: "Real-time fleet tracking & scheduling" },
    { icon: Shield, title: "Smart Diagnostics", desc: "AI-powered checks & quality control" },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#16222b] text-white selection:bg-[#dba816] selection:text-[#16222b] font-sans">

      {/* Left Side - Login Section */}
      <div className="flex-1 lg:w-1/2 flex flex-col justify-center p-8 lg:p-16 2xl:p-32 relative overflow-hidden">

        <div className="w-full max-w-[420px] mx-auto relative z-10 flex flex-col items-start">

          {/* Logo Handle */}
          <div className="flex items-center gap-3 mb-10 animate-fade-in hover:scale-105 transition-transform cursor-pointer group">
            <div className="relative">
              <div className="w-10 h-10 bg-[#dba816] rounded-xl flex items-center justify-center relative z-10">
                {/* Custom SVG Logo matching sister platforms */}
                <svg className="w-6 h-6 text-[#16222b]" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <span className="text-2xl font-black tracking-tighter text-[#dba816]">FleetONE</span>
          </div>

          <div className="mb-8 animate-fade-in w-full" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-3xl font-bold mb-2 text-white text-left">Welcome back</h1>
            <p className="text-[#8095A8] text-sm text-left">Enter your credentials to access the workspace</p>
          </div>

          <form onSubmit={handleSignIn} className="w-full animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {/* Form Container to match StoresOne/GarageOne style */}
            <div className="bg-[#1c2834] border border-[#2c3d4f] rounded-xl p-6 shadow-sm space-y-6">

              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-[13px] text-[#A0B0C0] font-medium block text-left">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8095A8]" />
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 pl-10 pr-4 bg-[#16222b] border-[#2c3d4f] text-white font-medium rounded-lg placeholder:text-[#506578] focus-visible:ring-1 focus-visible:ring-[#dba816] focus-visible:border-[#dba816] focus-visible:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="signin-password" className="text-[13px] text-[#A0B0C0] font-medium">Password</Label>
                  <a href="#" className="text-[12px] text-[#dba816] hover:text-[#dba816]/80 transition-colors font-medium">Forgot password?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8095A8]" />
                  <Input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 pl-10 pr-10 bg-[#16222b] border-[#2c3d4f] text-white font-medium rounded-lg placeholder:text-[#506578] focus-visible:ring-1 focus-visible:ring-[#dba816] focus-visible:border-[#dba816] focus-visible:outline-none transition-all tracking-[0.1em]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent text-[#8095A8] hover:text-[#dba816]"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-500 rounded-lg">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-[#dba816] hover:bg-[#c99912] text-[#16222b] font-semibold text-sm rounded-lg transition-all"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#16222b]" />}
                Sign In
              </Button>
            </div>
          </form>

          {/* Bottom Features Cards to match the ecosystem look */}
          <div className="mt-8 grid grid-cols-2 gap-4 animate-fade-in w-full" style={{ animationDelay: '0.4s' }}>
            {featureCards.map((card, i) => (
              <div key={i} className="bg-[#1c2834] border border-[#2c3d4f] p-4 rounded-xl hover:border-[#dba816]/30 transition-colors cursor-default">
                <card.icon className="w-5 h-5 text-[#dba816] mb-3" />
                <h3 className="text-[13px] font-semibold text-white mb-1">{card.title}</h3>
                <p className="text-[11px] text-[#A0B0C0] leading-relaxed font-medium">{card.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Right Side - Brand / Quote Section */}
      <div className="hidden lg:flex w-1/2 relative bg-[#dba816] overflow-hidden items-center justify-center p-16">

        {/* Abstract background shapes matching the concentric circles/curves concept */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-20">
          {/* Using a concentric circle pattern similar to StoresOne */}
          <div className="w-[800px] h-[800px] border border-[#b2870e] rounded-full absolute" />
          <div className="w-[600px] h-[600px] border border-[#b2870e] rounded-full absolute" />
          <div className="w-[400px] h-[400px] border border-[#b2870e] rounded-full absolute" />
          <div className="w-[1000px] h-[1000px] border border-[#b2870e] rounded-full absolute" />
        </div>

        <div className="relative z-10 max-w-[500px] text-center flex flex-col items-center">
          <Quote className="w-12 h-12 text-[#16222b] mb-6 opacity-30 fill-current rotate-180" />

          <h2 className="text-3xl xl:text-[34px] font-semibold text-[#16222b] leading-[1.3] mb-8 tracking-tight">
            "Elevating passenger experience with intelligent fleet management, seamless scheduling, and optimized transit operations."
          </h2>

          <div className="flex gap-2 mb-2 items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#16222b]/40"></div>
            <div className="w-6 h-2 rounded-full bg-[#16222b]"></div>
            <div className="w-2 h-2 rounded-full bg-[#16222b]/40"></div>
            <div className="w-2 h-2 rounded-full bg-[#16222b]/40"></div>
          </div>
        </div>

        {/* Footer info */}
        <div className="absolute bottom-6 right-8 flex items-center gap-1.5 text-[#16222b]/60 text-xs font-medium">
          Built with <span className="text-[#16222b] opacity-80">♥</span> by NCG Tech
          <span className="opacity-60 ml-1">Build v3.36.0</span>
        </div>
      </div>
    </div>
  );
}

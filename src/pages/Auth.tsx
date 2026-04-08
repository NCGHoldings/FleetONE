import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Truck, Eye, EyeOff, Loader2, Bus, BarChart3, MapPin, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import luxuryBusHero from "@/assets/luxury-bus-hero.jpg";

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
        description: "Successfully signed in to NCG Speed Transport System.",
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

  const features = [
    { icon: Bus, label: "Fleet Management", description: "Track your entire fleet" },
    { icon: MapPin, label: "Real-time Tracking", description: "GPS-enabled monitoring" },
    { icon: BarChart3, label: "Analytics Dashboard", description: "Data-driven insights" },
    { icon: Shield, label: "Secure & Reliable", description: "Enterprise-grade security" },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Decorative ambient blobs for the very background */}
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[40%] w-[400px] h-[400px] rounded-full bg-blue-400/10 blur-[100px] animate-pulse delay-700" />
      </div>

      {/* Left Side - Image Section */}
      <div className="relative lg:w-[55%] h-64 lg:h-auto overflow-hidden z-10 shadow-2xl">
        {/* Background Image */}
        <img
          src={luxuryBusHero}
          alt="Luxury Bus Fleet"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[20s] hover:scale-110"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-primary/80 to-transparent mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse delay-1000" />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 h-full flex flex-col justify-between p-8 lg:p-16 text-white pt-12 lg:pt-16">
          {/* Logo & Tagline */}
          <div className="animate-fade-in group cursor-default">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-xl group-hover:bg-white/20 transition-all duration-500">
                <Truck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                  NCG Speed
                </h1>
                <p className="text-white/80 font-medium tracking-wide mt-1">Enterprise Transport Management</p>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="hidden lg:block space-y-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div>
              <h2 className="text-2xl font-bold mb-2">Your Journey, Our Priority</h2>
              <p className="text-white/60 text-sm max-w-md">Seamlessly monitor, manage, and optimize your luxury fleet operations from a single unified command center.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              {features.map((feature, index) => (
                <div 
                  key={feature.label}
                  className="group bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 shadow-lg"
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/50 transition-all">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white/90 mb-1">{feature.label}</h3>
                  <p className="text-xs text-white/60 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="hidden lg:flex items-center gap-10 animate-fade-in bg-black/20 backdrop-blur-md p-6 rounded-3xl border border-white/10 w-fit" style={{ animationDelay: '0.5s' }}>
            <div className="text-center">
              <p className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">100+</p>
              <p className="text-xs font-medium text-white/60 uppercase tracking-widest mt-1">Active Buses</p>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div className="text-center">
              <p className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">50+</p>
              <p className="text-xs font-medium text-white/60 uppercase tracking-widest mt-1">Routes</p>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div className="text-center">
              <p className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">24/7</p>
              <p className="text-xs font-medium text-white/60 uppercase tracking-widest mt-1">Operations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Section */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 z-10 relative">
        <div className="w-full max-w-[420px] animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Card className="border border-white/20 shadow-2xl shadow-primary/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem]">
            <CardHeader className="text-center pb-6 pt-10">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-primary/30 ring-4 ring-primary/10">
                <Truck className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Welcome Back</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 mt-2 text-base">
                Sign in to access your command center
              </CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-10">
              <form onSubmit={handleSignIn} className="space-y-6">
                <div className="space-y-2.5">
                  <Label htmlFor="signin-email" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="name@ncgholdings.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all rounded-xl"
                  />
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 h-auto font-medium text-xs text-primary/80 hover:text-primary transition-colors"
                      onClick={handleForgotPassword}
                      disabled={loading || forgotLoading}
                    >
                      {forgotLoading ? "Sending..." : "Forgot Password?"}
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-12 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all rounded-xl pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-10 w-10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-transparent rounded-lg"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="animate-fade-in border-red-200 bg-red-50 dark:bg-red-950/50 dark:border-red-900 rounded-xl">
                    <AlertDescription className="text-red-600 dark:text-red-400 font-medium text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-700 active:scale-[0.98]" 
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    "Sign In to Dashboard"
                  )}
                </Button>
              </form>

              <div className="mt-8 p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                  New account registration is restricted to administrators only. 
                  Contact your system administrator to securely provision a new account.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Features - Show only on mobile */}
          <div className="lg:hidden mt-8 grid grid-cols-2 gap-3">
            {features.map((feature) => (
              <div 
                key={feature.label}
                className="flex flex-col items-center justify-center text-center gap-2 p-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

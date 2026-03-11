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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Image Section */}
      <div className="relative lg:w-1/2 h-64 lg:h-auto overflow-hidden">
        {/* Background Image */}
        <img
          src={luxuryBusHero}
          alt="Luxury Bus Fleet"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 h-full flex flex-col justify-between p-6 lg:p-12 text-white">
          {/* Logo & Tagline */}
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">NCG Speed</h1>
                <p className="text-white/80 text-sm">Transport Management System</p>
              </div>
            </div>
          </div>

          {/* Features Grid - Hidden on mobile, visible on lg */}
          <div className="hidden lg:block space-y-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-xl font-semibold mb-6">Your Journey, Our Priority</h2>
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div 
                  key={feature.label}
                  className="group bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300"
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                >
                  <feature.icon className="w-6 h-6 mb-2 text-white/90 group-hover:scale-110 transition-transform" />
                  <h3 className="font-medium text-sm">{feature.label}</h3>
                  <p className="text-xs text-white/70">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="hidden lg:flex items-center gap-8 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div>
              <p className="text-3xl font-bold">100+</p>
              <p className="text-sm text-white/70">Active Buses</p>
            </div>
            <div className="w-px h-10 bg-white/30" />
            <div>
              <p className="text-3xl font-bold">50+</p>
              <p className="text-sm text-white/70">Routes</p>
            </div>
            <div className="w-px h-10 bg-white/30" />
            <div>
              <p className="text-3xl font-bold">24/7</p>
              <p className="text-sm text-white/70">Operations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Section */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Card className="border-0 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
                <Truck className="w-7 h-7 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
              <CardDescription className="text-muted-foreground">
                Sign in to access your dashboard
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 bg-muted/50 border-muted-foreground/20 focus:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11 bg-muted/50 border-muted-foreground/20 focus:border-primary transition-colors pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="px-0 text-xs text-muted-foreground hover:text-primary"
                      onClick={handleForgotPassword}
                      disabled={loading || forgotLoading}
                    >
                      {forgotLoading ? "Sending..." : "Forgot Password?"}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="animate-fade-in">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300" 
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>

              <div className="mt-8 p-4 bg-muted/30 rounded-xl border border-border/50">
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  New account registration is restricted to administrators only. 
                  Contact your system administrator to create a new account.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Features - Show only on mobile */}
          <div className="lg:hidden mt-6 grid grid-cols-2 gap-3">
            {features.map((feature) => (
              <div 
                key={feature.label}
                className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/50"
              >
                <feature.icon className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-muted-foreground">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Mail, KeyRound, Loader2, Truck } from "lucide-react";
import { toast } from "sonner";

interface VendorLoginProps {
  onLogin: (session: {
    vendorId: string;
    vendorName: string;
    email: string;
    sessionToken: string;
    companyName: string;
  }) => void;
}

export const VendorLogin = ({ onLogin }: VendorLoginProps) => {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  // Request OTP mutation
  const requestOtp = useMutation({
    mutationFn: async (email: string) => {
      // Check if email exists in vendor_portal_access
      const { data: access, error: accessError } = await supabase
        .from("vendor_portal_access")
        .select(`
          *,
          vendor:vendors(id, vendor_name, company_id)
        `)
        .eq("email", email.toLowerCase())
        .eq("is_active", true)
        .maybeSingle();

      if (accessError) throw accessError;
      if (!access) throw new Error("Email not registered for vendor portal access");

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // Update OTP in database
      const { error: updateError } = await supabase
        .from("vendor_portal_access")
        .update({
          otp_code: otpCode,
          otp_expires_at: expiresAt,
        })
        .eq("id", access.id);

      if (updateError) throw updateError;

      // In production, send OTP via email using Resend
      // For now, show in console (development only)
      console.log(`[DEV] Vendor Portal OTP for ${email}: ${otpCode}`);
      
      return { accessId: access.id };
    },
    onSuccess: () => {
      setStep("otp");
      toast.success("Verification code sent to your email");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send verification code");
    },
  });

  // Verify OTP mutation
  const verifyOtp = useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      // Verify OTP
      const { data: access, error: accessError } = await supabase
        .from("vendor_portal_access")
        .select(`
          *,
          vendor:vendors(id, vendor_name, company_id)
        `)
        .eq("email", email.toLowerCase())
        .eq("otp_code", otp)
        .eq("is_active", true)
        .maybeSingle();

      if (accessError) throw accessError;
      if (!access) throw new Error("Invalid verification code");

      // Check if OTP is expired
      if (access.otp_expires_at && new Date(access.otp_expires_at) < new Date()) {
        throw new Error("Verification code has expired");
      }

      // Generate session token
      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

      // Create session
      const { error: sessionError } = await supabase
        .from("vendor_portal_sessions")
        .insert({
          vendor_access_id: access.id,
          session_token: sessionToken,
          expires_at: expiresAt,
        });

      if (sessionError) throw sessionError;

      // Update last login and clear OTP
      await supabase
        .from("vendor_portal_access")
        .update({
          last_login_at: new Date().toISOString(),
          otp_code: null,
          otp_expires_at: null,
        })
        .eq("id", access.id);

      return {
        vendorId: access.vendor?.id || access.vendor_id,
        vendorName: access.vendor?.vendor_name || "Vendor",
        email: access.email,
        sessionToken,
        companyName: "NCG FleetFlow",
      };
    },
    onSuccess: (data) => {
      toast.success("Login successful!");
      onLogin(data);
    },
    onError: (error: any) => {
      toast.error(error.message || "Verification failed");
    },
  });

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    requestOtp.mutate(email);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) return;
    verifyOtp.mutate({ email, otp });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
            <Truck className="h-8 w-8 text-orange-500" />
          </div>
          <CardTitle className="text-2xl">Vendor Portal</CardTitle>
          <CardDescription>
            {step === "email"
              ? "Enter your email to receive a verification code"
              : "Enter the 6-digit code sent to your email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="vendor@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={requestOtp.isPending}>
                {requestOtp.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="pl-10 text-center text-lg tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Code sent to {email}
                </p>
              </div>
              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={verifyOtp.isPending || otp.length !== 6}>
                {verifyOtp.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Login"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                }}
              >
                Back to Email
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

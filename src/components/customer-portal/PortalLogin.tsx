import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Mail, Lock, ArrowRight, RefreshCw } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface PortalLoginProps {
  onLogin: (session: {
    customerId: string;
    customerName: string;
    email: string;
    sessionToken: string;
    companyName: string;
  }) => void;
}

export function PortalLogin({ onLogin }: PortalLoginProps) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [portalAccessId, setPortalAccessId] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      // Check if email exists in portal access
      const { data: accessData, error: accessError } = await supabase
        .from("customer_portal_access")
        .select(`
          id,
          customer_id,
          email,
          is_active,
          customers (
            customer_name,
            company_id,
            companies (company_name)
          )
        `)
        .eq("email", email.toLowerCase())
        .eq("is_active", true)
        .single();

      if (accessError || !accessData) {
        toast.error("Email not found. Please contact support to get portal access.");
        setIsLoading(false);
        return;
      }

      // Generate OTP (6 digits)
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP
      const { error: updateError } = await supabase
        .from("customer_portal_access")
        .update({
          otp_code: generatedOtp,
          otp_expires_at: expiresAt.toISOString(),
        })
        .eq("id", accessData.id);

      if (updateError) {
        throw updateError;
      }

      setPortalAccessId(accessData.id);
      setStep("otp");
      
      toast.success(`OTP has been sent to ${email}. Please check your email.`);
    } catch (error: any) {
      console.error("OTP send error:", error);
      toast.error("Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP");
      return;
    }

    setIsLoading(true);
    try {
      // Verify OTP
      const { data: accessData, error: accessError } = await supabase
        .from("customer_portal_access")
        .select(`
          id,
          customer_id,
          email,
          otp_code,
          otp_expires_at,
          customers (
            customer_name,
            company_id,
            companies (company_name)
          )
        `)
        .eq("id", portalAccessId)
        .single();

      if (accessError || !accessData) {
        toast.error("Session expired. Please try again.");
        setStep("email");
        return;
      }

      // Check OTP
      if (accessData.otp_code !== otp) {
        toast.error("Invalid OTP. Please try again.");
        setOtp("");
        return;
      }

      // Check expiry
      if (new Date(accessData.otp_expires_at) < new Date()) {
        toast.error("OTP has expired. Please request a new one.");
        setStep("email");
        return;
      }

      // Generate session token
      const sessionToken = crypto.randomUUID();
      const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create session
      await supabase.from("customer_portal_sessions").insert({
        portal_access_id: accessData.id,
        session_token: sessionToken,
        expires_at: sessionExpiry.toISOString(),
      });

      // Update last login
      await supabase
        .from("customer_portal_access")
        .update({
          last_login_at: new Date().toISOString(),
          login_count: (accessData as any).login_count + 1,
          otp_code: null,
          otp_expires_at: null,
        })
        .eq("id", accessData.id);

      // Clear OTP
      setOtp("");

      // Call onLogin with session data
      const customerData = accessData.customers as any;
      onLogin({
        customerId: accessData.customer_id,
        customerName: customerData?.customer_name || "Customer",
        email: accessData.email,
        sessionToken,
        companyName: customerData?.companies?.company_name || "Company",
      });

      toast.success("Welcome back!");
    } catch (error: any) {
      toast.error("Login failed: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = () => {
    setOtp("");
    handleSendOtp({ preventDefault: () => {} } as React.FormEvent);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Customer Portal</CardTitle>
          <CardDescription>
            {step === "email" 
              ? "Enter your email to receive a login code" 
              : "Enter the 6-digit code sent to your email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Continue
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-sm text-center text-muted-foreground mt-2">
                  Code sent to {email}
                </p>
              </div>
              <div className="space-y-2">
                <Button 
                  onClick={handleVerifyOtp} 
                  className="w-full" 
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  Verify & Login
                </Button>
                <div className="flex justify-between text-sm">
                  <Button 
                    variant="link" 
                    className="p-0 h-auto" 
                    onClick={() => setStep("email")}
                  >
                    Change email
                  </Button>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto" 
                    onClick={handleResendOtp}
                    disabled={isLoading}
                  >
                    Resend code
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

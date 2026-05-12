import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Phone, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function TwoFactorEnroll() {
  const [step, setStep] = useState<'input' | 'verify' | 'success'>('input');
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const { hasMFAFactors, refreshMFAStatus } = useAuth();
  const { toast } = useToast();

  const handleEnroll = async () => {
    if (!phone) return;
    
    // Ensure 94 prefix
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "94" + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith("94")) {
      cleanPhone = "94" + cleanPhone;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'phone',
        phone: cleanPhone,
      });

      if (error) throw error;

      setFactorId(data.id);
      
      // Create initial challenge
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: data.id
      });
      
      if (challengeError) throw challengeError;
      
      setChallengeId(challenge.id);
      setStep('verify');
    } catch (err: any) {
      toast({
        title: "Enrollment Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!factorId || !challengeId || code.length < 6) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      });

      if (error) throw error;

      await refreshMFAStatus();
      setStep('success');
      toast({
        title: "Success",
        description: "SMS Two-Factor Authentication is now active.",
      });
    } catch (err: any) {
      toast({
        title: "Verification Failed",
        description: "The code you entered is incorrect. Please try again.",
        variant: "destructive",
      });
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleUnenroll = async () => {
    if (!window.confirm("Are you sure you want to disable 2FA? This will decrease your account security.")) return;
    
    setLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const factor of factors.all) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
      await refreshMFAStatus();
      setStep('input');
      toast({
        title: "2FA Disabled",
        description: "Two-Factor Authentication has been removed from your account.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (hasMFAFactors && step !== 'success') {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-500">
            <ShieldCheck className="w-5 h-5" />
            2FA is Enabled
          </CardTitle>
          <CardDescription>
            Your account is protected with SMS verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleUnenroll} disabled={loading} className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Disable SMS Authentication
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'success') {
    return (
      <Card className="border-green-500/20 bg-green-500/5 text-center py-6">
        <CardContent className="space-y-4 pt-6">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto text-green-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg">Identity Verified</h3>
            <p className="text-sm text-muted-foreground">Two-factor authentication is now active on your account.</p>
          </div>
          <Button variant="outline" onClick={() => setStep('input')} className="mt-2">
            View Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'verify') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verify Phone Number</CardTitle>
          <CardDescription>Enter the 6-digit code sent to your mobile device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={handleVerify}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleVerify} disabled={loading || code.length < 6} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Complete Setup
            </Button>
            <Button variant="ghost" onClick={() => setStep('input')} disabled={loading}>
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          SMS Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security by requiring a code sent to your phone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex gap-3 text-blue-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            Standard SMS rates may apply. Ensure your phone is always accessible as you'll need it every time you log in.
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="mfa-phone">Phone Number</Label>
          <div className="flex gap-2">
            <Input
              id="mfa-phone"
              placeholder="947..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
            <Button onClick={handleEnroll} disabled={loading || !phone}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Enable"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

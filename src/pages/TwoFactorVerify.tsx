import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { Loader2, ShieldCheck, ArrowLeft, Phone, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TwoFactorVerify() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const { user, mfaLevel, refreshMFAStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const initMFA = async () => {
      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (error || !factors.all.length) {
        navigate("/auth");
        return;
      }

      // Find the first verified phone factor
      const phoneFactor = factors.all.find(f => f.factor_type === 'phone' && f.status === 'verified');
      if (!phoneFactor) {
        navigate("/auth");
        return;
      }

      setFactorId(phoneFactor.id);
      createChallenge(phoneFactor.id);
    };

    if (mfaLevel === 'aal2') {
      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from);
    } else {
      initMFA();
    }
  }, [mfaLevel, navigate]);

  const createChallenge = async (fid: string) => {
    try {
      const { data, error } = await supabase.auth.mfa.challenge({ factorId: fid });
      if (error) throw error;
      setChallengeId(data.id);
    } catch (err: any) {
      toast({
        title: "Verification Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      toast({
        title: "Verified",
        description: "Secure login successful.",
      });
      
      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from);
    } catch (err: any) {
      toast({
        title: "Invalid Code",
        description: "The code you entered is incorrect or has expired.",
        variant: "destructive",
      });
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!factorId) return;
    setResending(true);
    try {
      await createChallenge(factorId);
      toast({
        title: "Code Resent",
        description: "A new security code has been sent to your phone.",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1f2e" }}>
      <div className="w-full max-w-[400px] px-6">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <ShieldCheck className="w-7 h-7 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Two-Step Verification</h1>
          <p className="text-sm px-4" style={{ color: "#8b9ab3" }}>
            We've sent a 6-digit security code to your registered mobile number.
          </p>
        </div>

        {/* Form */}
        <div
          className="rounded-2xl p-8 mb-6"
          style={{ background: "#242938", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex flex-col items-center space-y-8">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              disabled={loading}
              autoFocus
              onComplete={handleVerify}
            >
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={0} className="w-11 h-13 text-lg border-0 bg-[#2e3548] text-white rounded-xl focus:ring-1 focus:ring-amber-500/50" />
                <InputOTPSlot index={1} className="w-11 h-13 text-lg border-0 bg-[#2e3548] text-white rounded-xl focus:ring-1 focus:ring-amber-500/50" />
                <InputOTPSlot index={2} className="w-11 h-13 text-lg border-0 bg-[#2e3548] text-white rounded-xl focus:ring-1 focus:ring-amber-500/50" />
              </InputOTPGroup>
              <InputOTPSeparator className="text-amber-500/30 mx-1" />
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={3} className="w-11 h-13 text-lg border-0 bg-[#2e3548] text-white rounded-xl focus:ring-1 focus:ring-amber-500/50" />
                <InputOTPSlot index={4} className="w-11 h-13 text-lg border-0 bg-[#2e3548] text-white rounded-xl focus:ring-1 focus:ring-amber-500/50" />
                <InputOTPSlot index={5} className="w-11 h-13 text-lg border-0 bg-[#2e3548] text-white rounded-xl focus:ring-1 focus:ring-amber-500/50" />
              </InputOTPGroup>
            </InputOTP>

            <Button
              onClick={() => handleVerify()}
              disabled={loading || code.length < 6}
              className="w-full h-11 font-bold text-sm rounded-xl text-black transition-all
                         hover:opacity-90 active:scale-[0.98] shadow-lg"
              style={{ background: "#f59e0b", boxShadow: "0 4px 20px rgba(245,158,11,0.3)" }}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>
              ) : (
                "Verify & Continue"
              )}
            </Button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleResend}
            disabled={resending || loading}
            className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ color: "#f59e0b" }}
          >
            {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            Didn't receive a code? Resend
          </button>
          
          <button
            onClick={() => supabase.auth.signOut().then(() => navigate("/auth"))}
            className="flex items-center gap-2 text-xs font-medium opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: "#8b9ab3" }}
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Sign In
          </button>
        </div>

      </div>
    </div>
  );
}

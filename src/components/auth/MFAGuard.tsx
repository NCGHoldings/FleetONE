import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

interface MFAGuardProps {
  children: React.ReactNode;
}

export function MFAGuard({ children }: MFAGuardProps) {
  const { user, mfaFactors, aal, loading } = useAuth();
  const [mfaCode, setMfaCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  const hasMFAEnabled = mfaFactors && mfaFactors.length > 0;
  const isSecure = aal === "aal2";

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length !== 6) return;

    setIsVerifying(true);
    setError("");
    try {
      const factor = mfaFactors[0];
      if (!factor) throw new Error("No MFA factor found");

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factor.id
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challengeData.id,
        code: mfaCode
      });
      if (verifyError) throw verifyError;

      toast.success("Security verification successful");
      // The useAuth hook will automatically update AAL state
      window.location.reload(); // Hard reload to refresh all context/claims
    } catch (err: any) {
      setError(err.message || "Invalid verification code");
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) return null;

  // If user hasn't enabled MFA, we let them through (for now) 
  // OR you could force them to enable it here.
  if (!hasMFAEnabled || isSecure) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="w-full max-w-md border-amber-500/20 shadow-xl shadow-amber-500/5">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-amber-500" />
          </div>
          <CardTitle className="text-2xl">Step-up Security</CardTitle>
          <CardDescription>
            This area contains sensitive financial data. Please enter your 2FA code to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guard-mfa-code">Verification Code</Label>
              <Input
                id="guard-mfa-code"
                placeholder="000000"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
                className="text-center text-2xl tracking-[0.5em] font-mono h-12"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full h-11 font-bold bg-amber-500 hover:bg-amber-600 text-black"
              disabled={isVerifying || mfaCode.length !== 6}
            >
              {isVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Verify Identity
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

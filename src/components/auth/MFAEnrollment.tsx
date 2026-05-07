import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, ShieldAlert, Loader2, QrCode, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

export function MFAEnrollment() {
  const [loading, setLoading] = useState(false);
  const [factors, setFactors] = useState<any[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<{
    id: string;
    qr_code: string;
    uri: string;
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchFactors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setFactors(data.totp || []);
    } catch (error: any) {
      console.error("Error fetching MFA factors:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFactors();
  }, []);

  const startEnrollment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'FleetONE',
        friendlyName: `My Authenticator (${new Date().toLocaleDateString()})`
      });
      if (error) throw error;
      
      setEnrollmentData({
        id: data.id,
        qr_code: data.totp.qr_code,
        uri: data.totp.uri
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to start enrollment");
    } finally {
      setLoading(false);
    }
  };

  const verifyEnrollment = async () => {
    if (!enrollmentData || verifyCode.length !== 6) return;
    
    setIsVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollmentData.id
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollmentData.id,
        challengeId: challengeData.id,
        code: verifyCode
      });
      if (verifyError) throw verifyError;

      toast.success("2FA successfully enabled!");
      setEnrollmentData(null);
      setVerifyCode("");
      fetchFactors();
    } catch (error: any) {
      toast.error(error.message || "Invalid code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const unenroll = async (factorId: string) => {
    if (!confirm("Are you sure you want to disable 2FA? This will reduce your account security.")) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success("2FA has been disabled.");
      fetchFactors();
    } catch (error: any) {
      toast.error(error.message || "Failed to disable 2FA");
    } finally {
      setLoading(false);
    }
  };

  if (loading && factors.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-amber-500" />
          <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
        </div>
        <CardDescription>
          Add an extra layer of security to your account using an authenticator app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {factors.length > 0 ? (
          <div className="space-y-4">
            {factors.map((factor) => (
              <Alert key={factor.id} className="bg-green-500/10 border-green-500/20">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-500">2FA is Active</AlertTitle>
                <AlertDescription className="flex items-center justify-between mt-2">
                  <span className="text-sm opacity-80">{factor.friendly_name}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={() => unenroll(factor.id)}
                    disabled={loading}
                  >
                    Disable
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        ) : !enrollmentData ? (
          <div className="flex flex-col items-center text-center py-4">
            <QrCode className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <p className="text-sm text-muted-foreground mb-6">
              Protect your financial data by requiring a unique code from your phone whenever you log in.
            </p>
            <Button onClick={startEnrollment} disabled={loading}>
              Enable 2FA
            </Button>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white rounded-xl shadow-inner">
                <QRCodeSVG value={enrollmentData.uri} size={180} />
              </div>
              <p className="text-xs text-center text-muted-foreground max-w-[240px]">
                Scan this QR code with Google Authenticator, Authy, or any TOTP app.
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="mfa-code">Verification Code</Label>
              <div className="flex gap-2">
                <Input
                  id="mfa-code"
                  placeholder="000000"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center tracking-[0.5em] font-mono"
                  onKeyDown={(e) => e.key === 'Enter' && verifyEnrollment()}
                />
                <Button 
                  onClick={verifyEnrollment} 
                  disabled={isVerifying || verifyCode.length !== 6}
                >
                  {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                </Button>
              </div>
            </div>

            <Button variant="ghost" className="w-full text-xs" onClick={() => setEnrollmentData(null)}>
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

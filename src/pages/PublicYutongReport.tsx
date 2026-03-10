import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Loader2, BarChart3 } from 'lucide-react';
import { YutongExecutiveReport } from '@/components/yutong/report/YutongExecutiveReport';
import { YutongReportData } from '@/hooks/useYutongExecutiveReport';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function PublicYutongReport() {
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code') || '';
  const [code, setCode] = useState(codeFromUrl);
  const [reportData, setReportData] = useState<YutongReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const { toast } = useToast();

  const handleVerify = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('yutong-executive-report', {
        body: { access_code: code.trim() },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Access Denied', description: data.error, variant: 'destructive' });
        return;
      }
      setReportData(data);
      setVerified(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to fetch report', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify if code came from URL
  React.useEffect(() => {
    if (codeFromUrl && !verified) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (verified && reportData) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <YutongExecutiveReport data={reportData} isPublic={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Yutong Executive Report</CardTitle>
          <p className="text-sm text-muted-foreground">Enter your access code to view the report</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter access code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              className="pl-10"
              maxLength={20}
            />
          </div>
          <Button onClick={handleVerify} disabled={loading || !code.trim()} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? 'Verifying...' : 'View Report'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
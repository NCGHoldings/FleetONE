import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Share2, Copy, RefreshCw, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function SinotrukReportShareDialog() {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadCode = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'sinotruck_report_access_code')
      .maybeSingle();
    if (data?.setting_value) {
      setCode(typeof data.setting_value === 'string' ? data.setting_value : JSON.stringify(data.setting_value));
    }
  };

  useEffect(() => {
    loadCode();
  }, []);

  const generateCode = async () => {
    setLoading(true);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let newCode = '';
    for (let i = 0; i < 6; i++) newCode += chars[Math.floor(Math.random() * chars.length)];

    const { error } = await supabase
      .from('system_settings')
      .upsert({ setting_key: 'sinotruck_report_access_code', setting_value: newCode as any }, { onConflict: 'setting_key' });

    if (error) {
      toast({ title: 'Error', description: 'Failed to generate code', variant: 'destructive' });
    } else {
      setCode(newCode);
      toast({ title: 'Access code generated', description: `New code: ${newCode}` });
    }
    setLoading(false);
  };

  const shareUrl = `${window.location.origin}/public/sinotruck-report?code=${code}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Link copied!' });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Executive Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate an access code to share this report with anyone. They can view the live dashboard without logging in.
          </p>
          {code ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-lg p-3 text-center font-mono text-2xl tracking-widest font-bold">
                  {code}
                </div>
                <Button variant="outline" size="icon" onClick={generateCode} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Input value={shareUrl} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={generateCode} disabled={loading} className="w-full">
              {loading ? 'Generating...' : 'Generate Access Code'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

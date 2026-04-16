import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SinotrukSpreadsheetShareDialog({ open, onOpenChange }: Props) {
  const [accessCode, setAccessCode] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'sinotruck_spreadsheet_access_code')
        .single()
        .then(({ data }) => {
          if (data) {
            const val = typeof data.setting_value === 'string' ? data.setting_value : JSON.stringify(data.setting_value).replace(/"/g, '');
            setAccessCode(val);
          } else {
            setAccessCode('YTSHT2026');
          }
        });
    }
  }, [open]);

  const saveCode = async () => {
    const { error } = await supabase.from('system_settings').upsert({
      setting_key: 'sinotruck_spreadsheet_access_code',
      setting_value: accessCode,
    }, { onConflict: 'setting_key' });
    if (error) {
      toast({ title: 'Error', description: 'Failed to save access code', variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Access code updated' });
    }
  };

  const shareUrl = `${window.location.origin}/public/sinotruck-spreadsheet?code=${encodeURIComponent(accessCode)}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Spreadsheet</DialogTitle>
          <DialogDescription>Share a live spreadsheet link with authorized users</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Access Code</Label>
            <div className="flex gap-2">
              <Input value={accessCode} onChange={(e) => setAccessCode(e.target.value)} maxLength={20} />
              <Button variant="outline" size="sm" onClick={saveCode}>Save</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Shareable Link</Label>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="text-xs" />
              <Button variant="outline" size="icon" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Button className="w-full gap-2" onClick={() => window.open(shareUrl, '_blank')}>
            <ExternalLink className="h-4 w-4" /> Open in New Tab
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StaffSignatureSelector } from '@/components/special-hire/StaffSignatureSelector';
import { Save, PenTool, CheckCircle, Award } from 'lucide-react';

interface SignatureSetting {
  id: string;
  signature_role: 'prepared_by' | 'checked_by' | 'approved_by';
  default_user_id: string | null;
  is_enabled: boolean;
}

interface SignaturePreview {
  first_name: string;
  last_name: string;
  signature_data: string;
}

export const SpecialHireSignatureSettings = () => {
  const [settings, setSettings] = useState<SignatureSetting[]>([]);
  const [previews, setPreviews] = useState<Record<string, SignaturePreview>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('special_hire_signature_settings')
        .select('*')
        .order('signature_role');

      if (error) throw error;
      setSettings((data || []) as SignatureSetting[]);

      // Load signature previews for selected users
      if (data) {
        const userIds = data.map(s => s.default_user_id).filter(Boolean);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, signature_data')
            .in('user_id', userIds);

          if (profiles) {
            const previewMap: Record<string, SignaturePreview> = {};
            profiles.forEach(p => {
              previewMap[p.user_id] = {
                first_name: p.first_name || '',
                last_name: p.last_name || '',
                signature_data: p.signature_data || '',
              };
            });
            setPreviews(previewMap);
          }
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load signature settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (role: string, field: 'default_user_id' | 'is_enabled', value: any) => {
    setSettings(prev =>
      prev.map(s => (s.signature_role === role ? { ...s, [field]: value } : s))
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      for (const setting of settings) {
        const { error } = await supabase
          .from('special_hire_signature_settings')
          .update({
            default_user_id: setting.default_user_id,
            is_enabled: setting.is_enabled,
          })
          .eq('signature_role', setting.signature_role);

        if (error) throw error;
      }

      toast.success('Signature settings saved successfully!');
      await loadSettings(); // Reload to get fresh previews
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save signature settings');
    } finally {
      setSaving(false);
    }
  };

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'prepared_by':
        return {
          icon: PenTool,
          title: 'Prepared By (Operations)',
          description: 'Auto-adds when payment is confirmed and document created',
          color: 'text-blue-500',
        };
      case 'checked_by':
        return {
          icon: CheckCircle,
          title: 'Checked By (Finance)',
          description: 'Auto-adds when Finance approves payment',
          color: 'text-green-500',
        };
      case 'approved_by':
        return {
          icon: Award,
          title: 'Approved By (Management)',
          description: 'One-click approval button on documents',
          color: 'text-purple-500',
        };
      default:
        return {
          icon: PenTool,
          title: role,
          description: '',
          color: 'text-gray-500',
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading signature settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Special Hire Signature Automation</h2>
        <p className="text-muted-foreground">
          Configure default signers for automated document signatures. Signatures will be added automatically at each approval stage.
        </p>
      </div>

      <div className="grid gap-6">
        {settings.map((setting) => {
          const roleInfo = getRoleInfo(setting.signature_role);
          const Icon = roleInfo.icon;
          const preview = setting.default_user_id ? previews[setting.default_user_id] : null;

          return (
            <Card key={setting.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-6 w-6 ${roleInfo.color}`} />
                    <div>
                      <CardTitle>{roleInfo.title}</CardTitle>
                      <CardDescription>{roleInfo.description}</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={setting.is_enabled}
                    onCheckedChange={(checked) =>
                      updateSetting(setting.signature_role, 'is_enabled', checked)
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <StaffSignatureSelector
                  value={setting.default_user_id || undefined}
                  onChange={(userId) =>
                    updateSetting(setting.signature_role, 'default_user_id', userId)
                  }
                  label="Default Signer"
                  placeholder="Select staff member..."
                />

                {preview && preview.signature_data && (
                  <div className="space-y-2">
                    <Label>Signature Preview</Label>
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <img
                        src={preview.signature_data}
                        alt="Signature"
                        className="h-20 w-auto mx-auto"
                      />
                      <p className="text-center text-sm text-muted-foreground mt-2">
                        {preview.first_name} {preview.last_name}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

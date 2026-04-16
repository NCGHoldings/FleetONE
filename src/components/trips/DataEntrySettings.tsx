import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save } from 'lucide-react';

export const DataEntrySettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deadlineHours, setDeadlineHours] = useState('6');
  const [enforcementEnabled, setEnforcementEnabled] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('*')
      .in('setting_key', ['data_entry_deadline_hours', 'deadline_enforcement_enabled']);

    if (data) {
      const hours = data.find(s => s.setting_key === 'data_entry_deadline_hours');
      const enforcement = data.find(s => s.setting_key === 'deadline_enforcement_enabled');
      
      if (hours) setDeadlineHours(String(hours.setting_value));
      if (enforcement) setEnforcementEnabled(String(enforcement.setting_value) === 'true');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update deadline hours
      await supabase
        .from('system_settings')
        .update({
          setting_value: deadlineHours,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'data_entry_deadline_hours');

      // Update enforcement enabled
      await supabase
        .from('system_settings')
        .update({
          setting_value: enforcementEnabled ? 'true' : 'false',
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'deadline_enforcement_enabled');

      toast({
        title: "Settings Saved",
        description: "Data entry deadline settings have been updated."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle>Data Entry Deadline Settings</CardTitle>
        </div>
        <CardDescription>
          Configure when users must stop entering data for past dates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="enforcement">Enable Deadline Enforcement</Label>
            <Switch
              id="enforcement"
              checked={enforcementEnabled}
              onCheckedChange={setEnforcementEnabled}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            When enabled, users will need approval to enter data after the deadline
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deadline">Deadline Hours After Trip Date</Label>
          <Input
            id="deadline"
            type="number"
            min="1"
            max="72"
            value={deadlineHours}
            onChange={(e) => setDeadlineHours(e.target.value)}
            disabled={!enforcementEnabled}
          />
          <p className="text-sm text-muted-foreground">
            Users can enter data for up to {deadlineHours} hours after the trip date
          </p>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};
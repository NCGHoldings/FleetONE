import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Settings, Clock, FileText, Upload, Link2, QrCode, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const DataEntryControlWidget = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [deadlineHours, setDeadlineHours] = useState(6);
  const [enforcementEnabled, setEnforcementEnabled] = useState(true);
  const [pendingLateRequests, setPendingLateRequests] = useState(0);
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load settings
      const { data: settings } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['data_entry_deadline_hours', 'deadline_enforcement_enabled']);

      if (settings) {
        const hoursSettings = settings.find(s => s.setting_key === 'data_entry_deadline_hours');
        const enforcementSettings = settings.find(s => s.setting_key === 'deadline_enforcement_enabled');
        
        if (hoursSettings) setDeadlineHours(parseInt(String(hoursSettings.setting_value)));
        if (enforcementSettings) setEnforcementEnabled(String(enforcementSettings.setting_value) === 'true');
      }

      // Load pending counts
      const { count: lateCount } = await supabase
        .from('late_entry_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: submissionsCount } = await supabase
        .from('conductor_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setPendingLateRequests(lateCount || 0);
      setPendingSubmissions(submissionsCount || 0);
    } catch (error: any) {
      console.error('Error loading data entry control data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyUploadLink = () => {
    const link = `${window.location.origin}/public/conductor-upload`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied!",
      description: "Upload link copied to clipboard",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Data Entry Control Center
        </CardTitle>
        <CardDescription>
          Monitor and manage data entry deadlines and conductor submissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Settings */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Deadline</p>
            <p className="text-lg font-semibold">{deadlineHours} hours</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Enforcement</p>
            <div className="flex items-center gap-2 mt-1">
              {enforcementEnabled ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Enabled</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-600">Monitoring</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={() => navigate('/settings?tab=data-entry')}
            variant="outline"
            className="w-full justify-start"
          >
            <Settings className="mr-2 h-4 w-4" />
            Adjust Deadline Settings
          </Button>

          {/* Late Entry Requests */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Late Entry Requests</p>
                <p className="text-xs text-muted-foreground">Pending approval</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pendingLateRequests > 0 && (
                <Badge variant="destructive">{pendingLateRequests}</Badge>
              )}
              <Button
                onClick={() => navigate('/trips/late-entry-requests')}
                size="sm"
                variant="ghost"
              >
                Review
              </Button>
            </div>
          </div>

          {/* Conductor Submissions */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Conductor Submissions</p>
                <p className="text-xs text-muted-foreground">Awaiting review</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pendingSubmissions > 0 && (
                <Badge variant="secondary">{pendingSubmissions}</Badge>
              )}
              <Button
                onClick={() => navigate('/trips/conductor-submissions')}
                size="sm"
                variant="ghost"
              >
                Review
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Share */}
        <div className="pt-2 border-t space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Quick Actions</p>
          <div className="flex gap-2">
            <Button onClick={copyUploadLink} size="sm" variant="outline" className="flex-1">
              <Link2 className="mr-2 h-3 w-3" />
              Copy Link
            </Button>
            <Button
              onClick={() => navigate('/settings?tab=qr-codes')}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <QrCode className="mr-2 h-3 w-3" />
              QR Code
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

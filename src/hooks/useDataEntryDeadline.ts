import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { differenceInHours, addHours, format } from 'date-fns';

interface DeadlineStatus {
  canEnter: boolean;
  hoursExceeded: number;
  deadline: Date;
  deadlineHours: number;
  isEnforced: boolean;
}

interface LateEntryRequest {
  id: string;
  trip_date: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  created_at: string;
  reviewed_at?: string;
  review_notes?: string;
}

export const useDataEntryDeadline = () => {
  const { toast } = useToast();
  const [deadlineHours, setDeadlineHours] = useState(6);
  const [enforcementEnabled, setEnforcementEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['data_entry_deadline_hours', 'deadline_enforcement_enabled']);

      if (data) {
        const hoursSetting = data.find(s => s.setting_key === 'data_entry_deadline_hours');
        const enforcementSetting = data.find(s => s.setting_key === 'deadline_enforcement_enabled');
        
        if (hoursSetting) setDeadlineHours(parseInt(String(hoursSetting.setting_value)));
        
        // TEMPORARILY DISABLED: Hardcoding to false to allow old list data entry without impact
        setEnforcementEnabled(false);
        // if (enforcementSetting) setEnforcementEnabled(String(enforcementSetting.setting_value) === 'true');
      }
    };
    loadSettings();
  }, []);

  const checkDeadlineStatus = (tripDate: Date): DeadlineStatus => {
    const now = new Date();
    const deadline = addHours(tripDate, deadlineHours);
    const hoursExceeded = differenceInHours(now, deadline);

    return {
      canEnter: !enforcementEnabled || hoursExceeded < 0,
      hoursExceeded: Math.max(0, hoursExceeded),
      deadline,
      deadlineHours,
      isEnforced: enforcementEnabled
    };
  };

  const checkExistingRequest = async (tripDate: Date): Promise<LateEntryRequest | null> => {
    const { data } = await supabase
      .from('late_entry_requests')
      .select('*')
      .eq('trip_date', format(tripDate, 'yyyy-MM-dd'))
      .single();

    return data as LateEntryRequest | null;
  };

  const requestLateEntry = async (tripDate: Date, reason: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('late_entry_requests')
        .insert({
          trip_date: format(tripDate, 'yyyy-MM-dd'),
          requested_by: user.id,
          reason,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your late entry request has been submitted for approval."
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = async (requestId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('late_entry_requests')
        .delete()
        .eq('id', requestId)
        .eq('status', 'pending');

      if (error) throw error;

      toast({
        title: "Request Cancelled",
        description: "Your late entry request has been cancelled."
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    deadlineHours,
    enforcementEnabled,
    loading,
    checkDeadlineStatus,
    checkExistingRequest,
    requestLateEntry,
    cancelRequest
  };
};
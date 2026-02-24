import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PayrollSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface PayrollSettingsMap {
  working_days_per_month: number;
  overtime_multiplier: number;
  minimum_days_for_monthly: number;
  commission_payout_day: number;
  attendance_sync_frequency: string;
  auto_approve_commission_threshold: number;
}

const DEFAULT_SETTINGS: PayrollSettingsMap = {
  working_days_per_month: 26,
  overtime_multiplier: 1.5,
  minimum_days_for_monthly: 20,
  commission_payout_day: 5,
  attendance_sync_frequency: 'daily',
  auto_approve_commission_threshold: 1000,
};

export function usePayrollSettings() {
  const [settings, setSettings] = useState<PayrollSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payroll_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      setSettings((data || []) as PayrollSetting[]);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching payroll settings:', err);
      setError(err.message);
      toast.error('Failed to load payroll settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any, userId?: string) => {
    try {
      const { error } = await supabase
        .from('payroll_settings')
        .update({
          setting_value: { value },
          updated_at: new Date().toISOString(),
          updated_by: userId || null,
        })
        .eq('setting_key', key);

      if (error) throw error;
      toast.success('Setting updated successfully');
      await fetchSettings();
      return true;
    } catch (err: any) {
      console.error('Error updating setting:', err);
      toast.error(err.message || 'Failed to update setting');
      return false;
    }
  };

  const getSetting = (key: keyof PayrollSettingsMap): any => {
    const setting = settings.find(s => s.setting_key === key);
    if (setting?.setting_value?.value !== undefined) {
      return setting.setting_value.value;
    }
    return DEFAULT_SETTINGS[key];
  };

  const getSettingsMap = (): PayrollSettingsMap => {
    return {
      working_days_per_month: getSetting('working_days_per_month'),
      overtime_multiplier: getSetting('overtime_multiplier'),
      minimum_days_for_monthly: getSetting('minimum_days_for_monthly'),
      commission_payout_day: getSetting('commission_payout_day'),
      attendance_sync_frequency: getSetting('attendance_sync_frequency'),
      auto_approve_commission_threshold: getSetting('auto_approve_commission_threshold'),
    };
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSetting,
    getSetting,
    getSettingsMap,
  };
}

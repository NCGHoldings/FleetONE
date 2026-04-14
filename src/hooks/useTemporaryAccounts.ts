import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TemporaryAccount {
  id: string;
  account_code: string;
  generated_email: string;
  validity_hours: number;
  valid_until: string;
  status: 'active' | 'expired' | 'revoked';
  notes: string | null;
  last_login_at: string | null;
  login_count: number;
  created_at: string;
}

export function useTemporaryAccounts() {
  const [accounts, setAccounts] = useState<TemporaryAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('temporary_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts((data || []) as TemporaryAccount[]);
    } catch (error: any) {
      console.error('Error fetching temporary accounts:', error);
      toast.error('Failed to load temporary accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const createAccount = async (validityHours: number, notes?: string, role: string = 'staff') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('create-temporary-account', {
        body: { validityHours, notes, role },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Temporary account created successfully');
      fetchAccounts();
      return data.account;
    } catch (error: any) {
      console.error('Error creating temporary account:', error);
      toast.error(error.message || 'Failed to create temporary account');
      return null;
    }
  };

  const revokeAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('temporary_accounts')
        .update({ status: 'revoked' })
        .eq('id', accountId);

      if (error) throw error;
      toast.success('Account revoked');
      fetchAccounts();
    } catch (error: any) {
      console.error('Error revoking account:', error);
      toast.error('Failed to revoke account');
    }
  };

  const extendValidity = async (accountId: string, additionalHours: number) => {
    try {
      const account = accounts.find(a => a.id === accountId);
      if (!account) throw new Error('Account not found');

      const currentValidUntil = new Date(account.valid_until);
      const newValidUntil = new Date(currentValidUntil.getTime() + (additionalHours * 60 * 60 * 1000));

      const { error } = await supabase
        .from('temporary_accounts')
        .update({ 
          valid_until: newValidUntil.toISOString(),
          validity_hours: account.validity_hours + additionalHours,
          status: 'active' // Reactivate if was expired
        })
        .eq('id', accountId);

      if (error) throw error;
      toast.success(`Validity extended by ${additionalHours} hours`);
      fetchAccounts();
    } catch (error: any) {
      console.error('Error extending validity:', error);
      toast.error('Failed to extend validity');
    }
  };

  return {
    accounts,
    loading,
    fetchAccounts,
    createAccount,
    revokeAccount,
    extendValidity,
  };
}

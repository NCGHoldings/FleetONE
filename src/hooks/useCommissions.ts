import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type CommissionStatus = 'pending' | 'approved' | 'paid';

export interface StaffCommission {
  id: string;
  staff_id: string;
  trip_id: string | null;
  route_id: string | null;
  trip_date: string;
  route_revenue: number;
  target_amount: number;
  excess_revenue: number;
  commission_percent: number;
  commission_amount: number;
  status: CommissionStatus;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  staff_registry?: {
    staff_name: string;
    staff_type: string;
  };
  routes?: {
    route_name: string;
  };
}

export interface CommissionSummary {
  staff_id: string;
  staff_name: string;
  staff_type: string;
  total_commissions: number;
  pending_amount: number;
  approved_amount: number;
  paid_amount: number;
  commission_count: number;
}

export function useCommissions(dateRange?: { start: string; end: string }) {
  const [commissions, setCommissions] = useState<StaffCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommissions = async (start?: string, end?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('staff_commissions')
        .select(`
          *,
          staff_registry:staff_id (
            staff_name,
            staff_type
          ),
          routes:route_id (
            route_name
          )
        `)
        .order('trip_date', { ascending: false });

      if (start) query = query.gte('trip_date', start);
      if (end) query = query.lte('trip_date', end);

      const { data, error } = await query;

      if (error) throw error;
      setCommissions((data || []) as StaffCommission[]);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching commissions:', err);
      setError(err.message);
      toast.error('Failed to load commissions');
    } finally {
      setLoading(false);
    }
  };

  const approveCommission = async (id: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('staff_commissions')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Commission approved');
      await fetchCommissions(dateRange?.start, dateRange?.end);
      return true;
    } catch (err: any) {
      console.error('Error approving commission:', err);
      toast.error(err.message || 'Failed to approve commission');
      return false;
    }
  };

  const markAsPaid = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('staff_commissions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', ids);

      if (error) throw error;
      toast.success(`${ids.length} commission(s) marked as paid`);
      await fetchCommissions(dateRange?.start, dateRange?.end);
      return true;
    } catch (err: any) {
      console.error('Error marking commissions as paid:', err);
      toast.error(err.message || 'Failed to update commissions');
      return false;
    }
  };

  const bulkApprove = async (ids: string[], userId: string) => {
    try {
      const { error } = await supabase
        .from('staff_commissions')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', ids);

      if (error) throw error;
      toast.success(`${ids.length} commission(s) approved`);
      await fetchCommissions(dateRange?.start, dateRange?.end);
      return true;
    } catch (err: any) {
      console.error('Error bulk approving commissions:', err);
      toast.error(err.message || 'Failed to approve commissions');
      return false;
    }
  };

  const getCommissionSummary = (): CommissionSummary[] => {
    const summaryMap = new Map<string, CommissionSummary>();

    commissions.forEach(c => {
      const key = c.staff_id;
      const existing = summaryMap.get(key) || {
        staff_id: c.staff_id,
        staff_name: c.staff_registry?.staff_name || 'Unknown',
        staff_type: c.staff_registry?.staff_type || 'unknown',
        total_commissions: 0,
        pending_amount: 0,
        approved_amount: 0,
        paid_amount: 0,
        commission_count: 0,
      };

      existing.total_commissions += c.commission_amount;
      existing.commission_count += 1;

      if (c.status === 'pending') existing.pending_amount += c.commission_amount;
      if (c.status === 'approved') existing.approved_amount += c.commission_amount;
      if (c.status === 'paid') existing.paid_amount += c.commission_amount;

      summaryMap.set(key, existing);
    });

    return Array.from(summaryMap.values());
  };

  const triggerCalculation = async (date?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('calculate-commissions', {
        body: { date },
      });

      if (error) throw error;
      toast.success(data.message || 'Commissions calculated');
      await fetchCommissions(dateRange?.start, dateRange?.end);
      return data;
    } catch (err: any) {
      console.error('Error calculating commissions:', err);
      toast.error(err.message || 'Failed to calculate commissions');
      return null;
    }
  };

  useEffect(() => {
    fetchCommissions(dateRange?.start, dateRange?.end);
  }, [dateRange?.start, dateRange?.end]);

  return {
    commissions,
    loading,
    error,
    fetchCommissions,
    approveCommission,
    markAsPaid,
    bulkApprove,
    getCommissionSummary,
    triggerCalculation,
    pendingCommissions: commissions.filter(c => c.status === 'pending'),
    approvedCommissions: commissions.filter(c => c.status === 'approved'),
    paidCommissions: commissions.filter(c => c.status === 'paid'),
  };
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RouteTarget {
  id: string;
  route_id: string;
  revenue_target: number;
  driver_commission_percent: number;
  conductor_commission_percent: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  routes?: {
    route_name: string;
  } | null;
}

export interface RouteTargetFormData {
  route_id: string;
  revenue_target: number;
  driver_commission_percent: number;
  conductor_commission_percent: number;
  effective_from?: string;
  effective_to?: string | null;
  notes?: string;
  is_active?: boolean;
}

export function useRouteTargets() {
  const [targets, setTargets] = useState<RouteTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTargets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('route_targets')
        .select(`
          *,
          routes:route_id (
            route_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTargets((data || []) as RouteTarget[]);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching route targets:', err);
      setError(err.message);
      toast.error('Failed to load route targets');
    } finally {
      setLoading(false);
    }
  };

  const addTarget = async (data: RouteTargetFormData) => {
    try {
      const { error } = await supabase
        .from('route_targets')
        .insert({
          route_id: data.route_id,
          revenue_target: data.revenue_target,
          driver_commission_percent: data.driver_commission_percent,
          conductor_commission_percent: data.conductor_commission_percent,
          effective_from: data.effective_from || new Date().toISOString().split('T')[0],
          effective_to: data.effective_to || null,
          notes: data.notes || null,
          is_active: data.is_active ?? true,
        });

      if (error) throw error;
      toast.success('Route target added successfully');
      await fetchTargets();
      return true;
    } catch (err: any) {
      console.error('Error adding route target:', err);
      toast.error(err.message || 'Failed to add route target');
      return false;
    }
  };

  const updateTarget = async (id: string, data: Partial<RouteTargetFormData>) => {
    try {
      const { error } = await supabase
        .from('route_targets')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Route target updated successfully');
      await fetchTargets();
      return true;
    } catch (err: any) {
      console.error('Error updating route target:', err);
      toast.error(err.message || 'Failed to update route target');
      return false;
    }
  };

  const deleteTarget = async (id: string) => {
    try {
      const { error } = await supabase
        .from('route_targets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Route target deleted successfully');
      await fetchTargets();
      return true;
    } catch (err: any) {
      console.error('Error deleting route target:', err);
      toast.error(err.message || 'Failed to delete route target');
      return false;
    }
  };

  const getTargetForRoute = (routeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return targets.find(
      t => t.route_id === routeId && 
           t.is_active && 
           t.effective_from <= today &&
           (!t.effective_to || t.effective_to >= today)
    );
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  return {
    targets,
    loading,
    error,
    fetchTargets,
    addTarget,
    updateTarget,
    deleteTarget,
    getTargetForRoute,
    activeTargets: targets.filter(t => t.is_active),
  };
}

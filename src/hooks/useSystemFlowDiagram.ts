import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Node, Edge } from '@xyflow/react';

export interface FlowConfig {
  nodes: Node[];
  edges: Edge[];
}

export interface FlowDiagram {
  id: string;
  module_name: string;
  diagram_name: string;
  flow_config: FlowConfig;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModuleStats {
  tableName: string;
  total: number;
  pending?: number;
  approved?: number;
  rejected?: number;
  confirmed?: number;
  completed?: number;
  cancelled?: number;
  issues?: number;
}

export function useSystemFlowDiagram(moduleName: string) {
  const [diagram, setDiagram] = useState<FlowDiagram | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moduleStats, setModuleStats] = useState<Record<string, ModuleStats>>({});
  const { toast } = useToast();

  // Fetch diagram configuration
  const fetchDiagram = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_flow_diagrams')
        .select('*')
        .eq('module_name', moduleName)
        .eq('is_default', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Parse flow_config if it's a string - use safe parsing
        const safeParseJSON = <T,>(value: any, fallback: T): T => {
          if (value === null || value === undefined || value === '') return fallback;
          if (typeof value === 'object') return value as T;
          try { return JSON.parse(value); } 
          catch { return fallback; }
        };
        const flowConfig = safeParseJSON(data.flow_config, { nodes: [], edges: [] });
        
        setDiagram({
          ...data,
          flow_config: flowConfig as FlowConfig
        });
      }
    } catch (error) {
      console.error('Error fetching flow diagram:', error);
    } finally {
      setLoading(false);
    }
  }, [moduleName]);

  // Save diagram configuration
  const saveDiagram = useCallback(async (nodes: Node[], edges: Edge[]) => {
    try {
      setSaving(true);
      const flowConfig: FlowConfig = { nodes, edges };

      if (diagram?.id) {
        // Update existing
        const { error } = await supabase
          .from('system_flow_diagrams')
          .update({
            flow_config: flowConfig as any,
            updated_at: new Date().toISOString()
          })
          .eq('id', diagram.id);

        if (error) throw error;
      } else {
        // Create new
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('system_flow_diagrams')
          .insert({
            module_name: moduleName,
            diagram_name: 'Default',
            flow_config: flowConfig as any,
            is_default: true,
            created_by: userData.user?.id || null
          });

        if (error) throw error;
      }

      toast({
        title: 'Saved',
        description: 'Flow diagram saved successfully',
      });

      await fetchDiagram();
    } catch (error) {
      console.error('Error saving flow diagram:', error);
      toast({
        title: 'Error',
        description: 'Failed to save flow diagram',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [diagram, moduleName, toast, fetchDiagram]);

  // Fetch real-time stats for Special Hire module
  const fetchSpecialHireStats = useCallback(async () => {
    try {
      // Fetch quotations stats
      const { data: quotations } = await supabase
        .from('special_hire_quotations')
        .select('status, approval_status, trip_status');

      // Fetch payments stats
      const { data: payments } = await supabase
        .from('special_hire_payments')
        .select('status, payment_type');

      // Fetch submissions stats
      const { data: submissions } = await supabase
        .from('special_hire_submissions')
        .select('submission_status');

      const stats: Record<string, ModuleStats> = {
        submissions: {
          tableName: 'special_hire_submissions',
          total: submissions?.length || 0,
          pending: submissions?.filter(s => s.submission_status === 'pending').length || 0,
          approved: submissions?.filter(s => s.submission_status === 'converted').length || 0,
          rejected: submissions?.filter(s => s.submission_status === 'rejected').length || 0,
        },
        quotations: {
          tableName: 'special_hire_quotations',
          total: quotations?.length || 0,
          pending: quotations?.filter(q => q.status === 'pending').length || 0,
          confirmed: quotations?.filter(q => q.status === 'confirmed').length || 0,
          cancelled: quotations?.filter(q => q.status === 'cancelled').length || 0,
        },
        approvals: {
          tableName: 'special_hire_quotations',
          total: quotations?.length || 0,
          pending: quotations?.filter(q => q.approval_status === 'pending').length || 0,
          approved: quotations?.filter(q => q.approval_status === 'approved').length || 0,
          rejected: quotations?.filter(q => q.approval_status === 'rejected').length || 0,
        },
        trips: {
          tableName: 'special_hire_quotations',
          total: quotations?.filter(q => q.trip_status).length || 0,
          pending: quotations?.filter(q => q.trip_status === 'scheduled').length || 0,
          completed: quotations?.filter(q => q.trip_status === 'completed').length || 0,
          cancelled: quotations?.filter(q => q.trip_status === 'cancelled').length || 0,
        },
        payments: {
          tableName: 'special_hire_payments',
          total: payments?.length || 0,
          pending: payments?.filter(p => p.status === 'pending_finance' || p.status === 'pending_operations').length || 0,
          approved: payments?.filter(p => p.status === 'approved').length || 0,
          rejected: payments?.filter(p => p.status === 'rejected').length || 0,
        },
      };

      setModuleStats(stats);
    } catch (error) {
      console.error('Error fetching module stats:', error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchDiagram();
    if (moduleName === 'special_hire') {
      fetchSpecialHireStats();
    }
  }, [fetchDiagram, fetchSpecialHireStats, moduleName]);

  // Set up realtime subscription for stats
  useEffect(() => {
    if (moduleName !== 'special_hire') return;

    const channel = supabase
      .channel('special-hire-flow-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_hire_quotations' }, fetchSpecialHireStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_hire_payments' }, fetchSpecialHireStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_hire_submissions' }, fetchSpecialHireStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'special_hire_invoices' }, fetchSpecialHireStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [moduleName, fetchSpecialHireStats]);

  return {
    diagram,
    loading,
    saving,
    moduleStats,
    saveDiagram,
    refetchDiagram: fetchDiagram,
    refetchStats: fetchSpecialHireStats,
  };
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";

// ============ Asset Maintenance Teams ============
export const useMaintenanceTeams = () => {
  const { selectedCompanyId } = useCompany();
  
  return useQuery({
    queryKey: ["maintenance-teams", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("asset_maintenance_teams")
        .select("*")
        .eq("is_active", true)
        .order("team_name");
      
      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useCreateMaintenanceTeam = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (team: {
      team_name: string;
      team_code?: string;
      team_members?: string[];
      team_lead?: string;
    }) => {
      const { data, error } = await supabase
        .from("asset_maintenance_teams")
        .insert({
          ...team,
          company_id: selectedCompanyId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-teams"] });
      toast({ title: "Maintenance team created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create team", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateMaintenanceTeam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...team }: {
      id: string;
      team_name?: string;
      team_code?: string;
      team_members?: string[];
      team_lead?: string;
      is_active?: boolean;
    }) => {
      const { error } = await supabase
        .from("asset_maintenance_teams")
        .update({ ...team, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-teams"] });
      toast({ title: "Team updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update team", description: error.message, variant: "destructive" });
    },
  });
};

// ============ Asset Maintenance Logs ============
export const useAssetMaintenanceLogs = (status?: string, assetId?: string) => {
  const { selectedCompanyId } = useCompany();
  
  return useQuery({
    queryKey: ["asset-maintenance-logs", status, assetId, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("asset_maintenance_logs")
        .select(`
          *,
          fixed_assets (
            asset_code,
            asset_name,
            category_id,
            asset_categories (
              category_name
            )
          ),
          asset_maintenance_teams (
            team_name
          )
        `)
        .order("maintenance_date", { ascending: false });
      
      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }
      
      if (status) {
        query = query.eq("status", status);
      }
      
      if (assetId) {
        query = query.eq("asset_id", assetId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useUpcomingMaintenance = () => {
  const { selectedCompanyId } = useCompany();
  
  return useQuery({
    queryKey: ["upcoming-maintenance", selectedCompanyId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      
      let query = supabase
        .from("asset_maintenance_logs")
        .select(`
          *,
          fixed_assets (
            asset_code,
            asset_name
          ),
          asset_maintenance_teams (
            team_name
          )
        `)
        .gte("next_due_date", today)
        .lte("next_due_date", nextMonth)
        .in("status", ["scheduled", "in_progress"])
        .order("next_due_date");
      
      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useCreateMaintenanceLog = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (log: {
      asset_id: string;
      maintenance_number?: string;
      maintenance_type: "preventive" | "corrective" | "predictive" | "emergency";
      maintenance_date: string;
      next_due_date?: string;
      assigned_team_id?: string;
      assigned_to?: string;
      description?: string;
      cost?: number;
      priority?: "low" | "medium" | "high" | "critical";
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("asset_maintenance_logs")
        .insert({
          ...log,
          company_id: selectedCompanyId,
          status: "scheduled",
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-maintenance-logs"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-maintenance"] });
      toast({ title: "Maintenance scheduled" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to schedule maintenance", description: error.message, variant: "destructive" });
    },
  });
};

export const useStartMaintenance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await supabase
        .from("asset_maintenance_logs")
        .update({ 
          status: "in_progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", logId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-maintenance-logs"] });
      toast({ title: "Maintenance started" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to start maintenance", description: error.message, variant: "destructive" });
    },
  });
};

export const useCompleteMaintenance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      logId, 
      cost,
      completion_notes,
      next_due_date,
    }: { 
      logId: string;
      cost?: number;
      completion_notes?: string;
      next_due_date?: string;
    }) => {
      const { error } = await supabase
        .from("asset_maintenance_logs")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString(),
          cost,
          completion_notes,
          next_due_date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", logId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-maintenance-logs"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-maintenance"] });
      toast({ title: "Maintenance completed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to complete maintenance", description: error.message, variant: "destructive" });
    },
  });
};

export const useCancelMaintenance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ logId, reason }: { logId: string; reason?: string }) => {
      const { error } = await supabase
        .from("asset_maintenance_logs")
        .update({ 
          status: "cancelled",
          notes: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", logId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-maintenance-logs"] });
      toast({ title: "Maintenance cancelled" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel maintenance", description: error.message, variant: "destructive" });
    },
  });
};

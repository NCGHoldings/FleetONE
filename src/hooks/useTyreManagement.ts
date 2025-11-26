import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BusTyre {
  id: string;
  bus_id: string;
  tyre_serial_number?: string;
  tyre_brand: string;
  tyre_type?: string;
  tyre_size: string;
  position: string;
  purchase_date?: string;
  installation_date: string;
  purchase_cost: number;
  expected_lifespan_km: number;
  current_tread_depth_mm?: number;
  original_tread_depth_mm: number;
  status: string;
  km_at_installation: number;
  current_km: number;
  condition_percentage: number;
  last_rotation_date?: string;
  notes?: string;
  nsp_sale_reference_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TyreInspection {
  id: string;
  bus_id: string;
  tyre_id: string;
  inspection_date: string;
  inspector_id?: string;
  tread_depth_mm?: number;
  pressure_psi?: number;
  condition_status: string;
  wear_pattern?: string;
  damage_notes?: string;
  photos?: any;
  recommendation?: string;
  next_inspection_date?: string;
  created_at: string;
}

export interface TyreRotation {
  id: string;
  bus_id: string;
  rotation_date: string;
  performed_by?: string;
  rotation_type?: string;
  tyres_moved?: any;
  reason?: string;
  km_at_rotation?: number;
  notes?: string;
  created_at: string;
}

export const useTyreManagement = () => {
  const queryClient = useQueryClient();

  // Fetch all tyres
  const { data: tyres, isLoading: tyresLoading } = useQuery({
    queryKey: ["bus-tyres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bus_tyres")
        .select(`
          *,
          buses (bus_no, model, current_mileage)
        `)
        .order("bus_id", { ascending: true });

      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch tyres by bus
  const fetchTyresByBus = async (busId: string) => {
    const { data, error } = await supabase
      .from("bus_tyres")
      .select("*")
      .eq("bus_id", busId)
      .eq("status", "active")
      .order("position", { ascending: true });

    if (error) throw error;
    return data as BusTyre[];
  };

  // Fetch inspection history
  const { data: inspections } = useQuery({
    queryKey: ["tyre-inspections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tyre_inspection_records")
        .select(`
          *,
          buses (bus_no),
          profiles:inspector_id (first_name, last_name)
        `)
        .order("inspection_date", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  // Fetch rotation history
  const { data: rotations } = useQuery({
    queryKey: ["tyre-rotations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tyre_rotation_history")
        .select(`
          *,
          buses (bus_no),
          profiles:performed_by (first_name, last_name)
        `)
        .order("rotation_date", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  // Add new tyre
  const addTyreMutation = useMutation({
    mutationFn: async (tyre: any) => {
      const { data, error } = await supabase
        .from("bus_tyres")
        .insert([tyre])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bus-tyres"] });
      toast.success("Tyre added successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to add tyre: ${error.message}`);
    },
  });

  // Record inspection
  const addInspectionMutation = useMutation({
    mutationFn: async (inspection: any) => {
      const { data, error } = await supabase
        .from("tyre_inspection_records")
        .insert([inspection])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tyre-inspections"] });
      queryClient.invalidateQueries({ queryKey: ["bus-tyres"] });
      toast.success("Inspection recorded successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to record inspection: ${error.message}`);
    },
  });

  // Record rotation
  const addRotationMutation = useMutation({
    mutationFn: async (rotation: any) => {
      const { data, error } = await supabase
        .from("tyre_rotation_history")
        .insert([rotation])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tyre-rotations"] });
      queryClient.invalidateQueries({ queryKey: ["bus-tyres"] });
      toast.success("Rotation recorded successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to record rotation: ${error.message}`);
    },
  });

  // Update tyre
  const updateTyreMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BusTyre> }) => {
      const { data, error } = await supabase
        .from("bus_tyres")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bus-tyres"] });
      toast.success("Tyre updated successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to update tyre: ${error.message}`);
    },
  });

  // Delete tyre
  const deleteTyreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bus_tyres")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bus-tyres"] });
      toast.success("Tyre deleted successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete tyre: ${error.message}`);
    },
  });

  // Sync all tyre conditions manually
  const syncAllConditionsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("sync_all_tyre_conditions");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bus-tyres"] });
      toast.success("All tyre conditions synced successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to sync conditions: ${error.message}`);
    },
  });

  // Calculate overall stats
  const stats = tyres ? {
    totalTyres: tyres.length,
    activeTyres: tyres.filter(t => t.status === 'active').length,
    needingReplacement: tyres.filter(t => t.condition_percentage < 30).length,
    dueForRotation: tyres.filter(t => {
      const kmSinceRotation = t.current_km - (t.last_rotation_date ? parseInt(t.km_at_installation.toString()) : 0);
      return kmSinceRotation > 20000;
    }).length,
    averageCondition: tyres.length > 0 
      ? tyres.reduce((sum, t) => sum + parseFloat(t.condition_percentage.toString()), 0) / tyres.length 
      : 0,
  } : null;

  return {
    tyres,
    tyresLoading,
    inspections,
    rotations,
    stats,
    fetchTyresByBus,
    addTyre: addTyreMutation.mutate,
    addInspection: addInspectionMutation.mutate,
    addRotation: addRotationMutation.mutate,
    updateTyre: updateTyreMutation.mutate,
    deleteTyre: deleteTyreMutation.mutate,
    syncAllConditions: syncAllConditionsMutation.mutate,
    isSyncing: syncAllConditionsMutation.isPending,
  };
};

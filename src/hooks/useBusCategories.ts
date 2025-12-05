import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BusCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  display_order: number;
  is_active: boolean;
  bus_count?: number;
}

export interface BusSubCategory {
  id: string;
  category_id: string;
  code: string;
  name: string;
  description: string | null;
  color: string | null;
  display_order: number;
  is_active: boolean;
  bus_count?: number;
}

export interface BusRouteRule {
  id: string;
  route_pattern: string;
  category_id: string;
  sub_category_id: string | null;
  priority: number;
  is_active: boolean;
  matched_buses_count: number;
  category?: BusCategory;
  sub_category?: BusSubCategory;
}

export function useBusCategories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all categories with bus counts
  const { data: categories = [], isLoading: loadingCategories, refetch: refetchCategories } = useQuery({
    queryKey: ['bus-categories'],
    queryFn: async () => {
      const { data: cats, error } = await supabase
        .from('bus_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;

      // Get bus counts per category
      const { data: buses } = await supabase
        .from('buses')
        .select('category_id');

      const countMap: Record<string, number> = {};
      buses?.forEach(b => {
        if (b.category_id) {
          countMap[b.category_id] = (countMap[b.category_id] || 0) + 1;
        }
      });

      return (cats || []).map(cat => ({
        ...cat,
        bus_count: countMap[cat.id] || 0
      })) as BusCategory[];
    }
  });

  // Fetch sub-categories with bus counts
  const { data: subCategories = [], isLoading: loadingSubCategories } = useQuery({
    queryKey: ['bus-sub-categories'],
    queryFn: async () => {
      const { data: subs, error } = await supabase
        .from('bus_sub_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;

      // Get bus counts per sub-category
      const { data: buses } = await supabase
        .from('buses')
        .select('sub_category_id');

      const countMap: Record<string, number> = {};
      buses?.forEach(b => {
        if (b.sub_category_id) {
          countMap[b.sub_category_id] = (countMap[b.sub_category_id] || 0) + 1;
        }
      });

      return (subs || []).map(sub => ({
        ...sub,
        bus_count: countMap[sub.id] || 0
      })) as BusSubCategory[];
    }
  });

  // Fetch route rules
  const { data: routeRules = [], isLoading: loadingRules } = useQuery({
    queryKey: ['bus-route-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bus_category_route_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });
      
      if (error) throw error;
      return data as BusRouteRule[];
    }
  });

  // Get sub-categories for a specific category
  const getSubCategoriesForCategory = (categoryId: string) => {
    return subCategories.filter(sub => sub.category_id === categoryId);
  };

  // Get category badge info for a bus
  const getCategoryBadgeInfo = (categoryId?: string | null, subCategoryId?: string | null) => {
    const category = categories.find(c => c.id === categoryId);
    const subCategory = subCategories.find(s => s.id === subCategoryId);
    
    return {
      category,
      subCategory,
      displayName: category?.name || 'Uncategorized',
      fullName: subCategory ? `${category?.name} | ${subCategory.name}` : category?.name || 'Uncategorized',
      color: subCategory?.color || category?.color || '#6B7280',
      icon: category?.icon || 'bus'
    };
  };

  // Assign category to a bus
  const assignCategoryMutation = useMutation({
    mutationFn: async ({ busId, categoryId, subCategoryId }: { busId: string; categoryId: string; subCategoryId?: string | null }) => {
      const { error } = await supabase
        .from('buses')
        .update({
          category_id: categoryId,
          sub_category_id: subCategoryId || null,
          category_assignment_source: 'manual'
        })
        .eq('id', busId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bus-categories'] });
      queryClient.invalidateQueries({ queryKey: ['bus-sub-categories'] });
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
      toast({
        title: "Success",
        description: "Bus category updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Add new category
  const addCategoryMutation = useMutation({
    mutationFn: async (data: { code: string; name: string; description?: string; color?: string; icon?: string }) => {
      const { error } = await supabase
        .from('bus_categories')
        .insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bus-categories'] });
      toast({ title: "Success", description: "Category added successfully" });
    }
  });

  // Add new sub-category
  const addSubCategoryMutation = useMutation({
    mutationFn: async (data: { category_id: string; code: string; name: string; description?: string; color?: string }) => {
      const { error } = await supabase
        .from('bus_sub_categories')
        .insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bus-sub-categories'] });
      toast({ title: "Success", description: "Sub-category added successfully" });
    }
  });

  // Add new route rule
  const addRouteRuleMutation = useMutation({
    mutationFn: async (data: { route_pattern: string; category_id: string; sub_category_id?: string | null; priority?: number; is_active?: boolean }) => {
      const { error } = await supabase
        .from('bus_category_route_rules')
        .insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bus-route-rules'] });
      toast({ title: "Success", description: "Route rule added successfully" });
    }
  });

  // Delete route rule
  const deleteRouteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('bus_category_route_rules')
        .delete()
        .eq('id', ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bus-route-rules'] });
      toast({ title: "Success", description: "Route rule deleted" });
    }
  });

  // Re-run auto-assignment
  const rerunAutoAssignment = async () => {
    toast({ title: "Processing", description: "Re-running auto-assignment..." });
    
    // Get all buses
    const { data: buses } = await supabase.from('buses').select('id, bus_no, route');
    const { data: schoolRoutes } = await supabase.from('school_routes').select('bus_reg_no');
    const { data: dailyTrips } = await supabase.from('daily_trips').select('bus_id');
    
    const schoolBusNos = new Set(schoolRoutes?.map(sr => sr.bus_reg_no) || []);
    const tripBusIds = new Set(dailyTrips?.map(dt => dt.bus_id) || []);
    
    const publicBusCat = categories.find(c => c.code === 'public_bus');
    const schoolBusCat = categories.find(c => c.code === 'school_bus');
    const superLuxury = subCategories.find(s => s.code === 'super_luxury' && s.category_id === publicBusCat?.id);
    const semiLuxury = subCategories.find(s => s.code === 'semi_luxury' && s.category_id === publicBusCat?.id);

    let updated = 0;
    for (const bus of buses || []) {
      let categoryId = publicBusCat?.id;
      let subCategoryId = semiLuxury?.id;
      let source = 'default';

      // Check if school bus
      if (schoolBusNos.has(bus.bus_no)) {
        categoryId = schoolBusCat?.id;
        subCategoryId = null;
        source = 'auto_school_routes';
      }
      // Check if super luxury route
      else if (bus.route && (
        bus.route.toLowerCase().includes('jaffna') ||
        bus.route.toLowerCase().includes('badulla') ||
        bus.route.toLowerCase().includes('moratuwa') ||
        bus.route.toLowerCase().includes('makumbura')
      )) {
        categoryId = publicBusCat?.id;
        subCategoryId = superLuxury?.id;
        source = 'auto_route_pattern';
      }
      // Check if in daily trips
      else if (tripBusIds.has(bus.id)) {
        categoryId = publicBusCat?.id;
        subCategoryId = semiLuxury?.id;
        source = 'auto_daily_trips';
      }

      await supabase
        .from('buses')
        .update({
          category_id: categoryId,
          sub_category_id: subCategoryId,
          category_assignment_source: source
        })
        .eq('id', bus.id);
      
      updated++;
    }

    await refetchCategories();
    queryClient.invalidateQueries({ queryKey: ['fleet'] });
    
    toast({
      title: "Auto-Assignment Complete",
      description: `Updated ${updated} buses based on route patterns and usage.`
    });
  };

  return {
    categories,
    subCategories,
    routeRules,
    loadingCategories,
    loadingSubCategories,
    loadingRules,
    getSubCategoriesForCategory,
    getCategoryBadgeInfo,
    assignCategory: assignCategoryMutation.mutate,
    addCategory: addCategoryMutation.mutate,
    addSubCategory: addSubCategoryMutation.mutate,
    addRouteRule: addRouteRuleMutation.mutate,
    deleteRouteRule: deleteRouteRuleMutation.mutate,
    rerunAutoAssignment
  };
}

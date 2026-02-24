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

export interface BusInCategory {
  id: string;
  bus_no: string;
  model: string;
  status: string;
  category_assignment_source: string | null;
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
  const { data: subCategories = [], isLoading: loadingSubCategories, refetch: refetchSubCategories } = useQuery({
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
  const { data: routeRules = [], isLoading: loadingRules, refetch: refetchRules } = useQuery({
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

  // Get buses for a category
  const getBusesForCategory = async (categoryId: string): Promise<BusInCategory[]> => {
    const { data, error } = await supabase
      .from('buses')
      .select('id, bus_no, model, status, category_assignment_source')
      .eq('category_id', categoryId)
      .order('bus_no');
    
    if (error) throw error;
    return (data || []) as BusInCategory[];
  };

  // Get buses for a sub-category
  const getBusesForSubCategory = async (subCategoryId: string): Promise<BusInCategory[]> => {
    const { data, error } = await supabase
      .from('buses')
      .select('id, bus_no, model, status, category_assignment_source')
      .eq('sub_category_id', subCategoryId)
      .order('bus_no');
    
    if (error) throw error;
    return (data || []) as BusInCategory[];
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

  // Update category
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BusCategory> }) => {
      const { error } = await supabase
        .from('bus_categories')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bus-categories'] });
      toast({ title: "Success", description: "Category updated successfully" });
    }
  });

  // Delete category
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      // First, unassign buses from this category
      await supabase
        .from('buses')
        .update({ category_id: null, sub_category_id: null })
        .eq('category_id', id);
      
      // Delete sub-categories
      await supabase
        .from('bus_sub_categories')
        .delete()
        .eq('category_id', id);
      
      // Delete route rules
      await supabase
        .from('bus_category_route_rules')
        .delete()
        .eq('category_id', id);
      
      const { error } = await supabase
        .from('bus_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bus-categories'] });
      queryClient.invalidateQueries({ queryKey: ['bus-sub-categories'] });
      queryClient.invalidateQueries({ queryKey: ['bus-route-rules'] });
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
      toast({ title: "Success", description: "Category deleted successfully" });
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

  // Update sub-category
  const updateSubCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BusSubCategory> }) => {
      const { error } = await supabase
        .from('bus_sub_categories')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bus-sub-categories'] });
      toast({ title: "Success", description: "Sub-category updated successfully" });
    }
  });

  // Delete sub-category
  const deleteSubCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      // Unassign buses from this sub-category
      await supabase
        .from('buses')
        .update({ sub_category_id: null })
        .eq('sub_category_id', id);
      
      // Delete route rules using this sub-category
      await supabase
        .from('bus_category_route_rules')
        .delete()
        .eq('sub_category_id', id);
      
      const { error } = await supabase
        .from('bus_sub_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bus-sub-categories'] });
      queryClient.invalidateQueries({ queryKey: ['bus-route-rules'] });
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
      toast({ title: "Success", description: "Sub-category deleted successfully" });
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

  // Update route rule
  const updateRouteRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BusRouteRule> }) => {
      const { error } = await supabase
        .from('bus_category_route_rules')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bus-route-rules'] });
      toast({ title: "Success", description: "Route rule updated successfully" });
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

  // Re-run auto-assignment - FIXED to use daily_trips + routes
  const rerunAutoAssignment = async () => {
    toast({ title: "Processing", description: "Re-running auto-assignment from actual trip data..." });
    
    // Get all buses
    const { data: buses } = await supabase.from('buses').select('id, bus_no');
    
    // Get school routes to identify school buses
    const { data: schoolRoutes } = await supabase.from('school_routes').select('bus_reg_no');
    const schoolBusNos = new Set(schoolRoutes?.map(sr => sr.bus_reg_no?.toUpperCase().replace(/\s+/g, '')) || []);
    
    // Get all daily trips with routes to find actual route assignments
    const { data: tripData } = await supabase
      .from('daily_trips')
      .select(`
        bus_id,
        routes:route_id (
          id,
          route_name
        )
      `);
    
    // Build a map of bus_id -> route names from actual trip data
    const busRouteMap: Record<string, Set<string>> = {};
    tripData?.forEach(trip => {
      if (trip.bus_id && trip.routes) {
        if (!busRouteMap[trip.bus_id]) {
          busRouteMap[trip.bus_id] = new Set();
        }
        const routeData = trip.routes as { id: string; route_name: string } | null;
        if (routeData?.route_name) {
          busRouteMap[trip.bus_id].add(routeData.route_name.toLowerCase());
        }
      }
    });
    
    // Get active route rules
    const { data: activeRules } = await supabase
      .from('bus_category_route_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });
    
    const publicBusCat = categories.find(c => c.code === 'public_bus');
    const schoolBusCat = categories.find(c => c.code === 'school_bus');
    const superLuxury = subCategories.find(s => s.code === 'super_luxury' && s.category_id === publicBusCat?.id);
    const semiLuxury = subCategories.find(s => s.code === 'semi_luxury' && s.category_id === publicBusCat?.id);

    // Track match counts for route rules
    const ruleMatchCounts: Record<string, number> = {};
    (activeRules || []).forEach(rule => {
      ruleMatchCounts[rule.id] = 0;
    });

    let updated = 0;
    for (const bus of buses || []) {
      let categoryId = publicBusCat?.id;
      let subCategoryId = semiLuxury?.id;
      let source = 'default';

      const busNoNormalized = bus.bus_no?.toUpperCase().replace(/\s+/g, '') || '';
      
      // Check if school bus
      if (schoolBusNos.has(busNoNormalized)) {
        categoryId = schoolBusCat?.id;
        subCategoryId = null;
        source = 'auto_school_routes';
      } else {
        // Get routes this bus has actually run from daily_trips
        const busRoutes = busRouteMap[bus.id];
        
        if (busRoutes && busRoutes.size > 0) {
          // Check route rules against actual trip routes
          for (const rule of activeRules || []) {
            // Convert SQL LIKE pattern to regex
            const pattern = rule.route_pattern
              .toLowerCase()
              .replace(/%/g, '.*')
              .replace(/_/g, '.');
            const regex = new RegExp(pattern, 'i');
            
            // Check if any of the bus's actual routes match this rule
            const hasMatch = Array.from(busRoutes).some(route => regex.test(route));
            
            if (hasMatch) {
              categoryId = rule.category_id;
              subCategoryId = rule.sub_category_id;
              source = 'auto_route_rule';
              ruleMatchCounts[rule.id] = (ruleMatchCounts[rule.id] || 0) + 1;
              break; // Use first matching rule (highest priority)
            }
          }
          
          // If no rule matched but has trips, mark as public bus
          if (source === 'default') {
            categoryId = publicBusCat?.id;
            subCategoryId = semiLuxury?.id;
            source = 'auto_daily_trips';
          }
        }
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

    // Update matched_buses_count for each route rule
    for (const [ruleId, count] of Object.entries(ruleMatchCounts)) {
      await supabase
        .from('bus_category_route_rules')
        .update({ matched_buses_count: count })
        .eq('id', ruleId);
    }

    await refetchCategories();
    await refetchSubCategories();
    await refetchRules();
    queryClient.invalidateQueries({ queryKey: ['fleet'] });
    
    toast({
      title: "Auto-Assignment Complete",
      description: `Updated ${updated} buses based on actual trip data and route patterns.`
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
    getBusesForCategory,
    getBusesForSubCategory,
    assignCategory: assignCategoryMutation.mutate,
    addCategory: addCategoryMutation.mutate,
    updateCategory: updateCategoryMutation.mutate,
    deleteCategory: deleteCategoryMutation.mutate,
    addSubCategory: addSubCategoryMutation.mutate,
    updateSubCategory: updateSubCategoryMutation.mutate,
    deleteSubCategory: deleteSubCategoryMutation.mutate,
    addRouteRule: addRouteRuleMutation.mutate,
    updateRouteRule: updateRouteRuleMutation.mutate,
    deleteRouteRule: deleteRouteRuleMutation.mutate,
    rerunAutoAssignment
  };
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface CompanyAccess {
  id: string;
  user_id: string;
  company_id: string;
  can_edit: boolean | null;
  created_at: string;
}

interface UseCompanyAccessOptions {
  userId?: string;
}

export function useCompanyAccess(options: UseCompanyAccessOptions = {}) {
  const { userId } = options;
  const queryClient = useQueryClient();
  const [localPermissions, setLocalPermissions] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  // Fetch user's company access
  const { data: accessRecords = [], isLoading, refetch } = useQuery({
    queryKey: ["user-company-access", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_company_access")
        .select("*")
        .eq("user_id", userId);
      
      if (error) {
        console.error("Error fetching company access:", error);
        throw error;
      }
      
      return (data || []) as CompanyAccess[];
    },
    enabled: !!userId,
  });

  // Initialize local permissions from fetched data
  useEffect(() => {
    if (accessRecords.length > 0) {
      setLocalPermissions(new Set(accessRecords.map(r => r.company_id)));
      setIsDirty(false);
    } else if (userId) {
      setLocalPermissions(new Set());
      setIsDirty(false);
    }
  }, [accessRecords, userId]);

  // Check if user has access to a specific company
  const hasAccess = useCallback((companyId: string): boolean => {
    return localPermissions.has(companyId);
  }, [localPermissions]);

  // Set access for a single company
  const setAccess = useCallback((companyId: string, hasAccess: boolean) => {
    setLocalPermissions(prev => {
      const next = new Set(prev);
      if (hasAccess) {
        next.add(companyId);
      } else {
        next.delete(companyId);
      }
      return next;
    });
    setIsDirty(true);
  }, []);

  // Bulk set access for multiple companies
  const bulkSetAccess = useCallback((companyIds: string[], hasAccess: boolean) => {
    setLocalPermissions(prev => {
      const next = new Set(prev);
      companyIds.forEach(id => {
        if (hasAccess) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
    setIsDirty(true);
  }, []);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ userId, companyIds }: { userId: string; companyIds: string[] }) => {
      // First, delete all existing access for this user
      const { error: deleteError } = await supabase
        .from("user_company_access")
        .delete()
        .eq("user_id", userId);
      
      if (deleteError) {
        throw deleteError;
      }

      // Then insert new access records
      if (companyIds.length > 0) {
        const records = companyIds.map(companyId => ({
          user_id: userId,
          company_id: companyId,
          can_edit: true,
        }));

        const { error: insertError } = await supabase
          .from("user_company_access")
          .insert(records);
        
        if (insertError) {
          throw insertError;
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-company-access"] });
      setIsDirty(false);
    },
  });

  // Save permissions
  const savePermissions = useCallback(async () => {
    if (!userId) {
      return { error: "No user ID provided" };
    }

    try {
      await saveMutation.mutateAsync({
        userId,
        companyIds: Array.from(localPermissions),
      });
      return { success: true };
    } catch (error: any) {
      console.error("Error saving company access:", error);
      return { error: error.message || "Failed to save permissions" };
    }
  }, [userId, localPermissions, saveMutation]);

  // Get all company IDs a user has access to
  const getAllowedCompanyIds = useCallback((): string[] => {
    return Array.from(localPermissions);
  }, [localPermissions]);

  return {
    accessRecords,
    isLoading,
    hasAccess,
    setAccess,
    bulkSetAccess,
    savePermissions,
    isSaving: saveMutation.isPending,
    isDirty,
    getAllowedCompanyIds,
    refetch,
    localPermissions,
  };
}

// Hook for fetching current user's company access (for filtering in CompanyContext)
export function useCurrentUserCompanyAccess() {
  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 1000 * 60 * 5,
  });

  const userId = session?.user?.id;

  const { data: accessRecords = [], isLoading } = useQuery({
    queryKey: ["current-user-company-access", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_company_access")
        .select("company_id")
        .eq("user_id", userId);
      
      if (error) {
        console.error("Error fetching current user company access:", error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!userId,
  });

  // Also fetch user roles to determine if they should see all companies
  const { data: userRoles = [] } = useQuery({
    queryKey: ["current-user-roles", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      if (error) {
        console.error("Error fetching user roles:", error);
        return [];
      }
      
      return data?.map(r => r.role) || [];
    },
    enabled: !!userId,
  });

  const allowedCompanyIds = accessRecords.map(r => r.company_id);
  const hasExplicitAccess = accessRecords.length > 0;
  
  // Management roles that see all companies by default when no explicit permissions set
  const isManagementRole = userRoles.some(role => 
    ['super_admin', 'admin', 'finance'].includes(role)
  );

  return {
    allowedCompanyIds,
    hasExplicitAccess,
    isManagementRole,
    isLoading,
    userId,
  };
}

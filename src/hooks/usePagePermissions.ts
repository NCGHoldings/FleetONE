import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PageItem } from "@/lib/pages";
import { useAuth } from "./useAuth";

export type PermissionMap = Record<string, boolean>; // pageId -> has_access

export function usePagePermissions(targetUserId?: string) {
  const { hasRole, user } = useAuth();
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isSuperAdmin = hasRole('super_admin');
  
  // Use targetUserId if provided, otherwise use current user's ID
  const effectiveUserId = targetUserId ?? user?.id;
  const isCheckingOwnAccess = !targetUserId;

  const fetchPermissions = useCallback(async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("user_page_permissions")
      .select("page_identifier, has_access")
      .eq("user_id", effectiveUserId);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const map: PermissionMap = {};
    (data || []).forEach((row: any) => {
      map[row.page_identifier] = row.has_access;
    });
    setPermissions(map);
    setLoading(false);
  }, [effectiveUserId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasAccess = useCallback(
    (pageId: string) => {
      const value = permissions[pageId];
      
      // If explicit permission exists in database, always use it
      // This allows denying access even to super_admins
      if (value !== undefined) {
        return value;
      }
      
      // No explicit permission set - apply role-based defaults
      
      // Super admins get default access when no explicit permission
      if (isSuperAdmin && isCheckingOwnAccess) {
        return true;
      }
      
      // Management roles get default access when no explicit permission set
      const hasManagementRole = hasRole('admin') || hasRole('supervisor') || hasRole('finance');
      if (hasManagementRole && isCheckingOwnAccess) {
        return true;
      }
      
      // Zero-Trust: Deny by default for other roles
      return false;
    },
    [permissions, isSuperAdmin, isCheckingOwnAccess, hasRole]
  );

  const setAccess = useCallback((pageId: string, value: boolean) => {
    setPermissions((prev) => ({ ...prev, [pageId]: value }));
  }, []);

  const bulkSetAccess = useCallback((items: PageItem[], value: boolean) => {
    setPermissions((prev) => {
      const next = { ...prev };
      items.forEach((p) => { next[p.id] = value; });
      return next;
    });
  }, []);

  const savePermissions = useCallback(async (grantedByUserId?: string) => {
    if (!targetUserId) return { error: "No target user" } as const;

    const rows = Object.entries(permissions).map(([page_identifier, has_access]) => ({
      user_id: targetUserId,
      page_identifier,
      has_access,
      granted_by: grantedByUserId,
    }));

    const { error } = await supabase
      .from("user_page_permissions")
      .upsert(rows, { onConflict: "user_id,page_identifier" });

    if (error) return { error: error.message } as const;
    return { success: true } as const;
  }, [permissions, targetUserId]);

  return {
    permissions,
    loading,
    error,
    hasAccess,
    setAccess,
    bulkSetAccess,
    savePermissions,
    refetch: fetchPermissions,
  };
}

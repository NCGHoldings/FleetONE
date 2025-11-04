import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PageItem } from "@/lib/pages";
import { useAuth } from "./useAuth";

export type PermissionMap = Record<string, boolean>; // pageId -> has_access

export function usePagePermissions(targetUserId?: string) {
  const { hasRole } = useAuth();
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isSuperAdmin = hasRole('super_admin');

  const fetchPermissions = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("user_page_permissions")
      .select("page_identifier, has_access")
      .eq("user_id", targetUserId);

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
  }, [targetUserId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasAccess = useCallback(
    (pageId: string) => {
      // Super admins bypass all page restrictions when checking their own access
      if (isSuperAdmin && !targetUserId) {
        return true;
      }
      
      // TEMPORARY: Allow all users to access trips_analytics until permissions are properly set
      if (pageId === "trips_analytics") {
        return true;
      }
      
      // Zero-Trust: Deny by default if no explicit permission set
      const value = permissions[pageId];
      return value === undefined ? false : !!value;
    },
    [permissions, isSuperAdmin, targetUserId]
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

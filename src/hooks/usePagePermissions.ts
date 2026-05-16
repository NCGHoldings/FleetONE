import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PageItem } from "@/lib/pages";
import { ALL_PAGES_FLAT } from "@/lib/pages";
import { useAuth } from "./useAuth";

export type PermissionMap = Record<string, boolean>; // pageId -> has_access

export function usePagePermissions(targetUserId?: string) {
  const { hasRole, user, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isSuperAdmin = hasRole('super_admin');
  
  // Use targetUserId if provided, otherwise use current user's ID
  const effectiveUserId = targetUserId ?? user?.id;
  const isCheckingOwnAccess = !targetUserId;

  // The overall loading state should be true if auth is loading OR we are fetching permissions
  const loading = authLoading || fetching;

  const fetchPermissions = useCallback(async () => {
    if (!effectiveUserId) return;
    setFetching(true);
    setError(null);
    
    const CACHE_KEY_PERMISSIONS = `ncg_permissions_cache_${effectiveUserId}`;
    
    // 1. Try to load from cache first for immediate offline support
    try {
      const cached = localStorage.getItem(CACHE_KEY_PERMISSIONS);
      if (cached) {
        setPermissions(JSON.parse(cached));
      }
    } catch (cacheErr) {
      console.warn("Permissions cache read error", cacheErr);
    }

    try {
      // 5-second timeout to prevent infinite "Verifying access..." loading state
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Permissions fetch timeout - Network might be unreachable")), 30000);
      });

      const fetchPromise = supabase
        .from("user_page_permissions")
        .select("page_identifier, has_access")
        .eq("user_id", effectiveUserId);

      const response = await Promise.race([fetchPromise, timeoutPromise]) as any;
      const { data, error } = response;

      if (error) {
        setError(error.message);
        setFetching(false);
        return;
      }

      // Initialize ALL pages with false (no access) by default
      const map: PermissionMap = {};
      ALL_PAGES_FLAT.forEach((page) => {
        map[page.id] = false;
      });
      
      // Override with actual permissions from database
      (data || []).forEach((row: any) => {
        map[row.page_identifier] = row.has_access;
      });
      
      setPermissions(map);
      localStorage.setItem(CACHE_KEY_PERMISSIONS, JSON.stringify(map));
    } catch (e: any) {
      console.warn("[Permissions] Fetch failed or timed out. Retaining cached permissions.", e.message);
      setError(e.message);
    } finally {
      setFetching(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasAccess = useCallback(
    (pageId: string) => {
      const value = permissions[pageId];
      
      // If explicit permission exists, use it
      if (value !== undefined) {
        return value;
      }
      
      // No permission entry - only super_admin gets default access
      if (isSuperAdmin && isCheckingOwnAccess) {
        return true;
      }
      
      // Zero-Trust: Deny by default for everyone else
      return false;
    },
    [permissions, isSuperAdmin, isCheckingOwnAccess]
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

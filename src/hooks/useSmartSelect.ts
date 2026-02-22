import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { detectEmptyDropdown } from '@/lib/autoIssueDetector';
import { ALL_PAGES_FLAT } from '@/lib/pages';

/**
 * Hook to automatically detect and report empty dropdowns.
 * 
 * Usage:
 * ```tsx
 * const { data: categories } = useQuery({ ... });
 * useSmartSelect({
 *   fieldName: 'Category',
 *   data: categories,
 *   hasCreateOption: false, // set to true if there's a "Create New" button
 *   tableName: 'asset_categories', // optional: the Supabase table name
 * });
 * ```
 * 
 * If `data` is empty/null and `hasCreateOption` is false,
 * it automatically logs an issue to the system_issues table.
 */
export function useSmartSelect(params: {
  fieldName: string;
  data: any[] | null | undefined;
  hasCreateOption?: boolean;
  tableName?: string;
  enabled?: boolean;
}) {
  const { fieldName, data, hasCreateOption = false, tableName, enabled = true } = params;
  const location = useLocation();
  const hasReported = useRef(false);

  useEffect(() => {
    // Only check once data has been fetched (not loading state)
    if (!enabled) return;
    if (data === undefined) return; // Still loading, skip
    if (hasReported.current) return; // Already reported this session

    // If data is null or empty array AND no create option
    if ((!data || data.length === 0) && !hasCreateOption) {
      hasReported.current = true;
      const pageName = ALL_PAGES_FLAT.find(p => p.url === location.pathname)?.title || location.pathname;
      
      detectEmptyDropdown({
        fieldName,
        data,
        hasCreateOption,
        pageUrl: location.pathname,
        pageName,
        tableName,
      });
    }
  }, [data, fieldName, hasCreateOption, tableName, enabled, location.pathname]);
}

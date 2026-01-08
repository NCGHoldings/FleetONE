import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import type { GovernanceOccurrence } from '@/hooks/useGovernanceOccurrences';

interface Holiday {
  holiday_date: string;
  holiday_name: string;
  type: string;
  is_mercantile: boolean;
}

interface UseGovernanceOccurrencesRangeParams {
  startDate: Date;
  endDate: Date;
  companyIds?: string[];
  sbuIds?: string[];
  types?: string[];
  categories?: string[];
  statuses?: string[];
  enabled?: boolean;
}

export const useGovernanceOccurrencesRange = ({
  startDate,
  endDate,
  companyIds = [],
  sbuIds = [],
  types = [],
  categories = [],
  statuses = [],
  enabled = true,
}: UseGovernanceOccurrencesRangeParams) => {
  const start = format(startOfMonth(startDate), 'yyyy-MM-dd');
  const end = format(endOfMonth(endDate), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['governance-occurrences-range', start, end, companyIds, sbuIds, types, categories, statuses],
    queryFn: async () => {
      const query = supabase
        .from('governance_occurrences')
        .select(`
          *,
          governance_item:governance_items!item_id (
            id,
            title,
            type,
            category,
            company_id,
            sbu_id,
            owner_name,
            owner_email,
            companies (
              id,
              name
            ),
            sbus (
              id,
              name
            )
          )
        `)
        .gte('scheduled_date', start)
        .lte('scheduled_date', end)
        .order('scheduled_date', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      if (companyIds.length > 0) {
        filteredData = filteredData.filter(item => 
          item.governance_item && companyIds.includes(item.governance_item.company_id)
        );
      }

      if (sbuIds.length > 0) {
        filteredData = filteredData.filter(item => 
          item.governance_item?.sbu_id && sbuIds.includes(item.governance_item.sbu_id)
        );
      }

      if (types.length > 0) {
        filteredData = filteredData.filter(item => 
          item.governance_item && types.includes(item.governance_item.type)
        );
      }

      if (categories.length > 0) {
        filteredData = filteredData.filter(item => 
          item.governance_item && categories.includes(item.governance_item.category)
        );
      }

      if (statuses.length > 0) {
        filteredData = filteredData.filter(item => 
          statuses.includes(item.status)
        );
      }

      return filteredData as unknown as GovernanceOccurrence[];
    },
    enabled,
  });
};

export const useHolidaysRange = (startDate: Date, endDate: Date, enabled = true) => {
  const start = format(startOfMonth(startDate), 'yyyy-MM-dd');
  const end = format(endOfMonth(endDate), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['holidays-range', start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holidays')
        .select('holiday_date, holiday_name, type, is_mercantile')
        .gte('holiday_date', start)
        .lte('holiday_date', end);
      
      if (error) throw error;
      return (data || []) as Holiday[];
    },
    enabled,
  });
};

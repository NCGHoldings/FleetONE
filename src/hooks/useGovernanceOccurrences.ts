import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type OccurrenceStatus = Database['public']['Enums']['governance_item_status'];

export interface GovernanceOccurrence {
  id: string;
  item_id: string;
  scheduled_date: string;
  due_date: string | null;
  status: OccurrenceStatus;
  is_holiday_adjusted: boolean;
  adjusted_reason: string | null;
  original_scheduled_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  governance_item: {
    id: string;
    title: string;
    type: 'REPORT' | 'EVENT';
    category: string;
    company_id: string;
    sbu_id: string | null;
    owner_name: string | null;
    owner_email: string | null;
    companies: {
      id: string;
      name: string;
    };
    sbus?: {
      id: string;
      name: string;
    } | null;
  };
}

interface UseGovernanceOccurrencesParams {
  currentDate: Date;
  companyIds?: string[];
  sbuIds?: string[];
  types?: string[];
  categories?: string[];
  statuses?: string[];
}

export const useGovernanceOccurrences = ({
  currentDate,
  companyIds = [],
  sbuIds = [],
  types = [],
  categories = [],
  statuses = [],
}: UseGovernanceOccurrencesParams) => {
  const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['governance-occurrences', startDate, endDate, companyIds, sbuIds, types, categories, statuses],
    queryFn: async () => {
      let query = supabase
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
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      // Filter in-memory since we can't filter on joined table fields directly
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

      return filteredData as any as GovernanceOccurrence[];
    },
  });
};

export const useUpdateOccurrenceStatus = () => {
  return async (occurrenceId: string, status: OccurrenceStatus) => {
    const { error } = await supabase
      .from('governance_occurrences')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', occurrenceId);

    if (error) throw error;
  };
};

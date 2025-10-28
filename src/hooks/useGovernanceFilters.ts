import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

export const useGovernanceFilters = () => {
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedSBUs, setSelectedSBUs] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['governance-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: sbus = [], isLoading: sbusLoading } = useQuery({
    queryKey: ['governance-sbus', selectedCompanies],
    queryFn: async () => {
      let query = supabase
        .from('sbus')
        .select('id, name, company_id')
        .eq('is_active', true)
        .order('name');

      if (selectedCompanies.length > 0) {
        query = query.in('company_id', selectedCompanies);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: companies.length > 0,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['governance-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('governance_items')
        .select('category')
        .eq('is_active', true);

      if (error) throw error;
      
      // Get unique categories
      const uniqueCategories = [...new Set(data.map(item => item.category))];
      return uniqueCategories.sort();
    },
  });

  const resetFilters = () => {
    setSelectedCompanies([]);
    setSelectedSBUs([]);
    setSelectedTypes([]);
    setSelectedCategories([]);
    setSelectedStatuses([]);
  };

  const toggleCompany = (companyId: string) => {
    setSelectedCompanies(prev => 
      prev.includes(companyId) 
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
    // Clear SBU selection when company changes
    setSelectedSBUs([]);
  };

  const toggleSBU = (sbuId: string) => {
    setSelectedSBUs(prev => 
      prev.includes(sbuId)
        ? prev.filter(id => id !== sbuId)
        : [...prev, sbuId]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  return {
    companies,
    sbus,
    categories,
    selectedCompanies,
    selectedSBUs,
    selectedTypes,
    selectedCategories,
    selectedStatuses,
    isLoading: companiesLoading || sbusLoading || categoriesLoading,
    toggleCompany,
    toggleSBU,
    toggleType,
    toggleCategory,
    toggleStatus,
    resetFilters,
  };
};

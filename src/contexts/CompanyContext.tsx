import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Company IDs for consolidated GL architecture
// NCG Holding: Parent with consolidated GL for all sub-companies
// NCG Express: Standalone company with its own GL
export const NCG_HOLDING_ID = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';
export const NCG_EXPRESS_ID = '7ece7595-8b7b-46de-8bfc-c1e8e0da7513';

// Company type matching database structure
export interface Company {
  id: string;
  name: string;
  short_code?: string | null;
  is_active?: boolean | null;
  parent_company_id?: string | null;
  business_unit_type?: string | null;
  company_code?: string | null;
  logo_url?: string | null;
  tax_registration?: string | null;
  fiscal_year_start?: number | null;
  default_currency?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface CompanyContextType {
  selectedCompanyId: string | null;
  selectedCompany: Company | null;
  companies: Company[];
  parentCompanies: Company[];
  subCompanies: Company[];
  isLoading: boolean;
  setSelectedCompanyId: (id: string | null) => void;
  getSubCompaniesFor: (parentId: string) => Company[];
  // Consolidated GL helpers
  getParentCompanyId: (companyId: string) => string;
  isSubCompany: (companyId: string) => boolean;
  isSubCompanyOfNCGHolding: (companyId: string) => boolean; // Specifically checks NCG Holding
  isNCGHoldingOrSubCompany: (companyId: string) => boolean; // NCG Holding or any of its sub-companies
  getEffectiveCompanyId: () => string | null; // Returns parent for sub-companies, otherwise selected
  getBusinessUnitCode: () => string | null; // Returns short_code for sub-companies, null for parent
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const STORAGE_KEY = "selectedCompanyId";

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(() => {
    // Initialize from localStorage
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });

  // Fetch all companies with hierarchy support
  const { data: companies = [], isLoading, error } = useQuery({
    queryKey: ["companies-hierarchy"],
    queryFn: async () => {
      console.log("Fetching companies...");
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) {
        console.error("Failed to load companies:", error);
        throw error;
      }
      
      console.log("Companies loaded:", data?.length || 0, "companies");
      return (data || []) as Company[];
    },
    retry: 3,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Log any query errors
  useEffect(() => {
    if (error) {
      console.error("Company query error:", error);
    }
  }, [error]);

  // Derive parent and sub companies
  const parentCompanies = companies.filter(c => !c.parent_company_id);
  const subCompanies = companies.filter(c => c.parent_company_id);

  // Get sub-companies for a specific parent
  const getSubCompaniesFor = (parentId: string) => {
    return companies.filter(c => c.parent_company_id === parentId);
  };

  // Get selected company details
  const selectedCompany = companies.find(c => c.id === selectedCompanyId) || null;

  // Consolidated GL helpers
  const getParentCompanyId = (companyId: string): string => {
    const company = companies.find(c => c.id === companyId);
    return company?.parent_company_id || companyId;
  };

  const isSubCompany = (companyId: string): boolean => {
    const company = companies.find(c => c.id === companyId);
    return !!company?.parent_company_id;
  };

  // Specifically checks if company is a sub-company of NCG Holding
  const isSubCompanyOfNCGHolding = (companyId: string): boolean => {
    const company = companies.find(c => c.id === companyId);
    return company?.parent_company_id === NCG_HOLDING_ID;
  };

  // Checks if company is NCG Holding or one of its sub-companies
  // Used to validate School Bus operations should only run under NCG Holding hierarchy
  const isNCGHoldingOrSubCompany = (companyId: string): boolean => {
    return companyId === NCG_HOLDING_ID || isSubCompanyOfNCGHolding(companyId);
  };

  // Returns parent company ID for sub-companies of NCG Holding, otherwise returns selected company ID
  // This ensures NCG Express remains completely isolated with its own COA/GL
  // While NCG Holding sub-companies share the consolidated NCG Holding COA/GL
  const getEffectiveCompanyId = (): string | null => {
    if (!selectedCompanyId) return null;
    
    // Only consolidate for NCG Holding sub-companies
    if (isSubCompanyOfNCGHolding(selectedCompanyId)) {
      return NCG_HOLDING_ID;
    }
    
    // NCG Express and other standalone companies use their own ID
    return selectedCompanyId;
  };

  // Returns the business unit code (short_code) for NCG Holding sub-companies
  // Used for tagging journal entries with business unit identifier (SBO, YUT, etc.)
  const getBusinessUnitCode = (): string | null => {
    if (!selectedCompanyId || !selectedCompany) return null;
    
    // Only NCG Holding sub-companies have business unit codes
    if (isSubCompanyOfNCGHolding(selectedCompanyId)) {
      return selectedCompany.short_code || null;
    }
    
    return null; // NCG Express and parent companies don't have business unit codes
  };

  // Set company and persist to localStorage
  const setSelectedCompanyId = (id: string | null) => {
    const previousCompanyId = selectedCompanyId;
    setSelectedCompanyIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    
    // Invalidate all company-specific queries when company changes
    if (previousCompanyId !== id) {
      // Invalidate queries that include company filtering
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] });
      queryClient.invalidateQueries({ queryKey: ["ar-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["ap-payments"] });
    }
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent("companyChanged", { detail: { companyId: id } }));
  };

  // Listen for company change events from other components (e.g., CompanySwitcher)
  useEffect(() => {
    const handleCompanyChange = (event: CustomEvent<{ companyId: string }>) => {
      if (event.detail.companyId !== selectedCompanyId) {
        setSelectedCompanyIdState(event.detail.companyId);
      }
    };

    window.addEventListener("companyChanged", handleCompanyChange as EventListener);
    return () => {
      window.removeEventListener("companyChanged", handleCompanyChange as EventListener);
    };
  }, [selectedCompanyId]);

  // Auto-select first company if none selected
  useEffect(() => {
    if (!isLoading && companies.length > 0 && !selectedCompanyId) {
      const firstCompany = companies[0];
      setSelectedCompanyId(firstCompany.id);
    }
  }, [isLoading, companies, selectedCompanyId]);

  return (
    <CompanyContext.Provider
      value={{
        selectedCompanyId,
        selectedCompany,
        companies,
        parentCompanies,
        subCompanies,
        isLoading,
        setSelectedCompanyId,
        getSubCompaniesFor,
        getParentCompanyId,
        isSubCompany,
        isSubCompanyOfNCGHolding,
        isNCGHoldingOrSubCompany,
        getEffectiveCompanyId,
        getBusinessUnitCode,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
};

// Optional hook that doesn't throw if outside provider (for gradual migration)
export const useCompanyOptional = (): CompanyContextType | null => {
  const context = useContext(CompanyContext);
  return context || null;
};

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const STORAGE_KEY = "selectedCompanyId";

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(() => {
    // Initialize from localStorage
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });

  // Fetch all companies with hierarchy support
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies-hierarchy"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("companies")
        .select("id, name, short_code, is_active, parent_company_id, business_unit_type, company_code, logo_url, tax_registration, fiscal_year_start, default_currency, created_at, updated_at")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return (data || []) as Company[];
    },
  });

  // Derive parent and sub companies
  const parentCompanies = companies.filter(c => !c.parent_company_id);
  const subCompanies = companies.filter(c => c.parent_company_id);

  // Get sub-companies for a specific parent
  const getSubCompaniesFor = (parentId: string) => {
    return companies.filter(c => c.parent_company_id === parentId);
  };

  // Get selected company details
  const selectedCompany = companies.find(c => c.id === selectedCompanyId) || null;

  // Set company and persist to localStorage
  const setSelectedCompanyId = (id: string | null) => {
    setSelectedCompanyIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
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

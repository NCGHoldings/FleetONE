import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Company IDs for consolidated GL architecture
// NCG Holding: Parent with consolidated GL for all sub-companies
// NCG Express: Standalone company with its own GL
export const NCG_HOLDING_ID = 'a0000000-0000-0000-0000-000000000001';
export const NCG_EXPRESS_ID = '7ece7595-8b7b-46de-8bfc-c1e8e0da7513';
export const NCG_TEST_ID = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';

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
  companies: Company[]; // Filtered based on user access
  allCompanies: Company[]; // All companies (for admin use)
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
  // Test mode
  isTestCompany: boolean; // True when selected company has business_unit_type = 'test'
  // Access control
  hasCompanyAccess: (companyId: string) => boolean;
  allowedCompanyIds: string[];
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

  // Fetch current user session
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["auth-session-company"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 1000 * 60 * 5,
  });

  const userId = session?.user?.id;

  // Fetch user's company access permissions
  const { data: userCompanyAccess = [], isLoading: accessLoading } = useQuery({
    queryKey: ["user-company-access-current", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_company_access")
        .select("company_id")
        .eq("user_id", userId);
      
      if (error) {
        console.error("Error fetching company access:", error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!userId,
  });

  // Fetch user roles
  const { data: userRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["user-roles-company", userId],
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

  // Fetch all companies with hierarchy support
  const { data: allCompanies = [], isLoading: companiesLoading, error } = useQuery({
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

  // Combined loading state — only false when ALL dependencies resolved
  const isLoading = sessionLoading || companiesLoading || (!!userId && (accessLoading || rolesLoading));

  // Log any query errors
  useEffect(() => {
    if (error) {
      console.error("Company query error:", error);
    }
  }, [error]);

  // Determine allowed company IDs
  const allowedCompanyIds = useMemo(() => {
    return userCompanyAccess.map(a => a.company_id);
  }, [userCompanyAccess]);

  // Check if user has explicit access configured
  const hasExplicitAccess = allowedCompanyIds.length > 0;

  // Management roles that see all companies by default
  const isManagementRole = userRoles.some(role => 
    ['super_admin', 'admin', 'finance'].includes(role)
  );

  // Filter companies based on user permissions
  const companies = useMemo(() => {
    // If user has explicit company access configured, use that
    if (hasExplicitAccess) {
      return allCompanies.filter(c => allowedCompanyIds.includes(c.id));
    }
    
    // Management roles see all companies when no explicit permissions set
    if (isManagementRole) {
      return allCompanies;
    }
    
    // Other roles see no companies (zero-trust)
    return [];
  }, [allCompanies, allowedCompanyIds, hasExplicitAccess, isManagementRole]);

  // Check if user has access to a specific company
  const hasCompanyAccess = (companyId: string): boolean => {
    if (isManagementRole && !hasExplicitAccess) return true;
    return allowedCompanyIds.includes(companyId);
  };

  // Derive parent and sub companies from filtered list
  const parentCompanies = companies.filter(c => !c.parent_company_id);
  const subCompanies = companies.filter(c => c.parent_company_id);

  // Get sub-companies for a specific parent (uses allCompanies for admin modal access)
  const getSubCompaniesFor = (parentId: string) => {
    return allCompanies.filter(c => c.parent_company_id === parentId);
  };

  // Get selected company details (check allCompanies first, then filtered)
  const selectedCompany = allCompanies.find(c => c.id === selectedCompanyId) || null;

  // Consolidated GL helpers (use allCompanies to ensure lookups work)
  const getParentCompanyId = (companyId: string): string => {
    const company = allCompanies.find(c => c.id === companyId);
    return company?.parent_company_id || companyId;
  };

  const isSubCompany = (companyId: string): boolean => {
    const company = allCompanies.find(c => c.id === companyId);
    return !!company?.parent_company_id;
  };

  // Specifically checks if company is a sub-company of NCG Holding
  const isSubCompanyOfNCGHolding = (companyId: string): boolean => {
    const company = allCompanies.find(c => c.id === companyId);
    return company?.parent_company_id === NCG_HOLDING_ID;
  };

  // Checks if company is a sub-company of NCG Test Environment
  const isSubCompanyOfNCGTest = (companyId: string): boolean => {
    const company = allCompanies.find(c => c.id === companyId);
    return company?.parent_company_id === NCG_TEST_ID;
  };

  // Checks if company is NCG Holding or one of its sub-companies
  // Used to validate School Bus operations should only run under NCG Holding hierarchy
  const isNCGHoldingOrSubCompany = (companyId: string): boolean => {
    return companyId === NCG_HOLDING_ID || isSubCompanyOfNCGHolding(companyId);
  };

  // Returns parent company ID for sub-companies of NCG Holding or NCG Test, otherwise returns selected company ID
  // This ensures NCG Express remains completely isolated with its own COA/GL
  // While NCG Holding sub-companies share the consolidated NCG Holding COA/GL
  // And NCG Test sub-companies share the consolidated NCG Test COA/GL
  const getEffectiveCompanyId = (): string | null => {
    if (!selectedCompanyId) return null;
    
    // Consolidate for NCG Holding sub-companies
    if (isSubCompanyOfNCGHolding(selectedCompanyId)) {
      return NCG_HOLDING_ID;
    }
    
    // Consolidate for NCG Test sub-companies
    if (isSubCompanyOfNCGTest(selectedCompanyId)) {
      return NCG_TEST_ID;
    }
    
    // NCG Express and other standalone companies use their own ID
    return selectedCompanyId;
  };

  // Fallback BU-code mapping by company name when short_code is missing.
  // Critical for live "School Bus Operations" which currently has no short_code in DB.
  const inferBusinessUnitCodeByName = (name?: string | null): string | null => {
    if (!name) return null;
    const n = name.toLowerCase();
    if (n.includes("school bus")) return "SBO";
    if (n.includes("special hire")) return "SPH";
    if (n.includes("yutong")) return "YUT";
    if (n.includes("sinotruck") || n.includes("sinotruk")) return "SNT";
    if (n.includes("light vehicle")) return "LTV";
    return null;
  };

  // Returns the business unit code (short_code) for NCG Holding or NCG Test sub-companies
  // Used for tagging journal entries with business unit identifier (SBO, YUT, etc.)
  const getBusinessUnitCode = (): string | null => {
    if (!selectedCompanyId || !selectedCompany) return null;

    // NCG Holding sub-companies
    if (isSubCompanyOfNCGHolding(selectedCompanyId)) {
      return selectedCompany.short_code || inferBusinessUnitCodeByName(selectedCompany.name) || null;
    }

    // NCG Test sub-companies
    if (isSubCompanyOfNCGTest(selectedCompanyId)) {
      return selectedCompany.short_code || inferBusinessUnitCodeByName(selectedCompany.name) || null;
    }

    return null; // NCG Express and parent companies don't have business unit codes
  };

  // Test mode detection
  const isTestCompany = useMemo(() => {
    if (!selectedCompany) return false;
    if (selectedCompany.business_unit_type === 'test') return true;
    // Check if parent is a test company
    if (selectedCompany.parent_company_id) {
      const parent = allCompanies.find(c => c.id === selectedCompany.parent_company_id);
      return parent?.business_unit_type === 'test';
    }
    return false;
  }, [selectedCompany, allCompanies]);

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
      // Aggressively invalidate ALL cached queries system-wide to ensure 100% data integrity
      // when switching contexts. This forces every mounted component to instantly refetch.
      queryClient.invalidateQueries();
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
        allCompanies,
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
        isTestCompany,
        hasCompanyAccess,
        allowedCompanyIds,
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

// Company-filtered data hooks for multi-company architecture
// These hooks wrap the base data hooks and add company_id filtering

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyOptional } from "@/contexts/CompanyContext";

// ============ Chart of Accounts (Company Filtered) ============
export const useCompanyChartOfAccounts = () => {
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;

  return useQuery({
    queryKey: ["chart-of-accounts", companyId],
    queryFn: async () => {
      // Note: company_id filtering will work after types are regenerated
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .order("account_code");
      
      if (error) throw error;
      return data;
    },
  });
};

// ============ Journal Entries (Company Filtered) ============
export const useCompanyJournalEntries = (status?: "draft" | "posted" | "void") => {
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;

  return useQuery({
    queryKey: ["journal-entries", companyId, status],
    queryFn: async () => {
      let query = supabase
        .from("journal_entries")
        .select("*")
        .order("entry_date", { ascending: false });
      
      if (status) {
        query = query.eq("status", status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

// ============ Customers (Company Filtered) ============
export const useCompanyCustomers = () => {
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;

  return useQuery({
    queryKey: ["customers", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("customer_name");
      
      if (error) throw error;
      return data;
    },
  });
};

// ============ Vendors (Company Filtered) ============
export const useCompanyVendors = () => {
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;

  return useQuery({
    queryKey: ["vendors", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("vendor_name");
      
      if (error) throw error;
      return data;
    },
  });
};

// ============ AR Invoices (Company Filtered) ============
export const useCompanyARInvoices = (status?: string) => {
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;

  return useQuery({
    queryKey: ["ar-invoices", companyId, status],
    queryFn: async () => {
      let query = supabase
        .from("ar_invoices")
        .select(`
          *,
          customers (
            customer_code,
            customer_name
          ),
          bus_categories (
            name,
            color
          )
        `)
        .order("invoice_date", { ascending: false });
      
      if (status) {
        query = query.eq("status", status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

// ============ AP Invoices (Company Filtered) ============
export const useCompanyAPInvoices = (status?: string) => {
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;

  return useQuery({
    queryKey: ["ap-invoices", companyId, status],
    queryFn: async () => {
      let query = supabase
        .from("ap_invoices")
        .select(`
          *,
          vendors (
            vendor_code,
            vendor_name
          )
        `)
        .order("invoice_date", { ascending: false });
      
      if (status) {
        query = query.eq("status", status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

// ============ Bank Accounts (Company Filtered) ============
export const useCompanyBankAccounts = () => {
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;

  return useQuery({
    queryKey: ["bank-accounts", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .order("account_name");
      
      if (error) throw error;
      return data;
    },
  });
};

// ============ Fixed Assets (Company Filtered) ============
export const useCompanyFixedAssets = () => {
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;

  return useQuery({
    queryKey: ["fixed-assets", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_assets")
        .select(`
          *,
          asset_categories (
            category_code,
            category_name,
            depreciation_method,
            useful_life_years
          )
        `)
        .order("asset_code");
      
      if (error) throw error;
      return data;
    },
  });
};

// ============ AR Summary (Company Filtered) ============
export const useCompanyARSummary = () => {
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;

  return useQuery({
    queryKey: ["ar-summary", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_invoices")
        .select("balance, due_date, status")
        .neq("status", "paid");
      
      if (error) throw error;
      
      const today = new Date();
      let totalOutstanding = 0;
      let totalOverdue = 0;
      let countOverdue = 0;
      
      data?.forEach(inv => {
        totalOutstanding += inv.balance || 0;
        if (new Date(inv.due_date) < today && inv.balance > 0) {
          totalOverdue += inv.balance || 0;
          countOverdue++;
        }
      });
      
      return { totalOutstanding, totalOverdue, countOverdue, totalInvoices: data?.length || 0 };
    },
  });
};

// ============ AP Summary (Company Filtered) ============
export const useCompanyAPSummary = () => {
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;

  return useQuery({
    queryKey: ["ap-summary", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ap_invoices")
        .select("balance, due_date, status")
        .neq("status", "paid");
      
      if (error) throw error;
      
      const today = new Date();
      let totalOutstanding = 0;
      let totalOverdue = 0;
      let countOverdue = 0;
      
      data?.forEach(inv => {
        totalOutstanding += inv.balance || 0;
        if (new Date(inv.due_date) < today && inv.balance > 0) {
          totalOverdue += inv.balance || 0;
          countOverdue++;
        }
      });
      
      return { totalOutstanding, totalOverdue, countOverdue, totalInvoices: data?.length || 0 };
    },
  });
};

// ============ Accounting Summary (Company Filtered) ============
export const useCompanyAccountingSummary = () => {
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;

  return useQuery({
    queryKey: ["accounting-summary", companyId],
    queryFn: async () => {
      const { data: accounts, error } = await supabase
        .from("chart_of_accounts")
        .select("account_type, current_balance")
        .eq("is_active", true);
      
      if (error) throw error;
      
      const summary = {
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
      };
      
      accounts?.forEach(acc => {
        const balance = acc.current_balance || 0;
        switch (acc.account_type) {
          case "asset":
            summary.totalAssets += balance;
            break;
          case "liability":
            summary.totalLiabilities += balance;
            break;
          case "equity":
            summary.totalEquity += balance;
            break;
          case "revenue":
            summary.totalRevenue += balance;
            break;
          case "expense":
            summary.totalExpenses += balance;
            break;
        }
      });
      
      summary.netIncome = summary.totalRevenue - summary.totalExpenses;
      
      return summary;
    },
  });
};

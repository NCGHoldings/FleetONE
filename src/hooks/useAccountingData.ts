// Centralized data fetching hooks for all accounting modules
// All hooks filter by selectedCompanyId for multi-company data isolation
// Sub-companies automatically filter by business_unit_code for their specific entries
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { fetchAllRows } from "@/lib/utils";

// Helper hook to get auto business unit filtering for sub-companies
export const useAutoBusinessUnitFilter = () => {
  const { selectedCompanyId, getBusinessUnitCode } = useCompany();

  // Auto-filter by business unit when a sub-company is selected
  const autoBusinessUnitCode = getBusinessUnitCode();

  return autoBusinessUnitCode;
};
// ============ Profiles (Users) ============
export const useAllProfiles = () => {
  return useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, first_name, last_name");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });
};

// ============ Chart of Accounts ============
// For sub-companies, fetch parent company's COA (consolidated GL)
export const useChartOfAccounts = () => {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["chart-of-accounts", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("chart_of_accounts")
        .select("*")
        .order("account_code");

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useAccountsByType = (accountType: "asset" | "liability" | "equity" | "revenue" | "expense") => {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["accounts-by-type", accountType, effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("account_type", accountType)
        .eq("is_active", true)
        .order("account_code");

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Journal Entries ============
// For consolidated GL, show all entries for parent company
// Auto-filters by business_unit_code when a sub-company is selected
// businessUnitCodeOverride: pass "all" to see all entries (consolidated view), or specific code
export const useJournalEntries = (status?: "draft" | "posted" | "void", businessUnitCodeOverride?: string) => {
  const { selectedCompany, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  // Use override if provided, otherwise use auto-detected from selected company
  const businessUnitCode = businessUnitCodeOverride !== undefined
    ? businessUnitCodeOverride
    : autoBusinessUnitCode;

  return useQuery({
    queryKey: ["journal-entries", status, effectiveCompanyId, businessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("journal_entries")
        .select("*, business_unit_code")
        .order("created_at", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (status) {
        query = query.eq("status", status);
      }

      // Filter by specific business unit if provided (auto or override)
      if (businessUnitCode && businessUnitCode !== "all") {
        if (businessUnitCode === "SBO") {
          query = query.or(`business_unit_code.eq.SBO,entry_number.ilike.SBS-%,entry_number.ilike.FUEL-BLK-%`);
        } else {
          query = query.or(`business_unit_code.eq.${businessUnitCode},entry_number.ilike.${businessUnitCode}-%`);
        }
      } else if (selectedCompany && !selectedCompany.parent_company_id) {
        // Parent companies drop filter
      } else if (selectedCompany) {
        // Fallback to prefix matching for legacy bridged records natively prefixed with short_code
        const cName = selectedCompany.name.toLowerCase();
        if (cName.includes("yutong")) {
          query = query.or("entry_number.ilike.YUT-%,business_unit_code.eq.YUT");
        } else if (cName.includes("sinotruck")) {
          query = query.or("entry_number.ilike.SNT-%,business_unit_code.eq.SNT");
        } else if (cName.includes("school bus")) {
          query = query.or("entry_number.ilike.SBS-%,entry_number.ilike.FUEL-BLK-%,business_unit_code.eq.SBO");
        } else if (cName.includes("special hire")) {
          query = query.or("entry_number.ilike.SPH-%,business_unit_code.eq.SPH");
        } else if (cName.includes("light vehicle")) {
          query = query.or("entry_number.ilike.LTV-%,business_unit_code.eq.LTV");
        }
      }

      const data = await fetchAllRows(query);
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useJournalEntryLines = (entryId: string) => {
  return useQuery({
    queryKey: ["journal-entry-lines", entryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select(`
          *,
          chart_of_accounts:account_id (
            account_code,
            account_name,
            account_type
          )
        `)
        .eq("journal_entry_id", entryId)
        .order("debit", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!entryId,
  });
};

// ============ Financial Periods ============
export const useFinancialPeriods = () => {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["financial-periods", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("financial_periods")
        .select("*")
        .order("start_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useCurrentPeriod = () => {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["current-period", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      const today = new Date().toISOString().split("T")[0];
      let query = supabase
        .from("financial_periods")
        .select("*")
        .lte("start_date", today)
        .gte("end_date", today)
        .eq("is_closed", false);

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      const { data, error } = await query.single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Customers (AR) ============
// Filters by business_unit_code when a sub-company is selected
export const useCustomers = () => {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["customers", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("customers")
        .select("*, customer_categories(category_name)")
        .order("customer_code", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      // Filter by business unit for sub-company views
      if (autoBusinessUnitCode) {
        (query as any) = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const data = await fetchAllRows(query);
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useCustomerBalance = (customerId: string) => {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["customer-balance", customerId, effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId || !customerId) return null;
      let query = supabase
        .from("customers")
        .select("current_balance")
        .eq("id", customerId);

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      const { data, error } = await query.single();
      if (error) throw error;
      return data?.current_balance || 0;
    },
    enabled: !!customerId && !!effectiveCompanyId,
  });
};

// ============ Vendors (AP) ============
// Filters by business_unit_code when a sub-company is selected
export const useVendors = () => {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["vendors", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("vendors")
        .select("*, vendor_categories(category_name)")
        .order("vendor_code", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      const data = await fetchAllRows(query);
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useVendorBalance = (vendorId: string) => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["vendor-balance", vendorId, effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId || !vendorId) return null;
      let query = supabase
        .from("vendors")
        .select("current_balance")
        .eq("id", vendorId);

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      const { data, error } = await query.single();
      if (error) throw error;
      return data?.current_balance || 0;
    },
    enabled: !!vendorId && !!effectiveCompanyId,
  });
};

// ============ AR Invoices ============
// Filters by business_unit_code when a sub-company is selected
export const useARInvoices = (status?: "all" | "draft" | "sent" | "paid" | "partially_paid" | "void") => {
  const { selectedCompany, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["ar-invoices", status, effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("ar_invoices")
        .select("*, customers(customer_name)")
        .order("invoice_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      // Filter by business unit for sub-company views
      if (autoBusinessUnitCode) {
        query = query.or(`business_unit_code.eq.${autoBusinessUnitCode},invoice_number.ilike.${autoBusinessUnitCode}-%`);
      } else if (selectedCompany && !selectedCompany.parent_company_id) {
        // Parent companies drop filter
      } else if (selectedCompany) {
        // Fallback for legacy setups
        const cName = selectedCompany.name.toLowerCase();
        if (cName.includes("school bus")) query = query.or("invoice_number.ilike.SBS-%,business_unit_code.eq.SBO");
        else if (cName.includes("special hire")) query = query.or("invoice_number.ilike.SPH-%,business_unit_code.eq.SPH");
        else if (cName.includes("yutong")) query = query.or("invoice_number.ilike.YUT-%,business_unit_code.eq.YUT");
        else if (cName.includes("sinotruck")) query = query.or("invoice_number.ilike.SNT-%,business_unit_code.eq.SNT");
        else if (cName.includes("light vehicle")) query = query.or("invoice_number.ilike.LTV-%,business_unit_code.eq.LTV");
      }

      const data = await fetchAllRows(query);
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ AP Invoices ============
// Filters by business_unit_code when a sub-company is selected
export const useAPInvoices = (status?: "all" | "draft" | "sent" | "paid" | "partially_paid" | "void") => {
  const { selectedCompany, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["ap-invoices", status, effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("ap_invoices")
        .select("*, vendors(vendor_name)")
        .order("invoice_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      // Filter by business unit for sub-company views
      if (autoBusinessUnitCode) {
        query = query.or(`business_unit_code.eq.${autoBusinessUnitCode},invoice_number.ilike.${autoBusinessUnitCode}-%`);
      } else if (selectedCompany && !selectedCompany.parent_company_id) {
        // Parent companies drop filter
      } else if (selectedCompany) {
        // Fallback for legacy setups
        const cName = selectedCompany.name.toLowerCase();
        if (cName.includes("school bus")) query = query.or("invoice_number.ilike.SBS-%,business_unit_code.eq.SBO");
        else if (cName.includes("special hire")) query = query.or("invoice_number.ilike.SPH-%,business_unit_code.eq.SPH");
        else if (cName.includes("yutong")) query = query.or("invoice_number.ilike.YUT-%,business_unit_code.eq.YUT");
        else if (cName.includes("sinotruck")) query = query.or("invoice_number.ilike.SNT-%,business_unit_code.eq.SNT");
        else if (cName.includes("light vehicle")) query = query.or("invoice_number.ilike.LTV-%,business_unit_code.eq.LTV");
      }

      const data = await fetchAllRows(query);
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ AR Receipts ============
// Filters by business_unit_code when a sub-company is selected
export const useARReceipts = () => {
  const { selectedCompany, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["ar-receipts", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("ar_receipts")
        .select("*, customers(customer_name), bank_accounts(account_name)")
        .order("receipt_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      // Filter by business unit for sub-company views
      if (autoBusinessUnitCode) {
        query = query.or(`business_unit_code.eq.${autoBusinessUnitCode},receipt_number.ilike.${autoBusinessUnitCode}-%`);
      } else if (selectedCompany && !selectedCompany.parent_company_id) {
        // Parent companies drop filter
      } else if (selectedCompany) {
        // Fallback for legacy setups
        const cName = selectedCompany.name.toLowerCase();
        if (cName.includes("school bus")) query = query.or("receipt_number.ilike.SBS-%,business_unit_code.eq.SBO");
        else if (cName.includes("special hire")) query = query.or("receipt_number.ilike.SPH-%,business_unit_code.eq.SPH");
        else if (cName.includes("yutong")) query = query.or("receipt_number.ilike.YUT-%,business_unit_code.eq.YUT");
        else if (cName.includes("sinotruck")) query = query.or("receipt_number.ilike.SNT-%,business_unit_code.eq.SNT");
        else if (cName.includes("light vehicle")) query = query.or("receipt_number.ilike.LTV-%,business_unit_code.eq.LTV");
      }

      const data = await fetchAllRows(query);
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ AP Payments ============
// Filters by business_unit_code when a sub-company is selected
export const useAPPayments = () => {
  const { selectedCompany, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["ap-payments", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("ap_payments")
        .select(`
          *,
          vendors (vendor_name),
          bank_accounts (account_name)
        `)
        .order("payment_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      try {
        const data = await fetchAllRows(query);
        return data;
      } catch (error: any) {
        // Fallback: if join fails (e.g. missing FK), retry without bank_accounts join
        console.warn('AP Payments query failed, retrying without bank_accounts join:', error.message);
        let fallbackQuery = supabase
          .from("ap_payments")
          .select(`
            *,
            vendors (
              vendor_code, vendor_name, address, bank_account, bank_name, bank_branch,
              tax_id, currency, email, phone, contact_person
            ),
            vendor_bank_accounts (
              id, bank_name, bank_branch, account_number, account_holder_name, account_label
            )
          `)
          .order("created_at", { ascending: false });

        if (effectiveCompanyId) {
          fallbackQuery = fallbackQuery.eq("company_id", effectiveCompanyId);
        }
        if (autoBusinessUnitCode) {
          fallbackQuery = fallbackQuery.eq("business_unit_code", autoBusinessUnitCode);
        }

        const fallbackData = await fetchAllRows(fallbackQuery);
        return fallbackData;
      }
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Bank Accounts ============
// Bank accounts are section-specific (each sub-company can have its own bank accounts)
export const useBankAccounts = () => {
  const { selectedCompany, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["bank-accounts", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      // Use explicit column selection to avoid PostgREST errors from non-existent columns (e.g. 'status')
      let query = supabase
        .from("bank_accounts")
        .select("id, account_name, bank_name, account_number, account_type, currency, current_balance, company_id, gl_account_id, is_active, opening_balance, notes, created_at, updated_at, business_unit_code, shared_business_units, chart_of_accounts(account_code)");

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      // Filter by business unit for sub-company views
      if (autoBusinessUnitCode) {
        query = query.or(`business_unit_code.eq.${autoBusinessUnitCode},shared_business_units.cs.{${autoBusinessUnitCode}}`);
      } else if (selectedCompany && !selectedCompany.parent_company_id) {
        // Parent companies drop filter
      } else if (selectedCompany) {
        // Fallback for legacy setups if autoBusinessUnitCode isn't explicitly set
        const cName = selectedCompany.name.toLowerCase();
        let targetBU = null;
        if (cName.includes("school bus")) targetBU = "SBO";
        else if (cName.includes("special hire")) targetBU = "SPH";
        else if (cName.includes("yutong")) targetBU = "YUT";
        else if (cName.includes("sinotruck")) targetBU = "SNT";
        else if (cName.includes("light vehicle")) targetBU = "LTV";

        if (targetBU) {
          query = query.or(`business_unit_code.eq.${targetBU},shared_business_units.cs.{${targetBU}}`);
        }
      }

      const { data, error } = await query;
      if (error) {
        // Fallback: if explicit columns fail (schema mismatch), try minimal safe columns
        console.warn("Bank accounts query failed, retrying with minimal columns:", error.message);
        let fallbackQuery = supabase
          .from("bank_accounts")
          .select("id, account_name, bank_name, account_number, company_id, current_balance, is_active, created_at, updated_at");
          
        if (effectiveCompanyId) {
          fallbackQuery = fallbackQuery.eq("company_id", effectiveCompanyId);
        }
        
        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        if (fallbackError) throw fallbackError;
        
        return fallbackData?.sort((a, b) => (a.account_name || "").localeCompare(b.account_name || ""));
      }

      // Map account_code from relation and sort
      if (data) {
        const enhancedData = data.map(item => ({
          ...item,
          account_code: (item.chart_of_accounts as any)?.account_code || null
        }));
        
        return enhancedData.sort((a, b) => {
          const codeA = a.account_code || "ZZZ";
          const codeB = b.account_code || "ZZZ";
          if (codeA === codeB) {
             return (a.account_name || "").localeCompare(b.account_name || "");
          }
          return codeA.localeCompare(codeB);
        });
      }

      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useBankTransactions = (bankAccountId?: string) => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["bank-transactions", bankAccountId, effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("bank_transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .limit(100);

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (bankAccountId) {
        query = query.eq("bank_account_id", bankAccountId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// Reconciliation-specific hook: fetches ALL unreconciled + date-filtered reconciled transactions
export const useBankTransactionsForRecon = (
  bankAccountId?: string,
  fromDate?: string,
  toDate?: string
) => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["bank-transactions-recon", bankAccountId, effectiveCompanyId, fromDate, toDate],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      // Fetch all unreconciled transactions (no limit)
      let unreconciledQuery = supabase
        .from("bank_transactions")
        .select("*")
        .eq("is_reconciled", false)
        .order("transaction_date", { ascending: false });

      if (effectiveCompanyId) {
        unreconciledQuery = unreconciledQuery.eq("company_id", effectiveCompanyId);
      }
      if (bankAccountId) {
        unreconciledQuery = unreconciledQuery.eq("bank_account_id", bankAccountId);
      }

      const { data: unreconciled, error: err1 } = await unreconciledQuery;
      if (err1) throw err1;

      // Fetch reconciled transactions within date range (for display)
      let reconciledData: typeof unreconciled = [];
      if (fromDate || toDate) {
        let reconciledQuery = supabase
          .from("bank_transactions")
          .select("*")
          .eq("is_reconciled", true)
          .order("transaction_date", { ascending: false })
          .limit(500);

        if (effectiveCompanyId) {
          reconciledQuery = reconciledQuery.eq("company_id", effectiveCompanyId);
        }
        if (bankAccountId) {
          reconciledQuery = reconciledQuery.eq("bank_account_id", bankAccountId);
        }
        if (fromDate) {
          reconciledQuery = reconciledQuery.gte("transaction_date", fromDate);
        }
        if (toDate) {
          reconciledQuery = reconciledQuery.lte("transaction_date", toDate);
        }

        const { data: reconciled, error: err2 } = await reconciledQuery;
        if (err2) throw err2;
        reconciledData = reconciled || [];
      }

      // Merge and deduplicate
      const allTxns = [...(unreconciled || []), ...reconciledData];
      const seen = new Set<string>();
      const unique = allTxns.filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      return unique.sort((a, b) =>
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      );
    },
    enabled: !!effectiveCompanyId && !!bankAccountId,
  });
};

export const useBankReconciliations = (bankAccountId?: string) => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["bank-reconciliations", bankAccountId, effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("bank_reconciliations")
        .select("*")
        .order("reconciliation_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (bankAccountId) {
        query = query.eq("bank_account_id", bankAccountId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// Fetch the last completed reconciliation for a bank account (for "Last Statement Balance")
export const useLastReconciliation = (bankAccountId: string | null) => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["last-reconciliation", bankAccountId, effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId || !bankAccountId) return null;
      const { data, error } = await supabase
        .from("bank_reconciliations")
        .select("*")
        .eq("bank_account_id", bankAccountId)
        .eq("company_id", effectiveCompanyId)
        .eq("status", "completed")
        .order("statement_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!bankAccountId && !!effectiveCompanyId,
  });
};

// ============ Fixed Assets ============
export const useFixedAssets = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["fixed-assets", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("fixed_assets")
        .select(`*, asset_types (type_name, asset_account_id, depreciation_account_id, accumulated_depr_account_id)`)
        .order("asset_code");

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }
      
      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useAssetCategories = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["asset-categories", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("asset_categories")
        .select("*")
        .order("category_code");

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useDepreciationSchedule = (assetId?: string) => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["depreciation-schedule", assetId, effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("asset_depreciation_schedule")
        .select("*")
        .order("depreciation_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }
      
      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      if (assetId) {
        query = query.eq("asset_id", assetId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Tax Codes ============
export const useTaxCodes = () => {
  return useQuery({
    queryKey: ["tax-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_codes")
        .select("*")
        .eq("is_active", true)
        .order("tax_code");
      if (error) throw error;
      return data;
    },
  });
};

// ============ Cost Centers ============
export const useCostCenters = () => {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["cost-centers", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("cost_centers")
        .select("*")
        .eq("is_active", true)
        .order("center_code");

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Budgets ============
export const useBudgets = (fiscalYear?: number) => {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["budgets", fiscalYear, effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("budgets")
        .select("*")
        .order("budget_name");

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (fiscalYear) {
        query = query.eq("fiscal_year", fiscalYear);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Audit Logs ============
export const useAuditLogs = (tableName?: string, recordId?: string) => {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["audit-logs", tableName, recordId, effectiveCompanyId],
    enabled: !!effectiveCompanyId,
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("accounting_audit_log")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(100);

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (tableName) {
        query = query.eq("table_name", tableName);
      }
      if (recordId) {
        query = query.eq("record_id", recordId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
};

// ============ Dashboard Summaries ============
export const useAccountingSummary = () => {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["accounting-summary", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("chart_of_accounts")
        .select("account_type, current_balance")
        .eq("is_active", true);

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      const { data: accounts, error } = await query;
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
    enabled: !!effectiveCompanyId,
  });
};

export const useARSummary = () => {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["ar-summary", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("ar_invoices")
        .select("balance, due_date, status")
        .neq("status", "paid");

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }
      
      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
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
    enabled: !!effectiveCompanyId,
  });
};

export const useAPSummary = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["ap-summary", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("ap_invoices")
        .select("balance, due_date, status")
        .neq("status", "paid");

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }
      
      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
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
    enabled: !!effectiveCompanyId,
  });
};

// ============ Items & Inventory ============
export const useItems = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["items", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("items")
        .select(`*, item_categories (category_name, category_code, valuation_method)`)
        .order("item_code");

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }
      
      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useItemStock = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["item-stock", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("item_stock")
        .select(`*, items (item_code, item_name)`)
        .order("warehouse_id");

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }
      
      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useItemCategories = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["item-categories", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = (supabase as any)
        .from("item_categories")
        .select("*")
        .order("category_name");

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Purchase Orders & GRN ============
export const usePurchaseOrders = (status?: string) => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["purchase-orders", status, effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("purchase_orders")
        .select(`*, vendors (vendor_code, vendor_name, address, contact_person, phone, email, tax_id)`)
        .order("order_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }
      
      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useGoodsReceiptNotes = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["goods-receipt-notes", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("goods_receipt_notes")
        .select(`*, vendors (vendor_name), purchase_orders (po_number)`)
        .order("created_at", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }
      
      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Cheque Register ============
export const useChequeRegister = (status?: string) => {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["cheque-register", status, effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("cheque_register")
        .select("*")
        .order("cheque_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }
      
      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Recurring Entries ============
export const useRecurringEntries = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["recurring-entries", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("recurring_journal_entries" as any)
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .order("template_name");

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Currencies & Exchange Rates ============
export const useCurrencies = () => {
  return useQuery({
    queryKey: ["currencies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("currencies" as any)
        .select("*")
        .order("currency_code");
      if (error) throw error;
      return data as any[];
    },
  });
};

export const useExchangeRates = (baseCurrency?: string) => {
  return useQuery({
    queryKey: ["exchange-rates", baseCurrency],
    queryFn: async () => {
      let query = supabase
        .from("exchange_rates" as any)
        .select("*")
        .order("effective_date", { ascending: false });
      if (baseCurrency) {
        query = query.eq("from_currency", baseCurrency);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
};

// ============ Purchase Requisitions ============
export const usePurchaseRequisitions = (status?: string) => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["purchase-requisitions", status, effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("purchase_requisitions" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }
      
      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Fund Transfers ============
export const useFundTransfers = () => {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["fund-transfers", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("fund_transfers" as any)
        .select("*")
        .order("transfer_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Asset Disposals ============
export const useAssetDisposals = () => {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["asset-disposals", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("asset_disposals")
        .select(`*, fixed_assets (asset_code, asset_name)`)
        .order("disposal_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Bad Debt Provisions ============
export const useBadDebtProvisions = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["bad-debt-provisions", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("ar_bad_debt_provisions")
        .select(`*, customers (customer_code, customer_name), ar_invoices (invoice_number)`)
        .order("provision_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Batch & Serial Numbers ============
export const useBatchNumbers = (itemId?: string) => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["batch-numbers", itemId, effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("batch_numbers")
        .select(`*, items (item_code, item_name)`)
        .order("batch_number");

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (itemId) query = query.eq("item_id", itemId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

export const useSerialNumbers = (itemId?: string) => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["serial-numbers", itemId, effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("serial_numbers" as any)
        .select(`*, items (item_code, item_name)`)
        .order("serial_number");

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (itemId) query = query.eq("item_id", itemId);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ WHT Certificates ============
export const useWHTCertificates = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["wht-certificates", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("wht_certificates" as any)
        .select(`*, vendors (vendor_code, vendor_name)`)
        .order("certificate_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Vendor Performance ============
export const useVendorPerformance = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["vendor-performance", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("vendor_performance" as any)
        .select(`*, vendors (vendor_code, vendor_name)`)
        .order("period_end", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Bank Reconciliation Items ============
export const useBankReconciliationItems = (reconciliationId?: string) => {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["bank-reconciliation-items", reconciliationId, effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("bank_reconciliation_items")
        .select("*")
        .order("statement_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      if (reconciliationId) query = query.eq("reconciliation_id", reconciliationId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!reconciliationId && !!effectiveCompanyId,
  });
};

// ============ Period Closing Checklist ============
export const usePeriodClosingChecklist = (periodId?: string) => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["period-closing-checklist", periodId, effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!periodId || !effectiveCompanyId) return null;

      // Unposted Journals
      let journalQuery = supabase.from("journal_entries").select("id, status").eq("period_id", periodId).neq("status", "posted").eq("company_id", effectiveCompanyId);
      if (autoBusinessUnitCode) journalQuery = journalQuery.eq("business_unit_code", autoBusinessUnitCode);

      // Unpaid AR Invoices
      let arQuery = supabase.from("ar_invoices").select("id, status").eq("period_id", periodId).eq("status", "unpaid").eq("company_id", effectiveCompanyId);
      if (autoBusinessUnitCode) arQuery = arQuery.eq("business_unit_code", autoBusinessUnitCode);

      // Unpaid AP Invoices
      let apQuery = supabase.from("ap_invoices").select("id, status").eq("period_id", periodId).eq("status", "unpaid").eq("company_id", effectiveCompanyId);
      if (autoBusinessUnitCode) apQuery = apQuery.eq("business_unit_code", autoBusinessUnitCode);

      // Pending Bank Reconciliations
      let reconQuery = supabase.from("bank_reconciliations").select("id, status").neq("status", "completed").eq("company_id", effectiveCompanyId);
      // Reconciliations are usually per bank account, which might be branch-specific or shared.
      // Filtering by branch if applicable.
      if (autoBusinessUnitCode) reconQuery = reconQuery.eq("business_unit_code", autoBusinessUnitCode);

      const [journals, arInvoices, apInvoices, reconciliations] = await Promise.all([
        journalQuery,
        arQuery,
        apQuery,
        reconQuery,
      ]);

      return {
        unpostedJournals: journals.data?.length || 0,
        unpaidARInvoices: arInvoices.data?.length || 0,
        unpaidAPInvoices: apInvoices.data?.length || 0,
        pendingReconciliations: reconciliations.data?.length || 0,
      };
    },
    enabled: !!periodId && !!effectiveCompanyId,
  });
};

// ============ AR Credit Notes ============
export const useARCreditNotes = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["ar-credit-notes", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("ar_credit_notes")
        .select(`
          *,
          customers (customer_code, customer_name),
          ar_invoices (invoice_number)
        `)
        .order("credit_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ AP Debit Notes ============
export const useAPDebitNotes = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["ap-debit-notes", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("ap_debit_notes")
        .select(`
          *,
          vendors (vendor_code, vendor_name),
          ap_invoices (invoice_number)
        `)
        .order("debit_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Asset Revaluations ============
export const useAssetRevaluations = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["asset-revaluations", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("asset_revaluations")
        .select(`
          *,
          fixed_assets (asset_code, asset_name)
        `)
        .order("revaluation_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Asset Transfers ============
export const useAssetTransfers = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["asset-transfers", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("asset_transfers")
        .select(`
          *,
          fixed_assets (asset_code, asset_name)
        `)
        .order("transfer_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ SSCL Transactions ============
export const useSSCLTransactions = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["sscl-transactions", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      let query = supabase
        .from("sscl_transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
};

// ============ Companies ============
export const useCompanies = () => {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("name");
      if (error) throw error;
    return data;
    },
  });
};

// ============ Trial Balance Data ============
// Fetches aggregated debit/credit movements from journal_entry_lines
// Split into opening (before period) and period (within period) movements
export const useTrialBalanceData = (
  periodStartDate: string | null,
  periodEndDate: string | null,
  costCenterId?: string
) => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  // Opening movements: all posted JE lines before period start
  const openingQuery = useQuery({
    queryKey: ["trial-balance-opening", periodStartDate, effectiveCompanyId, autoBusinessUnitCode, costCenterId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      if (!periodStartDate) return [];

      // Get all posted journal entry IDs before period start
      let jeQuery = supabase
        .from("journal_entries")
        .select("id")
        .eq("status", "posted")
        .lt("entry_date", periodStartDate);

      if (effectiveCompanyId) {
        jeQuery = jeQuery.eq("company_id", effectiveCompanyId);
      }
      if (autoBusinessUnitCode) {
        jeQuery = jeQuery.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data: entries, error: jeError } = await jeQuery;
      if (jeError) throw jeError;
      if (!entries || entries.length === 0) return [];

      const entryIds = entries.map(e => e.id);

      // Fetch lines for those entries in batches (Supabase IN filter limit)
      const batchSize = 200;
      const allLines: { account_id: string; debit: number; credit: number }[] = [];

      for (let i = 0; i < entryIds.length; i += batchSize) {
        const batch = entryIds.slice(i, i + batchSize);
        let lineQuery = supabase
          .from("journal_entry_lines")
          .select("account_id, debit, credit, cost_center_id")
          .in("journal_entry_id", batch);

        const { data: lines, error: lineError } = await lineQuery;
        if (lineError) throw lineError;
        if (lines) allLines.push(...lines as any);
      }

      // Filter by cost center if needed, then aggregate
      const filtered = costCenterId && costCenterId !== "all"
        ? allLines.filter((l: any) => l.cost_center_id === costCenterId)
        : allLines;

      const agg: Record<string, { debit: number; credit: number }> = {};
      filtered.forEach(line => {
        if (!line.account_id) return;
        if (!agg[line.account_id]) agg[line.account_id] = { debit: 0, credit: 0 };
        agg[line.account_id].debit += line.debit || 0;
        agg[line.account_id].credit += line.credit || 0;
      });

      return Object.entries(agg).map(([account_id, vals]) => ({
        account_id,
        total_debit: vals.debit,
        total_credit: vals.credit,
      }));
    },
    enabled: !!effectiveCompanyId && !!periodStartDate,
  });

  // Period movements: posted JE lines within period
  const periodQuery = useQuery({
    queryKey: ["trial-balance-period", periodStartDate, periodEndDate, effectiveCompanyId, autoBusinessUnitCode, costCenterId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      if (!periodStartDate || !periodEndDate) return [];

      let jeQuery = supabase
        .from("journal_entries")
        .select("id")
        .eq("status", "posted")
        .gte("entry_date", periodStartDate)
        .lte("entry_date", periodEndDate);

      if (effectiveCompanyId) {
        jeQuery = jeQuery.eq("company_id", effectiveCompanyId);
      }
      if (autoBusinessUnitCode) {
        jeQuery = jeQuery.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data: entries, error: jeError } = await jeQuery;
      if (jeError) throw jeError;
      if (!entries || entries.length === 0) return [];

      const entryIds = entries.map(e => e.id);

      const batchSize = 200;
      const allLines: { account_id: string; debit: number; credit: number }[] = [];

      for (let i = 0; i < entryIds.length; i += batchSize) {
        const batch = entryIds.slice(i, i + batchSize);
        let lineQuery = supabase
          .from("journal_entry_lines")
          .select("account_id, debit, credit, cost_center_id")
          .in("journal_entry_id", batch);

        const { data: lines, error: lineError } = await lineQuery;
        if (lineError) throw lineError;
        if (lines) allLines.push(...lines as any);
      }

      const filtered = costCenterId && costCenterId !== "all"
        ? allLines.filter((l: any) => l.cost_center_id === costCenterId)
        : allLines;

      const agg: Record<string, { debit: number; credit: number }> = {};
      filtered.forEach(line => {
        if (!line.account_id) return;
        if (!agg[line.account_id]) agg[line.account_id] = { debit: 0, credit: 0 };
        agg[line.account_id].debit += line.debit || 0;
        agg[line.account_id].credit += line.credit || 0;
      });

      return Object.entries(agg).map(([account_id, vals]) => ({
        account_id,
        total_debit: vals.debit,
        total_credit: vals.credit,
      }));
    },
    enabled: !!effectiveCompanyId && !!periodStartDate && !!periodEndDate,
  });

  return {
    openingMovements: openingQuery.data || [],
    periodMovements: periodQuery.data || [],
    isLoading: openingQuery.isLoading || periodQuery.isLoading,
    error: openingQuery.error || periodQuery.error,
  };
};

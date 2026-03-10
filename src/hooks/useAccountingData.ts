// Centralized data fetching hooks for all accounting modules
// All hooks filter by selectedCompanyId for multi-company data isolation
// Sub-companies automatically filter by business_unit_code for their specific entries
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

// Helper hook to get auto business unit filtering for sub-companies
const useAutoBusinessUnitFilter = () => {
  const { selectedCompanyId, getBusinessUnitCode, isSubCompanyOfNCGHolding } = useCompany();

  // Auto-filter by business unit when a sub-company is selected
  const autoBusinessUnitCode = selectedCompanyId && isSubCompanyOfNCGHolding(selectedCompanyId)
    ? getBusinessUnitCode()
    : null;

  return autoBusinessUnitCode;
};
// ============ Chart of Accounts ============
// For sub-companies, fetch parent company's COA (consolidated GL)
export const useChartOfAccounts = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["chart-of-accounts", effectiveCompanyId],
    queryFn: async () => {
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
    enabled: !!selectedCompanyId,
  });
};

export const useAccountsByType = (accountType: "asset" | "liability" | "equity" | "revenue" | "expense") => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["accounts-by-type", accountType, effectiveCompanyId],
    queryFn: async () => {
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
    enabled: !!selectedCompanyId,
  });
};

// ============ Journal Entries ============
// For consolidated GL, show all entries for parent company
// Auto-filters by business_unit_code when a sub-company is selected
// businessUnitCodeOverride: pass "all" to see all entries (consolidated view), or specific code
export const useJournalEntries = (status?: "draft" | "posted" | "void", businessUnitCodeOverride?: string) => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  // Use override if provided, otherwise use auto-detected from selected company
  const businessUnitCode = businessUnitCodeOverride !== undefined
    ? businessUnitCodeOverride
    : autoBusinessUnitCode;

  return useQuery({
    queryKey: ["journal-entries", status, effectiveCompanyId, businessUnitCode],
    queryFn: async () => {
      let query = supabase
        .from("journal_entries")
        .select("*, business_unit_code")
        .order("entry_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (status) {
        query = query.eq("status", status);
      }

      // Filter by specific business unit if provided (auto or override)
      if (businessUnitCode && businessUnitCode !== "all") {
        query = query.eq("business_unit_code", businessUnitCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
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
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["financial-periods", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("financial_periods")
        .select("*")
        .order("start_date", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useCurrentPeriod = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["current-period", selectedCompanyId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      let query = supabase
        .from("financial_periods")
        .select("*")
        .lte("start_date", today)
        .gte("end_date", today)
        .eq("is_closed", false);

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query.single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ Customers (AR) ============
// Filters by business_unit_code when a sub-company is selected
export const useCustomers = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["customers", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select("*")
        .order("customer_name");

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      // Filter by business unit for sub-company views
      if (autoBusinessUnitCode) {
        (query as any) = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useCustomerBalance = (customerId: string) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["customer-balance", customerId, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("ar_invoices")
        .select("balance")
        .eq("customer_id", customerId)
        .neq("status", "paid");

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.reduce((sum, inv) => sum + (inv.balance || 0), 0);
    },
    enabled: !!customerId && !!selectedCompanyId,
  });
};

// ============ Vendors (AP) ============
// Filters by business_unit_code when a sub-company is selected
export const useVendors = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["vendors", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      let query = supabase
        .from("vendors")
        .select("*")
        .order("vendor_name");

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      // Filter by business unit for sub-company views
      if (autoBusinessUnitCode) {
        (query as any) = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useVendorBalance = (vendorId: string) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["vendor-balance", vendorId, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("ap_invoices")
        .select("balance")
        .eq("vendor_id", vendorId)
        .neq("status", "paid");

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.reduce((sum, inv) => sum + (inv.balance || 0), 0);
    },
    enabled: !!vendorId && !!selectedCompanyId,
  });
};

// ============ AR Invoices ============
// Filters by business_unit_code when a sub-company is selected
export const useARInvoices = (status?: string) => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["ar-invoices", status, effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      let query: any = supabase
        .from("ar_invoices")
        .select(`
          *,
          customers (
            customer_code,
            customer_name,
            billing_address,
            phone,
            email
          ),
          bus_categories (
            name,
            color,
            code
          )
        `)
        .order("invoice_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      // Filter by business unit for sub-company views
      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ AP Invoices ============
// Filters by business_unit_code when a sub-company is selected
export const useAPInvoices = (status?: string) => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["ap-invoices", status, effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      let query: any = supabase
        .from("ap_invoices")
        .select(`
          *,
          vendors (
            vendor_code,
            vendor_name,
            address,
            bank_account,
            bank_name,
            bank_branch,
            tax_id,
            currency,
            email,
            phone,
            contact_person,
            payment_terms
          )
        `)
        .order("invoice_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      // Filter by business unit for sub-company views
      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ AR Receipts ============
// Filters by business_unit_code when a sub-company is selected
export const useARReceipts = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["ar-receipts", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      let query = supabase
        .from("ar_receipts")
        .select(`
          *,
          customers (
            customer_code,
            customer_name,
            billing_address,
            phone,
            email
          )
        `)
        .order("receipt_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      // Filter by business unit for sub-company views
      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ AP Payments ============
// Filters by business_unit_code when a sub-company is selected
export const useAPPayments = () => {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const autoBusinessUnitCode = useAutoBusinessUnitFilter();

  return useQuery({
    queryKey: ["ap-payments", effectiveCompanyId, autoBusinessUnitCode],
    queryFn: async () => {
      let query = supabase
        .from("ap_payments")
        .select(`
          *,
          vendors (
            vendor_code,
            vendor_name,
            address,
            bank_account,
            bank_name,
            bank_branch,
            tax_id,
            currency,
            email,
            phone,
            contact_person
          ),
          bank_accounts (
            id,
            account_name,
            bank_name,
            account_number
          ),
          vendor_bank_accounts (
            id,
            bank_name,
            bank_branch,
            account_number,
            account_holder_name,
            account_label
          )
        `)
        .order("payment_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      // Filter by business unit for sub-company views
      if (autoBusinessUnitCode) {
        query = query.eq("business_unit_code", autoBusinessUnitCode);
      }

      const { data, error } = await query;
      if (error) {
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
          .order("payment_date", { ascending: false });

        if (effectiveCompanyId) {
          fallbackQuery = fallbackQuery.eq("company_id", effectiveCompanyId);
        }
        if (autoBusinessUnitCode) {
          fallbackQuery = fallbackQuery.eq("business_unit_code", autoBusinessUnitCode);
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        if (fallbackError) throw fallbackError;
        return fallbackData;
      }
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ Bank Accounts ============
// Bank accounts are section-specific (each sub-company can have its own bank accounts)
export const useBankAccounts = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["bank-accounts", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("bank_accounts")
        .select("*")
        .order("account_name");

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useBankTransactions = (bankAccountId?: string) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["bank-transactions", bankAccountId, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("bank_transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .limit(100);

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      if (bankAccountId) {
        query = query.eq("bank_account_id", bankAccountId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

// Reconciliation-specific hook: fetches ALL unreconciled + date-filtered reconciled transactions
export const useBankTransactionsForRecon = (
  bankAccountId?: string,
  fromDate?: string,
  toDate?: string
) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["bank-transactions-recon", bankAccountId, selectedCompanyId, fromDate, toDate],
    queryFn: async () => {
      // Fetch all unreconciled transactions (no limit)
      let unreconciledQuery = supabase
        .from("bank_transactions")
        .select("*")
        .eq("is_reconciled", false)
        .order("transaction_date", { ascending: false });

      if (selectedCompanyId) {
        unreconciledQuery = unreconciledQuery.eq("company_id", selectedCompanyId);
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

        if (selectedCompanyId) {
          reconciledQuery = reconciledQuery.eq("company_id", selectedCompanyId);
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
    enabled: !!selectedCompanyId && !!bankAccountId,
  });
};

export const useBankReconciliations = (bankAccountId?: string) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["bank-reconciliations", bankAccountId, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("bank_reconciliations")
        .select("*")
        .order("reconciliation_date", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      if (bankAccountId) {
        query = query.eq("bank_account_id", bankAccountId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

// Fetch the last completed reconciliation for a bank account (for "Last Statement Balance")
export const useLastReconciliation = (bankAccountId: string | null) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["last-reconciliation", bankAccountId, selectedCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_reconciliations")
        .select("*")
        .eq("bank_account_id", bankAccountId!)
        .eq("status", "completed")
        .order("statement_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!bankAccountId && !!selectedCompanyId,
  });
};

// ============ Fixed Assets ============
export const useFixedAssets = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["fixed-assets", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
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

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useAssetCategories = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["asset-categories", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("asset_categories")
        .select("*")
        .order("category_code");

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useDepreciationSchedule = (assetId?: string) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["depreciation-schedule", assetId, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("asset_depreciation_schedule")
        .select("*")
        .order("depreciation_date", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      if (assetId) {
        query = query.eq("asset_id", assetId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
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
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["cost-centers", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("cost_centers")
        .select("*")
        .eq("is_active", true)
        .order("center_code");

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ Budgets ============
export const useBudgets = (fiscalYear?: number) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["budgets", fiscalYear, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("budgets")
        .select("*")
        .order("budget_name");

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      if (fiscalYear) {
        query = query.eq("fiscal_year", fiscalYear);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ Audit Logs ============
export const useAuditLogs = (tableName?: string, recordId?: string) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["audit-logs", tableName, recordId, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("accounting_audit_log")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(100);

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
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
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ Dashboard Summaries ============
export const useAccountingSummary = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["accounting-summary", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("chart_of_accounts")
        .select("account_type, current_balance")
        .eq("is_active", true);

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
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
    enabled: !!selectedCompanyId,
  });
};

export const useARSummary = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["ar-summary", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("ar_invoices")
        .select("balance, due_date, status")
        .neq("status", "paid");

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
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
    enabled: !!selectedCompanyId,
  });
};

export const useAPSummary = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["ap-summary", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("ap_invoices")
        .select("balance, due_date, status")
        .neq("status", "paid");

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
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
    enabled: !!selectedCompanyId,
  });
};

// ============ Items & Inventory ============
export const useItems = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["items", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("items")
        .select(`*, item_categories (category_name, category_code, valuation_method)`)
        .order("item_code");

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useItemStock = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["item-stock", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("item_stock")
        .select(`*, items (item_code, item_name)`)
        .order("location");

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useItemCategories = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["item-categories", selectedCompanyId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("item_categories")
        .select("*")
        .order("category_name");

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ Purchase Orders & GRN ============
export const usePurchaseOrders = (status?: string) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["purchase-orders", status, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("purchase_orders")
        .select(`*, vendors (vendor_code, vendor_name)`)
        .order("po_date", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useGoodsReceiptNotes = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["goods-receipt-notes", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("goods_receipt_notes")
        .select(`*, vendors (vendor_name), purchase_orders (po_number)`)
        .order("receipt_date", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ Cheque Register ============
export const useChequeRegister = (status?: string) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["cheque-register", status, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("cheque_register")
        .select("*")
        .order("cheque_date", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ Recurring Entries ============
export const useRecurringEntries = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["recurring-entries", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("recurring_journal_entries" as any)
        .select("*")
        .order("template_name");

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedCompanyId,
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
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["purchase-requisitions", status, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("purchase_requisitions" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ Fund Transfers ============
export const useFundTransfers = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["fund-transfers", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("fund_transfers" as any)
        .select("*")
        .order("transfer_date", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ Asset Disposals ============
export const useAssetDisposals = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["asset-disposals", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("asset_disposals")
        .select(`*, fixed_assets (asset_code, asset_name)`)
        .order("disposal_date", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ Bad Debt Provisions ============
export const useBadDebtProvisions = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["bad-debt-provisions", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("ar_bad_debt_provisions")
        .select(`*, customers (customer_code, customer_name), ar_invoices (invoice_number)`)
        .order("provision_date", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ Batch & Serial Numbers ============
export const useBatchNumbers = (itemId?: string) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["batch-numbers", itemId, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("batch_numbers")
        .select(`*, items (item_code, item_name)`)
        .order("batch_number");

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      if (itemId) query = query.eq("item_id", itemId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

export const useSerialNumbers = (itemId?: string) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["serial-numbers", itemId, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("serial_numbers" as any)
        .select(`*, items (item_code, item_name)`)
        .order("serial_number");

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      if (itemId) query = query.eq("item_id", itemId);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ WHT Certificates ============
export const useWHTCertificates = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["wht-certificates", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("wht_certificates" as any)
        .select(`*, vendors (vendor_code, vendor_name)`)
        .order("certificate_date", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ Vendor Performance ============
export const useVendorPerformance = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["vendor-performance", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("vendor_performance" as any)
        .select(`*, vendors (vendor_code, vendor_name)`)
        .order("period_end", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ Bank Reconciliation Items ============
export const useBankReconciliationItems = (reconciliationId?: string) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["bank-reconciliation-items", reconciliationId, selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("bank_reconciliation_items")
        .select("*")
        .order("statement_date", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      if (reconciliationId) query = query.eq("reconciliation_id", reconciliationId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!reconciliationId && !!selectedCompanyId,
  });
};

// ============ Period Closing Checklist ============
export const usePeriodClosingChecklist = (periodId?: string) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["period-closing-checklist", periodId, selectedCompanyId],
    queryFn: async () => {
      if (!periodId) return null;

      const [journals, arInvoices, apInvoices, reconciliations] = await Promise.all([
        supabase.from("journal_entries").select("id, status").eq("period_id", periodId).neq("status", "posted"),
        supabase.from("ar_invoices").select("id, status").eq("period_id", periodId).eq("status", "unpaid"),
        supabase.from("ap_invoices").select("id, status").eq("period_id", periodId).eq("status", "unpaid"),
        supabase.from("bank_reconciliations").select("id, status").neq("status", "completed"),
      ]);

      return {
        unpostedJournals: journals.data?.length || 0,
        unpaidARInvoices: arInvoices.data?.length || 0,
        unpaidAPInvoices: apInvoices.data?.length || 0,
        pendingReconciliations: reconciliations.data?.length || 0,
      };
    },
    enabled: !!periodId && !!selectedCompanyId,
  });
};

// ============ AR Credit Notes ============
export const useARCreditNotes = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["ar-credit-notes", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("ar_credit_notes")
        .select(`
          *,
          customers (customer_code, customer_name),
          ar_invoices (invoice_number)
        `)
        .order("credit_date", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ AP Debit Notes ============
export const useAPDebitNotes = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["ap-debit-notes", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("ap_debit_notes")
        .select(`
          *,
          vendors (vendor_code, vendor_name),
          ap_invoices (invoice_number)
        `)
        .order("debit_date", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ Asset Revaluations ============
export const useAssetRevaluations = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["asset-revaluations", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("asset_revaluations")
        .select(`
          *,
          fixed_assets (asset_code, asset_name)
        `)
        .order("revaluation_date", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ Asset Transfers ============
export const useAssetTransfers = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["asset-transfers", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("asset_transfers")
        .select(`
          *,
          fixed_assets (asset_code, asset_name)
        `)
        .order("transfer_date", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ SSCL Transactions ============
export const useSSCLTransactions = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["sscl-transactions", selectedCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("sscl_transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
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

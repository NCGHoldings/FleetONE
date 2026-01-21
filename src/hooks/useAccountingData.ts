// Centralized data fetching hooks for all accounting modules
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ============ Chart of Accounts ============
export const useChartOfAccounts = () => {
  return useQuery({
    queryKey: ["chart-of-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .order("account_code");
      if (error) throw error;
      return data;
    },
  });
};

export const useAccountsByType = (accountType: "asset" | "liability" | "equity" | "revenue" | "expense") => {
  return useQuery({
    queryKey: ["accounts-by-type", accountType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("account_type", accountType)
        .eq("is_active", true)
        .order("account_code");
      if (error) throw error;
      return data;
    },
  });
};

// ============ Journal Entries ============
export const useJournalEntries = (status?: "draft" | "posted" | "void") => {
  return useQuery({
    queryKey: ["journal-entries", status],
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

export const useJournalEntryLines = (entryId: string) => {
  return useQuery({
    queryKey: ["journal-entry-lines", entryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select(`
          *,
          chart_of_accounts (
            account_code,
            account_name,
            account_type
          )
        `)
        .eq("journal_entry_id", entryId)
        .order("line_number");
      if (error) throw error;
      return data;
    },
    enabled: !!entryId,
  });
};

// ============ Financial Periods ============
export const useFinancialPeriods = () => {
  return useQuery({
    queryKey: ["financial-periods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_periods")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useCurrentPeriod = () => {
  return useQuery({
    queryKey: ["current-period"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("financial_periods")
        .select("*")
        .lte("start_date", today)
        .gte("end_date", today)
        .eq("is_closed", false)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });
};

// ============ Customers (AR) ============
export const useCustomers = () => {
  return useQuery({
    queryKey: ["customers"],
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

export const useCustomerBalance = (customerId: string) => {
  return useQuery({
    queryKey: ["customer-balance", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_invoices")
        .select("balance")
        .eq("customer_id", customerId)
        .neq("status", "paid");
      if (error) throw error;
      return data.reduce((sum, inv) => sum + (inv.balance || 0), 0);
    },
    enabled: !!customerId,
  });
};

// ============ Vendors (AP) ============
export const useVendors = () => {
  return useQuery({
    queryKey: ["vendors"],
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

export const useVendorBalance = (vendorId: string) => {
  return useQuery({
    queryKey: ["vendor-balance", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ap_invoices")
        .select("balance")
        .eq("vendor_id", vendorId)
        .neq("status", "paid");
      if (error) throw error;
      return data.reduce((sum, inv) => sum + (inv.balance || 0), 0);
    },
    enabled: !!vendorId,
  });
};

// ============ AR Invoices ============
export const useARInvoices = (status?: string) => {
  return useQuery({
    queryKey: ["ar-invoices", status],
    queryFn: async () => {
      let query = supabase
        .from("ar_invoices")
        .select(`
          *,
          customers (
            customer_code,
            customer_name
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

// ============ AP Invoices ============
export const useAPInvoices = (status?: string) => {
  return useQuery({
    queryKey: ["ap-invoices", status],
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

// ============ AR Receipts ============
export const useARReceipts = () => {
  return useQuery({
    queryKey: ["ar-receipts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_receipts")
        .select(`
          *,
          customers (
            customer_code,
            customer_name
          )
        `)
        .order("receipt_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

// ============ AP Payments ============
export const useAPPayments = () => {
  return useQuery({
    queryKey: ["ap-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ap_payments")
        .select(`
          *,
          vendors (
            vendor_code,
            vendor_name
          )
        `)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

// ============ Bank Accounts ============
export const useBankAccounts = () => {
  return useQuery({
    queryKey: ["bank-accounts"],
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

export const useBankTransactions = (bankAccountId?: string) => {
  return useQuery({
    queryKey: ["bank-transactions", bankAccountId],
    queryFn: async () => {
      let query = supabase
        .from("bank_transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .limit(100);
      
      if (bankAccountId) {
        query = query.eq("bank_account_id", bankAccountId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useBankReconciliations = (bankAccountId?: string) => {
  return useQuery({
    queryKey: ["bank-reconciliations", bankAccountId],
    queryFn: async () => {
      let query = supabase
        .from("bank_reconciliations")
        .select("*")
        .order("reconciliation_date", { ascending: false });
      
      if (bankAccountId) {
        query = query.eq("bank_account_id", bankAccountId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

// ============ Fixed Assets ============
export const useFixedAssets = () => {
  return useQuery({
    queryKey: ["fixed-assets"],
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

export const useAssetCategories = () => {
  return useQuery({
    queryKey: ["asset-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_categories")
        .select("*")
        .order("category_code");
      if (error) throw error;
      return data;
    },
  });
};

export const useDepreciationSchedule = (assetId?: string) => {
  return useQuery({
    queryKey: ["depreciation-schedule", assetId],
    queryFn: async () => {
      let query = supabase
        .from("asset_depreciation_schedule")
        .select("*")
        .order("depreciation_date", { ascending: false });
      
      if (assetId) {
        query = query.eq("asset_id", assetId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
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
  return useQuery({
    queryKey: ["cost-centers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_centers")
        .select("*")
        .eq("is_active", true)
        .order("cost_center_code");
      if (error) throw error;
      return data;
    },
  });
};

// ============ Budgets ============
export const useBudgets = (fiscalYear?: number) => {
  return useQuery({
    queryKey: ["budgets", fiscalYear],
    queryFn: async () => {
      let query = supabase
        .from("budgets")
        .select("*")
        .order("budget_name");
      
      if (fiscalYear) {
        query = query.eq("fiscal_year", fiscalYear);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

// ============ Audit Logs ============
export const useAuditLogs = (tableName?: string, recordId?: string) => {
  return useQuery({
    queryKey: ["audit-logs", tableName, recordId],
    queryFn: async () => {
      let query = supabase
        .from("accounting_audit_log")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(100);
      
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
  });
};

// ============ Dashboard Summaries ============
export const useAccountingSummary = () => {
  return useQuery({
    queryKey: ["accounting-summary"],
    queryFn: async () => {
      // Fetch totals by account type
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

export const useARSummary = () => {
  return useQuery({
    queryKey: ["ar-summary"],
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

export const useAPSummary = () => {
  return useQuery({
    queryKey: ["ap-summary"],
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

// ============ Items & Inventory ============
export const useItems = () => {
  return useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select(`*, item_categories (category_name, category_code, valuation_method)`)
        .order("item_code");
      if (error) throw error;
      return data;
    },
  });
};

export const useItemStock = () => {
  return useQuery({
    queryKey: ["item-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_stock")
        .select(`*, items (item_code, item_name)`)
        .order("location");
      if (error) throw error;
      return data;
    },
  });
};

export const useItemCategories = () => {
  return useQuery({
    queryKey: ["item-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_categories")
        .select("*")
        .order("category_name");
      if (error) throw error;
      return data;
    },
  });
};

// ============ Purchase Orders & GRN ============
export const usePurchaseOrders = (status?: string) => {
  return useQuery({
    queryKey: ["purchase-orders", status],
    queryFn: async () => {
      let query = supabase
        .from("purchase_orders")
        .select(`*, vendors (vendor_code, vendor_name)`)
        .order("po_date", { ascending: false });
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useGoodsReceiptNotes = () => {
  return useQuery({
    queryKey: ["goods-receipt-notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goods_receipt_notes")
        .select(`*, vendors (vendor_name), purchase_orders (po_number)`)
        .order("receipt_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

// ============ Cheque Register ============
export const useChequeRegister = (status?: string) => {
  return useQuery({
    queryKey: ["cheque-register", status],
    queryFn: async () => {
      let query = supabase
        .from("cheque_register")
        .select("*")
        .order("cheque_date", { ascending: false });
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

// ============ Recurring Entries ============
export const useRecurringEntries = () => {
  return useQuery({
    queryKey: ["recurring-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_journal_entries" as any)
        .select("*")
        .order("template_name");
      if (error) throw error;
      return data as any[];
    },
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
  return useQuery({
    queryKey: ["purchase-requisitions", status],
    queryFn: async () => {
      let query = supabase
        .from("purchase_requisitions" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
};

// ============ Fund Transfers ============
export const useFundTransfers = () => {
  return useQuery({
    queryKey: ["fund-transfers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fund_transfers" as any)
        .select("*")
        .order("transfer_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
};

// ============ Asset Disposals ============
export const useAssetDisposals = () => {
  return useQuery({
    queryKey: ["asset-disposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_disposals")
        .select(`*, fixed_assets (asset_code, asset_name)`)
        .order("disposal_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

// ============ Bad Debt Provisions ============
export const useBadDebtProvisions = () => {
  return useQuery({
    queryKey: ["bad-debt-provisions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_bad_debt_provisions")
        .select(`*, customers (customer_code, customer_name), ar_invoices (invoice_number)`)
        .order("provision_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

// ============ Batch & Serial Numbers ============
export const useBatchNumbers = (itemId?: string) => {
  return useQuery({
    queryKey: ["batch-numbers", itemId],
    queryFn: async () => {
      let query = supabase
        .from("batch_numbers")
        .select(`*, items (item_code, item_name)`)
        .order("batch_number");
      if (itemId) query = query.eq("item_id", itemId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useSerialNumbers = (itemId?: string) => {
  return useQuery({
    queryKey: ["serial-numbers", itemId],
    queryFn: async () => {
      let query = supabase
        .from("serial_numbers" as any)
        .select(`*, items (item_code, item_name)`)
        .order("serial_number");
      if (itemId) query = query.eq("item_id", itemId);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
};

// ============ WHT Certificates ============
export const useWHTCertificates = () => {
  return useQuery({
    queryKey: ["wht-certificates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wht_certificates" as any)
        .select(`*, vendors (vendor_code, vendor_name)`)
        .order("certificate_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
};

// ============ Vendor Performance ============
export const useVendorPerformance = () => {
  return useQuery({
    queryKey: ["vendor-performance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_performance" as any)
        .select(`*, vendors (vendor_code, vendor_name)`)
        .order("period_end", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
};

// ============ Bank Reconciliation Items ============
export const useBankReconciliationItems = (reconciliationId?: string) => {
  return useQuery({
    queryKey: ["bank-reconciliation-items", reconciliationId],
    queryFn: async () => {
      let query = supabase
        .from("bank_reconciliation_items" as any)
        .select(`*, bank_transactions (*)`)
        .order("statement_date", { ascending: false });
      if (reconciliationId) query = query.eq("reconciliation_id", reconciliationId);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!reconciliationId,
  });
};

// ============ Period Closing Checklist ============
export const usePeriodClosingChecklist = (periodId?: string) => {
  return useQuery({
    queryKey: ["period-closing-checklist", periodId],
    queryFn: async () => {
      // Check various conditions for period closing
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
    enabled: !!periodId,
  });
};

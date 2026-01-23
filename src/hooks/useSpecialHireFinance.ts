import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { format } from "date-fns";

// Helper function to update COA balances after journal entry creation
// This follows proper double-entry bookkeeping rules:
// - Assets and Expenses are "debit normal" (debit increases balance)
// - Liabilities, Equity, and Revenue are "credit normal" (credit increases balance)
async function updateAccountBalancesFromJournalEntry(journalEntryId: string) {
  const { data: lines, error: linesError } = await supabase
    .from("journal_entry_lines")
    .select(`
      account_id,
      debit,
      credit
    `)
    .eq("journal_entry_id", journalEntryId);

  if (linesError) {
    console.error("Error fetching journal entry lines:", linesError);
    throw linesError;
  }

  if (!lines || lines.length === 0) return;

  for (const line of lines) {
    if (!line.account_id) continue;

    const { data: account, error: accountError } = await supabase
      .from("chart_of_accounts")
      .select("current_balance, account_type")
      .eq("id", line.account_id)
      .single();

    if (accountError || !account) {
      console.error("Error fetching account:", accountError);
      continue;
    }

    const netAmount = (line.debit || 0) - (line.credit || 0);
    const isDebitNormal = ["asset", "expense"].includes(account.account_type || "");
    const adjustment = isDebitNormal ? netAmount : -netAmount;

    const { error: updateError } = await supabase
      .from("chart_of_accounts")
      .update({
        current_balance: (account.current_balance || 0) + adjustment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", line.account_id);

    if (updateError) {
      console.error("Error updating account balance:", updateError);
    }
  }
}

export interface SpecialHireFinanceSettings {
  id: string;
  company_id: string;
  // Revenue Accounts
  revenue_internal_account_id: string | null;
  revenue_external_account_id: string | null;
  // Receivable Account
  trade_receivable_account_id: string | null;
  // Customer Advance (Liability)
  customer_advance_account_id: string | null;
  // Bank/Cash Accounts
  default_bank_account_id: string | null;
  // Expense Accounts
  discount_expense_account_id: string | null;
  commission_expense_account_id: string | null;
  refund_expense_account_id: string | null;
  // Tax Accounts (optional)
  vat_output_account_id: string | null;
  wht_payable_account_id: string | null;
  // Auto-posting settings
  auto_post_advance_payments: boolean;
  auto_post_invoices: boolean;
  auto_post_balance_payments: boolean;
  // Numbering prefixes
  invoice_prefix: string;
  advance_receipt_prefix: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Helper to convert empty strings to null for UUID fields
function sanitizeSettingsForDB(settings: Record<string, any>): Record<string, any> {
  const uuidFields = [
    'revenue_internal_account_id',
    'revenue_external_account_id',
    'trade_receivable_account_id',
    'customer_advance_account_id',
    'default_bank_account_id',
    'discount_expense_account_id',
    'commission_expense_account_id',
    'refund_expense_account_id',
    'vat_output_account_id',
    'wht_payable_account_id',
  ];
  
  const sanitized = { ...settings };
  uuidFields.forEach(field => {
    if (sanitized[field] === '' || sanitized[field] === undefined) {
      sanitized[field] = null;
    }
  });
  
  return sanitized;
}

// Fetch finance settings
export function useSpecialHireFinanceSettings() {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["special-hire-finance-settings", effectiveCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_hire_finance_settings")
        .select(`
          *,
          revenue_internal_account:chart_of_accounts!special_hire_finance_settings_revenue_internal_account_id_fkey(id, account_code, account_name),
          revenue_external_account:chart_of_accounts!special_hire_finance_settings_revenue_external_account_id_fkey(id, account_code, account_name),
          trade_receivable_account:chart_of_accounts!special_hire_finance_settings_trade_receivable_account_id_fkey(id, account_code, account_name),
          customer_advance_account:chart_of_accounts!special_hire_finance_settings_customer_advance_account_id_fkey(id, account_code, account_name),
          default_bank_account:chart_of_accounts!special_hire_finance_settings_default_bank_account_id_fkey(id, account_code, account_name),
          discount_expense_account:chart_of_accounts!special_hire_finance_settings_discount_expense_account_id_fkey(id, account_code, account_name),
          commission_expense_account:chart_of_accounts!special_hire_finance_settings_commission_expense_account_id_fkey(id, account_code, account_name),
          refund_expense_account:chart_of_accounts!special_hire_finance_settings_refund_expense_account_id_fkey(id, account_code, account_name),
          vat_output_account:chart_of_accounts!special_hire_finance_settings_vat_output_account_id_fkey(id, account_code, account_name),
          wht_payable_account:chart_of_accounts!special_hire_finance_settings_wht_payable_account_id_fkey(id, account_code, account_name)
        `)
        .eq("company_id", effectiveCompanyId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId,
  });
}

// Update or create finance settings
export function useUpdateSpecialHireFinanceSettings() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useMutation({
    mutationFn: async (settings: Partial<SpecialHireFinanceSettings>) => {
      const sanitizedSettings = sanitizeSettingsForDB(settings);
      
      const { data: existing } = await supabase
        .from("special_hire_finance_settings")
        .select("id")
        .eq("company_id", effectiveCompanyId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("special_hire_finance_settings")
          .update({
            ...sanitizedSettings,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("special_hire_finance_settings")
          .insert({
            ...sanitizedSettings,
            company_id: effectiveCompanyId,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-hire-finance-settings"] });
      toast.success("Special Hire finance settings updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });
}

// Post advance payment to GL
// DR Bank/Cash (Asset) | CR Customer Advance Receipt (Liability)
export function usePostAdvancePaymentToGL() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode() || 'SPH';

  return useMutation({
    mutationFn: async ({
      quotationNo,
      customerName,
      amount,
      settings,
      paymentMethod,
    }: {
      quotationNo: string;
      customerName: string;
      amount: number;
      settings: SpecialHireFinanceSettings;
      paymentMethod?: string;
    }) => {
      if (!settings.default_bank_account_id || !settings.customer_advance_account_id) {
        throw new Error("GL accounts not configured. Please configure Special Hire Finance Settings.");
      }

      const entryNumber = `SPH-ADV-${quotationNo}-${Date.now().toString(36).toUpperCase()}`;

      // Create journal entry
      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: format(new Date(), "yyyy-MM-dd"),
          description: `Advance payment received - ${customerName} - ${quotationNo}`,
          reference: quotationNo,
          total_debit: amount,
          total_credit: amount,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // Create journal entry lines
      // DR Bank/Cash (Asset increases with Debit)
      // CR Customer Advance Receipt (Liability increases with Credit)
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: settings.default_bank_account_id,
            description: `Advance received - ${customerName} (${quotationNo})`,
            debit: amount,
            credit: 0,
            company_id: effectiveCompanyId,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: settings.customer_advance_account_id,
            description: `Customer advance - ${customerName}`,
            debit: 0,
            credit: amount,
            company_id: effectiveCompanyId,
          },
        ]);

      if (linesError) throw linesError;

      // Update COA balances
      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
    },
    onError: (error) => {
      console.error("Error posting advance payment to GL:", error);
    },
  });
}

// Post invoice to GL (when trip is completed and invoice generated)
// DR Trade Receivable (Asset) | CR Special Hire Revenue (Revenue)
export function usePostInvoiceToGL() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode() || 'SPH';

  return useMutation({
    mutationFn: async ({
      invoiceNo,
      quotationNo,
      customerName,
      totalAmount,
      isInternal,
      settings,
    }: {
      invoiceNo: string;
      quotationNo: string;
      customerName: string;
      totalAmount: number;
      isInternal?: boolean;
      settings: SpecialHireFinanceSettings;
    }) => {
      const revenueAccountId = isInternal 
        ? settings.revenue_internal_account_id 
        : settings.revenue_external_account_id;

      if (!settings.trade_receivable_account_id || !revenueAccountId) {
        throw new Error("GL accounts not configured. Please configure Special Hire Finance Settings.");
      }

      const entryNumber = `SPH-INV-${invoiceNo}-${Date.now().toString(36).toUpperCase()}`;

      // Create journal entry
      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: format(new Date(), "yyyy-MM-dd"),
          description: `Special hire invoice - ${customerName} - ${invoiceNo}`,
          reference: quotationNo,
          total_debit: totalAmount,
          total_credit: totalAmount,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // Create journal entry lines
      // DR Trade Receivable (Asset increases with Debit)
      // CR Special Hire Revenue (Revenue increases with Credit)
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: settings.trade_receivable_account_id,
            description: `Receivable - ${customerName} (${invoiceNo})`,
            debit: totalAmount,
            credit: 0,
            company_id: effectiveCompanyId,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: revenueAccountId,
            description: `Revenue - Special Hire ${invoiceNo}`,
            debit: 0,
            credit: totalAmount,
            company_id: effectiveCompanyId,
          },
        ]);

      if (linesError) throw linesError;

      // Update COA balances
      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
    },
    onError: (error) => {
      console.error("Error posting invoice to GL:", error);
    },
  });
}

// Apply advance payment to invoice (reduces both liability and receivable)
// DR Customer Advance Receipt (Liability) | CR Trade Receivable (Asset)
export function useApplyAdvanceToInvoice() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode() || 'SPH';

  return useMutation({
    mutationFn: async ({
      invoiceNo,
      quotationNo,
      customerName,
      advanceAmount,
      settings,
    }: {
      invoiceNo: string;
      quotationNo: string;
      customerName: string;
      advanceAmount: number;
      settings: SpecialHireFinanceSettings;
    }) => {
      if (!settings.customer_advance_account_id || !settings.trade_receivable_account_id) {
        throw new Error("GL accounts not configured. Please configure Special Hire Finance Settings.");
      }

      const entryNumber = `SPH-ADV-APPLY-${invoiceNo}-${Date.now().toString(36).toUpperCase()}`;

      // Create journal entry
      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: format(new Date(), "yyyy-MM-dd"),
          description: `Apply advance to invoice - ${customerName} - ${invoiceNo}`,
          reference: quotationNo,
          total_debit: advanceAmount,
          total_credit: advanceAmount,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // Create journal entry lines
      // DR Customer Advance (Liability decreases with Debit)
      // CR Trade Receivable (Asset decreases with Credit)
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: settings.customer_advance_account_id,
            description: `Apply advance - ${customerName} (${invoiceNo})`,
            debit: advanceAmount,
            credit: 0,
            company_id: effectiveCompanyId,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: settings.trade_receivable_account_id,
            description: `Reduce receivable - ${customerName}`,
            debit: 0,
            credit: advanceAmount,
            company_id: effectiveCompanyId,
          },
        ]);

      if (linesError) throw linesError;

      // Update COA balances
      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
    },
    onError: (error) => {
      console.error("Error applying advance to invoice:", error);
    },
  });
}

// Post balance payment to GL
// DR Bank/Cash (Asset) | CR Trade Receivable (Asset)
export function usePostBalancePaymentToGL() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode() || 'SPH';

  return useMutation({
    mutationFn: async ({
      quotationNo,
      invoiceNo,
      customerName,
      balanceAmount,
      settings,
    }: {
      quotationNo: string;
      invoiceNo?: string;
      customerName: string;
      balanceAmount: number;
      settings: SpecialHireFinanceSettings;
    }) => {
      if (!settings.default_bank_account_id || !settings.trade_receivable_account_id) {
        throw new Error("GL accounts not configured. Please configure Special Hire Finance Settings.");
      }

      const entryNumber = `SPH-BAL-${quotationNo}-${Date.now().toString(36).toUpperCase()}`;

      // Create journal entry
      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: format(new Date(), "yyyy-MM-dd"),
          description: `Balance payment received - ${customerName} - ${quotationNo}`,
          reference: invoiceNo || quotationNo,
          total_debit: balanceAmount,
          total_credit: balanceAmount,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // Create journal entry lines
      // DR Bank/Cash (Asset increases with Debit)
      // CR Trade Receivable (Asset decreases with Credit)
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: settings.default_bank_account_id,
            description: `Balance payment - ${customerName} (${quotationNo})`,
            debit: balanceAmount,
            credit: 0,
            company_id: effectiveCompanyId,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: settings.trade_receivable_account_id,
            description: `Clear receivable - ${customerName}`,
            debit: 0,
            credit: balanceAmount,
            company_id: effectiveCompanyId,
          },
        ]);

      if (linesError) throw linesError;

      // Update COA balances
      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
    },
    onError: (error) => {
      console.error("Error posting balance payment to GL:", error);
    },
  });
}

// Post refund to GL
// DR Customer Advance Receipt (Liability) | CR Bank/Cash (Asset)
export function usePostRefundToGL() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode() || 'SPH';

  return useMutation({
    mutationFn: async ({
      quotationNo,
      customerName,
      refundAmount,
      reason,
      settings,
    }: {
      quotationNo: string;
      customerName: string;
      refundAmount: number;
      reason?: string;
      settings: SpecialHireFinanceSettings;
    }) => {
      if (!settings.customer_advance_account_id || !settings.default_bank_account_id) {
        throw new Error("GL accounts not configured. Please configure Special Hire Finance Settings.");
      }

      const entryNumber = `SPH-REF-${quotationNo}-${Date.now().toString(36).toUpperCase()}`;

      // Create journal entry
      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: format(new Date(), "yyyy-MM-dd"),
          description: `Refund issued - ${customerName} - ${quotationNo}${reason ? ` (${reason})` : ''}`,
          reference: quotationNo,
          total_debit: refundAmount,
          total_credit: refundAmount,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // Create journal entry lines
      // DR Customer Advance (Liability decreases with Debit)
      // CR Bank/Cash (Asset decreases with Credit)
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: settings.customer_advance_account_id,
            description: `Refund advance - ${customerName} (${quotationNo})`,
            debit: refundAmount,
            credit: 0,
            company_id: effectiveCompanyId,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: settings.default_bank_account_id,
            description: `Refund payment - ${customerName}`,
            debit: 0,
            credit: refundAmount,
            company_id: effectiveCompanyId,
          },
        ]);

      if (linesError) throw linesError;

      // Update COA balances
      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
    },
    onError: (error) => {
      console.error("Error posting refund to GL:", error);
    },
  });
}

// Post discount to GL (reduces revenue/receivable)
// DR Discount Expense OR Revenue Reduction | CR Trade Receivable
export function usePostDiscountToGL() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode() || 'SPH';

  return useMutation({
    mutationFn: async ({
      invoiceNo,
      quotationNo,
      customerName,
      discountAmount,
      settings,
    }: {
      invoiceNo: string;
      quotationNo: string;
      customerName: string;
      discountAmount: number;
      settings: SpecialHireFinanceSettings;
    }) => {
      if (!settings.discount_expense_account_id || !settings.trade_receivable_account_id) {
        throw new Error("GL accounts not configured. Please configure discount expense account.");
      }

      const entryNumber = `SPH-DISC-${invoiceNo}-${Date.now().toString(36).toUpperCase()}`;

      // Create journal entry
      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: format(new Date(), "yyyy-MM-dd"),
          description: `Discount given - ${customerName} - ${invoiceNo}`,
          reference: quotationNo,
          total_debit: discountAmount,
          total_credit: discountAmount,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // Create journal entry lines
      // DR Discount Expense (Expense increases with Debit)
      // CR Trade Receivable (Asset decreases with Credit)
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: settings.discount_expense_account_id,
            description: `Discount expense - ${customerName} (${invoiceNo})`,
            debit: discountAmount,
            credit: 0,
            company_id: effectiveCompanyId,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: settings.trade_receivable_account_id,
            description: `Reduce receivable for discount - ${customerName}`,
            debit: 0,
            credit: discountAmount,
            company_id: effectiveCompanyId,
          },
        ]);

      if (linesError) throw linesError;

      // Update COA balances
      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
    },
    onError: (error) => {
      console.error("Error posting discount to GL:", error);
    },
  });
}

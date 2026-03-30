import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany, NCG_HOLDING_ID } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { format } from "date-fns";

// Standalone function to fetch Special Hire finance settings (for use outside React hooks)
export async function fetchSpecialHireFinanceSettings(companyId?: string): Promise<any> {
  // Default to NCG Holding if no company ID provided
  const effectiveCompanyId = companyId || NCG_HOLDING_ID;
  
  const { data, error } = await supabase
    .from("special_hire_finance_settings")
    .select("*")
    .eq("company_id", effectiveCompanyId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching Special Hire finance settings:", error);
    return null;
  }
  return data;
}

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

// Standalone function to post advance payment to GL (for use outside React hooks)
export async function postAdvancePaymentToGLStandalone({
  quotationNo,
  customerName,
  amount,
  settings,
  effectiveCompanyId,
}: {
  quotationNo: string;
  customerName: string;
  amount: number;
  settings: any;
  effectiveCompanyId: string;
}) {
  if (!settings?.default_bank_account_id || !settings?.customer_advance_account_id) {
    console.warn("GL accounts not configured for Special Hire advance payments");
    return null;
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
      business_unit_code: "SPH",
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
}

// Standalone function to post FULL payment to GL (follows AR flow: DR Bank / CR Customer Advance)
// Full payments now go through the same advance flow, then AR Invoice handles revenue recognition
export async function postFullPaymentToGLStandalone({
  quotationNo,
  customerName,
  amount,
  settings,
  effectiveCompanyId,
}: {
  quotationNo: string;
  customerName: string;
  amount: number;
  settings: any;
  effectiveCompanyId: string;
}) {
  if (!settings?.default_bank_account_id || !settings?.customer_advance_account_id) {
    console.warn("GL accounts not configured for Special Hire full payments");
    return null;
  }

  const entryNumber = `SPH-FULL-${quotationNo}-${Date.now().toString(36).toUpperCase()}`;

  // Create journal entry — same as advance: DR Bank / CR Customer Advance
  const { data: journalEntry, error: jeError } = await supabase
    .from("journal_entries")
    .insert({
      entry_number: entryNumber,
      entry_date: format(new Date(), "yyyy-MM-dd"),
      description: `Full payment received - ${customerName} - ${quotationNo}`,
      reference: quotationNo,
      total_debit: amount,
      total_credit: amount,
      status: "posted",
      company_id: effectiveCompanyId,
      business_unit_code: "SPH",
      posted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (jeError) throw jeError;

  // DR Bank/Cash (Asset increases with Debit)
  // CR Customer Advance (Liability increases with Credit) — revenue recognized later via AR Invoice
  const { error: linesError } = await supabase
    .from("journal_entry_lines")
    .insert([
      {
        journal_entry_id: journalEntry.id,
        account_id: settings.default_bank_account_id,
        description: `Full payment received - ${customerName} (${quotationNo})`,
        debit: amount,
        credit: 0,
        company_id: effectiveCompanyId,
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: settings.customer_advance_account_id,
        description: `Customer advance - Full payment ${quotationNo}`,
        debit: 0,
        credit: amount,
        company_id: effectiveCompanyId,
      },
    ]);

  if (linesError) throw linesError;

  // Update COA balances
  await updateAccountBalancesFromJournalEntry(journalEntry.id);

  return journalEntry;
}

// Standalone function to post balance payment to GL (for use outside React hooks)
export async function postBalancePaymentToGLStandalone({
  quotationNo,
  invoiceNo,
  customerName,
  balanceAmount,
  settings,
  effectiveCompanyId,
}: {
  quotationNo: string;
  invoiceNo?: string;
  customerName: string;
  balanceAmount: number;
  settings: any;
  effectiveCompanyId: string;
}) {
  if (!settings?.default_bank_account_id || !settings?.trade_receivable_account_id) {
    console.warn("GL accounts not configured for Special Hire balance payments");
    return null;
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
      business_unit_code: "SPH",
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
}

// Standalone function to post refund to GL
export async function postRefundToGLStandalone({
  quotationNo,
  customerName,
  refundAmount,
  reason,
  settings,
  effectiveCompanyId,
}: {
  quotationNo: string;
  customerName: string;
  refundAmount: number;
  reason?: string;
  settings: any;
  effectiveCompanyId: string;
}) {
  if (!settings?.customer_advance_account_id || !settings?.default_bank_account_id) {
    console.warn("GL accounts not configured for Special Hire refunds");
    return null;
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
      business_unit_code: "SPH",
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
}

// Standalone function to post invoice to GL (Revenue recognition)
export async function postInvoiceToGLStandalone({
  invoiceNo,
  quotationNo,
  customerName,
  totalAmount,
  isInternal,
  settings,
  effectiveCompanyId,
}: {
  invoiceNo: string;
  quotationNo: string;
  customerName: string;
  totalAmount: number;
  isInternal?: boolean;
  settings: any;
  effectiveCompanyId: string;
}) {
  const revenueAccountId = isInternal 
    ? settings?.revenue_internal_account_id 
    : settings?.revenue_external_account_id;

  if (!settings?.trade_receivable_account_id || !revenueAccountId) {
    console.warn("GL accounts not configured for Special Hire invoices");
    return null;
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
      business_unit_code: "SPH",
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
}

// Standalone function to apply advance to invoice
export async function applyAdvanceToInvoiceStandalone({
  invoiceNo,
  quotationNo,
  customerName,
  advanceAmount,
  settings,
  effectiveCompanyId,
}: {
  invoiceNo: string;
  quotationNo: string;
  customerName: string;
  advanceAmount: number;
  settings: any;
  effectiveCompanyId: string;
}) {
  if (!settings?.customer_advance_account_id || !settings?.trade_receivable_account_id) {
    console.warn("GL accounts not configured for Special Hire advance application");
    return null;
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
      business_unit_code: "SPH",
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
}

// Standalone function to post post-trip adjustment to GL
// When a trip has extra KM, extra time, or additional expenses, this records the additional revenue
// DR Trade Receivable (Asset) | CR Special Hire Revenue (Revenue)
export async function postPostTripAdjustmentToGLStandalone({
  quotationNo,
  customerName,
  adjustmentAmount,
  adjustmentDetails,
  isInternal,
  settings,
  effectiveCompanyId,
}: {
  quotationNo: string;
  customerName: string;
  adjustmentAmount: number;
  adjustmentDetails?: string;
  isInternal?: boolean;
  settings: any;
  effectiveCompanyId: string;
}) {
  if (adjustmentAmount <= 0) {
    console.log("[SPH GL] No positive adjustment to post");
    return null;
  }

  const revenueAccountId = isInternal
    ? settings?.revenue_internal_account_id
    : settings?.revenue_external_account_id;

  if (!settings?.trade_receivable_account_id || !revenueAccountId) {
    console.warn("GL accounts not configured for Special Hire adjustments");
    return null;
  }

  const entryNumber = `SPH-ADJ-${quotationNo}-${Date.now().toString(36).toUpperCase()}`;
  const description = adjustmentDetails
    ? `Post-trip adjustment - ${customerName} - ${quotationNo} (${adjustmentDetails})`
    : `Post-trip adjustment - ${customerName} - ${quotationNo}`;

  // Create journal entry
  const { data: journalEntry, error: jeError } = await supabase
    .from("journal_entries")
    .insert({
      entry_number: entryNumber,
      entry_date: format(new Date(), "yyyy-MM-dd"),
      description,
      reference: quotationNo,
      total_debit: adjustmentAmount,
      total_credit: adjustmentAmount,
      status: "posted",
      company_id: effectiveCompanyId,
      business_unit_code: "SPH",
      posted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (jeError) throw jeError;

  // Create journal entry lines
  // DR Trade Receivable (customer owes more)
  // CR Revenue (additional revenue recognized)
  const { error: linesError } = await supabase
    .from("journal_entry_lines")
    .insert([
      {
        journal_entry_id: journalEntry.id,
        account_id: settings.trade_receivable_account_id,
        description: `Adjustment receivable - ${customerName} (${quotationNo})`,
        debit: adjustmentAmount,
        credit: 0,
        company_id: effectiveCompanyId,
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: revenueAccountId,
        description: `Adjustment revenue - ${quotationNo}`,
        debit: 0,
        credit: adjustmentAmount,
        company_id: effectiveCompanyId,
      },
    ]);

  if (linesError) throw linesError;

  // Update COA balances
  await updateAccountBalancesFromJournalEntry(journalEntry.id);

  return journalEntry;
}

// Standalone function to post discount to GL
// When a discount is applied, this reduces the receivable
// DR Discount Expense (Expense) | CR Trade Receivable (Asset)
export async function postDiscountToGLStandalone({
  invoiceNo,
  quotationNo,
  customerName,
  discountAmount,
  settings,
  effectiveCompanyId,
}: {
  invoiceNo: string;
  quotationNo: string;
  customerName: string;
  discountAmount: number;
  settings: any;
  effectiveCompanyId: string;
}) {
  if (discountAmount <= 0) {
    console.log("[SPH GL] No discount to post");
    return null;
  }

  if (!settings?.discount_expense_account_id || !settings?.trade_receivable_account_id) {
    console.warn("GL accounts not configured for Special Hire discounts");
    return null;
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
      business_unit_code: "SPH",
      posted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (jeError) throw jeError;

  // Create journal entry lines
  // DR Discount Expense (Expense increases)
  // CR Trade Receivable (Asset decreases — customer owes less)
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

// =============================================
// AR INVOICE & CUSTOMER INTEGRATION FUNCTIONS
// =============================================

// Standalone function to create or get SPH customer with fallback
export async function createOrGetSPHCustomer({
  customerName,
  customerPhone,
  customerEmail,
  companyId,
}: {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  companyId: string;
}): Promise<string | null> {
  try {
    console.log('[SPH AR] Creating/getting customer:', customerName);
    
    // Try RPC function first
    const { data, error } = await supabase.rpc('create_or_get_sph_customer', {
      p_customer_name: customerName,
      p_customer_phone: customerPhone || null,
      p_customer_email: customerEmail || null,
      p_company_id: companyId,
    });

    if (error) {
      console.warn('[SPH AR] RPC function failed, attempting fallback:', error.message);
    }

    if (data) {
      console.log('[SPH AR] ✅ Customer ID from RPC:', data);
      return data;
    }

    // Fallback: Direct database operations if RPC fails or returns null
    console.log('[SPH AR] Fallback: Attempting direct database lookup/insert...');

    // First, try to find existing customer by phone or email
    if (customerPhone || customerEmail) {
      const query = supabase
        .from('customers')
        .select('id')
        .eq('company_id', companyId);
      
      // Build OR condition for phone/email match
      const conditions: string[] = [];
      if (customerPhone) conditions.push(`phone.eq.${customerPhone}`);
      if (customerEmail) conditions.push(`email.eq.${customerEmail}`);
      
      if (conditions.length > 0) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('company_id', companyId)
          .or(conditions.join(','))
          .limit(1)
          .maybeSingle();
        
        if (existingCustomer) {
          console.log('[SPH AR] ✅ Found existing customer:', existingCustomer.id);
          return existingCustomer.id;
        }
      }
    }

    // Also try matching by exact name
    const { data: existingByName } = await supabase
      .from('customers')
      .select('id')
      .eq('company_id', companyId)
      .eq('customer_name', customerName)
      .limit(1)
      .maybeSingle();

    if (existingByName) {
      console.log('[SPH AR] ✅ Found existing customer by name:', existingByName.id);
      return existingByName.id;
    }

    // Create new customer
    console.log('[SPH AR] Creating new customer...');
    
    // Generate a unique customer code
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const customerCode = `SPH-${timestamp}-${randomPart}`;
    
    const { data: newCustomer, error: insertError } = await supabase
      .from('customers')
      .insert({
        company_id: companyId,
        customer_code: customerCode,
        customer_name: customerName,
        phone: customerPhone || null,
        email: customerEmail || null,
        customer_type: 'individual',
        business_unit_code: 'SPH',
        is_active: true,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[SPH AR] ❌ Failed to create customer:', insertError.message);
      console.error('[SPH AR] Insert error details:', {
        code: insertError.code,
        hint: insertError.hint,
        details: insertError.details,
      });
      return null;
    }

    console.log('[SPH AR] ✅ New customer created:', newCustomer.id);
    return newCustomer.id;
  } catch (error: any) {
    console.error('[SPH AR] ❌ Critical failure in createOrGetSPHCustomer:', error);
    return null;
  }
}

// Standalone function to create AR Invoice for SPH
export async function createSPHARInvoice({
  quotationId,
  quotationNo,
  customerId,
  customerName,
  totalAmount,
  advanceAmount,
  dueDate,
  companyId,
  journalEntryId,
}: {
  quotationId: string;
  quotationNo: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  advanceAmount: number;
  dueDate: string;
  companyId: string;
  journalEntryId?: string;
}): Promise<{ invoiceId: string; invoiceNumber: string } | null> {
  try {
    console.log('[SPH AR] Creating AR Invoice for quotation:', quotationNo);
    
    // Generate invoice number using the database function
    const { data: invoiceNumber, error: numError } = await supabase.rpc(
      'generate_sph_ar_invoice_number',
      { p_company_id: companyId }
    );

    if (numError) {
      console.error('[SPH AR] Error generating invoice number:', numError);
      throw numError;
    }

    const balance = totalAmount - advanceAmount;
    const status = balance <= 0 ? 'paid' : (advanceAmount > 0 ? 'partial' : 'unpaid');

    // Create AR Invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('ar_invoices')
      .insert({
        invoice_number: invoiceNumber,
        invoice_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: dueDate,
        customer_id: customerId,
        total_amount: totalAmount,
        paid_amount: advanceAmount,
        balance: balance,
        status: status,
        company_id: companyId,
        business_unit_code: 'SPH',
        reference: quotationNo,
        notes: `Special Hire - ${customerName}`,
        journal_entry_id: journalEntryId || null,
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('[SPH AR] Error creating AR Invoice:', invoiceError);
      throw invoiceError;
    }

    // ========== AUTO GL POSTING using SPH Finance Settings ==========
    if (!journalEntryId && totalAmount > 0) {
      try {
        // Use SPH-specific finance settings instead of generic category resolver
        const sphSettings = await fetchSpecialHireFinanceSettings(companyId);
        const tradeReceivableId = sphSettings?.trade_receivable_account_id;
        const revenueAccountId = sphSettings?.revenue_external_account_id || sphSettings?.revenue_internal_account_id;

        if (tradeReceivableId && revenueAccountId) {
          const { postARInvoiceToGL } = await import('@/lib/gl-posting-utils');
          const glResult = await postARInvoiceToGL({
            invoiceNumber: invoiceNumber,
            invoiceDate: format(new Date(), 'yyyy-MM-dd'),
            totalAmount: totalAmount,
            tradeReceivableId: tradeReceivableId,
            salesRevenueId: revenueAccountId,
            companyId: companyId,
            businessUnitCode: 'SPH',
            customerName: customerName,
            sourceModule: 'special_hire',
          });
          if (glResult.success && glResult.journalEntryId) {
            await (supabase as any)
              .from('ar_invoices')
              .update({ journal_entry_id: glResult.journalEntryId })
              .eq('id', invoice.id);
            console.log('[SPH AR] GL posted for AR Invoice:', invoiceNumber, '→ Revenue:', revenueAccountId);
          } else {
            console.warn('[SPH AR] GL posting failed:', glResult.error);
          }
        } else {
          console.warn('[SPH AR] Missing SPH GL accounts. Receivable:', tradeReceivableId, 'Revenue:', revenueAccountId);
        }
      } catch (glErr) {
        console.warn('[SPH AR] GL posting error:', glErr);
      }
    }

    // Link AR Invoice to quotation
    const { error: linkError } = await supabase
      .from('special_hire_quotations')
      .update({ 
        ar_invoice_id: invoice.id,
        finance_customer_id: customerId 
      })
      .eq('id', quotationId);

    if (linkError) {
      console.error('[SPH AR] Error linking AR Invoice to quotation:', linkError);
    }

    console.log('[SPH AR] ✅ AR Invoice created:', invoiceNumber);
    return { invoiceId: invoice.id, invoiceNumber };
  } catch (error) {
    console.error('[SPH AR] Failed to create AR Invoice:', error);
    return null;
  }
}

// Standalone function to update AR Invoice on payment
export async function updateSPHARInvoiceOnPayment({
  arInvoiceId,
  paymentAmount,
  paymentId,
  journalEntryId,
}: {
  arInvoiceId: string;
  paymentAmount: number;
  paymentId: string;
  journalEntryId?: string;
}): Promise<boolean> {
  try {
    console.log('[SPH AR] Updating AR Invoice on payment:', arInvoiceId);
    
    // Get current invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('ar_invoices')
      .select('*')
      .eq('id', arInvoiceId)
      .single();

    if (fetchError || !invoice) {
      console.error('[SPH AR] Error fetching AR Invoice:', fetchError);
      return false;
    }

    const newPaidAmount = (invoice.paid_amount || 0) + paymentAmount;
    const newBalance = invoice.total_amount - newPaidAmount;
    const newStatus = newBalance <= 0 ? 'paid' : (newPaidAmount > 0 ? 'partial' : 'unpaid');

    // Update AR Invoice — do NOT overwrite journal_entry_id (keep revenue-recognition JE)
    const { error: updateError } = await supabase
      .from('ar_invoices')
      .update({
        paid_amount: newPaidAmount,
        balance: newBalance,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', arInvoiceId);

    if (updateError) {
      console.error('[SPH AR] Error updating AR Invoice:', updateError);
      return false;
    }

    // Link payment to AR Invoice
    const { error: linkError } = await supabase
      .from('special_hire_payments')
      .update({ 
        ar_invoice_id: arInvoiceId,
        journal_entry_id: journalEntryId || null,
      })
      .eq('id', paymentId);

    if (linkError) {
      console.error('[SPH AR] Error linking payment to AR Invoice:', linkError);
    }

    console.log('[SPH AR] ✅ AR Invoice updated. New balance:', newBalance);
    return true;
  } catch (error) {
    console.error('[SPH AR] Failed to update AR Invoice:', error);
    return false;
  }
}

// Standalone function to create AR Receipt for SPH
export async function createSPHARReceipt({
  customerId,
  arInvoiceId,
  paymentAmount,
  paymentMethod,
  reference,
  paymentId,
  companyId,
  journalEntryId,
}: {
  customerId: string;
  arInvoiceId: string;
  paymentAmount: number;
  paymentMethod: string;
  reference?: string;
  paymentId: string;
  companyId: string;
  journalEntryId?: string;
}): Promise<{ receiptId: string; receiptNumber: string } | null> {
  try {
    console.log('[SPH AR] Creating AR Receipt for payment:', paymentId);
    
    // Generate receipt number using the database function
    const { data: receiptNumber, error: numError } = await supabase.rpc(
      'generate_sph_ar_receipt_number',
      { p_company_id: companyId }
    );

    if (numError) {
      console.error('[SPH AR] Error generating receipt number:', numError);
      throw numError;
    }

    // Create AR Receipt
    const { data: receipt, error: receiptError } = await supabase
      .from('ar_receipts')
      .insert({
        receipt_number: receiptNumber,
        receipt_date: format(new Date(), 'yyyy-MM-dd'),
        customer_id: customerId,
        amount: paymentAmount,
        payment_method: paymentMethod,
        reference: reference || null,
        status: 'posted',
        company_id: companyId,
        business_unit_code: 'SPH',
        journal_entry_id: journalEntryId || null,
      })
      .select()
      .single();

    if (receiptError) {
      console.error('[SPH AR] Error creating AR Receipt:', receiptError);
      throw receiptError;
    }

    // Create receipt allocation only if there's an invoice to allocate to
    if (arInvoiceId) {
      const { error: allocError } = await supabase
        .from('ar_receipt_allocations')
        .insert({
          receipt_id: receipt.id,
          invoice_id: arInvoiceId,
          allocated_amount: paymentAmount,
          company_id: companyId,
        });

      if (allocError) {
        console.error('[SPH AR] Error creating receipt allocation:', allocError);
      }
    }

    // Link receipt to payment
    const { error: linkError } = await supabase
      .from('special_hire_payments')
      .update({ ar_receipt_id: receipt.id })
      .eq('id', paymentId);

    if (linkError) {
      console.error('[SPH AR] Error linking receipt to payment:', linkError);
    }

    console.log('[SPH AR] ✅ AR Receipt created:', receiptNumber);
    return { receiptId: receipt.id, receiptNumber };
  } catch (error) {
    console.error('[SPH AR] Failed to create AR Receipt:', error);
    return null;
  }
}

// Standalone function to update AR Invoice with full invoice amount (when invoice is sent)
export async function updateSPHARInvoiceOnInvoiceSent({
  arInvoiceId,
  quotationId,
  totalAmount,
  journalEntryId,
}: {
  arInvoiceId?: string;
  quotationId: string;
  totalAmount: number;
  journalEntryId?: string;
}): Promise<boolean> {
  try {
    // If no AR Invoice exists, we need to create one first
    if (!arInvoiceId) {
      console.log('[SPH AR] No AR Invoice found - will be created during payment approval');
      return true; // Not an error, just not ready yet
    }

    console.log('[SPH AR] Updating AR Invoice on invoice sent:', arInvoiceId);
    
    // Get current invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('ar_invoices')
      .select('*')
      .eq('id', arInvoiceId)
      .single();

    if (fetchError || !invoice) {
      console.error('[SPH AR] Error fetching AR Invoice:', fetchError);
      return false;
    }

    const newBalance = totalAmount - (invoice.paid_amount || 0);
    const newStatus = newBalance <= 0 ? 'paid' : ((invoice.paid_amount || 0) > 0 ? 'partial' : 'unpaid');

    // Update AR Invoice with new total
    const { error: updateError } = await supabase
      .from('ar_invoices')
      .update({
        total_amount: totalAmount,
        balance: newBalance,
        status: newStatus,
        journal_entry_id: journalEntryId || invoice.journal_entry_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', arInvoiceId);

    if (updateError) {
      console.error('[SPH AR] Error updating AR Invoice:', updateError);
      return false;
    }

    console.log('[SPH AR] ✅ AR Invoice updated with invoice amount:', totalAmount);
    return true;
  } catch (error) {
    console.error('[SPH AR] Failed to update AR Invoice:', error);
    return false;
  }
}

// Standalone function to check if document exists for payment
export async function checkPaymentDocument(paymentId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('document_storage')
      .select('id')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (error) {
      console.error('[SPH AR] Error checking payment document:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('[SPH AR] Failed to check payment document:', error);
    return false;
  }
}

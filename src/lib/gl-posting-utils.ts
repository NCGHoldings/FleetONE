/**
 * Centralized GL Posting Utilities
 * Provides automated journal entry creation for AR/AP transactions
 * following standard double-entry accounting principles.
 */

import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// ============ Types ============

export interface GLAccountConfig {
  bankAccountId: string | null;
  tradeReceivableId: string | null;
  tradePayableId: string | null;
  salesRevenueId: string | null;
  customerAdvanceId: string | null;
  expenseAccountId: string | null;
  whtPayableId: string | null;
}

export interface JournalEntryLine {
  account_id: string;
  description: string;
  debit: number;
  credit: number;
}

export interface CreateJournalEntryParams {
  entry_date: string;
  description: string;
  reference: string;
  lines: JournalEntryLine[];
  company_id: string;
  business_unit_code?: string;
  source_module?: string;
}

// ============ Validation ============

/**
 * Validates that required GL accounts are configured for a given operation
 */
export function validateGLConfig(
  config: Partial<GLAccountConfig>,
  operation: "ar_invoice" | "ar_receipt" | "ap_invoice" | "ap_payment" | "advance_receipt"
): { valid: boolean; missingAccounts: string[] } {
  const missingAccounts: string[] = [];

  switch (operation) {
    case "ar_invoice":
      if (!config.tradeReceivableId) missingAccounts.push("Trade Receivable");
      if (!config.salesRevenueId) missingAccounts.push("Sales Revenue");
      break;
    case "ar_receipt":
      if (!config.bankAccountId) missingAccounts.push("Bank Account");
      if (!config.tradeReceivableId) missingAccounts.push("Trade Receivable");
      break;
    case "advance_receipt":
      if (!config.bankAccountId) missingAccounts.push("Bank Account");
      if (!config.customerAdvanceId) missingAccounts.push("Customer Advance (Liability)");
      break;
    case "ap_invoice":
      if (!config.expenseAccountId) missingAccounts.push("Expense Account");
      if (!config.tradePayableId) missingAccounts.push("Trade Payable");
      break;
    case "ap_payment":
      if (!config.bankAccountId) missingAccounts.push("Bank Account");
      if (!config.tradePayableId) missingAccounts.push("Trade Payable");
      break;
  }

  return {
    valid: missingAccounts.length === 0,
    missingAccounts,
  };
}

// ============ Journal Entry Generation ============

/**
 * Generates a unique journal entry number
 */
export function generateEntryNumber(prefix: string = "JE"): string {
  const dateStr = format(new Date(), "yyyyMMdd");
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${dateStr}-${randomStr}`;
}

/**
 * Creates a journal entry with lines and updates COA balances
 */
export async function createAndPostJournalEntry(
  params: CreateJournalEntryParams
): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  try {
    // Validate debit = credit
    const totalDebit = params.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = params.lines.reduce((sum, l) => sum + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return {
        success: false,
        error: `Journal entry is not balanced: Debit (${totalDebit}) ≠ Credit (${totalCredit})`,
      };
    }

    // Create journal entry header
    const { data: journalEntry, error: entryError } = await supabase
      .from("journal_entries")
      .insert([
        {
          entry_number: generateEntryNumber(),
          entry_date: params.entry_date,
          description: params.description,
          reference: params.reference,
          total_debit: totalDebit,
          total_credit: totalCredit,
          status: "posted",
          posted_at: new Date().toISOString(),
          company_id: params.company_id,
          business_unit_code: params.business_unit_code,
          source_module: params.source_module,
        },
      ])
      .select()
      .single();

    if (entryError) throw entryError;

    // Create journal entry lines
    const lines = params.lines.map((line) => ({
      journal_entry_id: journalEntry.id,
      account_id: line.account_id,
      description: line.description,
      debit: line.debit,
      credit: line.credit,
      company_id: params.company_id,
      business_unit_code: params.business_unit_code,
    }));

    const { error: linesError } = await supabase
      .from("journal_entry_lines")
      .insert(lines);

    if (linesError) throw linesError;

    // Update COA balances
    for (const line of params.lines) {
      await updateAccountBalance(line.account_id, line.debit, line.credit);
    }

    return { success: true, journalEntryId: journalEntry.id };
  } catch (error) {
    console.error("GL Posting Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create journal entry",
    };
  }
}

/**
 * Updates a COA account balance based on debit/credit and account type
 */
async function updateAccountBalance(
  accountId: string,
  debit: number,
  credit: number
): Promise<void> {
  const { data: account } = await supabase
    .from("chart_of_accounts")
    .select("current_balance, account_type")
    .eq("id", accountId)
    .single();

  if (account) {
    const netAmount = debit - credit;
    // Debit normal accounts: Assets, Expenses
    // Credit normal accounts: Liabilities, Revenue, Equity
    const isDebitNormal = ["asset", "expense"].includes(account.account_type);
    const adjustment = isDebitNormal ? netAmount : -netAmount;

    await supabase
      .from("chart_of_accounts")
      .update({ current_balance: (account.current_balance || 0) + adjustment })
      .eq("id", accountId);
  }
}

// ============ AR Transaction GL Posting ============

/**
 * Posts GL entry for AR Invoice creation
 * DR Trade Receivable
 * CR Sales Revenue
 */
export async function postARInvoiceToGL(params: {
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  tradeReceivableId: string;
  salesRevenueId: string;
  companyId: string;
  businessUnitCode?: string;
  customerName?: string;
  sourceModule?: string;
}): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  return createAndPostJournalEntry({
    entry_date: params.invoiceDate,
    description: `AR Invoice: ${params.invoiceNumber}${params.customerName ? ` - ${params.customerName}` : ""}`,
    reference: params.invoiceNumber,
    company_id: params.companyId,
    business_unit_code: params.businessUnitCode,
    source_module: params.sourceModule,
    lines: [
      {
        account_id: params.tradeReceivableId,
        description: `Trade Receivable - ${params.invoiceNumber}`,
        debit: params.totalAmount,
        credit: 0,
      },
      {
        account_id: params.salesRevenueId,
        description: `Sales Revenue - ${params.invoiceNumber}`,
        debit: 0,
        credit: params.totalAmount,
      },
    ],
  });
}

/**
 * Posts GL entry for AR Receipt
 * DR Bank/Cash
 * CR Trade Receivable
 */
export async function postARReceiptToGL(params: {
  receiptNumber: string;
  receiptDate: string;
  amount: number;
  bankAccountId: string;
  tradeReceivableId: string;
  companyId: string;
  businessUnitCode?: string;
  customerName?: string;
}): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  return createAndPostJournalEntry({
    entry_date: params.receiptDate,
    description: `AR Receipt: ${params.receiptNumber}${params.customerName ? ` from ${params.customerName}` : ""}`,
    reference: params.receiptNumber,
    company_id: params.companyId,
    business_unit_code: params.businessUnitCode,
    lines: [
      {
        account_id: params.bankAccountId,
        description: `Bank Receipt - ${params.receiptNumber}`,
        debit: params.amount,
        credit: 0,
      },
      {
        account_id: params.tradeReceivableId,
        description: `Reduce Receivable - ${params.receiptNumber}`,
        debit: 0,
        credit: params.amount,
      },
    ],
  });
}

/**
 * Posts GL entry for Customer Advance Receipt
 * DR Bank/Cash
 * CR Customer Advance (Liability)
 */
export async function postAdvanceReceiptToGL(params: {
  receiptNumber: string;
  receiptDate: string;
  amount: number;
  bankAccountId: string;
  customerAdvanceId: string;
  companyId: string;
  businessUnitCode?: string;
  customerName?: string;
}): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  return createAndPostJournalEntry({
    entry_date: params.receiptDate,
    description: `Advance Receipt: ${params.receiptNumber}${params.customerName ? ` from ${params.customerName}` : ""}`,
    reference: params.receiptNumber,
    company_id: params.companyId,
    business_unit_code: params.businessUnitCode,
    lines: [
      {
        account_id: params.bankAccountId,
        description: `Bank Receipt (Advance) - ${params.receiptNumber}`,
        debit: params.amount,
        credit: 0,
      },
      {
        account_id: params.customerAdvanceId,
        description: `Customer Advance Liability - ${params.receiptNumber}`,
        debit: 0,
        credit: params.amount,
      },
    ],
  });
}

/**
 * Posts GL entry for Advance Application to Invoice
 * DR Customer Advance (Liability)
 * CR Trade Receivable
 */
export async function postAdvanceApplicationToGL(params: {
  invoiceNumber: string;
  applicationDate: string;
  amount: number;
  customerAdvanceId: string;
  tradeReceivableId: string;
  companyId: string;
  businessUnitCode?: string;
}): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  return createAndPostJournalEntry({
    entry_date: params.applicationDate,
    description: `Advance Applied to Invoice: ${params.invoiceNumber}`,
    reference: `ADV-APP-${params.invoiceNumber}`,
    company_id: params.companyId,
    business_unit_code: params.businessUnitCode,
    lines: [
      {
        account_id: params.customerAdvanceId,
        description: `Apply Advance - ${params.invoiceNumber}`,
        debit: params.amount,
        credit: 0,
      },
      {
        account_id: params.tradeReceivableId,
        description: `Reduce Receivable (Advance) - ${params.invoiceNumber}`,
        debit: 0,
        credit: params.amount,
      },
    ],
  });
}

// ============ AP Transaction GL Posting ============

/**
 * Posts GL entry for AP Invoice approval
 * DR Expense/Inventory Account(s) — one debit line per distinct GL account from invoice lines
 * CR Trade Payable — single credit for the total amount
 */
export async function postAPInvoiceToGL(params: {
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  expenseAccountId: string; // fallback default
  tradePayableId: string;
  companyId: string;
  businessUnitCode?: string;
  vendorName?: string;
  expenseLines?: Array<{ accountId: string; amount: number; description?: string }>;
  sourceModule?: string;
}): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  const debitLines: JournalEntryLine[] = [];

  if (params.expenseLines && params.expenseLines.length > 0) {
    // Group by accountId and sum amounts for multi-line posting
    const grouped = new Map<string, { amount: number; description: string }>();
    for (const line of params.expenseLines) {
      const existing = grouped.get(line.accountId);
      if (existing) {
        existing.amount += line.amount;
      } else {
        grouped.set(line.accountId, {
          amount: line.amount,
          description: line.description || `Expense/Purchase - ${params.invoiceNumber}`,
        });
      }
    }
    for (const [accountId, data] of grouped) {
      debitLines.push({
        account_id: accountId,
        description: data.description,
        debit: data.amount,
        credit: 0,
      });
    }
  } else {
    // Fallback: single debit to default expense account
    debitLines.push({
      account_id: params.expenseAccountId,
      description: `Expense/Purchase - ${params.invoiceNumber}`,
      debit: params.totalAmount,
      credit: 0,
    });
  }

  return createAndPostJournalEntry({
    entry_date: params.invoiceDate,
    description: `AP Invoice: ${params.invoiceNumber}${params.vendorName ? ` - ${params.vendorName}` : ""}`,
    reference: params.invoiceNumber,
    company_id: params.companyId,
    business_unit_code: params.businessUnitCode,
    source_module: params.sourceModule,
    lines: [
      ...debitLines,
      {
        account_id: params.tradePayableId,
        description: `Trade Payable - ${params.invoiceNumber}`,
        debit: 0,
        credit: params.totalAmount,
      },
    ],
  });
}

/**
 * Posts GL entry for AP Payment
 * DR Trade Payable
 * CR Bank/Cash
 * (Optional) DR Trade Payable / CR WHT Payable for WHT deductions
 */
export async function postAPPaymentToGL(params: {
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  whtAmount?: number;
  bankAccountId: string;
  tradePayableId: string;
  whtPayableId?: string;
  companyId: string;
  businessUnitCode?: string;
  vendorName?: string;
}): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  const lines: JournalEntryLine[] = [
    {
      account_id: params.tradePayableId,
      description: `Settle Payable - ${params.paymentNumber}`,
      debit: params.amount + (params.whtAmount || 0),
      credit: 0,
    },
    {
      account_id: params.bankAccountId,
      description: `Bank Payment - ${params.paymentNumber}`,
      debit: 0,
      credit: params.amount,
    },
  ];

  // Add WHT line if applicable
  if (params.whtAmount && params.whtAmount > 0 && params.whtPayableId) {
    lines.push({
      account_id: params.whtPayableId,
      description: `WHT Deducted - ${params.paymentNumber}`,
      debit: 0,
      credit: params.whtAmount,
    });
  }

  return createAndPostJournalEntry({
    entry_date: params.paymentDate,
    description: `AP Payment: ${params.paymentNumber}${params.vendorName ? ` to ${params.vendorName}` : ""}`,
    reference: params.paymentNumber,
    company_id: params.companyId,
    business_unit_code: params.businessUnitCode,
    lines,
  });
}

// ============ Balance Reconciliation ============

/**
 * Recalculates COA balances from posted journal entry lines
 * Use for audit/verification purposes
 */
export async function recalculateCOABalances(
  companyId: string
): Promise<{
  success: boolean;
  discrepancies: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    currentBalance: number;
    calculatedBalance: number;
    difference: number;
  }>;
  error?: string;
}> {
  try {
    // Get all accounts for the company
    const { data: accounts, error: accountsError } = await supabase
      .from("chart_of_accounts")
      .select("id, account_code, account_name, current_balance, account_type")
      .eq("company_id", companyId);

    if (accountsError) throw accountsError;

    // Get all posted journal entry lines
    const { data: journalLines, error: linesError } = await supabase
      .from("journal_entry_lines")
      .select(`
        account_id,
        debit,
        credit,
        journal_entries!inner(status, company_id)
      `)
      .eq("journal_entries.company_id", companyId)
      .eq("journal_entries.status", "posted");

    if (linesError) throw linesError;

    const discrepancies: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      currentBalance: number;
      calculatedBalance: number;
      difference: number;
    }> = [];

    for (const account of accounts || []) {
      // Calculate balance from journal lines
      const accountLines = journalLines?.filter((l) => l.account_id === account.id) || [];
      const totalDebit = accountLines.reduce((sum, l) => sum + (l.debit || 0), 0);
      const totalCredit = accountLines.reduce((sum, l) => sum + (l.credit || 0), 0);

      const isDebitNormal = ["asset", "expense"].includes(account.account_type);
      // Calculate expected balance based on journal entries only (no opening balance column exists)
      const calculatedBalance = isDebitNormal ? totalDebit - totalCredit : totalCredit - totalDebit;

      const difference = Math.abs((account.current_balance || 0) - calculatedBalance);

      if (difference > 0.01) {
        discrepancies.push({
          accountId: account.id,
          accountCode: account.account_code,
          accountName: account.account_name,
          currentBalance: account.current_balance || 0,
          calculatedBalance,
          difference,
        });
      }
    }

    return { success: true, discrepancies };
  } catch (error) {
    console.error("Balance Reconciliation Error:", error);
    return {
      success: false,
      discrepancies: [],
      error: error instanceof Error ? error.message : "Failed to reconcile balances",
    };
  }
}

/**
 * Fixes COA balance discrepancies by updating to calculated values
 */
export async function fixBalanceDiscrepancies(
  discrepancies: Array<{ accountId: string; calculatedBalance: number }>
): Promise<{ success: boolean; fixed: number; error?: string }> {
  try {
    let fixed = 0;
    for (const d of discrepancies) {
      const { error } = await supabase
        .from("chart_of_accounts")
        .update({ current_balance: d.calculatedBalance })
        .eq("id", d.accountId);

      if (!error) fixed++;
    }
    return { success: true, fixed };
  } catch (error) {
    return {
      success: false,
      fixed: 0,
      error: error instanceof Error ? error.message : "Failed to fix discrepancies",
    };
  }
}

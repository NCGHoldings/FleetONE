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
}

// ============ Validation ============

/**
 * Validates that required GL accounts are configured for a given operation
 */
export function validateGLConfig(
  config: Partial<GLAccountConfig>,
  operation: "ar_invoice" | "ar_receipt" | "ap_invoice" | "ap_payment" | "advance_receipt" | "petty_cash_disbursement" | "petty_cash_replenishment" | "iou_issuance" | "iou_settlement" | "credit_note"
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
    case "petty_cash_disbursement":
      if (!config.expenseAccountId) missingAccounts.push("Expense Account");
      if (!config.bankAccountId) missingAccounts.push("Petty Cash Fund GL Account");
      break;
    case "petty_cash_replenishment":
      if (!config.bankAccountId) missingAccounts.push("Bank Account");
      if (!config.expenseAccountId) missingAccounts.push("Petty Cash Fund GL Account");
      break;
    case "iou_issuance":
      if (!config.tradeReceivableId) missingAccounts.push("Staff Advance Account");
      if (!config.bankAccountId) missingAccounts.push("Cash/Bank Account");
      break;
    case "iou_settlement":
      if (!config.expenseAccountId) missingAccounts.push("Expense Account");
      if (!config.tradeReceivableId) missingAccounts.push("Staff Advance Account");
      break;
    case "credit_note":
      if (!config.tradeReceivableId) missingAccounts.push("Trade Receivable/Payable");
      if (!config.salesRevenueId) missingAccounts.push("Revenue/Expense Account");
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
 * DR Trade Receivable (gross total)
 * CR Sales Revenue (net amount = total - tax)
 * CR Output Tax Payable (tax amount, if applicable)
 */
export async function postARInvoiceToGL(params: {
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  taxAmount?: number;
  tradeReceivableId: string;
  salesRevenueId: string;
  taxPayableAccountId?: string;
  companyId: string;
  businessUnitCode?: string;
  customerName?: string;
}): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  const taxAmount = params.taxAmount || 0;
  const netAmount = params.totalAmount - taxAmount;

  const lines: JournalEntryLine[] = [
    {
      account_id: params.tradeReceivableId,
      description: `Trade Receivable - ${params.invoiceNumber}${params.customerName ? ` - ${params.customerName}` : ""}`,
      debit: params.totalAmount,
      credit: 0,
    },
    {
      account_id: params.salesRevenueId,
      description: `Sales Revenue - ${params.invoiceNumber}`,
      debit: 0,
      credit: taxAmount > 0 ? netAmount : params.totalAmount,
    },
  ];

  // Add tax line if tax exists and tax account is configured
  if (taxAmount > 0 && params.taxPayableAccountId) {
    lines.push({
      account_id: params.taxPayableAccountId,
      description: `Output Tax - Invoice ${params.invoiceNumber}`,
      debit: 0,
      credit: taxAmount,
    });
  }

  return createAndPostJournalEntry({
    entry_date: params.invoiceDate,
    description: `AR Invoice: ${params.invoiceNumber}${params.customerName ? ` - ${params.customerName}` : ""}`,
    reference: params.invoiceNumber,
    company_id: params.companyId,
    business_unit_code: params.businessUnitCode,
    lines,
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
 * DR Expense/Inventory Account(s) — one debit line per distinct GL account from invoice lines (net amounts)
 * DR Input Tax Recoverable (tax amount, if applicable)
 * CR Trade Payable — single credit for the total amount (gross)
 */
export async function postAPInvoiceToGL(params: {
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  taxAmount?: number;
  expenseAccountId: string; // fallback default
  tradePayableId: string;
  inputTaxAccountId?: string;
  companyId: string;
  businessUnitCode?: string;
  vendorName?: string;
  expenseLines?: Array<{ accountId: string; amount: number; description?: string }>;
}): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  const taxAmount = params.taxAmount || 0;
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
    const expenseAmount = taxAmount > 0 ? (params.totalAmount - taxAmount) : params.totalAmount;
    debitLines.push({
      account_id: params.expenseAccountId,
      description: `Expense/Purchase - ${params.invoiceNumber}`,
      debit: expenseAmount,
      credit: 0,
    });
  }

  // Add input tax line if tax exists and tax account is configured
  if (taxAmount > 0 && params.inputTaxAccountId) {
    debitLines.push({
      account_id: params.inputTaxAccountId,
      description: `Input Tax - Invoice ${params.invoiceNumber}`,
      debit: taxAmount,
      credit: 0,
    });
  }

  return createAndPostJournalEntry({
    entry_date: params.invoiceDate,
    description: `AP Invoice: ${params.invoiceNumber}${params.vendorName ? ` - ${params.vendorName}` : ""}`,
    reference: params.invoiceNumber,
    company_id: params.companyId,
    business_unit_code: params.businessUnitCode,
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

// ============ Petty Cash GL Posting ============

/**
 * Posts GL entry for Petty Cash Disbursement
 * DR Expense Account (category-specific)
 * CR Petty Cash Fund GL Account
 */
export async function postPettyCashDisbursementToGL(params: {
  voucherNumber: string;
  transactionDate: string;
  amount: number;
  expenseAccountId: string;
  pettyCashFundAccountId: string;
  companyId: string;
  businessUnitCode?: string;
  description?: string;
  payeeName?: string;
}): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  return createAndPostJournalEntry({
    entry_date: params.transactionDate,
    description: `Petty Cash Disbursement: ${params.voucherNumber}${params.payeeName ? ` to ${params.payeeName}` : ""}${params.description ? ` - ${params.description}` : ""}`,
    reference: params.voucherNumber,
    company_id: params.companyId,
    business_unit_code: params.businessUnitCode,
    lines: [
      {
        account_id: params.expenseAccountId,
        description: `Expense - ${params.voucherNumber}`,
        debit: params.amount,
        credit: 0,
      },
      {
        account_id: params.pettyCashFundAccountId,
        description: `Petty Cash Fund - ${params.voucherNumber}`,
        debit: 0,
        credit: params.amount,
      },
    ],
  });
}

/**
 * Posts GL entry for Petty Cash Replenishment
 * DR Petty Cash Fund GL Account
 * CR Bank/Cash Account
 */
export async function postPettyCashReplenishmentToGL(params: {
  referenceNumber: string;
  transactionDate: string;
  amount: number;
  pettyCashFundAccountId: string;
  bankAccountId: string;
  companyId: string;
  businessUnitCode?: string;
  fundName?: string;
}): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  return createAndPostJournalEntry({
    entry_date: params.transactionDate,
    description: `Petty Cash Replenishment: ${params.fundName || params.referenceNumber}`,
    reference: params.referenceNumber,
    company_id: params.companyId,
    business_unit_code: params.businessUnitCode,
    lines: [
      {
        account_id: params.pettyCashFundAccountId,
        description: `Replenish Petty Cash - ${params.fundName || params.referenceNumber}`,
        debit: params.amount,
        credit: 0,
      },
      {
        account_id: params.bankAccountId,
        description: `Bank Payment (Replenishment) - ${params.referenceNumber}`,
        debit: 0,
        credit: params.amount,
      },
    ],
  });
}

// ============ IOU / Staff Advance GL Posting ============

/**
 * Posts GL entry for IOU Issuance
 * DR Staff Advance (Asset/Receivable)
 * CR Cash/Bank
 */
export async function postIOUIssuanceToGL(params: {
  iouNumber: string;
  issuedDate: string;
  amount: number;
  staffAdvanceAccountId: string;
  cashAccountId: string;
  companyId: string;
  businessUnitCode?: string;
  staffName?: string;
  purpose?: string;
}): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  return createAndPostJournalEntry({
    entry_date: params.issuedDate,
    description: `IOU Issued: ${params.iouNumber}${params.staffName ? ` to ${params.staffName}` : ""}${params.purpose ? ` - ${params.purpose}` : ""}`,
    reference: params.iouNumber,
    company_id: params.companyId,
    business_unit_code: params.businessUnitCode,
    lines: [
      {
        account_id: params.staffAdvanceAccountId,
        description: `Staff Advance - ${params.iouNumber}`,
        debit: params.amount,
        credit: 0,
      },
      {
        account_id: params.cashAccountId,
        description: `Cash/Bank (IOU Issue) - ${params.iouNumber}`,
        debit: 0,
        credit: params.amount,
      },
    ],
  });
}

/**
 * Posts GL entry for IOU Settlement
 * DR Expense Account(s)
 * CR Staff Advance (Asset/Receivable)
 * If there's a refund (settled < issued), also:
 * DR Cash/Bank (for refund amount)
 * CR Staff Advance
 */
export async function postIOUSettlementToGL(params: {
  iouNumber: string;
  settlementDate: string;
  settledAmount: number;
  expenseAccountId: string;
  staffAdvanceAccountId: string;
  companyId: string;
  businessUnitCode?: string;
  staffName?: string;
}): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  return createAndPostJournalEntry({
    entry_date: params.settlementDate,
    description: `IOU Settled: ${params.iouNumber}${params.staffName ? ` by ${params.staffName}` : ""}`,
    reference: `SETTLE-${params.iouNumber}`,
    company_id: params.companyId,
    business_unit_code: params.businessUnitCode,
    lines: [
      {
        account_id: params.expenseAccountId,
        description: `Expense (IOU Settlement) - ${params.iouNumber}`,
        debit: params.settledAmount,
        credit: 0,
      },
      {
        account_id: params.staffAdvanceAccountId,
        description: `Clear Staff Advance - ${params.iouNumber}`,
        debit: 0,
        credit: params.settledAmount,
      },
    ],
  });
}

// ============ Credit Note / Debit Note GL Posting ============

/**
 * Posts GL reversal for AR Credit Note
 * DR Sales Revenue (reverse the net revenue)
 * DR Output Tax Payable (reverse the tax, if applicable)
 * CR Trade Receivable (reduce what customer owes - gross)
 */
export async function postARCreditNoteToGL(params: {
  creditNoteNumber: string;
  creditNoteDate: string;
  amount: number;
  taxAmount?: number;
  salesRevenueId: string;
  tradeReceivableId: string;
  taxPayableAccountId?: string;
  companyId: string;
  businessUnitCode?: string;
  customerName?: string;
}): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  const taxAmount = params.taxAmount || 0;
  const netAmount = taxAmount > 0 ? params.amount - taxAmount : params.amount;

  const lines: JournalEntryLine[] = [
    {
      account_id: params.salesRevenueId,
      description: `Revenue Reversal - ${params.creditNoteNumber}`,
      debit: netAmount,
      credit: 0,
    },
  ];

  // Add tax reversal line if applicable
  if (taxAmount > 0 && params.taxPayableAccountId) {
    lines.push({
      account_id: params.taxPayableAccountId,
      description: `Tax Reversal - ${params.creditNoteNumber}`,
      debit: taxAmount,
      credit: 0,
    });
  }

  lines.push({
    account_id: params.tradeReceivableId,
    description: `Reduce Receivable - ${params.creditNoteNumber}`,
    debit: 0,
    credit: params.amount,
  });

  return createAndPostJournalEntry({
    entry_date: params.creditNoteDate,
    description: `AR Credit Note: ${params.creditNoteNumber}${params.customerName ? ` - ${params.customerName}` : ""}`,
    reference: params.creditNoteNumber,
    company_id: params.companyId,
    business_unit_code: params.businessUnitCode,
    lines,
  });
}

/**
 * Posts GL reversal for AP Debit Note
 * DR Trade Payable (reduce what we owe)
 * CR Expense Account (reverse the original expense)
 */
export async function postAPDebitNoteToGL(params: {
  debitNoteNumber: string;
  debitNoteDate: string;
  amount: number;
  tradePayableId: string;
  expenseAccountId: string;
  companyId: string;
  businessUnitCode?: string;
  vendorName?: string;
}): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  return createAndPostJournalEntry({
    entry_date: params.debitNoteDate,
    description: `AP Debit Note: ${params.debitNoteNumber}${params.vendorName ? ` - ${params.vendorName}` : ""}`,
    reference: params.debitNoteNumber,
    company_id: params.companyId,
    business_unit_code: params.businessUnitCode,
    lines: [
      {
        account_id: params.tradePayableId,
        description: `Reduce Payable - ${params.debitNoteNumber}`,
        debit: params.amount,
        credit: 0,
      },
      {
        account_id: params.expenseAccountId,
        description: `Expense Reversal - ${params.debitNoteNumber}`,
        debit: 0,
        credit: params.amount,
      },
    ],
  });
}

/**
 * Posts GL entry for standalone Bank Transaction
 * For deposits: DR Bank Account → CR Contra Account
 * For withdrawals: DR Contra Account → CR Bank Account
 */
export async function postBankTransactionToGL(params: {
  reference: string;
  transactionDate: string;
  amount: number;
  bankGLAccountId: string;
  contraAccountId: string;
  transactionType: "deposit" | "withdrawal" | "transfer";
  companyId: string;
  businessUnitCode?: string;
  description?: string;
}): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  const isDeposit = params.transactionType === "deposit";

  return createAndPostJournalEntry({
    entry_date: params.transactionDate,
    description: `Bank ${params.transactionType}: ${params.description || params.reference}`,
    reference: params.reference,
    company_id: params.companyId,
    business_unit_code: params.businessUnitCode,
    lines: [
      {
        account_id: isDeposit ? params.bankGLAccountId : params.contraAccountId,
        description: isDeposit ? `Bank Deposit - ${params.reference}` : `${params.description || "Withdrawal"} - ${params.reference}`,
        debit: params.amount,
        credit: 0,
      },
      {
        account_id: isDeposit ? params.contraAccountId : params.bankGLAccountId,
        description: isDeposit ? `${params.description || "Deposit"} - ${params.reference}` : `Bank Withdrawal - ${params.reference}`,
        debit: 0,
        credit: params.amount,
      },
    ],
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

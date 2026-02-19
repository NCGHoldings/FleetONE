/**
 * Expense Request Finance Integration Hook
 * Wires up the existing gl_posted/journal_entry_id fields on expense_requests
 * to actual GL posting when expenses are approved/paid.
 * 
 * DR Expense Account (based on category) | CR Bank/Cash/Petty Cash/AP
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { format } from "date-fns";

export interface ExpenseGLMapping {
  expense_category: string;
  gl_account_id: string;
}

export interface ExpenseRequestForGL {
  id: string;
  requestNumber: string;
  requestDate: string;
  businessUnitCode: string;
  expenseCategory: string;
  description: string;
  amount: number;
  busId?: string;
  vendorId?: string;
  vendorName?: string;
  paymentMethod: string; // cash, bank, petty_cash, iou, to_be_paid
  pettyCashFundId?: string;
  iouId?: string;
}

// Helper function to update COA balances after journal entry creation
async function updateAccountBalancesFromJournalEntry(journalEntryId: string) {
  const { data: lines, error: linesError } = await supabase
    .from("journal_entry_lines")
    .select("account_id, debit, credit")
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

    if (accountError || !account) continue;

    const netAmount = (line.debit || 0) - (line.credit || 0);
    const isDebitNormal = ["asset", "expense"].includes(account.account_type || "");
    const adjustment = isDebitNormal ? netAmount : -netAmount;

    await supabase
      .from("chart_of_accounts")
      .update({
        current_balance: (account.current_balance || 0) + adjustment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", line.account_id);
  }
}

// Fetch expense category → GL account mappings
export function useExpenseGLMappings() {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["expense-gl-mappings", effectiveCompanyId],
    queryFn: async (): Promise<ExpenseGLMapping[]> => {
      const { data, error } = await supabase
        .from("module_finance_settings")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .eq("module_name", "expense_requests")
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching expense GL mappings:", error);
      }

      if (data?.settings?.mappings) {
        return data.settings.mappings as ExpenseGLMapping[];
      }

      return [];
    },
  });
}

// Fetch expense request finance settings (bank/cash account defaults)
export function useExpenseRequestFinanceSettings() {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["expense-request-finance-settings", effectiveCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_finance_settings")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .eq("module_name", "expense_requests")
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching settings:", error);
      }

      return data?.settings || {
        default_bank_account_id: null,
        default_cash_account_id: null,
        default_petty_cash_account_id: null,
        auto_post_on_approve: false,
        gl_prefix: "EXP",
        mappings: [],
      };
    },
  });
}

// Save expense request finance settings
export function useSaveExpenseRequestFinanceSettings() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useMutation({
    mutationFn: async (settings: Record<string, any>) => {
      const { data, error } = await supabase
        .from("module_finance_settings")
        .upsert({
          company_id: effectiveCompanyId,
          module_name: "expense_requests",
          settings: settings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "company_id,module_name",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-request-finance-settings"] });
      queryClient.invalidateQueries({ queryKey: ["expense-gl-mappings"] });
      toast.success("Expense request finance settings saved");
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
}

// Post expense request to GL
export function usePostExpenseRequestToGL() {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  return useMutation({
    mutationFn: async ({
      expense,
      settings,
      mappings,
    }: {
      expense: ExpenseRequestForGL;
      settings: Record<string, any>;
      mappings: ExpenseGLMapping[];
    }) => {
      // 1. Find the GL account for this expense category
      const mapping = mappings.find(m => m.expense_category === expense.expenseCategory);
      
      let expenseAccountId: string | null = mapping?.gl_account_id || null;

      // If no mapping found, try to find a generic expense account
      if (!expenseAccountId) {
        const { data: genericAccount } = await supabase
          .from("chart_of_accounts")
          .select("id")
          .eq("company_id", effectiveCompanyId)
          .eq("account_type", "expense")
          .ilike("account_name", `%${expense.expenseCategory}%`)
          .limit(1)
          .maybeSingle();

        if (genericAccount) {
          expenseAccountId = genericAccount.id;
        } else {
          // Fallback to general expense
          const { data: fallback } = await supabase
            .from("chart_of_accounts")
            .select("id")
            .eq("company_id", effectiveCompanyId)
            .eq("account_type", "expense")
            .ilike("account_name", "%general expense%")
            .limit(1)
            .maybeSingle();

          expenseAccountId = fallback?.id || null;
        }
      }

      if (!expenseAccountId) {
        throw new Error(`No GL account mapped for expense category: ${expense.expenseCategory}. Please configure expense GL mappings.`);
      }

      // 2. Determine credit account based on payment method
      let creditAccountId: string | null = null;
      
      switch (expense.paymentMethod) {
        case "cash":
          creditAccountId = settings.default_cash_account_id;
          break;
        case "bank":
          creditAccountId = settings.default_bank_account_id;
          break;
        case "petty_cash":
          creditAccountId = settings.default_petty_cash_account_id || settings.default_cash_account_id;
          break;
        case "to_be_paid": {
          // Create AP entry - use trade payable
          const { data: payable } = await supabase
            .from("chart_of_accounts")
            .select("id")
            .eq("company_id", effectiveCompanyId)
            .eq("account_type", "liability")
            .ilike("account_name", "%trade payable%")
            .limit(1)
            .maybeSingle();
          creditAccountId = payable?.id || null;
          break;
        }
        default:
          creditAccountId = settings.default_bank_account_id || settings.default_cash_account_id;
      }

      if (!creditAccountId) {
        throw new Error(`No payment account configured for method: ${expense.paymentMethod}`);
      }

      // 3. Create Journal Entry
      const prefix = settings.gl_prefix || "EXP";
      const entryNumber = `${prefix}-${format(new Date(), "yyyyMMddHHmmss")}`;

      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: expense.requestDate,
          description: `Expense: ${expense.description || expense.expenseCategory} (${expense.requestNumber})`,
          reference: expense.requestNumber,
          total_debit: expense.amount,
          total_credit: expense.amount,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: expense.businessUnitCode || businessUnitCode || "HQ",
          business_unit_id: selectedCompanyId,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // 4. Create journal entry lines
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: expenseAccountId,
            description: expense.description || `${expense.expenseCategory} expense`,
            debit: expense.amount,
            credit: 0,
            company_id: effectiveCompanyId,
            bus_id: expense.busId || null,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: creditAccountId,
            description: `Payment for ${expense.requestNumber}`,
            debit: 0,
            credit: expense.amount,
            company_id: effectiveCompanyId,
          },
        ]);

      if (linesError) throw linesError;

      // 5. Update COA balances
      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      // 6. Update the expense request with GL posting info
      await supabase
        .from("expense_requests")
        .update({
          gl_posted: true,
          journal_entry_id: journalEntry.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", expense.id);

      // 7. If "to_be_paid" method and vendor exists, create AP Invoice
      if (expense.paymentMethod === "to_be_paid" && expense.vendorId) {
        const invoiceNumber = `EXP-INV-${format(new Date(), "yyyyMMddHHmmss")}`;

        const { data: apInvoice } = await supabase
          .from("ap_invoices")
          .insert({
            company_id: effectiveCompanyId,
            business_unit_code: expense.businessUnitCode || businessUnitCode || "HQ",
            vendor_id: expense.vendorId,
            invoice_number: invoiceNumber,
            invoice_date: expense.requestDate,
            due_date: format(
              new Date(new Date(expense.requestDate).setDate(
                new Date(expense.requestDate).getDate() + 30
              )),
              "yyyy-MM-dd"
            ),
            total_amount: expense.amount,
            balance: expense.amount,
            paid_amount: 0,
            status: "unpaid",
            reference: expense.requestNumber,
            notes: expense.description,
            journal_entry_id: journalEntry.id,
          })
          .select()
          .single();

        // Update expense request with AP invoice link
        if (apInvoice) {
          await supabase
            .from("expense_requests")
            .update({
              ap_invoice_id: apInvoice.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", expense.id);
        }
      }

      // 8. If petty cash, update petty cash fund balance
      if (expense.paymentMethod === "petty_cash" && expense.pettyCashFundId) {
        const { data: fund } = await supabase
          .from("petty_cash_funds")
          .select("current_balance")
          .eq("id", expense.pettyCashFundId)
          .single();

        if (fund) {
          await supabase
            .from("petty_cash_funds")
            .update({
              current_balance: (fund.current_balance || 0) - expense.amount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", expense.pettyCashFundId);
        }
      }

      return {
        journalEntryId: journalEntry.id,
        entryNumber: journalEntry.entry_number,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-requests"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["petty-cash-funds"] });
      toast.success("Expense posted to General Ledger");
    },
    onError: (error) => {
      toast.error(`Failed to post expense to GL: ${error.message}`);
    },
  });
}

// Bulk post multiple expense requests to GL
export async function bulkPostExpenseRequestsToGL(
  expenses: ExpenseRequestForGL[],
  settings: Record<string, any>,
  mappings: ExpenseGLMapping[],
  effectiveCompanyId: string,
  businessUnitCode: string,
  selectedCompanyId?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const expense of expenses) {
    try {
      const mapping = mappings.find(m => m.expense_category === expense.expenseCategory);
      let expenseAccountId = mapping?.gl_account_id || null;

      if (!expenseAccountId) {
        const { data: fallback } = await supabase
          .from("chart_of_accounts")
          .select("id")
          .eq("company_id", effectiveCompanyId)
          .eq("account_type", "expense")
          .ilike("account_name", `%${expense.expenseCategory}%`)
          .limit(1)
          .maybeSingle();
        expenseAccountId = fallback?.id || null;
      }

      if (!expenseAccountId) {
        errors.push(`${expense.requestNumber}: No GL account for category ${expense.expenseCategory}`);
        failed++;
        continue;
      }

      let creditAccountId = settings.default_bank_account_id || settings.default_cash_account_id;
      if (!creditAccountId) {
        errors.push(`${expense.requestNumber}: No payment account configured`);
        failed++;
        continue;
      }

      const prefix = settings.gl_prefix || "EXP";
      const entryNumber = `${prefix}-BULK-${format(new Date(), "yyyyMMddHHmmss")}-${success + 1}`;

      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: expense.requestDate,
          description: `Expense: ${expense.description || expense.expenseCategory} (${expense.requestNumber})`,
          reference: expense.requestNumber,
          total_debit: expense.amount,
          total_credit: expense.amount,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: expense.businessUnitCode || businessUnitCode,
          business_unit_id: selectedCompanyId,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: expenseAccountId,
            description: expense.description || expense.expenseCategory,
            debit: expense.amount,
            credit: 0,
            company_id: effectiveCompanyId,
            bus_id: expense.busId || null,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: creditAccountId,
            description: `Payment for ${expense.requestNumber}`,
            debit: 0,
            credit: expense.amount,
            company_id: effectiveCompanyId,
          },
        ]);

      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      await supabase
        .from("expense_requests")
        .update({
          gl_posted: true,
          journal_entry_id: journalEntry.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", expense.id);

      success++;
    } catch (err: any) {
      errors.push(`${expense.requestNumber}: ${err.message}`);
      failed++;
    }
  }

  return { success, failed, errors };
}

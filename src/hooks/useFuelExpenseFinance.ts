import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { format } from "date-fns";

export interface FuelExpenseForGL {
  expenseDate: string;
  branchId: string;
  busId?: string;
  amount: number;
  fuelLiters?: number;
  vendorId?: string;
  vendorName?: string;
  reference?: string;
  notes?: string;
  paymentMethod: 'direct' | 'credit';
  fuelStation?: string;
  billNumber?: string;
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

// Post fuel expense to GL with proper double entry
export function usePostFuelExpenseToGL() {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  return useMutation({
    mutationFn: async (expense: FuelExpenseForGL) => {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Get finance settings for the branch
      let settings = await supabase
        .from("school_bus_finance_settings")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .eq("branch_id", expense.branchId)
        .maybeSingle();

      // Fallback to default settings if no branch-specific settings
      if (!settings.data) {
        settings = await supabase
          .from("school_bus_finance_settings")
          .select("*")
          .eq("company_id", selectedCompanyId)
          .is("branch_id", null)
          .maybeSingle();
      }

      const financeSettings = settings.data;

      if (!financeSettings) {
        throw new Error("Finance settings not configured for School Bus Operations");
      }

      // Validate required accounts
      if (!financeSettings.fuel_expense_account_id) {
        throw new Error("Fuel Expense Account not configured in Finance Settings");
      }

      if (expense.paymentMethod === 'direct' && !financeSettings.fuel_bank_account_id) {
        throw new Error("Fuel Bank Account not configured in Finance Settings. Please add it in Settings → School Bus Finance");
      }

      // 2. Prepare GL accounts based on payment method
      let creditAccountId: string;
      let creditAccountName: string;

      if (expense.paymentMethod === 'direct') {
        // Direct payment from fuel bank
        creditAccountId = financeSettings.fuel_bank_account_id!;
        creditAccountName = "Fuel Bank Account";
      } else {
        // Credit purchase - need trade payable account
        if (!expense.vendorId) {
          throw new Error("Vendor is required for credit purchases");
        }
        
        // Get default trade payable from COA
        const { data: payableAccount } = await supabase
          .from("chart_of_accounts")
          .select("id")
          .eq("company_id", effectiveCompanyId)
          .ilike("account_name", "%trade payable%")
          .eq("account_type", "liability")
          .limit(1)
          .maybeSingle();

        if (!payableAccount) {
          throw new Error("Trade Payable account not found. Please configure GL accounts.");
        }
        creditAccountId = payableAccount.id;
        creditAccountName = "Trade Payable";
      }

      // 3. Create Journal Entry
      const entryNumber = `FUEL-${format(new Date(), "yyyyMMddHHmmss")}`;
      const description = expense.fuelStation 
        ? `Fuel Expense - ${expense.fuelStation}`
        : `Fuel Expense - ${expense.billNumber || 'General'}`;

      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: expense.expenseDate,
          description: description,
          reference: expense.billNumber || expense.reference,
          total_debit: expense.amount,
          total_credit: expense.amount,
          status: "posted",
          company_id: effectiveCompanyId,
           business_unit_code: 'SBO',
          business_unit_id: selectedCompanyId,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // 4. Create journal entry lines
      // DR: Fuel Expense Account / CR: Fuel Bank or Trade Payable
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: financeSettings.fuel_expense_account_id,
            description: `Fuel Expense - ${expense.fuelStation || expense.billNumber || 'General'}`,
            debit: expense.amount,
            credit: 0,
            company_id: effectiveCompanyId,
            bus_id: expense.busId || null,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: creditAccountId,
            description: expense.paymentMethod === 'direct' 
              ? `Payment from Fuel Bank` 
              : `Payable to ${expense.vendorName || 'Vendor'}`,
            debit: 0,
            credit: expense.amount,
            company_id: effectiveCompanyId,
          },
        ]);

      if (linesError) throw linesError;

      // 5. Update COA balances
      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      // 6. If direct payment, update fuel bank balance and create bank transaction
      if (expense.paymentMethod === 'direct') {
        // Get the bank account linked to the fuel GL account
        const { data: bankAccount } = await supabase
          .from("bank_accounts")
          .select("id, current_balance")
          .eq("gl_account_id", financeSettings.fuel_bank_account_id)
          .maybeSingle();

        if (bankAccount) {
          // Update bank balance
          await supabase
            .from("bank_accounts")
            .update({
              current_balance: (bankAccount.current_balance || 0) - expense.amount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", bankAccount.id);

          // Create bank transaction record
          await supabase
            .from("bank_transactions")
            .insert({
              bank_account_id: bankAccount.id,
              company_id: effectiveCompanyId,
              transaction_date: expense.expenseDate,
              transaction_type: "payment",
              description: `Fuel Expense - ${expense.fuelStation || expense.billNumber || 'General'}`,
              reference: expense.billNumber,
              debit_amount: expense.amount,
              credit_amount: 0,
              running_balance: (bankAccount.current_balance || 0) - expense.amount,
              journal_entry_id: journalEntry.id,
            });
        }
      }

      // 7. If credit purchase, create AP Invoice
      let apInvoiceId: string | null = null;
      if (expense.paymentMethod === 'credit' && expense.vendorId) {
        const invoiceNumber = `FUEL-INV-${format(new Date(), "yyyyMMddHHmmss")}`;
        
        const { data: apInvoice, error: apError } = await supabase
          .from("ap_invoices")
          .insert({
            company_id: effectiveCompanyId,
            business_unit_code: 'SBO',
            vendor_id: expense.vendorId,
            invoice_number: invoiceNumber,
            invoice_date: expense.expenseDate,
            due_date: format(new Date(new Date(expense.expenseDate).setDate(new Date(expense.expenseDate).getDate() + 30)), "yyyy-MM-dd"),
            total_amount: expense.amount,
            balance: expense.amount,
            paid_amount: 0,
            status: "unpaid",
            reference: expense.billNumber,
            notes: `Fuel purchase - ${expense.fuelStation || 'General'}${expense.fuelLiters ? ` (${expense.fuelLiters} liters)` : ''}`,
            journal_entry_id: journalEntry.id,
          })
          .select()
          .single();

        if (!apError && apInvoice) {
          apInvoiceId = apInvoice.id;

          // Create AP invoice line
          await supabase
            .from("ap_invoice_lines")
            .insert({
              invoice_id: apInvoice.id,
              company_id: effectiveCompanyId,
              account_id: financeSettings.fuel_expense_account_id,
              description: `Fuel - ${expense.fuelStation || 'General'}${expense.fuelLiters ? ` (${expense.fuelLiters}L)` : ''}`,
              quantity: expense.fuelLiters || 1,
              unit_price: expense.fuelLiters ? expense.amount / expense.fuelLiters : expense.amount,
              line_total: expense.amount,
            });
        }
      }

      return {
        journalEntry,
        apInvoiceId,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-requests"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] });
      toast.success("Fuel expense recorded with GL posting");
    },
    onError: (error) => {
      toast.error(`Failed to record fuel expense: ${error.message}`);
    },
  });
}

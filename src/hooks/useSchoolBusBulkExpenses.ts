import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { format } from "date-fns";

export interface BulkBusExpense {
  expenseDate: string;
  busId: string;
  amount: number;
  fuelLiters?: number;
  odometerEnd?: number; // Optional mileage
  notes?: string;
  expenseType: 'fuel' | 'repair' | 'other';
}

export interface BulkExpenseUploadPayload {
  branchId: string;
  paymentMethod: 'ap' | 'iou' | 'petty_cash' | 'direct';
  expenses: BulkBusExpense[];
  
  // AP specific parameters
  vendorId?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  
  // Petty Cash specific parameters
  pettyCashFundId?: string;
  
  // Direct Payment specific parameters
  directPaymentAccountId?: string;
}

// Helper function to update COA balances after journal entry creation
async function updateAccountBalancesFromJournalEntry(journalEntryId: string, supabaseClient: any = supabase) {
  const { data: lines, error: linesError } = await supabaseClient
    .from("journal_entry_lines")
    .select("account_id, debit, credit")
    .eq("journal_entry_id", journalEntryId);

  if (linesError) throw linesError;
  if (!lines || lines.length === 0) return;

  for (const line of lines) {
    if (!line.account_id) continue;

    const { data: account, error: accountError } = await supabaseClient
      .from("chart_of_accounts")
      .select("current_balance, account_type")
      .eq("id", line.account_id)
      .single();

    if (accountError || !account) continue;

    const netAmount = (line.debit || 0) - (line.credit || 0);
    const isDebitNormal = ["asset", "expense"].includes(account.account_type || "");
    const adjustment = isDebitNormal ? netAmount : -netAmount;

    await supabaseClient
      .from("chart_of_accounts")
      .update({
        current_balance: (account.current_balance || 0) + adjustment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", line.account_id);
  }
}

export function useSchoolBusBulkExpenses() {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useMutation({
    mutationFn: async (payload: BulkExpenseUploadPayload) => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!payload.expenses.length) {
        throw new Error("No valid expenses to process.");
      }

      // 1. Get finance settings for the branch
      let settings = await supabase
        .from("school_bus_finance_settings")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .eq("branch_id", payload.branchId)
        .maybeSingle();

      // Fallback
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

      // Validate Expense Account (Use fuel expense account natively, or fallback to an auto-search)
      let defaultFuelAccountId = financeSettings?.fuel_expense_account_id;
      
      if (!defaultFuelAccountId) {
        const { data: fuelCOA } = await supabase
          .from("chart_of_accounts")
          .select("id")
          .eq("company_id", effectiveCompanyId)
          .ilike("account_name", "%Fuel%")
          .eq("account_type", "expense")
          .limit(1)
          .maybeSingle();
          
        if (fuelCOA) {
          defaultFuelAccountId = fuelCOA.id;
        } else {
          throw new Error("Fuel Expense Account not configured in Finance Settings, and no default 'Fuel' expense account found in Chart of Accounts.");
        }
      }

      // 2. Resolve Credit Account based on Payment Method
      let creditAccountId: string;
      let creditAccountName: string;

      if (payload.paymentMethod === 'petty_cash') {
        let cashAccountId = financeSettings?.expense_cash_account_id;
        
        if (!cashAccountId) {
          const { data: cashCOA } = await supabase
            .from("chart_of_accounts")
            .select("id")
            .eq("company_id", effectiveCompanyId)
            .ilike("account_name", "%Petty Cash%")
            .limit(1)
            .maybeSingle();
            
          if (cashCOA) {
            cashAccountId = cashCOA.id;
          } else {
             throw new Error("Petty Cash Account not configured in Finance Settings, and no 'Petty Cash' account found in Chart of Accounts.");
          }
        }
        
        creditAccountId = cashAccountId;
        creditAccountName = "Petty Cash";
      } else if (payload.paymentMethod === 'iou') {
        // Find IOU account loosely if not explicitly passed
        const { data: iouAccount } = await supabase
          .from("chart_of_accounts")
          .select("id, account_name")
          .eq("company_id", effectiveCompanyId)
          .ilike("account_name", "%IOU%")
          .limit(1)
          .maybeSingle();

        if (!iouAccount) {
          throw new Error("IOU Account not found in Chart of Accounts. Please create one.");
        }
        creditAccountId = iouAccount.id;
        creditAccountName = iouAccount.account_name;
      } else if (payload.paymentMethod === 'direct') {
        // Direct Payment - credit a chosen asset account (Fuel Float / Bank)
        if (!payload.directPaymentAccountId) {
          throw new Error("Direct Payment requires a 'Pay From Account' to be selected.");
        }
        const { data: directAccount, error: directErr } = await supabase
          .from("chart_of_accounts")
          .select("id, account_name, company_id")
          .eq("id", payload.directPaymentAccountId)
          .maybeSingle();

        if (directErr || !directAccount) {
          throw new Error("Selected Direct Payment account not found.");
        }
        if (directAccount.company_id !== effectiveCompanyId) {
          throw new Error("Selected account belongs to a different company. Pick an account from the current company's COA.");
        }
        creditAccountId = directAccount.id;
        creditAccountName = directAccount.account_name;
      } else {
        // AP - Trade Payable
        const { data: payableAccount } = await supabase
          .from("chart_of_accounts")
          .select("id, account_name")
          .eq("company_id", effectiveCompanyId)
          .ilike("account_name", "%trade payable%")
          .eq("account_type", "liability")
          .limit(1)
          .maybeSingle();

        if (!payableAccount) {
          throw new Error("Trade Payable account not found. Please configure GL accounts.");
        }
        creditAccountId = payableAccount.id;
        creditAccountName = payableAccount.account_name;
      }

      // Cross-company guard: ensure the fuel expense account also belongs to this company
      const { data: fuelAcctCheck } = await supabase
        .from("chart_of_accounts")
        .select("company_id")
        .eq("id", defaultFuelAccountId)
        .maybeSingle();
      if (fuelAcctCheck && fuelAcctCheck.company_id !== effectiveCompanyId) {
        throw new Error("Fuel Expense account belongs to a different company. Update Finance Settings to use a COA from the current company.");
      }

      // We will loop through the batch and upload them one by one.
      let skippedCount = 0;
      let postedCount = 0;
      for (let i = 0; i < payload.expenses.length; i++) {
        const expense = payload.expenses[i];

        // Duplicate guard: skip if a fuel-import JE already exists for (bus, date)
        const { data: existingFuelLine } = await supabase
          .from("journal_entry_lines")
          .select("journal_entry_id, journal_entries!inner(id, entry_date, source_module)")
          .eq("bus_id", expense.busId)
          .eq("journal_entries.source_module", "school_bus_fuel_import")
          .eq("journal_entries.entry_date", expense.expenseDate)
          .limit(1)
          .maybeSingle();

        if (existingFuelLine?.journal_entry_id) {
          skippedCount += 1;
          continue;
        }
        // Resolve human-readable bus_no for use in invoice number / journal description
        const { data: busRow } = await supabase
          .from("buses")
          .select("bus_no")
          .eq("id", expense.busId)
          .maybeSingle();
        const busNoSafe = (busRow?.bus_no || expense.busId.substring(0, 4)).replace(/\s+/g, '');
        // 3. Upsert into daily_bus_expenses
        // Check if an expense already exists for that day + bus
        const { data: existingDaily } = await supabase
          .from("daily_bus_expenses")
          .select("id, fuel_cost, fuel_liters, notes")
          .eq("bus_id", expense.busId)
          .eq("expense_date", expense.expenseDate)
          .maybeSingle();

        let dailyExpenseId = existingDaily?.id;

        // Note: For simplicity we only overwrite fuel for this flow, representing fuel import.
        const expenseData = {
          expense_date: expense.expenseDate,
          bus_id: expense.busId,
          fuel_cost: (existingDaily?.fuel_cost || 0) + expense.amount,
          fuel_liters: (existingDaily?.fuel_liters || 0) + (expense.fuelLiters || 0),
          notes: expense.notes ? `${existingDaily?.notes || ''} | [Fuel Import] ${expense.notes}` : existingDaily?.notes,
          gl_posted: true,
          created_by: user?.id,
        };

        if (dailyExpenseId) {
          await supabase.from("daily_bus_expenses").update(expenseData).eq("id", dailyExpenseId);
        } else {
          const res = await supabase.from("daily_bus_expenses").insert(expenseData).select().single();
          if (res.data) dailyExpenseId = res.data.id;
        }

        // 4. Update Odometer (current_mileage in buses) if provided
        if (expense.odometerEnd) {
          await supabase
            .from("buses")
            .update({ current_mileage: expense.odometerEnd })
            .eq("id", expense.busId);
        }

        // 5. Create Journal Entry
        const entryNumber = `FUEL-BLK-${format(new Date(), "yyyyMMddHHmmss")}-${Math.floor(Math.random() * 1000)}`;
        const description = `Bulk Fuel Expense - Bus ${expense.busId}`;

        const { data: journalEntry, error: jeError } = await supabase
          .from("journal_entries")
          .insert({
            entry_number: entryNumber,
            entry_date: expense.expenseDate,
            description: description,
            reference: expense.notes || `IMP-${format(new Date(), "yyyyMMdd")}`,
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

        // Link journal entry back to daily_bus_expenses if it lacked one
        if (dailyExpenseId) {
            await supabase.from("daily_bus_expenses")
               .update({ journal_entry_id: journalEntry.id })
               .eq("id", dailyExpenseId)
               .is("journal_entry_id", null);
        }

        // 5.5 Deep ERP Integrations (AP Invoice & Petty Cash Vouchers)
        if (payload.paymentMethod === 'ap') {
           const baseInv = payload.invoiceNumber || `FUEL-AP-${format(new Date(), "yyyyMMdd")}`;
           const uniqueInv = `${baseInv}-${busNoSafe}-${expense.expenseDate}-${i + 1}`;
           const { error: apError } = await supabase
              .from('ap_invoices')
              .insert({
                  company_id: effectiveCompanyId,
                  business_unit_code: 'SBO',
                  vendor_id: payload.vendorId || null,
                  invoice_number: uniqueInv,
                  invoice_date: payload.invoiceDate || expense.expenseDate,
                  due_date: payload.dueDate || expense.expenseDate,
                  total_amount: expense.amount,
                  balance: expense.amount,
                  status: 'unpaid',
                  approval_status: 'approved',
                  approved_at: new Date().toISOString(),
                  approved_by: user?.id,
                  bus_id: expense.busId,
                  journal_entry_id: journalEntry.id,
                  notes: `Bulk Fuel Load - ${expense.expenseDate}`,
                  created_by: user?.id,
              });
           if (apError) throw new Error(`Failed to generate AP Invoice: ${apError.message}`);
        } else if (payload.paymentMethod === 'petty_cash' && payload.pettyCashFundId) {
           const { data: fund } = await supabase
              .from('petty_cash_funds')
              .select('current_balance')
              .eq('id', payload.pettyCashFundId)
              .maybeSingle();

           if (fund) {
              const newBalance = fund.current_balance - expense.amount;
              const { error: pcError } = await supabase
                 .from('petty_cash_transactions')
                 .insert({
                   petty_cash_fund_id: payload.pettyCashFundId,
                   company_id: effectiveCompanyId,
                   transaction_type: 'expense',
                   amount: expense.amount,
                   balance_after: newBalance,
                   description: `Bulk Fuel Import - Bus ${expense.busId}`,
                   journal_entry_id: journalEntry.id,
                   voucher_number: `PCV-FUEL-${format(new Date(), "yyyyMMddHHmmss")}-${Math.floor(Math.random() * 1000)}`,
                   created_by: user?.id,
                   status: 'approved' // Auto-approved via bulk sync
                 });
              if (pcError) throw new Error(`Petty Cash transaction failed: ${pcError.message}`);
              
              const { error: fundError } = await supabase
                 .from('petty_cash_funds')
                 .update({ current_balance: newBalance })
                 .eq('id', payload.pettyCashFundId);
              if (fundError) throw new Error(`Petty Cash balance update failed: ${fundError.message}`);
           }
        } else if (payload.paymentMethod === 'direct') {
           // Surface direct payment in AP → Payments for full traceability (one row per bus)
           const paymentNumber = `DP-FUEL-${format(new Date(), "yyyyMMddHHmmss")}-${i + 1}`;
           const { error: dpError } = await supabase
              .from('ap_payments')
              .insert({
                 company_id: effectiveCompanyId,
                 business_unit_code: 'SBO',
                 payment_number: paymentNumber,
                 payment_date: expense.expenseDate,
                 payment_method: 'direct',
                 payee_type: 'direct',
                 vendor_id: null,
                 bank_account_id: null,
                 bus_id: expense.busId,
                 bus_no: busNoSafe,
                 amount: expense.amount,
                 total_with_fees: expense.amount,
                 is_direct_payment: true,
                 status: 'paid',
                 approval_status: 'approved',
                 approved_at: new Date().toISOString(),
                 approved_by: user?.id,
                 journal_entry_id: journalEntry.id,
                 reference: `Float Account: ${creditAccountName}`,
                 notes: `Bulk fuel float drawdown — Bus ${busNoSafe} | Source: ${creditAccountName}`,
                 created_by: user?.id,
              });
           if (dpError) throw new Error(`Failed to record Direct Payment in AP: ${dpError.message}`);
        }

        // 6. Create journal entry lines
        // DR: Fuel Expense Account 
        // CR: Petty Cash / IOU / Trade Payable
        const { error: linesError } = await supabase
          .from("journal_entry_lines")
          .insert([
            {
              journal_entry_id: journalEntry.id,
              account_id: defaultFuelAccountId, // DEBIT expense
              description: `Bulk Fuel Expense | Date: ${expense.expenseDate}`,
              debit: expense.amount,
              credit: 0,
              company_id: effectiveCompanyId,
              bus_id: expense.busId,
            },
            {
              journal_entry_id: journalEntry.id,
              account_id: creditAccountId, // CREDIT liability/asset
              description: `${creditAccountName.toUpperCase()} | Bulk Fuel`,
              debit: 0,
              credit: expense.amount,
              company_id: effectiveCompanyId,
            },
          ]);

        if (linesError) throw linesError;

        // 7. Update COA balances
        await updateAccountBalancesFromJournalEntry(journalEntry.id);
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-bus-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["buses"] });
      toast.success("Bulk expenses successfully imported and posted to GL!");
    },
    onError: (error: any) => {
      toast.error(`Bulk import failed: ${error.message}`);
    },
  });
}

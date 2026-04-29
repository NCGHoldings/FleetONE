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
  expenseType: 'fuel' | 'parking' | 'highway' | 'other';
  // Additional fields for Parking/Highway/Other
  accountName?: string;
  bankName?: string;
  bankAccNo?: string;
  bankBranch?: string;
}

export interface BulkExpenseUploadPayload {
  branchId: string;
  paymentMethod: 'ap' | 'iou' | 'petty_cash' | 'direct';
  globalExpenseType?: 'fuel' | 'parking' | 'highway' | 'other';
  expenseAccountId?: string;
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

      const financeSettings = settings?.data;
      if (!financeSettings) {
        console.warn("Finance settings not configured for School Bus Operations. Relying on fallbacks.");
      }

      // Validate Expense Account (Use explicit UI selection, or configured account, or fallback to auto-search)
      let defaultExpenseAccountId = payload.expenseAccountId;

      if (!defaultExpenseAccountId && payload.globalExpenseType === 'fuel') {
         defaultExpenseAccountId = financeSettings?.fuel_expense_account_id;
      }
      
      if (!defaultExpenseAccountId) {
        let searchString = "%Fuel%";
        if (payload.globalExpenseType === 'parking') searchString = "%Parking%";
        else if (payload.globalExpenseType === 'highway') searchString = "%Highway%";
        else if (payload.globalExpenseType === 'other') searchString = "%Other Expense%";

        const { data: expCOA } = await supabase
          .from("chart_of_accounts")
          .select("id")
          .eq("company_id", effectiveCompanyId)
          .ilike("account_name", searchString)
          .eq("account_type", "expense")
          .limit(1)
          .maybeSingle();
          
        if (expCOA) {
          defaultExpenseAccountId = expCOA.id;
        } else {
          // Fallback to generic "Other Expense" if specific ones are not found
          if (payload.globalExpenseType !== 'fuel') {
             const { data: genericExp } = await supabase
               .from("chart_of_accounts")
               .select("id")
               .eq("company_id", effectiveCompanyId)
               .ilike("account_name", "%Other Expense%")
               .eq("account_type", "expense")
               .limit(1)
               .maybeSingle();
             if (genericExp) defaultExpenseAccountId = genericExp.id;
          }
          
          if (!defaultExpenseAccountId) {
             throw new Error(`Expense Account for ${payload.globalExpenseType || 'fuel'} not found in Chart of Accounts. Please create a "${searchString.replace(/%/g, '')}" expense account.`);
          }
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

      // Cross-company guard: ensure the expense account also belongs to this company
      let { data: expAcctCheck } = await supabase
        .from("chart_of_accounts")
        .select("company_id")
        .eq("id", defaultExpenseAccountId)
        .maybeSingle();
        
      if (expAcctCheck && expAcctCheck.company_id !== effectiveCompanyId) {
        console.warn(`Mapped Expense account belongs to a different company. Finding a valid one from current company COA...`);
        
        let searchString = "%Fuel%";
        if (payload.globalExpenseType === 'parking') searchString = "%Parking%";
        else if (payload.globalExpenseType === 'highway') searchString = "%Highway%";
        else if (payload.globalExpenseType === 'other') searchString = "%Other Expense%";

        // Find a valid one instead of throwing
        const { data: validExpCOA } = await supabase
          .from("chart_of_accounts")
          .select("id")
          .eq("company_id", effectiveCompanyId)
          .ilike("account_name", searchString)
          .eq("account_type", "expense")
          .limit(1)
          .maybeSingle();
          
        if (validExpCOA) {
          defaultExpenseAccountId = validExpCOA.id;
        } else {
          throw new Error(`Expense account belongs to a different company, and no default account found in ${effectiveCompanyId}. Update Finance Settings.`);
        }
      }

            // 3. Pre-process to filter duplicates and calculate totals
      let skippedCount = 0;
      let postedCount = 0;
      let totalAmount = 0;
      const validExpenses = [];

      for (const expense of payload.expenses) {
        // Duplicate guard: skip if a fuel-import JE already exists for (bus, date)
        const { data: existingFuelLine } = await supabase
          .from("journal_entry_lines")
          .select("journal_entry_id, journal_entries!inner(id, entry_date, source_module)")
          .eq("bus_id", expense.busId)
          .eq("journal_entries.source_module", `school_bus_${payload.globalExpenseType || 'fuel'}_import`)
          .eq("journal_entries.entry_date", expense.expenseDate)
          .limit(1)
          .maybeSingle();

        if (existingFuelLine?.journal_entry_id) {
          skippedCount += 1;
          continue;
        }
        
        validExpenses.push(expense);
        totalAmount += expense.amount;
      }

      if (validExpenses.length === 0) {
        return { posted: 0, skipped: skippedCount };
      }

      // 4. Generate ONE Journal Entry
      const prefix = payload.globalExpenseType === 'fuel' ? 'FUEL' : 'EXP';
      const entryNumber = `${prefix}-BLK-${format(new Date(), "yyyyMMddHHmmss")}-${Math.floor(Math.random() * 1000)}`;
      const expTypeTitle = payload.globalExpenseType ? payload.globalExpenseType.charAt(0).toUpperCase() + payload.globalExpenseType.slice(1) : 'Fuel';
      const description = `Bulk ${expTypeTitle} Expense - ${validExpenses.length} Buses`;

      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: validExpenses[0].expenseDate,
          description: description,
          reference: `IMP-${format(new Date(), "yyyyMMdd")}`,
          total_debit: totalAmount,
          total_credit: totalAmount,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: 'SBO',
          business_unit_id: selectedCompanyId,
          source_module: `school_bus_${payload.globalExpenseType || 'fuel'}_import`,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // 5. Generate ONE Parent Payment/Invoice Record
      let parentDocId = null;
      if (payload.paymentMethod === 'ap') {
         const uniqueInv = `${payload.invoiceNumber || prefix + '-AP-' + format(new Date(), "yyyyMMdd")}-${format(new Date(), "HHmmss")}`;
         const { data: apInv, error: apError } = await supabase
            .from('ap_invoices')
            .insert({
                company_id: effectiveCompanyId,
                business_unit_code: 'SBO',
                vendor_id: payload.vendorId || null,
                invoice_number: uniqueInv,
                invoice_date: payload.invoiceDate || validExpenses[0].expenseDate,
                due_date: payload.dueDate || validExpenses[0].expenseDate,
                total_amount: totalAmount,
                balance: totalAmount,
                status: 'unpaid',
                approval_status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: user?.id,
                journal_entry_id: journalEntry.id,
                notes: `Bulk ${expTypeTitle} Load | ${validExpenses.length} Buses`,
                created_by: user?.id,
            }).select().single();
         if (apError) throw new Error(`Failed to generate AP Invoice: ${apError.message}`);
         parentDocId = apInv.id;
      } else if (payload.paymentMethod === 'petty_cash' && payload.pettyCashFundId) {
         const { data: fund } = await supabase
            .from('petty_cash_funds')
            .select('current_balance')
            .eq('id', payload.pettyCashFundId)
            .maybeSingle();

         if (fund) {
            const newBalance = fund.current_balance - totalAmount;
            const { error: pcError } = await supabase
               .from('petty_cash_transactions')
               .insert({
                 petty_cash_fund_id: payload.pettyCashFundId,
                 company_id: effectiveCompanyId,
                 transaction_type: 'expense',
                 amount: totalAmount,
                 balance_after: newBalance,
                 description: `Bulk ${expTypeTitle} Import - ${validExpenses.length} Buses`,
                 journal_entry_id: journalEntry.id,
                 voucher_number: `PCV-${prefix}-${format(new Date(), "yyyyMMddHHmmss")}-${Math.floor(Math.random() * 1000)}`,
                 created_by: user?.id,
                 status: 'approved' 
               });
            if (pcError) throw new Error(`Petty Cash transaction failed: ${pcError.message}`);
            
            const { error: fundError } = await supabase
               .from('petty_cash_funds')
               .update({ current_balance: newBalance })
               .eq('id', payload.pettyCashFundId);
            if (fundError) throw new Error(`Petty Cash balance update failed: ${fundError.message}`);
         }
      } else if (payload.paymentMethod === 'direct') {
         const paymentNumber = `DP-${prefix}-${format(new Date(), "yyyyMMddHHmmss")}-${Math.floor(Math.random() * 1000)}`;
         const { data: apPay, error: dpError } = await supabase
            .from('ap_payments')
            .insert({
               company_id: effectiveCompanyId,
               business_unit_code: 'SBO',
               payment_number: paymentNumber,
               payment_date: validExpenses[0].expenseDate,
               payment_method: 'direct',
               payee_type: 'direct',
               vendor_id: null,
               bank_account_id: payload.directPaymentAccountId || null,
               amount: totalAmount,
               is_direct_payment: true,
               status: 'paid',
               approval_status: 'approved',
               approved_at: new Date().toISOString(),
               approved_by: user?.id,
               journal_entry_id: journalEntry.id,
               reference: `Float Account: ${creditAccountName}`,
               notes: `Bulk ${expTypeTitle.toLowerCase()} float drawdown — ${validExpenses.length} Buses | Source: ${creditAccountName}`,
               created_by: user?.id,
            }).select().single();
         if (dpError) throw new Error(`Failed to record Direct Payment in AP: ${dpError.message}`);
         parentDocId = apPay.id;
      }

      // 6. Loop to process individual expenses (Upserts & Line Items)
      const jeLines = [];
      const apInvoiceLines = [];
      const apPaymentLines = [];

      for (let i = 0; i < validExpenses.length; i++) {
        const expense = validExpenses[i];
        postedCount++;

        const { data: busRow } = await supabase
          .from("buses")
          .select("bus_no")
          .eq("id", expense.busId)
          .maybeSingle();
        const busNoSafe = (busRow?.bus_no || expense.busId.substring(0, 4)).replace(/\s+/g, '');
        
        // 6.1 Upsert into daily_bus_expenses
        const { data: existingDaily } = await supabase
          .from("daily_bus_expenses")
          .select("id, fuel_cost, fuel_liters, parking, highway_charges, other, notes")
          .eq("bus_id", expense.busId)
          .eq("expense_date", expense.expenseDate)
          .maybeSingle();

        let dailyExpenseId = existingDaily?.id;

        const baseNotes = `[${payload.globalExpenseType?.toUpperCase() || 'FUEL'} Import]`;
        let combinedNotes = expense.notes ? `${baseNotes} ${expense.notes}` : baseNotes;
        if (expense.accountName || expense.bankName) {
           combinedNotes += ` | Bank: ${expense.bankName || ''} Acc: ${expense.bankAccNo || ''} Branch: ${expense.bankBranch || ''} Holder: ${expense.accountName || ''}`;
        }
        
        const expenseData: any = {
          expense_date: expense.expenseDate,
          bus_id: expense.busId,
          notes: existingDaily?.notes ? `${existingDaily.notes} | ${combinedNotes}` : combinedNotes,
          gl_posted: true,
          created_by: user?.id,
          journal_entry_id: journalEntry.id,
        };

        if (payload.globalExpenseType === 'parking') {
           expenseData.parking = (existingDaily?.parking || 0) + expense.amount;
        } else if (payload.globalExpenseType === 'highway') {
           expenseData.highway_charges = (existingDaily?.highway_charges || 0) + expense.amount;
        } else if (payload.globalExpenseType === 'other') {
           expenseData.other = (existingDaily?.other || 0) + expense.amount;
        } else {
           expenseData.fuel_cost = (existingDaily?.fuel_cost || 0) + expense.amount;
           expenseData.fuel_liters = (existingDaily?.fuel_liters || 0) + (expense.fuelLiters || 0);
        }

        if (dailyExpenseId) {
          await supabase.from("daily_bus_expenses").update(expenseData).eq("id", dailyExpenseId);
        } else {
          await supabase.from("daily_bus_expenses").insert(expenseData);
        }

        // 6.2 Also insert into route_expenses so it shows up in P&L reports
        const { data: routeMatch } = await supabase
          .from("school_routes")
          .select("id")
          .eq("bus_reg_no", busNoSafe)
          .eq("branch_id", payload.branchId)
          .maybeSingle();

        // Always insert so P&L can pick it up by bus_no even if route_id is missing
        await supabase.from("route_expenses").insert({
          route_id: routeMatch?.id || null,
          branch_id: payload.branchId,
          bus_id: expense.busId,
          expense_type: payload.globalExpenseType || "fuel",
          description: `Bulk ${payload.globalExpenseType || 'Fuel'} Import - ${busNoSafe}`,
          amount: expense.amount,
          expense_date: expense.expenseDate,
          created_by: user?.id,
          journal_entry_id: journalEntry.id,
        });

        // 6.3 Update Odometer (current_mileage in buses) if provided
        if (expense.odometerEnd) {
          await supabase
            .from("buses")
            .update({ current_mileage: expense.odometerEnd })
            .eq("id", expense.busId);
        }

        // 6.4 JE Line for this bus
        jeLines.push({
          journal_entry_id: journalEntry.id,
          account_id: defaultExpenseAccountId, // DEBIT expense
          description: `Bus ${busNoSafe} | ${expTypeTitle} Expense | Date: ${expense.expenseDate}`,
          debit: expense.amount,
          credit: 0,
          company_id: effectiveCompanyId,
          bus_id: expense.busId,
        });

        // 6.5 AP Lines
        if (payload.paymentMethod === 'ap' && parentDocId) {
          apInvoiceLines.push({
            invoice_id: parentDocId,
            account_id: defaultExpenseAccountId,
            description: `Bus ${busNoSafe} - ${expTypeTitle}`,
            quantity: expense.fuelLiters || 1,
            unit_price: expense.fuelLiters ? (expense.amount / expense.fuelLiters) : expense.amount,
            line_total: expense.amount,
            company_id: effectiveCompanyId,
          });
        } else if (payload.paymentMethod === 'direct' && parentDocId) {
          apPaymentLines.push({
            payment_id: parentDocId,
            account_id: defaultExpenseAccountId,
            description: `Bus ${busNoSafe} - ${expTypeTitle}`,
            quantity: expense.fuelLiters || 1,
            unit_price: expense.fuelLiters ? (expense.amount / expense.fuelLiters) : expense.amount,
            line_total: expense.amount,
            company_id: effectiveCompanyId,
          });
        }
      }

      // 7. Add the single CREDIT line for the total amount
      jeLines.push({
        journal_entry_id: journalEntry.id,
        account_id: creditAccountId, // CREDIT liability/asset
        description: `${creditAccountName.toUpperCase()} | Bulk ${expTypeTitle} Total`,
        debit: 0,
        credit: totalAmount,
        company_id: effectiveCompanyId,
      });

      // 8. Insert all lines in batches
      if (jeLines.length > 0) {
        const { error: jeLinesError } = await supabase.from("journal_entry_lines").insert(jeLines);
        if (jeLinesError) throw jeLinesError;
      }
      if (apInvoiceLines.length > 0) {
        await supabase.from("ap_invoice_lines").insert(apInvoiceLines);
      }
      if (apPaymentLines.length > 0) {
        await supabase.from("ap_payment_lines").insert(apPaymentLines);
      }

      // 9. Update COA balances
      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      return { posted: postedCount, skipped: skippedCount };
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["daily-bus-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["buses"] });
      queryClient.invalidateQueries({ queryKey: ["ap-payments"] });
      const posted = result?.posted ?? 0;
      const skipped = result?.skipped ?? 0;
      if (skipped > 0) {
        toast.success(`Imported ${posted} bus${posted === 1 ? '' : 'es'}, skipped ${skipped} duplicate${skipped === 1 ? '' : 's'} already posted on this date.`);
      } else {
        toast.success(`Bulk expenses imported and posted to GL (${posted} bus${posted === 1 ? '' : 'es'}).`);
      }
    },
    onError: (error: any) => {
      toast.error(`Bulk import failed: ${error.message}`);
    },
  });
}

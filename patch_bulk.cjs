const fs = require('fs');

const code = fs.readFileSync('src/hooks/useSchoolBusBulkExpenses.ts', 'utf8');

const targetStartString = "// We will loop through the batch and upload them one by one.";
const targetEndString = "return { posted: postedCount, skipped: skippedCount };";

const startIndex = code.indexOf(targetStartString);
const endIndex = code.indexOf(targetEndString) + targetEndString.length;

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find start or end block.");
  process.exit(1);
}

const replacement = `      // 3. Pre-process to filter duplicates and calculate totals
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
          .eq("journal_entries.source_module", \`school_bus_\${payload.globalExpenseType || 'fuel'}_import\`)
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
      const entryNumber = \`\${prefix}-BLK-\${format(new Date(), "yyyyMMddHHmmss")}-\${Math.floor(Math.random() * 1000)}\`;
      const expTypeTitle = payload.globalExpenseType ? payload.globalExpenseType.charAt(0).toUpperCase() + payload.globalExpenseType.slice(1) : 'Fuel';
      const description = \`Bulk \${expTypeTitle} Expense - \${validExpenses.length} Buses\`;

      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: validExpenses[0].expenseDate,
          description: description,
          reference: \`IMP-\${format(new Date(), "yyyyMMdd")}\`,
          total_debit: totalAmount,
          total_credit: totalAmount,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: 'SBO',
          business_unit_id: selectedCompanyId,
          source_module: \`school_bus_\${payload.globalExpenseType || 'fuel'}_import\`,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // 5. Generate ONE Parent Payment/Invoice Record
      let parentDocId = null;
      if (payload.paymentMethod === 'ap') {
         const uniqueInv = \`\${payload.invoiceNumber || prefix + '-AP-' + format(new Date(), "yyyyMMdd")}-\${format(new Date(), "HHmmss")}\`;
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
                notes: \`Bulk \${expTypeTitle} Load | \${validExpenses.length} Buses\`,
                created_by: user?.id,
            }).select().single();
         if (apError) throw new Error(\`Failed to generate AP Invoice: \${apError.message}\`);
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
                 description: \`Bulk \${expTypeTitle} Import - \${validExpenses.length} Buses\`,
                 journal_entry_id: journalEntry.id,
                 voucher_number: \`PCV-\${prefix}-\${format(new Date(), "yyyyMMddHHmmss")}-\${Math.floor(Math.random() * 1000)}\`,
                 created_by: user?.id,
                 status: 'approved' 
               });
            if (pcError) throw new Error(\`Petty Cash transaction failed: \${pcError.message}\`);
            
            const { error: fundError } = await supabase
               .from('petty_cash_funds')
               .update({ current_balance: newBalance })
               .eq('id', payload.pettyCashFundId);
            if (fundError) throw new Error(\`Petty Cash balance update failed: \${fundError.message}\`);
         }
      } else if (payload.paymentMethod === 'direct') {
         const paymentNumber = \`DP-\${prefix}-\${format(new Date(), "yyyyMMddHHmmss")}-\${Math.floor(Math.random() * 1000)}\`;
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
               reference: \`Float Account: \${creditAccountName}\`,
               notes: \`Bulk \${expTypeTitle.toLowerCase()} float drawdown — \${validExpenses.length} Buses | Source: \${creditAccountName}\`,
               created_by: user?.id,
            }).select().single();
         if (dpError) throw new Error(\`Failed to record Direct Payment in AP: \${dpError.message}\`);
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
        const busNoSafe = (busRow?.bus_no || expense.busId.substring(0, 4)).replace(/\\s+/g, '');
        
        // 6.1 Upsert into daily_bus_expenses
        const { data: existingDaily } = await supabase
          .from("daily_bus_expenses")
          .select("id, fuel_cost, fuel_liters, parking, highway_charges, other, notes")
          .eq("bus_id", expense.busId)
          .eq("expense_date", expense.expenseDate)
          .maybeSingle();

        let dailyExpenseId = existingDaily?.id;

        const baseNotes = \`[\${payload.globalExpenseType?.toUpperCase() || 'FUEL'} Import]\`;
        let combinedNotes = expense.notes ? \`\${baseNotes} \${expense.notes}\` : baseNotes;
        if (expense.accountName || expense.bankName) {
           combinedNotes += \` | Bank: \${expense.bankName || ''} Acc: \${expense.bankAccNo || ''} Branch: \${expense.bankBranch || ''} Holder: \${expense.accountName || ''}\`;
        }
        
        const expenseData: any = {
          expense_date: expense.expenseDate,
          bus_id: expense.busId,
          notes: existingDaily?.notes ? \`\${existingDaily.notes} | \${combinedNotes}\` : combinedNotes,
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

        if (routeMatch?.id) {
          await supabase.from("route_expenses").insert({
            route_id: routeMatch.id,
            branch_id: payload.branchId,
            bus_id: expense.busId,
            expense_type: payload.globalExpenseType || "fuel",
            description: \`Bulk \${payload.globalExpenseType || 'Fuel'} Import - \${busNoSafe}\`,
            amount: expense.amount,
            expense_date: expense.expenseDate,
            created_by: user?.id,
            journal_entry_id: journalEntry.id,
          });
        }

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
          description: \`Bus \${busNoSafe} | \${expTypeTitle} Expense | Date: \${expense.expenseDate}\`,
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
            description: \`Bus \${busNoSafe} - \${expTypeTitle}\`,
            quantity: expense.fuelLiters || 1,
            unit_price: expense.fuelLiters ? (expense.amount / expense.fuelLiters) : expense.amount,
            line_total: expense.amount,
            company_id: effectiveCompanyId,
          });
        } else if (payload.paymentMethod === 'direct' && parentDocId) {
          apPaymentLines.push({
            payment_id: parentDocId,
            account_id: defaultExpenseAccountId,
            description: \`Bus \${busNoSafe} - \${expTypeTitle}\`,
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
        description: \`\${creditAccountName.toUpperCase()} | Bulk \${expTypeTitle} Total\`,
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

      return { posted: postedCount, skipped: skippedCount };`;

const newCode = code.substring(0, startIndex) + replacement + code.substring(endIndex);
fs.writeFileSync('src/hooks/useSchoolBusBulkExpenses.ts', newCode);
console.log("Successfully patched useSchoolBusBulkExpenses.ts");

// Edit mutations for AR/AP Receipts & Payments with auto GL reversal
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";

// Helper to reverse a journal entry and return the reversal entry id
async function reverseJournalEntry(entryId: string, companyId: string): Promise<string | null> {
  const { data: entry, error } = await supabase
    .from("journal_entries")
    .select(`*, journal_entry_lines (account_id, description, debit, credit, cost_center_id)`)
    .eq("id", entryId)
    .single();

  if (error || !entry) return null;

  // Reverse COA balances
  for (const line of entry.journal_entry_lines) {
    const netAmount = (line.debit || 0) - (line.credit || 0);
    const { data: account } = await supabase
      .from("chart_of_accounts")
      .select("current_balance, account_type")
      .eq("id", line.account_id)
      .single();
    if (account) {
      const isDebitNormal = ["asset", "expense"].includes(account.account_type);
      const adjustment = isDebitNormal ? -netAmount : netAmount;
      await supabase
        .from("chart_of_accounts")
        .update({ current_balance: (account.current_balance || 0) + adjustment })
        .eq("id", line.account_id);
    }
  }

  const reversalEntryNumber = `REV-${entry.entry_number}-EDIT`;
  const { data: reversalEntry, error: revError } = await supabase
    .from("journal_entries")
    .insert([{
      entry_number: reversalEntryNumber,
      entry_date: new Date().toISOString().split("T")[0],
      description: `Edit Reversal of ${entry.entry_number}: ${entry.description}`,
      reference: `EDIT-REV-${entry.entry_number}`,
      total_debit: entry.total_credit,
      total_credit: entry.total_debit,
      status: "posted",
      posted_at: new Date().toISOString(),
      company_id: companyId,
      source_module: entry.source_module,
      business_unit_code: entry.business_unit_code,
      is_reversal: true,
      reversed_entry_id: entryId,
    }])
    .select()
    .single();

  if (revError || !reversalEntry) return null;

  // Mark original as reversed
  await supabase
    .from("journal_entries")
    .update({ status: "reversed" as any, reversed_entry_id: reversalEntry.id })
    .eq("id", entryId);

  // Create reversed lines
  const reversedLines = entry.journal_entry_lines.map((line: any) => ({
    journal_entry_id: reversalEntry.id,
    account_id: line.account_id,
    description: `Reversal: ${line.description || ""}`,
    debit: line.credit,
    credit: line.debit,
    cost_center_id: line.cost_center_id,
    company_id: companyId,
  }));
  await supabase.from("journal_entry_lines").insert(reversedLines);

  return reversalEntry.id;
}

// Append to edit_history JSONB array
async function appendEditHistory(
  table: string,
  recordId: string,
  oldValues: Record<string, any>,
  newValues: Record<string, any>,
  reversedJeId?: string | null,
  newJeId?: string | null
) {
  const { data: current } = await (supabase as any)
    .from(table)
    .select("edit_history")
    .eq("id", recordId)
    .single();

  const history = Array.isArray(current?.edit_history) ? current.edit_history : [];
  history.push({
    edited_at: new Date().toISOString(),
    old_values: oldValues,
    new_values: newValues,
    reversed_je_id: reversedJeId || null,
    new_je_id: newJeId || null,
  });

  await (supabase as any)
    .from(table)
    .update({ edit_history: history })
    .eq("id", recordId);
}

// ============ Edit AP Payment ============
export const useEditAPPayment = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();

  return useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: {
        amount: number;
        payment_date: string;
        payment_method: string;
        bank_account_id?: string;
        cheque_number?: string;
        cheque_date?: string;
        reference?: string;
        notes?: string;
        vendor_bill_number?: string;
      };
    }) => {
      const effectiveCompanyId = getEffectiveCompanyId();
      const businessUnitCode = getBusinessUnitCode();

      // Fetch existing record
      const { data: existing, error: fetchErr } = await (supabase as any)
        .from("ap_payments")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchErr) throw fetchErr;

      // Step 1: Reverse existing JE if exists
      let reversedJeId: string | null = null;
      if (existing.journal_entry_id) {
        reversedJeId = await reverseJournalEntry(existing.journal_entry_id, effectiveCompanyId);
      }

      // Step 2: Reverse bank balance change from old payment
      if (existing.bank_account_id && existing.amount > 0) {
        const totalOld = existing.amount + (existing.bank_fee_amount || 0);
        const { data: bankAcc } = await supabase
          .from("bank_accounts")
          .select("current_balance")
          .eq("id", existing.bank_account_id)
          .single();
        if (bankAcc) {
          await supabase
            .from("bank_accounts")
            .update({ current_balance: (bankAcc.current_balance || 0) + totalOld })
            .eq("id", existing.bank_account_id);
        }
      }

      // Step 2b: Delete old bank transactions linked to this payment
      await (supabase as any)
        .from("bank_transactions")
        .delete()
        .eq("source_id", id)
        .in("source_type", ["ap_payment", "bank_fee"]);

      // Step 2c: Delete old bank fee records
      await (supabase as any)
        .from("bank_fee_charges")
        .delete()
        .eq("ap_payment_id", id);

      // Step 3: Update payment record
      const oldValues = {
        amount: existing.amount,
        payment_date: existing.payment_date,
        payment_method: existing.payment_method,
        reference: existing.reference,
        notes: existing.notes,
      };

      await (supabase as any)
        .from("ap_payments")
        .update({
          ...updates,
          journal_entry_id: null, // Will be re-linked after new GL post
        })
        .eq("id", id);

      // Step 4: Re-run GL posting (now supports BOTH normal and direct payments)
      let newJeId: string | null = null;
      let bankGLAccountId: string | null = null;
      if (updates.bank_account_id) {
        const { data: bankAccount } = await supabase
          .from("bank_accounts")
          .select("gl_account_id")
          .eq("id", updates.bank_account_id)
          .single();
        bankGLAccountId = bankAccount?.gl_account_id || null;
      }

      if (bankGLAccountId && updates.amount > 0) {
        if (existing.is_direct_payment) {
          // Direct payment: rebuild JE from ap_payment_lines (inline, no separate function)
          const { data: paymentLines } = await (supabase as any)
            .from("ap_payment_lines")
            .select("*, chart_of_accounts(account_code, account_name)")
            .eq("payment_id", id);

          if (paymentLines?.length) {
            let vendorName = "";
            if (existing.vendor_id) {
              const { data: vd } = await supabase.from("vendors").select("vendor_name").eq("id", existing.vendor_id).single();
              vendorName = vd?.vendor_name || "";
            }
            // Build JE lines
            const jeLines: Array<{ account_id: string; description: string; debit: number; credit: number }> = [];
            for (const line of paymentLines) {
              if (line.account_id && (line.line_total || 0) > 0) {
                jeLines.push({
                  account_id: line.account_id,
                  description: line.description || "Direct payment line",
                  debit: line.line_total,
                  credit: 0,
                });
              }
            }
            jeLines.push({
              account_id: bankGLAccountId!,
              description: `Direct Payment ${existing.payment_number} to ${vendorName}`,
              debit: 0,
              credit: updates.amount,
            });
            const totalDebit = jeLines.reduce((s, l) => s + l.debit, 0);
            const totalCredit = jeLines.reduce((s, l) => s + l.credit, 0);

            const { data: je, error: jeError } = await supabase
              .from("journal_entries")
              .insert([{
                entry_number: `JE-DP-${existing.payment_number}`,
                entry_date: updates.payment_date,
                description: `Direct Payment ${existing.payment_number} to ${vendorName}`,
                reference: updates.reference || existing.payment_number,
                total_debit: totalDebit,
                total_credit: totalCredit,
                status: "posted",
                company_id: effectiveCompanyId,
                business_unit_code: businessUnitCode,
              }])
              .select()
              .single();

            if (!jeError && je) {
              const jelLines = jeLines.map((l) => ({
                journal_entry_id: je.id,
                account_id: l.account_id,
                description: l.description,
                debit: l.debit,
                credit: l.credit,
                company_id: effectiveCompanyId,
                business_unit_code: businessUnitCode,
              }));
              await supabase.from("journal_entry_lines").insert(jelLines);
              // Update COA balances
              for (const l of jelLines) {
                const netAmount = (l.debit || 0) - (l.credit || 0);
                const { data: acc } = await supabase.from("chart_of_accounts").select("current_balance, account_type").eq("id", l.account_id).single();
                if (acc && netAmount !== 0) {
                  const isDebitNormal = ["asset", "expense"].includes(acc.account_type);
                  const adjustment = isDebitNormal ? netAmount : -netAmount;
                  await supabase.from("chart_of_accounts").update({ current_balance: (acc.current_balance || 0) + adjustment }).eq("id", l.account_id);
                }
              }
              newJeId = je.id;
              await supabase.from("ap_payments").update({ journal_entry_id: newJeId }).eq("id", id);
            }
          }
        } else {
          // Normal payment: use vendor AP account resolution
          const { resolveVendorAPAccounts } = await import("@/hooks/useVendorCategories");
          const resolved = await resolveVendorAPAccounts(existing.vendor_id, effectiveCompanyId);
          const tradePayableId = existing.is_advance
            ? (resolved.advanceAccountId || resolved.apAccountId)
            : resolved.apAccountId;

          if (tradePayableId) {
            const { data: vendorData } = await supabase.from("vendors").select("vendor_name").eq("id", existing.vendor_id).single();
            const { postAPPaymentToGL } = await import("@/lib/gl-posting-utils");
            const glResult = await postAPPaymentToGL({
              paymentNumber: existing.payment_number,
              paymentDate: updates.payment_date,
              amount: updates.amount,
              bankAccountId: bankGLAccountId,
              tradePayableId,
              companyId: effectiveCompanyId,
              businessUnitCode: businessUnitCode || undefined,
              vendorName: vendorData?.vendor_name || "",
            });
            if (glResult.success && glResult.journalEntryId) {
              newJeId = glResult.journalEntryId;
              await supabase.from("ap_payments").update({ journal_entry_id: newJeId }).eq("id", id);
            }
          }
        }

        // Step 4b: Handle bank fee re-posting if fee exists
        if (existing.bank_fee_amount && existing.bank_fee_amount > 0) {
          try {
            // Find bank charges expense account (same as create flow)
            const { data: bankChargesAccounts } = await supabase
              .from("chart_of_accounts")
              .select("id")
              .eq("company_id", effectiveCompanyId)
              .eq("is_active", true)
              .or("account_name.ilike.%bank charge%,account_name.ilike.%bank fee%")
              .eq("account_type", "expense")
              .limit(1);
            const bankChargesAccountId = bankChargesAccounts?.[0]?.id || null;

            if (bankChargesAccountId && newJeId) {
              // Append fee lines to the existing JE
              await supabase.from("journal_entry_lines").insert([
                {
                  journal_entry_id: newJeId,
                  account_id: bankChargesAccountId,
                  description: "Bank charges",
                  debit: existing.bank_fee_amount,
                  credit: 0,
                  company_id: effectiveCompanyId,
                },
                {
                  journal_entry_id: newJeId,
                  account_id: bankGLAccountId,
                  description: "Bank charges - bank",
                  debit: 0,
                  credit: existing.bank_fee_amount,
                  company_id: effectiveCompanyId,
                },
              ]);
              // Update JE totals
              const { data: jeData } = await supabase.from("journal_entries").select("total_debit, total_credit").eq("id", newJeId).single();
              if (jeData) {
                await supabase.from("journal_entries").update({
                  total_debit: (jeData.total_debit || 0) + existing.bank_fee_amount,
                  total_credit: (jeData.total_credit || 0) + existing.bank_fee_amount,
                }).eq("id", newJeId);
              }
              // Update COA for fee accounts
              const { data: chargesAcc } = await supabase.from("chart_of_accounts").select("current_balance, account_type").eq("id", bankChargesAccountId).single();
              if (chargesAcc) {
                const isDebitNormal = ["asset", "expense"].includes(chargesAcc.account_type);
                await supabase.from("chart_of_accounts").update({
                  current_balance: (chargesAcc.current_balance || 0) + (isDebitNormal ? existing.bank_fee_amount : -existing.bank_fee_amount),
                }).eq("id", bankChargesAccountId);
              }
              const { data: bankGLAcc } = await supabase.from("chart_of_accounts").select("current_balance, account_type").eq("id", bankGLAccountId).single();
              if (bankGLAcc) {
                const isDebitNormal = ["asset", "expense"].includes(bankGLAcc.account_type);
                await supabase.from("chart_of_accounts").update({
                  current_balance: (bankGLAcc.current_balance || 0) + (isDebitNormal ? -existing.bank_fee_amount : existing.bank_fee_amount),
                }).eq("id", bankGLAccountId);
              }
              // Re-create bank fee charge record (matching create flow schema)
              await (supabase as any).from("bank_fee_charges").insert([{
                bank_account_id: updates.bank_account_id,
                fee_date: updates.payment_date,
                amount: existing.bank_fee_amount,
                fee_type: existing.bank_fee_type || "bank_charge",
                description: `Bank fee for AP Payment ${existing.payment_number}`,
                ap_payment_id: id,
                company_id: effectiveCompanyId,
                status: "posted",
                journal_entry_id: newJeId,
              }]);
            }
          } catch (e) {
            console.error("[Edit AP Payment - Bank Fee]", e);
          }
        }
      }

      // Step 5: Apply new bank balance
      if (updates.bank_account_id && updates.amount > 0) {
        const totalNew = updates.amount + (existing.bank_fee_amount || 0);
        const { data: bankAcc } = await supabase
          .from("bank_accounts")
          .select("current_balance")
          .eq("id", updates.bank_account_id)
          .single();
        if (bankAcc) {
          await supabase
            .from("bank_accounts")
            .update({ current_balance: (bankAcc.current_balance || 0) - totalNew })
            .eq("id", updates.bank_account_id);
        }
      }

      // Step 5b: Re-create bank transaction records (matching create flow schema)
      if (updates.bank_account_id && updates.amount > 0) {
        const totalWithFees = updates.amount + (existing.bank_fee_amount || 0);
        await (supabase as any).from("bank_transactions").insert([{
          bank_account_id: updates.bank_account_id,
          transaction_date: updates.payment_date,
          transaction_type: "payment",
          description: `AP Payment ${existing.payment_number}`,
          debit_amount: 0,
          credit_amount: totalWithFees,
          reference: updates.reference || existing.payment_number,
          source_type: "ap_payment",
          source_id: id,
          company_id: effectiveCompanyId,
        }]);
        // Separate bank fee transaction for reconciliation
        if (existing.bank_fee_amount && existing.bank_fee_amount > 0) {
          await (supabase as any).from("bank_transactions").insert([{
            bank_account_id: updates.bank_account_id,
            transaction_date: updates.payment_date,
            transaction_type: "fee",
            description: `Bank fee - AP Payment ${existing.payment_number}`,
            debit_amount: 0,
            credit_amount: existing.bank_fee_amount,
            reference: `FEE-${existing.payment_number}`,
            source_type: "bank_fee",
            source_id: id,
            company_id: effectiveCompanyId,
          }]);
        }
      }

      // Step 6: Log edit history
      await appendEditHistory("ap_payments", id, oldValues, updates, reversedJeId, newJeId);

      return { id, reversedJeId, newJeId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-payments"] });
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
      toast.success("Payment updated with auto GL reversal & re-posting");
    },
    onError: (error) => {
      toast.error(`Failed to edit payment: ${error.message}`);
    },
  });
};

// ============ Edit AR Receipt ============
export const useEditARReceipt = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();

  return useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: {
        amount: number;
        receipt_date: string;
        payment_method: string;
        bank_account_id?: string;
        reference?: string;
        notes?: string;
      };
    }) => {
      const effectiveCompanyId = getEffectiveCompanyId();
      const businessUnitCode = getBusinessUnitCode();

      const { data: existing, error: fetchErr } = await (supabase as any)
        .from("ar_receipts")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchErr) throw fetchErr;

      // Step 1: Reverse existing JE
      let reversedJeId: string | null = null;
      if (existing.journal_entry_id) {
        reversedJeId = await reverseJournalEntry(existing.journal_entry_id, effectiveCompanyId);
      }

      // Step 2: Reverse old bank balance (receipts ADD to bank, so reverse = subtract)
      if (existing.bank_account_id && existing.amount > 0) {
        const { data: bankAcc } = await supabase
          .from("bank_accounts")
          .select("current_balance")
          .eq("id", existing.bank_account_id)
          .single();
        if (bankAcc) {
          await supabase
            .from("bank_accounts")
            .update({ current_balance: (bankAcc.current_balance || 0) - existing.amount })
            .eq("id", existing.bank_account_id);
        }
      }

      // Step 2b: Delete old bank transactions linked to this receipt
      await (supabase as any)
        .from("bank_transactions")
        .delete()
        .eq("source_id", id)
        .in("source_type", ["ar_receipt", "bank_fee"]);

      // Step 2c: Delete old bank fee records
      await (supabase as any)
        .from("bank_fee_charges")
        .delete()
        .eq("ar_receipt_id", id);

      // Step 3: Update record
      const oldValues = {
        amount: existing.amount,
        receipt_date: existing.receipt_date,
        payment_method: existing.payment_method,
        reference: existing.reference,
        notes: existing.notes,
      };

      await (supabase as any)
        .from("ar_receipts")
        .update({ ...updates, journal_entry_id: null })
        .eq("id", id);

      // Step 4: Re-run GL posting
      let newJeId: string | null = null;
      let bankGLAccountId: string | null = null;
      if (updates.bank_account_id) {
        const { data: bankAccount } = await supabase
          .from("bank_accounts")
          .select("gl_account_id")
          .eq("id", updates.bank_account_id)
          .single();
        bankGLAccountId = bankAccount?.gl_account_id || null;
      }

      if (bankGLAccountId && updates.amount > 0) {
        const partyType = (existing as any).party_type || "customer";
        let tradeReceivableId: string | null = null;
        let advanceAccountId: string | null = null;
        let partyName = "";

        if (partyType === "vendor") {
          const { resolveVendorAPAccounts } = await import("@/hooks/useVendorCategories");
          const resolved = await resolveVendorAPAccounts(existing.customer_id, effectiveCompanyId);
          tradeReceivableId = resolved.apAccountId;
          advanceAccountId = resolved.advanceAccountId || null;
        } else {
          const { resolveCustomerARAccounts } = await import("@/hooks/useCustomerCategories");
          const resolved = await resolveCustomerARAccounts(existing.customer_id, effectiveCompanyId);
          tradeReceivableId = resolved.arAccountId;
          advanceAccountId = resolved.advanceAccountId || null;
          const { data: custData } = await supabase.from("customers").select("customer_name").eq("id", existing.customer_id).single();
          partyName = custData?.customer_name || "";
        }

        if (existing.is_advance && advanceAccountId) {
          const { postAdvanceReceiptToGL } = await import("@/lib/gl-posting-utils");
          const glResult = await postAdvanceReceiptToGL({
            receiptNumber: existing.receipt_number,
            receiptDate: updates.receipt_date,
            amount: updates.amount,
            bankAccountId: bankGLAccountId,
            customerAdvanceId: advanceAccountId,
            companyId: effectiveCompanyId,
            businessUnitCode: businessUnitCode || undefined,
            customerName: partyName,
          });
          if (glResult.success && glResult.journalEntryId) {
            newJeId = glResult.journalEntryId;
            await supabase.from("ar_receipts").update({ journal_entry_id: newJeId }).eq("id", id);
          }
        } else if (tradeReceivableId) {
          const { postARReceiptToGL } = await import("@/lib/gl-posting-utils");
          const glResult = await postARReceiptToGL({
            receiptNumber: existing.receipt_number,
            receiptDate: updates.receipt_date,
            amount: updates.amount,
            bankAccountId: bankGLAccountId,
            tradeReceivableId,
            companyId: effectiveCompanyId,
            businessUnitCode: businessUnitCode || undefined,
            customerName: partyName,
          });
          if (glResult.success && glResult.journalEntryId) {
            newJeId = glResult.journalEntryId;
            await supabase.from("ar_receipts").update({ journal_entry_id: newJeId }).eq("id", id);
          }
        }

        // Step 4b: Handle bank fee re-posting if fee exists on the receipt
        const bankFeeAmount = (existing as any).bank_fee_amount || 0;
        if (bankFeeAmount > 0 && bankGLAccountId) {
          try {
            // Find bank charges expense account (same as create flow)
            const { data: bankChargesAccounts } = await supabase
              .from("chart_of_accounts")
              .select("id")
              .eq("company_id", effectiveCompanyId)
              .eq("is_active", true)
              .or("account_name.ilike.%bank charge%,account_name.ilike.%bank fee%")
              .eq("account_type", "expense")
              .limit(1);
            const bankChargesAccountId = bankChargesAccounts?.[0]?.id || null;

            if (bankChargesAccountId && newJeId) {
              await supabase.from("journal_entry_lines").insert([
                {
                  journal_entry_id: newJeId,
                  account_id: bankChargesAccountId,
                  description: "Bank charges",
                  debit: bankFeeAmount,
                  credit: 0,
                  company_id: effectiveCompanyId,
                },
                {
                  journal_entry_id: newJeId,
                  account_id: bankGLAccountId,
                  description: "Bank charges - bank",
                  debit: 0,
                  credit: bankFeeAmount,
                  company_id: effectiveCompanyId,
                },
              ]);
              const { data: jeData } = await supabase.from("journal_entries").select("total_debit, total_credit").eq("id", newJeId).single();
              if (jeData) {
                await supabase.from("journal_entries").update({
                  total_debit: (jeData.total_debit || 0) + bankFeeAmount,
                  total_credit: (jeData.total_credit || 0) + bankFeeAmount,
                }).eq("id", newJeId);
              }
              // Update COA for fee accounts
              const { data: chargesAcc } = await supabase.from("chart_of_accounts").select("current_balance, account_type").eq("id", bankChargesAccountId).single();
              if (chargesAcc) {
                const isDebitNormal = ["asset", "expense"].includes(chargesAcc.account_type);
                await supabase.from("chart_of_accounts").update({
                  current_balance: (chargesAcc.current_balance || 0) + (isDebitNormal ? bankFeeAmount : -bankFeeAmount),
                }).eq("id", bankChargesAccountId);
              }
              const { data: bankGLAcc } = await supabase.from("chart_of_accounts").select("current_balance, account_type").eq("id", bankGLAccountId).single();
              if (bankGLAcc) {
                const isDebitNormal = ["asset", "expense"].includes(bankGLAcc.account_type);
                await supabase.from("chart_of_accounts").update({
                  current_balance: (bankGLAcc.current_balance || 0) + (isDebitNormal ? -bankFeeAmount : bankFeeAmount),
                }).eq("id", bankGLAccountId);
              }
              // Re-create bank fee charge record (matching create flow schema)
              await (supabase as any).from("bank_fee_charges").insert([{
                bank_account_id: updates.bank_account_id,
                fee_date: updates.receipt_date,
                amount: bankFeeAmount,
                fee_type: (existing as any).bank_fee_type || "bank_charge",
                description: `Bank fee for AR Receipt ${existing.receipt_number}`,
                ar_receipt_id: id,
                company_id: effectiveCompanyId,
                status: "posted",
                journal_entry_id: newJeId,
              }]);
            }
          } catch (e) {
            console.error("[Edit AR Receipt - Bank Fee]", e);
          }
        }
      }

      // Step 5: Apply new bank balance
      if (updates.bank_account_id && updates.amount > 0) {
        const { data: bankAcc } = await supabase
          .from("bank_accounts")
          .select("current_balance")
          .eq("id", updates.bank_account_id)
          .single();
        if (bankAcc) {
          await supabase
            .from("bank_accounts")
            .update({ current_balance: (bankAcc.current_balance || 0) + updates.amount })
            .eq("id", updates.bank_account_id);
        }
      }

      // Step 5b: Re-create bank transaction records (matching create flow schema)
      if (updates.bank_account_id && updates.amount > 0) {
        await (supabase as any).from("bank_transactions").insert([{
          bank_account_id: updates.bank_account_id,
          transaction_date: updates.receipt_date,
          transaction_type: "receipt",
          description: `AR Receipt ${existing.receipt_number}`,
          debit_amount: updates.amount,
          credit_amount: 0,
          reference: updates.reference || existing.receipt_number,
          source_type: "ar_receipt",
          source_id: id,
          company_id: effectiveCompanyId,
        }]);
        // Bank fee transaction
        const bankFeeAmount2 = (existing as any).bank_fee_amount || 0;
        if (bankFeeAmount2 > 0) {
          await (supabase as any).from("bank_transactions").insert([{
            bank_account_id: updates.bank_account_id,
            transaction_date: updates.receipt_date,
            transaction_type: "fee",
            description: `Bank fee - AR Receipt ${existing.receipt_number}`,
            debit_amount: 0,
            credit_amount: bankFeeAmount2,
            reference: `FEE-${existing.receipt_number}`,
            source_type: "bank_fee",
            source_id: id,
            company_id: effectiveCompanyId,
          }]);
        }
      }

      await appendEditHistory("ar_receipts", id, oldValues, updates, reversedJeId, newJeId);

      return { id, reversedJeId, newJeId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
      toast.success("Receipt updated with auto GL reversal & re-posting");
    },
    onError: (error) => {
      toast.error(`Failed to edit receipt: ${error.message}`);
    },
  });
};

// ============ Edit AP Invoice ============
export const useEditAPInvoice = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();

  return useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: {
        total_amount: number;
        invoice_date: string;
        due_date: string;
        notes?: string;
        tax_amount?: number;
      };
    }) => {
      const effectiveCompanyId = getEffectiveCompanyId();
      const businessUnitCode = getBusinessUnitCode();

      const { data: existing, error: fetchErr } = await (supabase as any)
        .from("ap_invoices")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchErr) throw fetchErr;

      let reversedJeId: string | null = null;
      if (existing.journal_entry_id) {
        reversedJeId = await reverseJournalEntry(existing.journal_entry_id, effectiveCompanyId);
      }

      const oldValues = {
        total_amount: existing.total_amount,
        invoice_date: existing.invoice_date,
        due_date: existing.due_date,
        notes: existing.notes,
      };

      const paidAmount = existing.paid_amount || 0;
      const newBalance = updates.total_amount - paidAmount;

      await (supabase as any)
        .from("ap_invoices")
        .update({
          ...updates,
          balance: newBalance,
          journal_entry_id: null,
          status: newBalance <= 0 ? "paid" : newBalance < updates.total_amount ? "partial" : "unpaid",
        })
        .eq("id", id);

      // Re-post GL
      let newJeId: string | null = null;
      if (existing.vendor_id && updates.total_amount > 0) {
        try {
          const { resolveVendorAPAccounts } = await import("@/hooks/useVendorCategories");
          const resolved = await resolveVendorAPAccounts(existing.vendor_id, effectiveCompanyId);
          if (resolved.apAccountId && resolved.expenseAccountId) {
            const { postAPInvoiceToGL } = await import("@/lib/gl-posting-utils");
            const { data: vendorData } = await supabase.from("vendors").select("vendor_name").eq("id", existing.vendor_id).single();
            const glResult = await postAPInvoiceToGL({
              invoiceNumber: existing.invoice_number,
              invoiceDate: updates.invoice_date,
              totalAmount: updates.total_amount,
              expenseAccountId: resolved.expenseAccountId,
              tradePayableId: resolved.apAccountId,
              companyId: effectiveCompanyId,
              businessUnitCode: businessUnitCode || undefined,
              vendorName: vendorData?.vendor_name,
              sourceModule: 'manual_ap',
            });
            if (glResult.success && glResult.journalEntryId) {
              newJeId = glResult.journalEntryId;
              await (supabase as any).from("ap_invoices").update({ journal_entry_id: newJeId }).eq("id", id);
            }
          }
        } catch (e) {
          console.error("[Edit AP Invoice GL]", e);
        }
      }

      await appendEditHistory("ap_invoices", id, oldValues, updates, reversedJeId, newJeId);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
      toast.success("AP Invoice updated with auto GL reversal & re-posting");
    },
    onError: (error) => {
      toast.error(`Failed to edit AP invoice: ${error.message}`);
    },
  });
};

// ============ Edit AR Invoice ============
export const useEditARInvoice = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();

  return useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: {
        total_amount: number;
        invoice_date: string;
        due_date: string;
        notes?: string;
        tax_amount?: number;
      };
    }) => {
      const effectiveCompanyId = getEffectiveCompanyId();
      const businessUnitCode = getBusinessUnitCode();

      const { data: existing, error: fetchErr } = await (supabase as any)
        .from("ar_invoices")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchErr) throw fetchErr;

      let reversedJeId: string | null = null;
      if (existing.journal_entry_id) {
        reversedJeId = await reverseJournalEntry(existing.journal_entry_id, effectiveCompanyId);
      }

      const oldValues = {
        total_amount: existing.total_amount,
        invoice_date: existing.invoice_date,
        due_date: existing.due_date,
        notes: existing.notes,
      };

      const paidAmount = existing.paid_amount || 0;
      const newBalance = updates.total_amount - paidAmount;

      await (supabase as any)
        .from("ar_invoices")
        .update({
          ...updates,
          balance: newBalance,
          journal_entry_id: null,
          status: newBalance <= 0 ? "paid" : newBalance < updates.total_amount ? "partial" : "unpaid",
        })
        .eq("id", id);

      // Re-post GL
      let newJeId: string | null = null;
      if (existing.customer_id && updates.total_amount > 0) {
        try {
          const { resolveCustomerARAccounts } = await import("@/hooks/useCustomerCategories");
          const resolved = await resolveCustomerARAccounts(existing.customer_id, effectiveCompanyId);
          if (resolved.arAccountId && resolved.revenueAccountId) {
            const { postARInvoiceToGL } = await import("@/lib/gl-posting-utils");
            const glResult = await postARInvoiceToGL({
              invoiceNumber: existing.invoice_number,
              invoiceDate: updates.invoice_date,
              totalAmount: updates.total_amount,
              taxAmount: updates.tax_amount || undefined,
              tradeReceivableId: resolved.arAccountId,
              salesRevenueId: resolved.revenueAccountId,
              companyId: effectiveCompanyId,
              businessUnitCode: businessUnitCode || undefined,
              sourceModule: 'manual_ar',
            });
            if (glResult.success && glResult.journalEntryId) {
              newJeId = glResult.journalEntryId;
              await (supabase as any).from("ar_invoices").update({ journal_entry_id: newJeId }).eq("id", id);
            }
          }
        } catch (e) {
          console.error("[Edit AR Invoice GL]", e);
        }
      }

      await appendEditHistory("ar_invoices", id, oldValues, updates, reversedJeId, newJeId);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
      toast.success("AR Invoice updated with auto GL reversal & re-posting");
    },
    onError: (error) => {
      toast.error(`Failed to edit AR invoice: ${error.message}`);
    },
  });
};

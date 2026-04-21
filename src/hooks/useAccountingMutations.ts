// Centralized mutations for all accounting modules
// All mutations inject company_id for multi-company data isolation
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";

// ============ Journal Entries ============
export const useCreateJournalEntry = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode, isSubCompany } = useCompany();
  
  return useMutation({
    mutationFn: async (entry: {
      entry_number: string;
      entry_date: string;
      description: string;
      reference?: string;
      period_id?: string;
      total_debit: number;
      total_credit: number;
      lines: Array<{
        account_id: string;
        description?: string;
        debit_amount?: number;
        credit_amount?: number;
        cost_center_id?: string;
      }>;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      // For consolidated GL: post to parent company, tag with business unit
      const effectiveCompanyId = getEffectiveCompanyId();
      const businessUnitCode = getBusinessUnitCode();
      const businessUnitId = isSubCompany(selectedCompanyId) ? selectedCompanyId : null;
      
      const { data: journalEntry, error: entryError } = await supabase
        .from("journal_entries")
        .insert([{
          entry_number: entry.entry_number,
          entry_date: entry.entry_date,
          description: entry.description,
          reference: entry.reference,
          period_id: entry.period_id,
          total_debit: entry.total_debit,
          total_credit: entry.total_credit,
          status: "draft",
          company_id: effectiveCompanyId, // Posts to parent company for consolidated GL
          business_unit_id: businessUnitId, // Tags with originating sub-company
          business_unit_code: businessUnitCode, // Short code for filtering (SBO, YUT, etc.)
        }])
        .select()
        .single();
      
      if (entryError) throw entryError;
      
      const lines = entry.lines.map((line) => ({
        journal_entry_id: journalEntry.id,
        account_id: line.account_id,
        description: line.description || "",
        debit: line.debit_amount || 0,
        credit: line.credit_amount || 0,
        cost_center_id: line.cost_center_id,
        company_id: effectiveCompanyId,
        business_unit_code: businessUnitCode, // Tag lines too for efficient filtering
      }));
      
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(lines);
      
      if (linesError) throw linesError;
      
      return journalEntry;
    },
    onSuccess: () => {
      const effectiveCompanyId = getEffectiveCompanyId();
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", effectiveCompanyId] });
      toast.success("Journal entry created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create journal entry: ${error.message}`);
    },
  });
};

export const usePostJournalEntry = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { data: entry, error: fetchError } = await supabase
        .from("journal_entries")
        .select(`
          *,
          journal_entry_lines (
            account_id,
            debit,
            credit
          )
        `)
        .eq("id", entryId)
        .single();
      
      if (fetchError) throw fetchError;
      
      for (const line of entry.journal_entry_lines) {
        const netAmount = (line.debit || 0) - (line.credit || 0);
        
        const { data: account } = await supabase
          .from("chart_of_accounts")
          .select("current_balance, account_type")
          .eq("id", line.account_id)
          .single();
        
        if (account) {
          const isDebitNormal = ["asset", "expense"].includes(account.account_type);
          const adjustment = isDebitNormal ? netAmount : -netAmount;
          
          await supabase
            .from("chart_of_accounts")
            .update({ current_balance: (account.current_balance || 0) + adjustment })
            .eq("id", line.account_id);
        }
      }
      
      const { error: statusError } = await supabase
        .from("journal_entries")
        .update({ 
          status: "posted" as const,
          posted_at: new Date().toISOString(),
        })
        .eq("id", entryId);
      
      if (statusError) throw statusError;
      
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary", selectedCompanyId] });
      toast.success("Journal entry posted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to post journal entry: ${error.message}`);
    },
  });
};

export const useApproveJournalEntry = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async ({ entryId, level }: { entryId: string; level: number }) => {
      const statusMap: Record<number, "draft" | "posted" | "void"> = {
        1: "draft",
        2: "posted",
      };
      
      const newStatus = statusMap[level] || "posted";
      
      const { error } = await supabase
        .from("journal_entries")
        .update({ 
          status: newStatus,
          approved_at: new Date().toISOString(),
          posted_at: newStatus === "posted" ? new Date().toISOString() : undefined,
        })
        .eq("id", entryId);
      
      if (error) throw error;

      // ========== UPDATE COA BALANCES when posting ==========
      if (newStatus === "posted") {
        try {
          // Fetch all lines for this journal entry
          const { data: lines } = await supabase
            .from("journal_entry_lines")
            .select("account_id, debit, credit")
            .eq("journal_entry_id", entryId);

          if (lines && lines.length > 0) {
            for (const line of lines) {
              if (!line.account_id) continue;
              const { data: account } = await supabase
                .from("chart_of_accounts")
                .select("current_balance, account_type")
                .eq("id", line.account_id)
                .single();

              if (account) {
                const netAmount = (line.debit || 0) - (line.credit || 0);
                const isDebitNormal = ["asset", "expense"].includes(account.account_type);
                const adjustment = isDebitNormal ? netAmount : -netAmount;

                await supabase
                  .from("chart_of_accounts")
                  .update({ current_balance: (account.current_balance || 0) + adjustment })
                  .eq("id", line.account_id);
              }
            }
          }
        } catch (balanceError) {
          console.warn("COA balance update after JE approval failed:", balanceError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success("Journal entry approved & COA balances updated");
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });
};

// Note: useRejectJournalEntry is defined in the "Reject Mutations" section below

export const useReverseJournalEntry = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (entryId: string) => {
      // Fetch the original entry with lines
      const { data: entry, error: fetchError } = await supabase
        .from("journal_entries")
        .select(`
          *,
          journal_entry_lines (
            account_id,
            description,
            debit,
            credit,
            cost_center_id
          )
        `)
        .eq("id", entryId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Reverse the account balances
      for (const line of entry.journal_entry_lines) {
        const netAmount = (line.debit || 0) - (line.credit || 0);
        
        const { data: account } = await supabase
          .from("chart_of_accounts")
          .select("current_balance, account_type")
          .eq("id", line.account_id)
          .single();
        
        if (account) {
          const isDebitNormal = ["asset", "expense"].includes(account.account_type);
          const adjustment = isDebitNormal ? -netAmount : netAmount; // Reverse the adjustment
          
          await supabase
            .from("chart_of_accounts")
            .update({ current_balance: (account.current_balance || 0) + adjustment })
            .eq("id", line.account_id);
        }
      }
      
      // Generate reversal entry number
      const reversalEntryNumber = `REV-${entry.entry_number}`;
      
      // Create reversing entry with is_reversal flag and link to original
      const { data: reversalEntry, error: reversalError } = await supabase
        .from("journal_entries")
        .insert([{
          entry_number: reversalEntryNumber,
          entry_date: new Date().toISOString().split("T")[0],
          description: `Reversal of ${entry.entry_number}: ${entry.description}`,
          reference: `REV-${entry.entry_number}`,
          total_debit: entry.total_credit, // Swap debit/credit
          total_credit: entry.total_debit,
          status: "posted",
          posted_at: new Date().toISOString(),
          company_id: selectedCompanyId,
          source_module: entry.source_module,
          business_unit_code: entry.business_unit_code,
          is_reversal: true,
          reversed_entry_id: entryId,
        }])
        .select()
        .single();
      
      if (reversalError) throw reversalError;

      // Mark original entry as reversed and link back to reversal entry (bidirectional)
      const { error: statusError } = await supabase
        .from("journal_entries")
        .update({ 
          status: "reversed" as any,
          reversed_entry_id: reversalEntry.id,
        })
        .eq("id", entryId);
      
      if (statusError) throw statusError;
      
      // Create reversed lines (swap debit/credit)
      const reversedLines = entry.journal_entry_lines.map((line: any) => ({
        journal_entry_id: reversalEntry.id,
        account_id: line.account_id,
        description: `Reversal: ${line.description || ""}`,
        debit: line.credit, // Swap
        credit: line.debit, // Swap
        cost_center_id: line.cost_center_id,
        company_id: selectedCompanyId,
      }));
      
      await supabase.from("journal_entry_lines").insert(reversedLines);
      
      return reversalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary", selectedCompanyId] });
      toast.success("Journal entry reversed successfully");
    },
    onError: (error) => {
      toast.error(`Failed to reverse: ${error.message}`);
    },
  });
};

// ============ AR Invoices ============
export const useCreateARInvoice = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  
  return useMutation({
    mutationFn: async (invoice: {
      invoice_number: string;
      customer_id: string;
      invoice_date: string;
      due_date: string;
      total_amount: number;
      tax_amount?: number;
      notes?: string;
      bus_id?: string;
      bus_no?: string;
      bus_type?: string;
      bus_category_id?: string;
      bus_sub_category_id?: string;
      lines?: Array<{
        description: string;
        quantity: number;
        unit_price: number;
        line_total: number;
        account_id?: string;
        tax_code?: string;
      }>;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      // For consolidated GL: post to parent company, tag with business unit
      const effectiveCompanyId = getEffectiveCompanyId();
      const businessUnitCode = getBusinessUnitCode();
      
      const { lines, bus_id, bus_no, bus_type, bus_category_id, bus_sub_category_id, ...headerData } = invoice;
      
      const { data, error } = await supabase
        .from("ar_invoices")
        .insert([{
          ...headerData,
          balance: invoice.total_amount,
          status: "unpaid",
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode,
          bus_id: bus_id || null,
          bus_no: bus_no || null,
          bus_type: bus_type || null,
          bus_category_id: bus_category_id || null,
          bus_sub_category_id: bus_sub_category_id || null,
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      if (lines?.length) {
        const lineData = lines.map(line => ({
          invoice_id: data.id,
          ...line,
          company_id: effectiveCompanyId,
        }));
        
        await supabase.from("ar_invoice_lines").insert(lineData);
      }

      // ========== AUTO GL POSTING: DR Trade Receivable, CR Sales Revenue, CR Output VAT ==========
      try {
        console.log('[AR GL] Starting GL posting for AR invoice:', data.id, 'company:', effectiveCompanyId, 'customer:', invoice.customer_id);
        
        const { resolveCustomerARAccounts } = await import("@/hooks/useCustomerCategories");
        
        // Always fetch gl_settings for tax_payable_account_id
        const { data: glSettings } = await (supabase as any)
          .from("gl_settings")
          .select("trade_receivable_account_id, sales_revenue_account_id, tax_payable_account_id")
          .eq("company_id", effectiveCompanyId)
          .maybeSingle();

        // Handle missing customer_id — fall directly to gl_settings
        let resolved;
        if (invoice.customer_id) {
          resolved = await resolveCustomerARAccounts(invoice.customer_id, effectiveCompanyId);
        } else {
          // No customer — use gl_settings directly
          resolved = {
            arAccountId: glSettings?.trade_receivable_account_id || null,
            revenueAccountId: glSettings?.sales_revenue_account_id || null,
            advanceAccountId: null,
            source: "global" as const,
            missingAccounts: [] as string[],
          };
          if (!resolved.arAccountId) resolved.missingAccounts.push("Trade Receivable");
          if (!resolved.revenueAccountId) resolved.missingAccounts.push("Sales Revenue");
        }

        const taxPayableId = glSettings?.tax_payable_account_id || null;
        const taxAmount = invoice.tax_amount || 0;

        console.log('[AR GL] Resolved accounts:', { 
          arAccountId: resolved.arAccountId, 
          revenueAccountId: resolved.revenueAccountId,
          taxPayableId, taxAmount,
          source: resolved.source, 
          missing: resolved.missingAccounts 
        });

        if (resolved.missingAccounts.length > 0 && invoice.total_amount > 0) {
          console.error("AR GL missing accounts:", resolved.missingAccounts);
          toast.error(`GL Config Missing: ${resolved.missingAccounts.join("; ")}. Configure in Settings → Core GL or Customer Categories.`, { duration: 8000 });
        }

        if (resolved.arAccountId && resolved.revenueAccountId && invoice.total_amount > 0) {
          const { postARInvoiceToGL } = await import("@/lib/gl-posting-utils");

          // Build revenueLines from invoice line items if they have distinct account_ids
          let revenueLines: Array<{ accountId: string; amount: number; description?: string }> | undefined;
          if (lines && lines.length > 0) {
            const linesWithAccounts = lines.filter(l => l.account_id);
            if (linesWithAccounts.length > 0) {
              const hasTax = (invoice.tax_amount || 0) > 0;
              revenueLines = linesWithAccounts.map(l => ({
                accountId: l.account_id!,
                amount: hasTax ? l.line_total - (l.line_total * (invoice.tax_amount || 0) / invoice.total_amount) : l.line_total,
                description: `${l.description} - ${invoice.invoice_number}`,
              }));
            }
          }

          console.log('[AR GL] Calling postARInvoiceToGL with:', { invoiceNumber: invoice.invoice_number, totalAmount: invoice.total_amount, taxAmount, revenueLines: revenueLines?.length || 0 });
          const glResult = await postARInvoiceToGL({
            invoiceNumber: invoice.invoice_number,
            invoiceDate: invoice.invoice_date,
            totalAmount: invoice.total_amount,
            taxAmount: taxAmount > 0 ? taxAmount : undefined,
            tradeReceivableId: resolved.arAccountId,
            salesRevenueId: resolved.revenueAccountId,
            taxPayableId: taxPayableId || undefined,
            companyId: effectiveCompanyId,
            businessUnitCode: businessUnitCode || undefined,
            sourceModule: 'manual_ar',
            revenueLines,
          });
          console.log('[AR GL] GL Result:', glResult);
          if (glResult.success && glResult.journalEntryId) {
            await (supabase as any)
              .from("ar_invoices")
              .update({ journal_entry_id: glResult.journalEntryId })
              .eq("id", data.id);
          } else if (!glResult.success) {
            console.error('[AR GL] GL posting failed:', glResult.error);
            toast.error(`AR Invoice created but GL posting failed: ${glResult.error}. Check Settings → Core GL.`, { duration: 8000 });
          }
        } else {
          console.warn('[AR GL] Skipping GL post: arAccountId=', resolved.arAccountId, 'revenueAccountId=', resolved.revenueAccountId, 'totalAmount=', invoice.total_amount);
        }
      } catch (glError: any) {
        console.error('[AR GL] Exception in GL posting:', glError);
        toast.error(`AR Invoice created but GL posting error: ${glError?.message || 'Unknown'}`, { duration: 8000 });
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ar-summary"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success("Invoice created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create invoice: ${error.message}`);
    },
  });
};

// ============ AR Receipts ============
export const useCreateARReceipt = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  
  return useMutation({
    mutationFn: async (receipt: {
      receipt_number: string;
      customer_id: string;
      receipt_date: string;
      amount: number;
      payment_method: string;
      bank_account_id?: string;
      reference?: string;
      notes?: string;
      is_advance?: boolean;
      party_type?: "customer" | "vendor";
      override_gl_account_id?: string;
      bus_id?: string;
      bus_no?: string;
      vehicle_type?: string;
      bank_fee_amount?: number;
      bank_fee_type?: string;
      allocations?: Array<{
        invoice_id: string;
        allocated_amount: number;
        write_off_amount?: number;
        write_off_account_id?: string;
      }>;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      // For consolidated GL: post to parent company, tag with business unit
      const effectiveCompanyId = getEffectiveCompanyId();
      const businessUnitCode = getBusinessUnitCode();
      
      const { data, error } = await supabase
        .from("ar_receipts")
        .insert([{
          receipt_number: receipt.receipt_number,
          customer_id: receipt.customer_id,
          receipt_date: receipt.receipt_date,
          amount: receipt.amount,
          payment_method: receipt.payment_method,
          bank_account_id: receipt.bank_account_id,
          reference: receipt.reference,
          notes: receipt.notes,
          is_advance: receipt.is_advance || false,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode,
          override_gl_account_id: receipt.override_gl_account_id || null,
          bus_id: receipt.bus_id || null,
          bus_no: receipt.bus_no || null,
          vehicle_type: receipt.vehicle_type || null,
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Only process allocations if not an advance receipt
      if (!receipt.is_advance && receipt.allocations?.length) {
        for (const alloc of receipt.allocations) {
          await supabase.from("ar_receipt_allocations").insert([{
            receipt_id: data.id,
            invoice_id: alloc.invoice_id,
            allocated_amount: alloc.allocated_amount,
            write_off_amount: alloc.write_off_amount || 0,
            company_id: effectiveCompanyId,
          }]);
          
          const { data: invoice } = await supabase
            .from("ar_invoices")
            .select("balance, total_amount, paid_amount")
            .eq("id", alloc.invoice_id)
            .single();
          
          if (invoice) {
            const totalCredit = alloc.allocated_amount + (alloc.write_off_amount || 0);
            const newPaid = (invoice.paid_amount || 0) + totalCredit;
            const newBalance = invoice.total_amount - newPaid;
            
            await supabase
              .from("ar_invoices")
              .update({
                paid_amount: newPaid,
                balance: newBalance,
                status: newBalance <= 0 ? "paid" : newBalance < invoice.total_amount ? "partial" : "unpaid",
              })
              .eq("id", alloc.invoice_id);
          }
        }
      }

      // ========== GL POSTING ==========
      // Get the bank account's linked GL account if a bank account is selected
      let bankGLAccountId: string | null = null;
      if (receipt.bank_account_id) {
        const { data: bankAccount } = await supabase
          .from("bank_accounts")
          .select("gl_account_id")
          .eq("id", receipt.bank_account_id)
          .single();
        bankGLAccountId = bankAccount?.gl_account_id || null;
      }

      // Find Trade Receivable/Payable and Advance accounts via category resolution
      const partyType = receipt.party_type || "customer";
      let tradeReceivableId: string | null = null;
      let advanceAccountId: string | null = null;
      let customerName = "";

      if (partyType === "vendor") {
        const { resolveVendorAPAccounts } = await import("@/hooks/useVendorCategories");
        const resolved = await resolveVendorAPAccounts(receipt.customer_id, effectiveCompanyId);
        tradeReceivableId = resolved.apAccountId;
        advanceAccountId = resolved.advanceAccountId || null;
        try {
          const { data: vendorData } = await supabase
            .from("vendors")
            .select("vendor_name")
            .eq("id", receipt.customer_id)
            .single();
          customerName = vendorData?.vendor_name || "";
        } catch { /* Non-blocking */ }
      } else {
        const { resolveCustomerARAccounts } = await import("@/hooks/useCustomerCategories");
        const resolved = await resolveCustomerARAccounts(receipt.customer_id, effectiveCompanyId);
        tradeReceivableId = resolved.arAccountId;
        advanceAccountId = resolved.advanceAccountId || null;
        try {
          const { data: customerData } = await supabase
            .from("customers")
            .select("customer_name")
            .eq("id", receipt.customer_id)
            .single();
          customerName = customerData?.customer_name || "";
        } catch { /* Non-blocking */ }
      }

      // Apply GL override: manual override > category mapping > global settings
      if (receipt.override_gl_account_id) {
        tradeReceivableId = receipt.override_gl_account_id;
      }

      // Only post to GL if we have the required accounts
      if (bankGLAccountId && receipt.amount > 0) {
        const { postARReceiptToGL, postAdvanceReceiptToGL } = await import("@/lib/gl-posting-utils");

        let glResult: { success: boolean; journalEntryId?: string; error?: string };

        if (receipt.is_advance) {
          // Use resolved advance account or fallback to COA search
          let customerAdvanceId = advanceAccountId;
          if (!customerAdvanceId) {
            const { data: advanceAccounts } = await supabase
              .from("chart_of_accounts")
              .select("id")
              .eq("company_id", effectiveCompanyId)
              .eq("account_type", "liability")
              .eq("is_active", true)
              .ilike("account_name", "%customer advance%")
              .limit(1);
            customerAdvanceId = advanceAccounts?.[0]?.id || null;
          }

          if (customerAdvanceId) {
            glResult = await postAdvanceReceiptToGL({
              receiptNumber: receipt.receipt_number,
              receiptDate: receipt.receipt_date,
              amount: receipt.amount,
              bankAccountId: bankGLAccountId,
              customerAdvanceId: customerAdvanceId,
              companyId: effectiveCompanyId,
              businessUnitCode: businessUnitCode || undefined,
              customerName: customerName,
            });
          } else {
            glResult = { success: false, error: "Customer Advance account not found in COA" };
            console.warn("[AR Receipt GL] Customer Advance account not found, skipping advance GL posting");
            toast.warning("GL posting skipped: 'Customer Advance' account not found in Chart of Accounts.");
          }
        } else if (tradeReceivableId) {
          const totalWriteOff = receipt.allocations?.reduce((sum, a) => sum + (a.write_off_amount || 0), 0) || 0;
          const writeOffAccountId = receipt.allocations?.find(a => a.write_off_amount && a.write_off_amount > 0)?.write_off_account_id || undefined;

          glResult = await postARReceiptToGL({
            receiptNumber: receipt.receipt_number,
            receiptDate: receipt.receipt_date,
            amount: receipt.amount,
            writeOffAmount: totalWriteOff > 0 ? totalWriteOff : undefined,
            bankAccountId: bankGLAccountId,
            tradeReceivableId: tradeReceivableId,
            writeOffAccountId: writeOffAccountId,
            companyId: effectiveCompanyId,
            businessUnitCode: businessUnitCode || undefined,
            customerName: customerName,
          });
        } else {
          glResult = { success: false, error: "Trade Receivable account not found in COA" };
          console.warn("[AR Receipt GL] Trade Receivable account not found, skipping GL posting");
          toast.warning("GL posting skipped: 'Trade Receivable' account not found in Chart of Accounts.");
        }

        // Link journal entry to receipt if GL posting succeeded
        if (glResult.success && glResult.journalEntryId) {
          await supabase
            .from("ar_receipts")
            .update({ journal_entry_id: glResult.journalEntryId })
            .eq("id", data.id);
        }
      } else if (receipt.amount > 0 && !bankGLAccountId) {
        console.warn("[AR Receipt GL] Bank account has no linked GL account, skipping GL posting");
        toast.warning("GL posting skipped: Bank account has no linked GL account. Configure it in Banking → Edit Account → GL Account.");
      }

      // ========== BANK TRANSACTION ==========
      // Create bank transaction record if bank account is selected
      const receiptBankFeeAmount = receipt.bank_fee_amount || 0;
      const receiptTotalWithFees = receipt.amount - receiptBankFeeAmount; // Net amount after fee deduction
      if (receipt.bank_account_id && receipt.amount > 0) {
        const feeBreakdown = receiptBankFeeAmount > 0
          ? ` (Receipt: ${receipt.amount.toLocaleString()}, Bank Fee: ${receiptBankFeeAmount.toLocaleString()})`
          : '';
        await supabase.from("bank_transactions").insert([{
          bank_account_id: receipt.bank_account_id,
          transaction_date: receipt.receipt_date,
          transaction_type: "receipt",
          description: `AR Receipt from ${customerName || "Customer"} - ${receipt.receipt_number}${feeBreakdown}`,
          debit_amount: receiptTotalWithFees > 0 ? receiptTotalWithFees : receipt.amount,
          credit_amount: 0,
          reference: receipt.reference || receipt.receipt_number,
          company_id: selectedCompanyId,
          source_type: "ar_receipt",
          source_id: data.id,
        }]);

        // Update bank account balance (increase on receipt, minus fee)
        const { data: bankAccount } = await supabase
          .from("bank_accounts")
          .select("current_balance")
          .eq("id", receipt.bank_account_id)
          .single();

        if (bankAccount) {
          const netDeposit = receiptBankFeeAmount > 0 ? receiptTotalWithFees : receipt.amount;
          const newBalance = (bankAccount.current_balance || 0) + netDeposit;
          await supabase
            .from("bank_accounts")
            .update({ current_balance: newBalance })
            .eq("id", receipt.bank_account_id);
        }

        // Auto-create bank fee for AR Receipt if included
        if (receiptBankFeeAmount > 0) {
          // Find Bank Charges expense account
          let bankChargesAccountId: string | null = null;
          const { data: bankChargesAccounts } = await supabase
            .from("chart_of_accounts")
            .select("id")
            .eq("company_id", effectiveCompanyId)
            .eq("is_active", true)
            .or("account_name.ilike.%bank charge%,account_name.ilike.%bank fee%")
            .eq("account_type", "expense")
            .limit(1);
          bankChargesAccountId = bankChargesAccounts?.[0]?.id || null;

          // Auto-post fee GL lines to receipt's journal entry
          let feeJournalEntryId: string | null = null;
          const { data: receiptRecord } = await supabase
            .from("ar_receipts")
            .select("journal_entry_id")
            .eq("id", data.id)
            .single();

          if (bankChargesAccountId && bankGLAccountId && receiptRecord?.journal_entry_id) {
            await supabase.from("journal_entry_lines").insert([
              {
                journal_entry_id: receiptRecord.journal_entry_id,
                account_id: bankChargesAccountId,
                description: `Bank fee - ${receipt.bank_fee_type || "bank_charge"} for ${receipt.receipt_number}`,
                debit: receiptBankFeeAmount,
                credit: 0,
                company_id: effectiveCompanyId,
                business_unit_code: businessUnitCode,
              },
              {
                journal_entry_id: receiptRecord.journal_entry_id,
                account_id: bankGLAccountId,
                description: `Bank fee deduction from receipt - ${receipt.receipt_number}`,
                debit: 0,
                credit: receiptBankFeeAmount,
                company_id: effectiveCompanyId,
                business_unit_code: businessUnitCode,
              },
            ]);

            // Update JE totals
            const { data: jeData } = await supabase
              .from("journal_entries")
              .select("total_debit, total_credit")
              .eq("id", receiptRecord.journal_entry_id)
              .single();
            if (jeData) {
              await supabase.from("journal_entries").update({
                total_debit: (jeData.total_debit || 0) + receiptBankFeeAmount,
                total_credit: (jeData.total_credit || 0) + receiptBankFeeAmount,
              }).eq("id", receiptRecord.journal_entry_id);
            }

            feeJournalEntryId = receiptRecord.journal_entry_id;
          }

          // Create separate bank_transaction for the fee
          const { data: feeTxn } = await supabase.from("bank_transactions").insert([{
            bank_account_id: receipt.bank_account_id,
            transaction_date: receipt.receipt_date,
            transaction_type: "fee",
            description: `Bank fee (${receipt.bank_fee_type || "bank_charge"}) - AR Receipt ${receipt.receipt_number}`,
            credit_amount: receiptBankFeeAmount,
            debit_amount: 0,
            reference: `FEE-${receipt.receipt_number}`,
            company_id: selectedCompanyId,
            source_type: "bank_fee",
            source_id: data.id,
          }]).select().single();

          // Insert bank_fee_charges record as "posted"
          await supabase.from("bank_fee_charges").insert([{
            bank_account_id: receipt.bank_account_id,
            fee_date: receipt.receipt_date,
            amount: receiptBankFeeAmount,
            fee_type: receipt.bank_fee_type || "bank_charge",
            description: `Bank fee for AR Receipt ${receipt.receipt_number} from ${customerName}`,
            ar_receipt_id: data.id,
            company_id: selectedCompanyId,
            status: feeJournalEntryId ? "posted" : "draft",
            journal_entry_id: feeJournalEntryId,
            bank_transaction_id: feeTxn?.id || null,
          } as any]);
        }
      }

      // Auto-create cheque register entry for cheque receipts
      if (receipt.payment_method === "cheque") {
        const chequePayee = customerName || `Customer Receipt ${receipt.receipt_number}`;
        
        await supabase.from("cheque_register").insert([{
          cheque_number: receipt.reference || `CHQ-${data.id.slice(0, 8)}`,
          bank_account_id: receipt.bank_account_id,
          cheque_date: receipt.receipt_date,
          amount: receipt.amount,
          status: "draft",
          payee: chequePayee,
          company_id: selectedCompanyId,
          cheque_type: "incoming",
          ar_receipt_id: data.id,
          reference: receipt.reference || receipt.receipt_number,
        } as any]);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ar-summary"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", selectedCompanyId] });
      toast.success("Receipt recorded successfully");
    },
    onError: (error) => {
      toast.error(`Failed to record receipt: ${error.message}`);
    },
  });
};

// ============ AP Invoices ============
export const useCreateAPInvoice = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  
  return useMutation({
    mutationFn: async (invoice: {
      invoice_number: string;
      vendor_bill_number?: string;
      vendor_id: string;
      invoice_date: string;
      due_date: string;
      total_amount: number;
      subtotal?: number;
      tax_amount?: number;
      wht_amount?: number;
      notes?: string;
      route_id?: string;
      bus_id?: string;
      school_route_id?: string;
      lines?: Array<{
        description: string;
        quantity: number;
        unit_price: number;
        tax_amount?: number;
        tax_code?: string;
        line_total: number;
        account_id?: string;
      }>;
      cost_allocations?: Array<{ unit_code: string; amount: number }>;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      // For consolidated GL: post to parent company, tag with business unit
      const effectiveCompanyId = getEffectiveCompanyId();
      const businessUnitCode = getBusinessUnitCode();
      
      const { lines, cost_allocations, ...headerData } = invoice;
      
      const { data, error } = await supabase
        .from("ap_invoices")
        .insert([{
          ...headerData,
          balance: invoice.total_amount - (invoice.wht_amount || 0),
          status: "unpaid",
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode,
          route_id: invoice.route_id || null,
          bus_id: invoice.bus_id || null,
          school_route_id: invoice.school_route_id || null,
        } as any])
        .select()
        .single();
      
      if (error) throw error;
      
      // Insert line items into ap_invoice_lines
      if (lines?.length) {
        const lineData = lines.map(line => ({
          invoice_id: data.id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          tax_amount: line.tax_amount || 0,
          tax_code: line.tax_code,
          line_total: line.line_total,
          account_id: line.account_id || null,
          company_id: effectiveCompanyId,
        }));
        
        const { error: lineError } = await supabase.from("ap_invoice_lines").insert(lineData);
        if (lineError) {
          console.warn("Failed to insert AP invoice lines:", lineError.message);
        }
      }
      
      // ========== AUTO GL POSTING at creation: DR Expense, CR Trade Payable ==========
      try {
        const { resolveVendorAPAccounts } = await import("@/hooks/useVendorCategories");
        const resolved = await resolveVendorAPAccounts(invoice.vendor_id, effectiveCompanyId);
        
        if (resolved.missingAccounts.length > 0 && invoice.total_amount > 0) {
          console.error("AP GL missing accounts:", resolved.missingAccounts);
          toast.error(`GL Config Missing: ${resolved.missingAccounts.join("; ")}. Configure in Settings → Core GL or Vendor Categories.`, { duration: 8000 });
        }

        const tradePayableId = resolved.apAccountId;
        const defaultExpenseAccountId = resolved.expenseAccountId;

        if (tradePayableId && defaultExpenseAccountId && invoice.total_amount > 0) {
          const { postAPInvoiceToGL } = await import("@/lib/gl-posting-utils");

          // Fetch vendor name for JE description
          const { data: vendorData } = await supabase
            .from("vendors")
            .select("vendor_name")
            .eq("id", invoice.vendor_id)
            .single();

          // Resolve Input Tax account from gl_settings
          const { data: glSettings } = await (supabase as any)
            .from("gl_settings")
            .select("input_tax_account_id")
            .eq("company_id", effectiveCompanyId)
            .maybeSingle();

          const inputTaxAccountId = glSettings?.input_tax_account_id || null;

          // Build per-line expense entries WITH tax amounts using 3-tier resolution
          const expenseLines = (lines || []).map(line => ({
            accountId: line.account_id || defaultExpenseAccountId,
            amount: line.line_total || 0,
            taxAmount: line.tax_amount || 0,
            description: `${line.description || 'Expense'} - ${invoice.invoice_number}`,
          }));

          const glResult = await postAPInvoiceToGL({
            invoiceNumber: invoice.invoice_number,
            invoiceDate: invoice.invoice_date,
            totalAmount: invoice.total_amount,
            expenseAccountId: defaultExpenseAccountId,
            tradePayableId,
            inputTaxAccountId,
            companyId: effectiveCompanyId,
            businessUnitCode: businessUnitCode || undefined,
            vendorName: vendorData?.vendor_name,
            expenseLines: expenseLines.length > 0 ? expenseLines : undefined,
            sourceModule: 'manual_ap',
            costAllocations: cost_allocations,
          });

          if (glResult.success && glResult.journalEntryId) {
            await (supabase as any)
              .from("ap_invoices")
              .update({ journal_entry_id: glResult.journalEntryId })
              .eq("id", data.id);
          } else if (!glResult.success) {
            toast.error(`AP Invoice created but GL posting failed: ${glResult.error}. Check Settings → Core GL.`, { duration: 8000 });
          }
        }
      } catch (glError: any) {
        toast.error(`AP Invoice created but GL posting error: ${glError?.message || 'Unknown'}`, { duration: 8000 });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ap-summary"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success("Vendor invoice recorded & posted to GL");
    },
    onError: (error) => {
      toast.error(`Failed to record invoice: ${error.message}`);
    },
  });
};

// ============ AP Payments ============
export const useCreateAPPayment = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  
  return useMutation({
    mutationFn: async (payment: {
      payment_number: string;
      vendor_id: string;
      payee_type?: "vendor" | "customer";
      payee_id?: string;
      payment_date: string;
      amount: number;
      payment_method: string;
      bank_account_id?: string;
      cheque_number?: string;
      cheque_date?: string;
      reference?: string;
      notes?: string;
      is_advance?: boolean;
      is_direct_payment?: boolean;
      vendor_bank_account_id?: string;
      bank_fee_amount?: number;
      bank_fee_type?: string;
      vendor_bill_number?: string;
      bus_id?: string;
      bus_no?: string;
      vehicle_type?: string;
      allocations?: Array<{
        invoice_id: string;
        allocated_amount: number;
        wht_deducted?: number;
        write_off_amount?: number;
        write_off_account_id?: string;
      }>;
      direct_lines?: Array<{
        account_id: string;
        description: string;
        quantity: number;
        unit_price: number;
        tax_rate: number;
        tax_amount: number;
        line_total: number;
      }>;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      // For consolidated GL: post to parent company, tag with business unit
      const effectiveCompanyId = getEffectiveCompanyId();
      const businessUnitCode = getBusinessUnitCode();

      // Resolve payee type/id (default to vendor for backward compatibility)
      const payeeType: "vendor" | "customer" = payment.payee_type || "vendor";
      const payeeId: string = payment.payee_id || payment.vendor_id;

      // Get payee name for GL posting description (vendor or customer)
      let vendorName = "";
      if (payeeType === "customer") {
        const { data: customerData } = await supabase
          .from("customers")
          .select("customer_name")
          .eq("id", payeeId)
          .maybeSingle();
        vendorName = (customerData as any)?.customer_name || "";
      } else {
        const { data: vendorData } = await supabase
          .from("vendors")
          .select("vendor_name")
          .eq("id", payeeId)
          .maybeSingle();
        vendorName = vendorData?.vendor_name || "";
      }
      
      const { data, error } = await supabase
        .from("ap_payments")
        .insert([{
          payment_number: payment.payment_number,
          vendor_id: payeeType === "vendor" ? payeeId : null,
          payee_customer_id: payeeType === "customer" ? payeeId : null,
          payee_type: payeeType,
          payment_date: payment.payment_date,
          amount: payment.amount,
          payment_method: payment.payment_method,
          bank_account_id: payment.bank_account_id,
          cheque_number: payment.cheque_number,
          cheque_date: payment.cheque_date,
          reference: payment.reference,
          notes: payment.notes,
          is_advance: payment.is_advance || false,
          is_direct_payment: payment.is_direct_payment || false,
          bank_fee_amount: payment.bank_fee_amount || 0,
          bank_fee_type: payment.bank_fee_type || null,
          vendor_bill_number: payment.vendor_bill_number || null,
          bus_id: payment.bus_id || null,
          bus_no: payment.bus_no || null,
          vehicle_type: payment.vehicle_type || null,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode,
        } as any])
        .select()
        .single();
      
      if (error) throw error;

      // Calculate total WHT deducted
      const totalWhtDeducted = payment.allocations?.reduce((sum, a) => sum + (a.wht_deducted || 0), 0) || 0;
      
      // Only process allocations if not an advance payment
      if (!payment.is_advance && payment.allocations?.length) {
        for (const alloc of payment.allocations) {
          await supabase.from("ap_payment_allocations").insert([{
            payment_id: data.id,
            invoice_id: alloc.invoice_id,
            allocated_amount: alloc.allocated_amount,
            wht_deducted: alloc.wht_deducted || 0,
            write_off_amount: alloc.write_off_amount || 0,
            company_id: effectiveCompanyId,
          }]);
          
          const { data: invoice } = await supabase
            .from("ap_invoices")
            .select("balance, total_amount, paid_amount")
            .eq("id", alloc.invoice_id)
            .single();
          
          if (invoice) {
            const totalPaid = alloc.allocated_amount + (alloc.wht_deducted || 0) + (alloc.write_off_amount || 0);
            const newPaid = (invoice.paid_amount || 0) + totalPaid;
            const newBalance = invoice.total_amount - newPaid;
            
            await supabase
              .from("ap_invoices")
              .update({
                paid_amount: newPaid,
                balance: newBalance,
                status: newBalance <= 0 ? "paid" : newBalance < invoice.total_amount ? "partial" : "unpaid",
              })
              .eq("id", alloc.invoice_id);
          }
        }
      }

      // ========== DIRECT PAYMENT LINES ==========
      if (payment.is_direct_payment && payment.direct_lines?.length) {
        const linesToInsert = payment.direct_lines.map((line) => ({
          payment_id: data.id,
          account_id: line.account_id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          tax_rate: line.tax_rate,
          tax_amount: line.tax_amount,
          line_total: line.line_total,
          company_id: effectiveCompanyId,
        }));
        const { error: linesError } = await supabase
          .from("ap_payment_lines" as any)
          .insert(linesToInsert);
        if (linesError) {
          console.error("[AP Direct Payment] Failed to insert lines:", linesError);
        }
      }

      // ========== GL POSTING ==========
      // Get the bank account's linked GL account if a bank account is selected
      let bankGLAccountId: string | null = null;
      if (payment.bank_account_id) {
        const { data: bankAccount } = await supabase
          .from("bank_accounts")
          .select("gl_account_id")
          .eq("id", payment.bank_account_id)
          .single();
        bankGLAccountId = bankAccount?.gl_account_id || null;
      }

      // For direct payments: GL post per line (debit each line's account, credit bank)
      if (payment.is_direct_payment && payment.direct_lines?.length && bankGLAccountId && payment.amount > 0) {
        // Build journal entry lines: debit each expense account, credit bank
        const jeLines: Array<{ account_id: string; description: string; debit_amount: number; credit_amount: number }> = [];
        
        for (const line of payment.direct_lines) {
          if (line.account_id && line.line_total > 0) {
            jeLines.push({
              account_id: line.account_id,
              description: line.description || `Direct payment line`,
              debit_amount: line.line_total,
              credit_amount: 0,
            });
          }
        }
        // Credit bank for total
        jeLines.push({
          account_id: bankGLAccountId,
          description: `Direct Payment ${payment.payment_number} to ${vendorName}`,
          debit_amount: 0,
          credit_amount: payment.amount,
        });

        const totalDebit = jeLines.reduce((s, l) => s + l.debit_amount, 0);
        const totalCredit = jeLines.reduce((s, l) => s + l.credit_amount, 0);

        // Create journal entry
        const { data: je, error: jeError } = await supabase
          .from("journal_entries")
          .insert([{
            entry_number: `JE-DP-${payment.payment_number}`,
            entry_date: payment.payment_date,
            description: `Direct Payment ${payment.payment_number} to ${vendorName}`,
            reference: payment.reference || payment.payment_number,
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
            debit: l.debit_amount,
            credit: l.credit_amount,
            company_id: effectiveCompanyId,
            business_unit_code: businessUnitCode,
          }));
          await supabase.from("journal_entry_lines").insert(jelLines);

          // Update COA balances
          for (const l of jelLines) {
            if (l.debit > 0) {
              const { data: acc } = await supabase.from("chart_of_accounts").select("current_balance").eq("id", l.account_id).single();
              if (acc) {
                await supabase.from("chart_of_accounts").update({ current_balance: (acc.current_balance || 0) + l.debit }).eq("id", l.account_id);
              }
            }
            if (l.credit > 0) {
              const { data: acc } = await supabase.from("chart_of_accounts").select("current_balance").eq("id", l.account_id).single();
              if (acc) {
                await supabase.from("chart_of_accounts").update({ current_balance: (acc.current_balance || 0) - l.credit }).eq("id", l.account_id);
              }
            }
          }

          // Link journal entry to payment
          await supabase.from("ap_payments").update({ journal_entry_id: je.id }).eq("id", data.id);
        }
      } else if (!payment.is_direct_payment && payeeType === "vendor") {
        // Normal / Advance payment GL posting — resolve via vendor category mappings
        const { resolveVendorAPAccounts } = await import("@/hooks/useVendorCategories");
        const resolvedPaymentAccounts = await resolveVendorAPAccounts(payeeId, effectiveCompanyId);

        // For advance payments: use the advance account if available, else fall back to trade payable
        const tradePayableId = payment.is_advance
          ? (resolvedPaymentAccounts.advanceAccountId || resolvedPaymentAccounts.apAccountId)
          : resolvedPaymentAccounts.apAccountId;

        // Calculate total write-offs
        const totalWriteOff = payment.allocations?.reduce((sum, a) => sum + (a.write_off_amount || 0), 0) || 0;
        const writeOffAccountId = payment.allocations?.find(a => a.write_off_amount && a.write_off_amount > 0)?.write_off_account_id || undefined;

        // Find WHT Payable account if needed
        let whtPayableId: string | null = null;
        if (totalWhtDeducted > 0) {
          const { data: whtAccounts } = await supabase
            .from("chart_of_accounts")
            .select("id")
            .eq("company_id", effectiveCompanyId)
            .eq("account_type", "liability")
            .eq("is_active", true)
            .ilike("account_name", "%wht%payable%")
            .limit(1);
          whtPayableId = whtAccounts?.[0]?.id || null;
        }

        // Only post to GL if we have the required accounts
        if (tradePayableId && bankGLAccountId && payment.amount > 0) {
          const { postAPPaymentToGL } = await import("@/lib/gl-posting-utils");
          
          const glResult = await postAPPaymentToGL({
            paymentNumber: payment.payment_number,
            paymentDate: payment.payment_date,
            amount: payment.amount,
            whtAmount: totalWhtDeducted > 0 ? totalWhtDeducted : undefined,
            writeOffAmount: totalWriteOff > 0 ? totalWriteOff : undefined,
            bankAccountId: bankGLAccountId,
            tradePayableId: tradePayableId,
            whtPayableId: totalWhtDeducted > 0 ? whtPayableId || undefined : undefined,
            writeOffAccountId: writeOffAccountId,
            companyId: effectiveCompanyId,
            businessUnitCode: businessUnitCode || undefined,
            vendorName: vendorName,
          });

          if (glResult.success && glResult.journalEntryId) {
            await supabase
              .from("ap_payments")
              .update({ journal_entry_id: glResult.journalEntryId })
              .eq("id", data.id);
          }
        } else if (payment.amount > 0) {
          if (!bankGLAccountId) {
            console.warn("[AP Payment GL] Bank account has no linked GL account, skipping GL posting");
            toast.warning("GL posting skipped: Bank account has no linked GL account. Configure it in Banking → Edit Account → GL Account.");
          }
          if (!tradePayableId) {
            console.warn("[AP Payment GL] Trade Payable account not found in COA");
            toast.warning("GL posting skipped: 'Trade Payable' account not found in Chart of Accounts.");
          }
        }
      }

      // ========== BANK TRANSACTION ==========
      // Create bank transaction record if bank account is selected (use selectedCompanyId to match bank account)
      const totalWithFees = payment.amount + (payment.bank_fee_amount || 0);
      if (payment.bank_account_id && payment.amount > 0) {
        const feeBreakdown = payment.bank_fee_amount && payment.bank_fee_amount > 0
          ? ` (Payment: ${payment.amount.toLocaleString()}, Bank Fee: ${payment.bank_fee_amount.toLocaleString()})`
          : '';
        await supabase.from("bank_transactions").insert([{
          bank_account_id: payment.bank_account_id,
          transaction_date: payment.payment_date,
          transaction_type: "payment",
          description: `AP Payment to ${vendorName} - ${payment.payment_number}${feeBreakdown}`,
          credit_amount: totalWithFees,
          debit_amount: 0,
          reference: payment.reference || payment.payment_number,
          cheque_number: payment.cheque_number,
          company_id: selectedCompanyId,
          source_type: "ap_payment",
          source_id: data.id,
        }]);

        // Update bank account balance with total including fees
        const { data: bankAccount } = await supabase
          .from("bank_accounts")
          .select("current_balance")
          .eq("id", payment.bank_account_id)
          .single();

        if (bankAccount) {
          const newBalance = (bankAccount.current_balance || 0) - totalWithFees;
          await supabase
            .from("bank_accounts")
            .update({ current_balance: newBalance })
            .eq("id", payment.bank_account_id);
        }

        // Auto-create bank_fee_charges record if bank fee is included
        if (payment.bank_fee_amount && payment.bank_fee_amount > 0) {
          // 1. Find Bank Charges expense account for GL posting
          let bankChargesAccountId: string | null = null;
          const { data: bankChargesAccounts } = await supabase
            .from("chart_of_accounts")
            .select("id")
            .eq("company_id", effectiveCompanyId)
            .eq("is_active", true)
            .or("account_name.ilike.%bank charge%,account_name.ilike.%bank fee%")
            .eq("account_type", "expense")
            .limit(1);
          bankChargesAccountId = bankChargesAccounts?.[0]?.id || null;

          // 2. Auto-post fee GL lines to the SAME journal entry if possible
          let feeJournalEntryId: string | null = null;
          if (bankChargesAccountId && bankGLAccountId) {
            // Get the payment's journal entry to add fee lines
            const { data: paymentRecord } = await supabase
              .from("ap_payments")
              .select("journal_entry_id")
              .eq("id", data.id)
              .single();

            if (paymentRecord?.journal_entry_id) {
              // Add fee lines to existing JE
              await supabase.from("journal_entry_lines").insert([
                {
                  journal_entry_id: paymentRecord.journal_entry_id,
                  account_id: bankChargesAccountId,
                  description: `Bank fee - ${payment.bank_fee_type || "bank_charge"} for ${payment.payment_number}`,
                  debit: payment.bank_fee_amount,
                  credit: 0,
                  company_id: effectiveCompanyId,
                  business_unit_code: businessUnitCode,
                },
                {
                  journal_entry_id: paymentRecord.journal_entry_id,
                  account_id: bankGLAccountId,
                  description: `Bank fee deduction - ${payment.payment_number}`,
                  debit: 0,
                  credit: payment.bank_fee_amount,
                  company_id: effectiveCompanyId,
                  business_unit_code: businessUnitCode,
                },
              ]);

              // Update JE totals
              const { data: jeData } = await supabase
                .from("journal_entries")
                .select("total_debit, total_credit")
                .eq("id", paymentRecord.journal_entry_id)
                .single();
              if (jeData) {
                await supabase.from("journal_entries").update({
                  total_debit: (jeData.total_debit || 0) + payment.bank_fee_amount,
                  total_credit: (jeData.total_credit || 0) + payment.bank_fee_amount,
                }).eq("id", paymentRecord.journal_entry_id);
              }

              feeJournalEntryId = paymentRecord.journal_entry_id;
            }
          }

          // 3. Create a separate bank_transaction for the fee (for reconciliation)
          const { data: feeTxn } = await supabase.from("bank_transactions").insert([{
            bank_account_id: payment.bank_account_id,
            transaction_date: payment.payment_date,
            transaction_type: "fee",
            description: `Bank fee (${payment.bank_fee_type || "bank_charge"}) - AP Payment ${payment.payment_number}`,
            credit_amount: payment.bank_fee_amount,
            debit_amount: 0,
            reference: `FEE-${payment.payment_number}`,
            company_id: selectedCompanyId,
            source_type: "bank_fee",
            source_id: data.id,
          }]).select().single();

          // 4. Insert bank_fee_charges record as "posted" (not draft)
          await supabase.from("bank_fee_charges").insert([{
            bank_account_id: payment.bank_account_id,
            fee_date: payment.payment_date,
            amount: payment.bank_fee_amount,
            fee_type: payment.bank_fee_type || "bank_charge",
            description: `Bank fee for AP Payment ${payment.payment_number} to ${vendorName}`,
            ap_payment_id: data.id,
            company_id: selectedCompanyId,
            status: feeJournalEntryId ? "posted" : "draft",
            journal_entry_id: feeJournalEntryId,
            bank_transaction_id: feeTxn?.id || null,
          } as any]);
        }
      }

      // Auto-create cheque register entry for cheque payments
      if (payment.payment_method === "cheque" && payment.cheque_number) {
        await supabase.from("cheque_register").insert([{
          cheque_number: payment.cheque_number,
          bank_account_id: payment.bank_account_id,
          cheque_date: payment.cheque_date || payment.payment_date,
          amount: payment.amount,
          status: "draft",
          payee: vendorName,
          company_id: selectedCompanyId,
          cheque_type: "outgoing",
          payment_id: data.id,
          reference: payment.reference || payment.payment_number,
        } as any]);
      }

      // ========== FLEET LOAN REVERSE-SYNC ==========
      // If any allocated AP invoice is linked to a bus_loan_payment,
      // auto-update the loan payment status to "paid"
      if (!payment.is_advance && payment.allocations?.length) {
        for (const alloc of payment.allocations) {
          try {
            // Check if this invoice is linked to a bus_loan_payment
            const { data: linkedPayments } = await supabase
              .from("bus_loan_payments")
              .select("id, loan_id")
              .eq("ap_invoice_id", alloc.invoice_id);

            if (linkedPayments && linkedPayments.length > 0) {
              for (const loanPayment of linkedPayments) {
                // Auto-mark loan payment as paid
                await supabase
                  .from("bus_loan_payments")
                  .update({
                    payment_status: "paid",
                    actual_payment_date: payment.payment_date,
                    gl_posted: true,
                    journal_entry_id: data.journal_entry_id || null,
                  })
                  .eq("id", loanPayment.id);

                console.log(`[Fleet Loan Sync] Auto-marked loan payment ${loanPayment.id} as paid via AP payment`);
              }
            }
          } catch (syncError) {
            // Non-blocking: don't fail the AP payment if sync fails
            console.error("[Fleet Loan Sync] Error syncing loan payment:", syncError);
          }
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-payments"] });
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ap-summary"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", selectedCompanyId] });
      toast.success("Payment recorded successfully");
    },
    onError: (error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });
};

// ============ Bank Transactions ============
export const useCreateBankTransaction = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (transaction: {
      bank_account_id: string;
      transaction_date: string;
      transaction_type: string;
      description: string;
      debit_amount?: number;
      credit_amount?: number;
      reference?: string;
      cheque_number?: string;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data, error } = await supabase
        .from("bank_transactions")
        .insert([{
          ...transaction,
          company_id: selectedCompanyId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", selectedCompanyId] });
      toast.success("Transaction recorded successfully");
    },
    onError: (error) => {
      toast.error(`Failed to record transaction: ${error.message}`);
    },
  });
};

// ============ Fixed Assets ============
export const useCreateFixedAsset = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (asset: {
      asset_code: string;
      asset_name: string;
      category_id: string;
      purchase_date: string;
      purchase_cost: number;
      salvage_value?: number;
      location?: string;
      department?: string;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data, error } = await supabase
        .from("fixed_assets")
        .insert([{
          asset_code: asset.asset_code,
          asset_name: asset.asset_name,
          category_id: asset.category_id,
          purchase_date: asset.purchase_date,
          purchase_cost: asset.purchase_cost,
          salvage_value: asset.salvage_value,
          location: asset.location,
          department: asset.department,
          current_value: asset.purchase_cost,
          accumulated_depreciation: 0,
          status: "active",
          company_id: selectedCompanyId,
        }])
        .select()
        .single();
      
      if (error) throw error;

      // ========== ACQUISITION GL POSTING ==========
      // Fetch category GL accounts
      const { data: category } = await supabase
        .from("asset_categories")
        .select("asset_account_id, bank_account_id")
        .eq("id", asset.category_id)
        .single();

      if (category?.asset_account_id && category?.bank_account_id) {
        const { createAndPostJournalEntry, generateEntryNumber } = await import("@/lib/gl-posting-utils");
        
        const glResult = await createAndPostJournalEntry({
          entry_date: asset.purchase_date,
          description: `Asset Acquisition: ${asset.asset_name} (${asset.asset_code})`,
          reference: `ACQ-${asset.asset_code}`,
          company_id: selectedCompanyId,
          lines: [
            {
              account_id: category.asset_account_id,
              description: `Fixed Asset - ${asset.asset_name}`,
              debit: asset.purchase_cost,
              credit: 0,
            },
            {
              account_id: category.bank_account_id,
              description: `Cash/Bank Payment - ${asset.asset_name}`,
              debit: 0,
              credit: asset.purchase_cost,
            },
          ],
        });

        if (!glResult.success) {
          console.warn("Acquisition GL posting failed:", glResult.error);
          toast.warning("Asset registered but GL posting failed: " + glResult.error);
        }
      } else {
        toast.warning("Asset registered — GL accounts not configured on category, no journal entry created.");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success("Asset registered successfully");
    },
    onError: (error) => {
      toast.error(`Failed to register asset: ${error.message}`);
    },
  });
};

export const useRunDepreciation = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (periodId: string) => {
      let query = supabase
        .from("fixed_assets")
        .select(`
          *,
          asset_categories (
            depreciation_method,
            useful_life_years,
            depreciation_expense_account_id,
            accumulated_dep_account_id
          )
        `)
        .eq("status", "active");
      
      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }
      
      const { data: assets, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      
      const schedules = [];
      
      for (const asset of assets || []) {
        if (!asset.asset_categories) continue;
        
        const monthlyDepreciation = 
          (asset.purchase_cost - (asset.salvage_value || 0)) / 
          ((asset.asset_categories.useful_life_years || 5) * 12);
        
        const newAccumulated = (asset.accumulated_depreciation || 0) + monthlyDepreciation;
        const newNetValue = asset.purchase_cost - newAccumulated;
        
        schedules.push({
          asset_id: asset.id,
          period_id: periodId,
          depreciation_date: new Date().toISOString().split("T")[0],
          depreciation_amount: monthlyDepreciation,
          accumulated_depreciation: newAccumulated,
          net_book_value: newNetValue,
          is_posted: false,
          company_id: selectedCompanyId,
        });
        
        await supabase
          .from("fixed_assets")
          .update({
            accumulated_depreciation: newAccumulated,
            current_value: newNetValue,
          })
          .eq("id", asset.id);
      }
      
      if (schedules.length > 0) {
        await supabase.from("asset_depreciation_schedule").insert(schedules);
      }
      
      return { processedAssets: schedules.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["depreciation-schedule", selectedCompanyId] });
      toast.success(`Depreciation run complete: ${data.processedAssets} assets processed`);
    },
    onError: (error) => {
      toast.error(`Failed to run depreciation: ${error.message}`);
    },
  });
};

// ============ Financial Period ============
export const useClosePeriod = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (periodId: string) => {
      const { data: unposted } = await supabase
        .from("journal_entries")
        .select("id")
        .eq("period_id", periodId)
        .neq("status", "posted")
        .limit(1);
      
      if (unposted?.length) {
        throw new Error("Cannot close period with unposted journal entries");
      }
      
      const { error } = await supabase
        .from("financial_periods")
        .update({ 
          is_closed: true,
          closed_at: new Date().toISOString(),
        })
        .eq("id", periodId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-periods", selectedCompanyId] });
      toast.success("Period closed successfully");
    },
    onError: (error) => {
      toast.error(`Failed to close period: ${error.message}`);
    },
  });
};

// ============ Customer Mutations ============
export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  
  return useMutation({
    mutationFn: async (customer: {
      customer_code: string;
      customer_name: string;
      contact_email?: string;
      contact_phone?: string;
      billing_address?: string;
      credit_limit?: number;
      payment_terms?: number;
      tax_id?: string;
      is_active?: boolean;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      // For consolidated GL: store under parent company, tag with business unit
      const effectiveCompanyId = getEffectiveCompanyId();
      const businessUnitCode = getBusinessUnitCode();
      
      const { data, error } = await supabase
        .from("customers")
        .insert([{
          ...customer,
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create customer: ${error.message}`);
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase
        .from("customers")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", selectedCompanyId] });
      toast.success("Customer updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update customer: ${error.message}`);
    },
  });
};

// ============ Vendor Mutations ============
export const useCreateVendor = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  
  return useMutation({
    mutationFn: async (vendor: {
      vendor_code: string;
      vendor_name: string;
      contact_email?: string;
      contact_phone?: string;
      address?: string;
      payment_terms?: number;
      tax_id?: string;
      wht_applicable?: boolean;
      wht_rate?: number;
      is_active?: boolean;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      // For consolidated GL: store under parent company, tag with business unit
      const effectiveCompanyId = getEffectiveCompanyId();
      const businessUnitCode = getBusinessUnitCode();
      
      const { data, error } = await supabase
        .from("vendors")
        .insert([{
          ...vendor,
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create vendor: ${error.message}`);
    },
  });
};

export const useUpdateVendor = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase
        .from("vendors")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors", selectedCompanyId] });
      toast.success("Vendor updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update vendor: ${error.message}`);
    },
  });
};

// ============ AR Credit Notes ============
export const useCreateARCreditNote = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (data: any) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: result, error } = await supabase
        .from("ar_credit_notes")
        .insert([{ ...data, company_id: selectedCompanyId }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar-invoices", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["ar-credit-notes", selectedCompanyId] });
      toast.success("Credit note created");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ AP Debit Notes ============
export const useCreateAPDebitNote = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (data: any) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: result, error } = await supabase
        .from("ap_debit_notes")
        .insert([{ ...data, company_id: selectedCompanyId }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-invoices", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["ap-debit-notes", selectedCompanyId] });
      toast.success("Debit note created");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ AP Approvals ============
export const useApproveAPInvoice = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const effectiveCompanyId = getEffectiveCompanyId();
      const businessUnitCode = getBusinessUnitCode() || undefined;

      // 1. Fetch invoice details
      const { data: invoice } = await (supabase as any)
        .from("ap_invoices")
        .select("invoice_number, invoice_date, total_amount, vendor_id, journal_entry_id, vendors(vendor_name)")
        .eq("id", id)
        .single();

      if (!invoice) throw new Error("Invoice not found");

      // 2. Guard against double-posting
      if (invoice.journal_entry_id) {
        console.log("AP Invoice already posted to GL (journal_entry_id exists), skipping GL on approval.");
        
        // Just update approval status if already posted
        const { error: updErr } = await supabase.from("ap_invoices").update({ approval_status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
        if (updErr) throw updErr;
        return;
      }

      // 3. Resolve GL Accounts FIRST (Block approval if missing)
      let defaultExpenseAccountId: string | null = null;
      let tradePayableId: string | null = null;
      let vendorData = invoice.vendors as any;

      if (invoice.total_amount > 0) {
        const { resolveVendorAPAccounts } = await import("@/hooks/useVendorCategories");
        const resolved = await resolveVendorAPAccounts(invoice.vendor_id, effectiveCompanyId);

        if (resolved.missingAccounts.length > 0 && resolved.missingAccounts.length >= 2) {
            // Throw error immediately if critical accounts are missing
            throw new Error(`Missing GL Configuration: \n- ${resolved.missingAccounts.join('\n- ')}\nPlease configure these in Settings to approve invoices.`);
        }

        if (!resolved.apAccountId || !resolved.expenseAccountId) {
            throw new Error(`Missing GL Accounts for AP Invoice posting. Verify Trade Payable and Default Expense are configured.`);
        }

        tradePayableId = resolved.apAccountId;
        defaultExpenseAccountId = resolved.expenseAccountId;
      }

      // 4. Update approval status since safety checks passed
      const { error: approvalErr } = await supabase.from("ap_invoices").update({ approval_status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
      if (approvalErr) throw approvalErr;

      // 5. Build lines and Post to GL
      try {
        if (invoice.total_amount > 0 && tradePayableId && defaultExpenseAccountId) {
          const { data: invoiceLines } = await (supabase as any)
            .from("ap_invoice_lines")
            .select("account_id, line_total, tax_amount, description")
            .eq("invoice_id", id);

          // Resolve Input Tax account from gl_settings
          const { data: glSettings } = await (supabase as any)
            .from("gl_settings")
            .select("input_tax_account_id")
            .eq("company_id", effectiveCompanyId)
            .maybeSingle();

          const inputTaxAccountId = glSettings?.input_tax_account_id || null;

          const { postAPInvoiceToGL } = await import("@/lib/gl-posting-utils");

          const expenseLines = (invoiceLines || []).map((line: any) => ({
            accountId: line.account_id || defaultExpenseAccountId,
            amount: line.line_total || 0,
            taxAmount: line.tax_amount || 0,
            description: `${line.description || 'Expense'} - ${invoice.invoice_number}`,
          }));

          const glResult = await postAPInvoiceToGL({
            invoiceNumber: invoice.invoice_number,
            invoiceDate: invoice.invoice_date,
            totalAmount: invoice.total_amount,
            expenseAccountId: defaultExpenseAccountId,
            tradePayableId,
            inputTaxAccountId,
            companyId: effectiveCompanyId,
            businessUnitCode,
            vendorName: vendorData?.vendor_name,
            expenseLines: expenseLines.length > 0 ? expenseLines : undefined,
          });

          if (glResult.success && glResult.journalEntryId) {
            await (supabase as any)
              .from("ap_invoices")
              .update({ journal_entry_id: glResult.journalEntryId })
              .eq("id", id);
          } else if (!glResult.success) {
            throw new Error(`GL Posting Failed: ${glResult.error}`);
          }
        }
      } catch (glError: any) {
        // If GL fails, we should ideally rollback the approval, but since this is an async side-effect,
        // we'll revert the invoice back to 'pending' to allow retry.
        await supabase.from("ap_invoices").update({ approval_status: "pending", approved_at: null }).eq("id", id);
        throw new Error(`Failed to post to General Ledger. Invoice approval reverted. Reason: ${glError.message || glError}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success("Invoice approved & posted to GL");
    },
    onError: (error) => toast.error(error.message, { duration: 6000 }),
  });
};

export const useApproveAPPayment = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Update approval status
      const { error } = await supabase.from("ap_payments").update({ approval_status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;

      // ========== DOUBLE-POSTING GUARD ==========
      // GL is already posted at creation time (useCreateAPPayment).
      // Only post here if the payment somehow has no journal_entry_id (legacy fallback).
      const { data: existingPayment } = await supabase
        .from("ap_payments")
        .select("journal_entry_id")
        .eq("id", id)
        .single();

      if (existingPayment?.journal_entry_id) {
        console.log("[AP Approve] GL already posted, skipping duplicate posting for payment", id);
        return;
      }

      // ========== FALLBACK GL POSTING for old payments without JE ==========
      try {
        const effectiveCompanyId = getEffectiveCompanyId();
        const businessUnitCode = getBusinessUnitCode() || undefined;

        const { data: payment } = await supabase
          .from("ap_payments")
          .select("payment_number, payment_date, amount, vendors(vendor_name)")
          .eq("id", id)
          .single();

        const { data: glSettings } = await (supabase as any)
          .from("gl_settings")
          .select("trade_payable_account_id, bank_account_id")
          .eq("company_id", effectiveCompanyId)
          .maybeSingle();

        const tradePayableId = glSettings?.trade_payable_account_id;
        const bankAccountId = glSettings?.bank_account_id;

        if (payment && tradePayableId && bankAccountId && payment.amount > 0) {
          const { createAndPostJournalEntry } = await import("@/lib/gl-posting-utils");
          const vendorData = payment.vendors as Record<string, string> | null;
          const vendorName = vendorData?.vendor_name || "Vendor";
          
          const glResult = await createAndPostJournalEntry({
            entry_date: payment.payment_date,
            description: `AP Payment: ${payment.payment_number} - ${vendorName}`,
            reference: payment.payment_number,
            company_id: effectiveCompanyId,
            business_unit_code: businessUnitCode || "HQ",
            lines: [
              {
                account_id: tradePayableId,
                description: `Trade Payable - ${vendorName}`,
                debit: payment.amount,
                credit: 0,
              },
              {
                account_id: bankAccountId,
                description: `Bank Payment - ${payment.payment_number}`,
                debit: 0,
                credit: payment.amount,
              },
            ],
          });

          if (glResult.success && glResult.journalEntryId) {
            await supabase.from("ap_payments")
              .update({ journal_entry_id: glResult.journalEntryId })
              .eq("id", id);
          } else {
            console.warn("AP Payment GL posting failed:", glResult.error);
          }
        }
      } catch (glError) {
        console.warn("AP Payment GL posting error:", glError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-payments", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success("Payment approved & posted to GL");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Items & Inventory ============
export const useCreateItem = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (data: any) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: result, error } = await supabase
        .from("items")
        .insert([{ ...data, company_id: selectedCompanyId }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", selectedCompanyId] });
      toast.success("Item created");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

export const useCreateItemCategory = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (category: {
      category_code: string;
      category_name: string;
      parent_category_id?: string;
      inventory_account_id?: string;
      cogs_account_id?: string;
      sales_account_id?: string;
      valuation_method?: string;
      is_active?: boolean;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data, error } = await (supabase as any)
        .from("item_categories")
        .insert([{ ...category, company_id: selectedCompanyId }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-categories", selectedCompanyId] });
      toast.success("Category created");
    },
    onError: (error: any) => toast.error(`Failed: ${error.message}`),
  });
};

export const useCreateStockAdjustment = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (data: any) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: result, error } = await supabase
        .from("stock_adjustments")
        .insert([{ ...data, company_id: selectedCompanyId }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["item-stock", selectedCompanyId] });
      toast.success("Stock adjusted");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Purchase Orders & GRN ============
export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (data: any) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { lines, ...poData } = data;
      const { data: result, error } = await supabase
        .from("purchase_orders")
        .insert([{ ...poData, status: "draft", company_id: selectedCompanyId }])
        .select()
        .single();
      if (error) throw error;
      if (lines?.length) {
        await supabase.from("purchase_order_lines" as any).insert(lines.map((l: any) => ({ ...l, purchase_order_id: result.id, company_id: selectedCompanyId })));
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", selectedCompanyId] });
      toast.success("Purchase order created");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

export const useCreateGoodsReceipt = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (data: any) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { lines, ...grnData } = data;
      const { data: result, error } = await supabase
        .from("goods_receipt_notes")
        .insert([{ ...grnData, status: "received", company_id: selectedCompanyId }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goods-receipt-notes", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", selectedCompanyId] });
      toast.success("GRN recorded");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Recurring Entries (Create) ============
export const useCreateRecurringEntry = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (entry: {
      entry_name: string;
      description: string;
      frequency: string;
      amount: number;
      start_date: string;
      end_date?: string;
      debit_account_id: string;
      credit_account_id: string;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: result, error } = await (supabase as any)
        .from("recurring_journal_entries")
        .insert([{ 
          entry_name: entry.entry_name,
          description: entry.description,
          frequency: entry.frequency,
          amount: entry.amount,
          start_date: entry.start_date,
          end_date: entry.end_date,
          next_run_date: entry.start_date,
          debit_account_id: entry.debit_account_id,
          credit_account_id: entry.credit_account_id,
          is_active: true,
          company_id: selectedCompanyId,
        }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-entries", selectedCompanyId] });
      toast.success("Recurring entry created");
    },
    onError: (error: any) => toast.error(`Failed: ${error.message}`),
  });
};

export const useRunRecurringEntry = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompanyId) throw new Error("No company selected");

      // 1. Fetch the recurring entry details
      const { data: entry, error: fetchError } = await (supabase as any)
        .from("recurring_journal_entries")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;

      // 2. Create actual journal entry via GL posting
      const { createAndPostJournalEntry, generateEntryNumber } = await import("@/lib/gl-posting-utils");
      const entryNumber = generateEntryNumber("REC");
      const today = new Date().toISOString().split('T')[0];

      const glResult = await createAndPostJournalEntry({
        entry_date: today,
        description: `Recurring: ${entry.entry_name} - ${entry.description}`,
        reference: entryNumber,
        company_id: selectedCompanyId,
        lines: [
          {
            account_id: entry.debit_account_id,
            description: entry.description || entry.entry_name,
            debit: entry.amount,
            credit: 0,
          },
          {
            account_id: entry.credit_account_id,
            description: entry.description || entry.entry_name,
            debit: 0,
            credit: entry.amount,
          },
        ],
      });

      if (!glResult.success) {
        throw new Error(glResult.error || "Failed to create journal entry");
      }

      // 3. Calculate next run date based on frequency
      const nextRunDate = new Date(today);
      switch (entry.frequency) {
        case 'daily': nextRunDate.setDate(nextRunDate.getDate() + 1); break;
        case 'weekly': nextRunDate.setDate(nextRunDate.getDate() + 7); break;
        case 'monthly': nextRunDate.setMonth(nextRunDate.getMonth() + 1); break;
        case 'quarterly': nextRunDate.setMonth(nextRunDate.getMonth() + 3); break;
        case 'yearly': nextRunDate.setFullYear(nextRunDate.getFullYear() + 1); break;
      }

      // 4. Update last_run_date, next_run_date, and run_count
      const { error: updateError } = await (supabase as any)
        .from("recurring_journal_entries")
        .update({
          last_run_date: today,
          next_run_date: nextRunDate.toISOString().split('T')[0],
          run_count: (entry.run_count || 0) + 1,
        })
        .eq("id", id);
      if (updateError) throw updateError;

      return glResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-entries", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success("Recurring entry executed — journal entry posted to GL");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Currency Management ============
export const useCreateCurrency = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { currency_code: string; currency_name: string; symbol?: string; is_base_currency?: boolean }) => {
      const { data: result, error } = await supabase.from("currencies" as any).insert([data]).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
      toast.success("Currency added");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

export const useCreateExchangeRate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { from_currency: string; to_currency: string; rate: number; effective_date: string }) => {
      const { data: result, error } = await supabase.from("exchange_rates" as any).insert([data]).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
      toast.success("Exchange rate added");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

export const useUpdateExchangeRate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; rate?: number; effective_date?: string }) => {
      const { error } = await supabase.from("exchange_rates" as any).update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
      toast.success("Exchange rate updated");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Purchase Requisitions ============
export const useCreatePurchaseRequisition = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (data: any) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: result, error } = await supabase
        .from("purchase_requisitions" as any)
        .insert([{ ...data, status: "draft", company_id: selectedCompanyId }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requisitions", selectedCompanyId] });
      toast.success("Purchase requisition created");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

export const useApprovePurchaseRequisition = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("purchase_requisitions" as any).update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requisitions", selectedCompanyId] });
      toast.success("Requisition approved");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

export const useConvertPRtoPO = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (prId: string) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: prData, error: prError } = await supabase.from("purchase_requisitions" as any).select("*").eq("id", prId).single();
      if (prError) throw prError;
      
      const pr = prData as any;
      
      const { data: po, error: poError } = await supabase.from("purchase_orders").insert([{
        po_number: `PO-${Date.now()}`,
        vendor_id: pr.vendor_id || null,
        order_date: new Date().toISOString().split('T')[0],
        expected_date: pr.required_date || null,
        total_amount: pr.estimated_total || 0,
        status: "draft",
        notes: `Converted from PR: ${pr.requisition_number || prId}`,
        pr_id: prId,
        company_id: selectedCompanyId,
      }]).select().single();
      if (poError) throw poError;
      
      await supabase.from("purchase_requisitions" as any).update({ status: "converted", converted_to_po_id: po.id }).eq("id", prId);
      
      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requisitions", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", selectedCompanyId] });
      toast.success("Converted to Purchase Order");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Bank Reconciliation ============
export const useCreateBankReconciliation = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (data: { bank_account_id: string; statement_date: string; statement_balance: number; book_balance: number }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: result, error } = await supabase.from("bank_reconciliations").insert([{
        ...data,
        reconciliation_date: new Date().toISOString().split('T')[0],
        status: "in_progress",
        company_id: selectedCompanyId,
      }]).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliations", selectedCompanyId] });
      toast.success("Reconciliation started");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// Full save: create reconciliation record + items + mark transactions reconciled
export const useSaveBankReconciliation = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (data: {
      bank_account_id: string;
      statement_date: string;
      statement_no: string;
      statement_balance: number;
      book_balance: number;
      adjusted_book_balance: number;
      difference: number;
      cleared_transaction_ids: string[];
      cleared_amounts: Record<string, number>;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      // 1. Create the reconciliation header
      const { data: recon, error: reconError } = await supabase
        .from("bank_reconciliations")
        .insert([{
          bank_account_id: data.bank_account_id,
          statement_date: data.statement_date,
          statement_balance: data.statement_balance,
          book_balance: data.book_balance,
          adjusted_book_balance: data.adjusted_book_balance,
          difference: data.difference,
          reconciliation_date: new Date().toISOString().split('T')[0],
          status: "completed",
          notes: data.statement_no ? `Statement No: ${data.statement_no}` : null,
          company_id: selectedCompanyId,
          reconciled_at: new Date().toISOString(),
        }])
        .select()
        .single();
      if (reconError) throw reconError;

      // 2. Create reconciliation items for each cleared transaction
      if (data.cleared_transaction_ids.length > 0) {
        const items = data.cleared_transaction_ids.map((txnId) => ({
          reconciliation_id: recon.id,
          bank_transaction_id: txnId,
          statement_amount: data.cleared_amounts[txnId] || 0,
          statement_date: data.statement_date,
          match_status: "matched",
          matched_at: new Date().toISOString(),
          company_id: selectedCompanyId,
        }));

        const { error: itemsError } = await supabase
          .from("bank_reconciliation_items")
          .insert(items);
        if (itemsError) throw itemsError;

        // 3. Mark transactions as reconciled
        const { error: updateError } = await supabase
          .from("bank_transactions")
          .update({
            is_reconciled: true,
            reconciled_at: new Date().toISOString(),
            reconciliation_id: recon.id,
          })
          .in("id", data.cleared_transaction_ids);
        if (updateError) throw updateError;
      }

      return recon;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliations"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["last-reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Reconciliation completed and saved");
    },
    onError: (error) => toast.error(`Failed to save reconciliation: ${error.message}`),
  });
};

export const useMatchReconciliationItem = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async ({ itemId, transactionId }: { itemId: string; transactionId: string }) => {
      const { error } = await supabase.from("bank_reconciliation_items" as any).update({ 
        bank_transaction_id: transactionId, 
        match_status: "matched",
        matched_at: new Date().toISOString(),
      }).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliation-items", selectedCompanyId] });
      toast.success("Item matched");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Fund Transfers ============
export const useCreateFundTransfer = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (data: { from_account_id: string; to_account_id: string; amount: number; transfer_date: string; reference?: string }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: result, error } = await supabase.from("fund_transfers" as any).insert([{
        ...data,
        status: "completed",
        company_id: selectedCompanyId,
      }]).select().single();
      if (error) throw error;

      // ========== AUTO GL POSTING: DR To Account, CR From Account ==========
      try {
        const { createAndPostJournalEntry, generateEntryNumber } = await import("@/lib/gl-posting-utils");

        // Fetch account names for description
        const { data: fromAccount } = await supabase.from("chart_of_accounts").select("account_name, account_code").eq("id", data.from_account_id).single();
        const { data: toAccount } = await supabase.from("chart_of_accounts").select("account_name, account_code").eq("id", data.to_account_id).single();

        const fromName = fromAccount ? `${fromAccount.account_code} - ${fromAccount.account_name}` : 'Source Account';
        const toName = toAccount ? `${toAccount.account_code} - ${toAccount.account_name}` : 'Destination Account';

        const glResult = await createAndPostJournalEntry({
          entry_date: data.transfer_date,
          description: `Fund Transfer: ${fromName} → ${toName}`,
          reference: data.reference || generateEntryNumber("FT"),
          company_id: selectedCompanyId,
          lines: [
            {
              account_id: data.to_account_id,
              description: `Transfer in from ${fromName}`,
              debit: data.amount,
              credit: 0,
            },
            {
              account_id: data.from_account_id,
              description: `Transfer out to ${toName}`,
              debit: 0,
              credit: data.amount,
            },
          ],
        });

        if (glResult.success && glResult.journalEntryId) {
          await supabase.from("fund_transfers" as any).update({ journal_entry_id: glResult.journalEntryId }).eq("id", (result as any).id);
        } else {
          console.warn("Fund transfer GL posting failed:", glResult.error);
        }
      } catch (glError) {
        console.warn("Fund transfer GL posting error:", glError);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fund-transfers", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success("Fund transfer completed & posted to GL");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Asset Disposals ============
export const useCreateAssetDisposal = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (data: { asset_id: string; disposal_date: string; disposal_type: string; disposal_value?: number; reason?: string }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: asset, error: assetError } = await supabase.from("fixed_assets").select("*, asset_categories(asset_account_id, accumulated_dep_account_id, bank_account_id, gain_loss_disposal_account_id)").eq("id", data.asset_id).single();
      if (assetError) throw assetError;
      
      const nbv = asset.current_value || 0;
      const gainLoss = (data.disposal_value || 0) - nbv;
      const accumulatedDep = asset.accumulated_depreciation || 0;
      const purchaseCost = asset.purchase_cost || 0;
      
      const { data: result, error } = await supabase.from("asset_disposals").insert([{
        ...data,
        net_book_value: nbv,
        accumulated_depreciation: accumulatedDep,
        gain_loss: gainLoss,
        approval_status: "pending",
        company_id: selectedCompanyId,
      }]).select().single();
      if (error) throw error;
      
      await supabase.from("fixed_assets").update({ status: "disposed" }).eq("id", data.asset_id);

      // ========== DISPOSAL GL POSTING ==========
      const cat = asset.asset_categories;
      if (cat?.asset_account_id && cat?.accumulated_dep_account_id && cat?.gain_loss_disposal_account_id) {
        const { createAndPostJournalEntry } = await import("@/lib/gl-posting-utils");
        
        const lines: Array<{ account_id: string; description: string; debit: number; credit: number }> = [];
        
        // DR Accumulated Depreciation (remove contra-asset)
        if (accumulatedDep > 0) {
          lines.push({
            account_id: cat.accumulated_dep_account_id,
            description: `Remove Accum Dep - ${asset.asset_name}`,
            debit: accumulatedDep,
            credit: 0,
          });
        }

        // DR Bank (sale proceeds) if sold
        if ((data.disposal_value || 0) > 0 && cat.bank_account_id) {
          lines.push({
            account_id: cat.bank_account_id,
            description: `Disposal Proceeds - ${asset.asset_name}`,
            debit: data.disposal_value || 0,
            credit: 0,
          });
        }

        // Handle Gain or Loss
        if (gainLoss > 0) {
          // Gain on disposal (credit)
          lines.push({
            account_id: cat.gain_loss_disposal_account_id,
            description: `Gain on Disposal - ${asset.asset_name}`,
            debit: 0,
            credit: gainLoss,
          });
        } else if (gainLoss < 0) {
          // Loss on disposal (debit)
          lines.push({
            account_id: cat.gain_loss_disposal_account_id,
            description: `Loss on Disposal - ${asset.asset_name}`,
            debit: Math.abs(gainLoss),
            credit: 0,
          });
        }

        // CR Fixed Asset (remove at cost)
        lines.push({
          account_id: cat.asset_account_id,
          description: `Remove Asset at Cost - ${asset.asset_name}`,
          debit: 0,
          credit: purchaseCost,
        });
        
        const glResult = await createAndPostJournalEntry({
          entry_date: data.disposal_date,
          description: `Asset Disposal: ${asset.asset_name} (${asset.asset_code})`,
          reference: `DSP-${asset.asset_code}`,
          company_id: selectedCompanyId,
          lines,
        });

        if (glResult.success && glResult.journalEntryId) {
          await supabase.from("asset_disposals").update({ journal_entry_id: glResult.journalEntryId }).eq("id", result.id);
        } else {
          console.warn("Disposal GL posting failed:", glResult.error);
          toast.warning("Disposal recorded but GL posting failed: " + glResult.error);
        }
      } else {
        toast.warning("Disposal recorded — GL accounts not fully configured on category.");
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-disposals", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["fixed-assets", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success("Asset disposal recorded");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Bad Debt Provisions ============
export const useCreateBadDebtProvision = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (data: { customer_id?: string; invoice_id?: string; provision_amount: number; provision_date: string; reason?: string }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: result, error } = await supabase.from("ar_bad_debt_provisions").insert([{
        ...data,
        status: "pending",
        company_id: selectedCompanyId,
      }]).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bad-debt-provisions", selectedCompanyId] });
      toast.success("Bad debt provision created");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

export const useWriteOffBadDebt = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (provisionId: string) => {
      const { error } = await supabase.from("ar_bad_debt_provisions").update({ 
        status: "written_off",
        write_off_date: new Date().toISOString().split('T')[0],
      }).eq("id", provisionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bad-debt-provisions", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["ar-invoices", selectedCompanyId] });
      toast.success("Bad debt written off");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Batch & Serial Numbers ============
export const useCreateBatchNumber = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (data: { item_id: string; batch_number: string; quantity_received: number; expiry_date?: string; manufacture_date?: string }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: result, error } = await supabase.from("batch_numbers").insert([{
        ...data,
        quantity_available: data.quantity_received,
        status: "active",
        company_id: selectedCompanyId,
      }]).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batch-numbers", selectedCompanyId] });
      toast.success("Batch number created");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

export const useCreateSerialNumber = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (data: { item_id: string; serial_number: string; status?: string }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: result, error } = await supabase.from("serial_numbers" as any).insert([{
        ...data,
        status: data.status || "available",
        company_id: selectedCompanyId,
      }]).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serial-numbers", selectedCompanyId] });
      toast.success("Serial number created");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ WHT Certificates ============
export const useCreateWHTCertificate = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (data: { vendor_id: string; certificate_number: string; certificate_date: string; wht_amount: number; tax_period?: string }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: result, error } = await supabase.from("wht_certificates" as any).insert([{
        ...data,
        status: "issued",
        company_id: selectedCompanyId,
      }]).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wht-certificates", selectedCompanyId] });
      toast.success("WHT certificate issued");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ PO Approval ============
export const useApprovePurchaseOrder = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("purchase_orders")
        .update({ 
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", selectedCompanyId] });
      toast.success("Purchase order approved");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

export const useRejectPurchaseOrder = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("purchase_orders")
        .update({ 
          status: "rejected",
          notes: reason,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", selectedCompanyId] });
      toast.success("Purchase order rejected");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Stock Adjustment Approval ============
export const useApproveStockAdjustment = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("stock_adjustments")
        .update({ 
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      // ========== AUTO GL POSTING for Stock Adjustment ==========
      try {
        const effectiveCompanyId = getEffectiveCompanyId();
        const businessUnitCode = getBusinessUnitCode();

        // Fetch adjustment details
        const { data: adjustment } = await (supabase as any)
          .from("stock_adjustments")
          .select("adjustment_number, adjustment_date, adjustment_type, adjustment_value, reason, items(item_name)")
          .eq("id", id)
          .single();

        // Fetch GL settings for inventory
        const { data: glSettings } = await (supabase as any)
          .from("gl_settings")
          .select("*")
          .eq("company_id", effectiveCompanyId)
          .maybeSingle();

        const inventoryAccountId = (glSettings as Record<string, string> | null)?.inventory_account_id;
        const adjustmentExpenseId = (glSettings as Record<string, string> | null)?.stock_adjustment_account_id ||
          (glSettings as Record<string, string> | null)?.default_expense_account_id;

        if (adjustment && inventoryAccountId && adjustmentExpenseId && adjustment.adjustment_value > 0) {
          const { createAndPostJournalEntry } = await import("@/lib/gl-posting-utils");
          const itemName = adjustment.items?.item_name || "Stock";
          const isIncrease = adjustment.adjustment_type === "increase" || adjustment.adjustment_type === "addition";

          const glResult = await createAndPostJournalEntry({
            entry_date: adjustment.adjustment_date || new Date().toISOString().split("T")[0],
            description: `Stock Adjustment: ${adjustment.adjustment_number || id.substring(0, 8)} - ${itemName} (${adjustment.adjustment_type})`,
            reference: adjustment.adjustment_number || id.substring(0, 8),
            company_id: effectiveCompanyId,
            business_unit_code: businessUnitCode || "HQ",
            lines: isIncrease
              ? [
                  { account_id: inventoryAccountId, description: `Inventory Increase - ${itemName}`, debit: adjustment.adjustment_value, credit: 0 },
                  { account_id: adjustmentExpenseId, description: `Stock Adjustment - ${itemName}`, debit: 0, credit: adjustment.adjustment_value },
                ]
              : [
                  { account_id: adjustmentExpenseId, description: `Stock Adjustment Write-off - ${itemName}`, debit: adjustment.adjustment_value, credit: 0 },
                  { account_id: inventoryAccountId, description: `Inventory Decrease - ${itemName}`, debit: 0, credit: adjustment.adjustment_value },
                ],
          });

          if (!glResult.success) {
            console.warn("Stock Adjustment GL posting failed:", glResult.error);
          }
        }
      } catch (glError) {
        console.warn("Stock Adjustment GL posting error:", glError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["items", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success("Stock adjustment approved & posted to GL");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Reject Mutations ============
export const useRejectJournalEntry = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("journal_entries")
        .update({ 
          status: "void",
          notes: reason,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries", selectedCompanyId] });
      toast.success("Journal entry rejected");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

export const useRejectAPInvoice = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("ap_invoices")
        .update({ 
          approval_status: "rejected",
          notes: reason,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-invoices", selectedCompanyId] });
      toast.success("Invoice rejected");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

export const useRejectAPPayment = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("ap_payments")
        .update({ 
          approval_status: "rejected",
          notes: reason,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-payments", selectedCompanyId] });
      toast.success("Payment rejected");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Reversing Journal Entries ============
export const useCreateReversingEntry = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async ({ originalEntryId, reverseDate }: { originalEntryId: string; reverseDate: string }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: original, error: fetchError } = await supabase
        .from("journal_entries")
        .select(`
          *,
          journal_entry_lines (*)
        `)
        .eq("id", originalEntryId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const reverseEntryNumber = `REV-${Date.now()}`;
      const { data: reversingEntry, error: entryError } = await supabase
        .from("journal_entries")
        .insert([{
          entry_number: reverseEntryNumber,
          entry_date: reverseDate,
          description: `Reversal of: ${original.description} (Entry: ${originalEntryId})`,
          reference: `REV-${original.entry_number}`,
          total_debit: original.total_credit,
          total_credit: original.total_debit,
          status: "draft",
          is_reversal: true,
          company_id: selectedCompanyId,
        }])
        .select()
        .single();
      
      if (entryError) throw entryError;
      
      const reversedLines = original.journal_entry_lines.map((line: any) => ({
        journal_entry_id: reversingEntry.id,
        account_id: line.account_id,
        description: `Reversal: ${line.description || ""}`,
        debit: line.credit || 0,
        credit: line.debit || 0,
        cost_center_id: line.cost_center_id,
        company_id: selectedCompanyId,
      }));
      
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(reversedLines);
      
      if (linesError) throw linesError;
      
      return reversingEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries", selectedCompanyId] });
      toast.success("Reversing entry created");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Depreciation with GL Posting ============
export const useRunDepreciationWithGL = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (periodId: string) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: period, error: periodError } = await supabase
        .from("financial_periods")
        .select("*")
        .eq("id", periodId)
        .single();
      
      if (periodError) throw periodError;
      
      let query = supabase
        .from("fixed_assets")
        .select(`
          *,
          asset_categories (
            depreciation_expense_account_id,
            accumulated_dep_account_id,
            useful_life_years
          )
        `)
        .eq("status", "active");
      
      if (selectedCompanyId) {
        query = query.eq("company_id", selectedCompanyId);
      }
      
      const { data: assets, error: assetsError } = await query;
      if (assetsError) throw assetsError;
      
      const scheduleEntries: any[] = [];
      const journalLines: any[] = [];
      let totalDepreciation = 0;
      
      for (const asset of assets || []) {
        if (!asset.asset_categories) continue;
        
        const usefulLife = asset.asset_categories.useful_life_years || 5;
        const salvage = asset.salvage_value || 0;
        const monthlyDep = (asset.purchase_cost - salvage) / (usefulLife * 12);
        const newAccumulated = (asset.accumulated_depreciation || 0) + monthlyDep;
        const newNBV = asset.purchase_cost - newAccumulated;
        
        scheduleEntries.push({
          asset_id: asset.id,
          depreciation_date: period.end_date,
          depreciation_amount: monthlyDep,
          accumulated_depreciation: newAccumulated,
          net_book_value: newNBV,
          period_id: periodId,
          is_posted: true,
          company_id: selectedCompanyId,
        });
        
        if (asset.asset_categories.depreciation_expense_account_id) {
          journalLines.push({
            account_id: asset.asset_categories.depreciation_expense_account_id,
            description: `Depreciation - ${asset.asset_code} - ${asset.asset_name}`,
            debit: monthlyDep,
            credit: 0,
            company_id: selectedCompanyId,
          });
        }
        
        if (asset.asset_categories.accumulated_dep_account_id) {
          journalLines.push({
            account_id: asset.asset_categories.accumulated_dep_account_id,
            description: `Accumulated Dep - ${asset.asset_code} - ${asset.asset_name}`,
            debit: 0,
            credit: monthlyDep,
            company_id: selectedCompanyId,
          });
        }
        
        totalDepreciation += monthlyDep;
        
        await supabase
          .from("fixed_assets")
          .update({
            accumulated_depreciation: newAccumulated,
            current_value: newNBV,
            last_depreciation_date: period.end_date,
          })
          .eq("id", asset.id);
      }
      
      if (journalLines.length > 0) {
        const { data: journalEntry, error: jeError } = await supabase
          .from("journal_entries")
          .insert([{
            entry_number: `DEP-${Date.now()}`,
            entry_date: period.end_date,
            description: `Monthly Depreciation - ${period.period_name || period.end_date} (Auto-generated)`,
            reference: `DEP-${period.end_date}`,
            total_debit: totalDepreciation,
            total_credit: totalDepreciation,
            status: "posted",
            period_id: periodId,
            company_id: selectedCompanyId,
          }])
          .select()
          .single();
        
        if (jeError) throw jeError;
        
        const linesWithJE = journalLines.map((line) => ({
          ...line,
          journal_entry_id: journalEntry.id,
        }));
        
        await supabase.from("journal_entry_lines").insert(linesWithJE);
        
        // Update COA balances for each journal line (matches createAndPostJournalEntry behavior)
        for (const line of linesWithJE) {
          const { data: account } = await supabase
            .from("chart_of_accounts")
            .select("current_balance, account_type")
            .eq("id", line.account_id)
            .single();

          if (account) {
            const isDebitNormal = ["asset", "expense"].includes(account.account_type);
            const adjustment = isDebitNormal
              ? (line.debit - line.credit)
              : (line.credit - line.debit);

            await supabase
              .from("chart_of_accounts")
              .update({
                current_balance: (account.current_balance || 0) + adjustment
              })
              .eq("id", line.account_id);
          }
        }
        
        for (const entry of scheduleEntries) {
          entry.journal_entry_id = journalEntry.id;
        }
      }
      
      if (scheduleEntries.length > 0) {
        await supabase.from("asset_depreciation_schedule").insert(scheduleEntries);
      }
      
      return { assetsProcessed: assets?.length || 0, totalDepreciation };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["depreciation-schedule", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", selectedCompanyId] });
      toast.success(`Depreciation run complete: ${data.assetsProcessed} assets processed`);
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Currency Revaluation ============
export const useRunCurrencyRevaluation = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async ({ periodId, revaluationDate }: { periodId: string; revaluationDate: string }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: rates, error: ratesError } = await supabase
        .from("exchange_rates")
        .select("*")
        .order("effective_date", { ascending: false });
      
      if (ratesError) throw ratesError;
      
      const accountsProcessed = rates?.length || 0;
      const totalGainLoss = 0;
      
      if (rates && rates.length > 0) {
        const { error: jeError } = await supabase
          .from("journal_entries")
          .insert([{
            entry_number: `REVAL-${Date.now()}`,
            entry_date: revaluationDate,
            description: `Currency Revaluation Run - ${revaluationDate} (${accountsProcessed} rates processed)`,
            reference: `REVAL-${revaluationDate}`,
            total_debit: 0,
            total_credit: 0,
            status: "posted",
            period_id: periodId,
            company_id: selectedCompanyId,
          }]);
        
        if (jeError) throw jeError;
      }
      
      return { accountsProcessed, totalGainLoss };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
      toast.success(`Revaluation complete: ${data.accountsProcessed} rates processed`);
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Bank Statement Import ============
export const useImportBankStatement = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async ({ 
      bankAccountId, 
      transactions,
      statementDate,
      openingBalance,
      closingBalance,
    }: { 
      bankAccountId: string;
      transactions: Array<{
        date: string;
        description: string;
        reference?: string;
        debit?: number;
        credit?: number;
      }>;
      statementDate: string;
      openingBalance?: number;
      closingBalance?: number;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: importRecord, error: importError } = await supabase
        .from("bank_statement_imports")
        .insert([{
          bank_account_id: bankAccountId,
          file_name: `Import-${statementDate}`,
          import_date: new Date().toISOString(),
          statement_start_date: statementDate,
          statement_end_date: statementDate,
          opening_balance: openingBalance,
          closing_balance: closingBalance,
          transaction_count: transactions.length,
          total_debits: transactions.reduce((sum, t) => sum + (t.debit || 0), 0),
          total_credits: transactions.reduce((sum, t) => sum + (t.credit || 0), 0),
          status: "pending",
          company_id: selectedCompanyId,
        }])
        .select()
        .single();
      
      if (importError) throw importError;
      
      const bankTransactions = transactions.map((t) => ({
        bank_account_id: bankAccountId,
        transaction_date: t.date,
        description: t.description,
        reference: t.reference,
        debit_amount: t.debit || 0,
        credit_amount: t.credit || 0,
        transaction_type: (t.debit || 0) > 0 ? "withdrawal" : "deposit",
        is_reconciled: false,
        source_type: "statement_import",
        source_id: importRecord.id,
        company_id: selectedCompanyId,
      }));
      
      const { error: txnError } = await supabase
        .from("bank_transactions")
        .insert(bankTransactions);
      
      if (txnError) throw txnError;
      
      await supabase
        .from("bank_statement_imports")
        .update({ status: "completed" })
        .eq("id", importRecord.id);
      
      return importRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["bank-statement-imports", selectedCompanyId] });
      toast.success("Bank statement imported successfully");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ AP Credit Notes ============
export const useCreateAPCreditNote = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (data: {
      credit_note_number: string;
      vendor_id: string;
      credit_date: string;
      amount: number;
      reason?: string;
      original_invoice_id?: string;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: result, error } = await supabase
        .from("ap_debit_notes")
        .insert([{
          debit_note_number: data.credit_note_number.replace("CN", "DN"),
          vendor_id: data.vendor_id,
          debit_date: data.credit_date,
          amount: -data.amount,
          reason: `[CREDIT NOTE] ${data.reason || ""}`,
          original_invoice_id: data.original_invoice_id,
          status: "draft",
          company_id: selectedCompanyId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-invoices", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["ap-credit-notes", selectedCompanyId] });
      toast.success("AP Credit note created");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ AR Debit Notes ============
export const useCreateARDebitNote = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (data: {
      debit_note_number: string;
      customer_id: string;
      debit_date: string;
      amount: number;
      reason?: string;
      original_invoice_id?: string;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: result, error } = await supabase
        .from("ar_credit_notes")
        .insert([{
          credit_note_number: data.debit_note_number.replace("DN", "CN"),
          customer_id: data.customer_id,
          credit_date: data.debit_date,
          amount: -data.amount,
          reason: `[DEBIT NOTE] ${data.reason || ""}`,
          original_invoice_id: data.original_invoice_id,
          status: "draft",
          company_id: selectedCompanyId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar-invoices", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["ar-debit-notes", selectedCompanyId] });
      toast.success("AR Debit note created");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Bank Accounts ============
export const useCreateBankAccount = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (account: {
      account_code: string;
      account_name: string;
      bank_name: string;
      account_number: string;
      branch?: string;
      account_type?: string;
      currency?: string;
      opening_balance?: number;
      current_balance?: number;
      gl_account_id?: string;
      is_active?: boolean;
      is_default?: boolean;
      notes?: string;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data, error } = await supabase
        .from("bank_accounts")
        .insert([{
          ...account,
          company_id: selectedCompanyId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", selectedCompanyId] });
      toast.success("Bank account created successfully");
    },
    onError: (error) => toast.error(`Failed to create bank account: ${error.message}`),
  });
};

export const useUpdateBankAccount = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (account: {
      id: string;
      account_code?: string;
      account_name?: string;
      bank_name?: string;
      account_number?: string;
      branch?: string;
      account_type?: string;
      currency?: string;
      opening_balance?: number;
      gl_account_id?: string;
      is_active?: boolean;
      is_default?: boolean;
      notes?: string;
    }) => {
      const { id, ...updateData } = account;
      const { data, error } = await supabase
        .from("bank_accounts")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", selectedCompanyId] });
      toast.success("Bank account updated successfully");
    },
    onError: (error) => toast.error(`Failed to update bank account: ${error.message}`),
  });
};

// ============ Asset Categories ============
export const useCreateAssetCategory = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (category: {
      category_code: string;
      category_name: string;
      depreciation_method?: string;
      depreciation_rate?: number;
      useful_life_years?: number;
      asset_account_id?: string;
      accumulated_dep_account_id?: string;
      depreciation_expense_account_id?: string;
      bank_account_id?: string;
      gain_loss_disposal_account_id?: string;
      revaluation_surplus_account_id?: string;
      is_active?: boolean;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data, error } = await supabase
        .from("asset_categories")
        .insert([{
          ...category,
          company_id: selectedCompanyId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-categories", selectedCompanyId] });
      toast.success("Asset category created successfully");
    },
    onError: (error) => toast.error(`Failed to create category: ${error.message}`),
  });
};

// ============ Cost Centers ============
export const useCreateCostCenter = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (costCenter: {
      cost_center_code: string;
      cost_center_name: string;
      cost_center_type?: string;
      parent_id?: string;
      description?: string;
      is_active?: boolean;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data, error } = await supabase
        .from("cost_centers")
        .insert([{
          center_code: costCenter.cost_center_code,
          center_name: costCenter.cost_center_name,
          is_active: costCenter.is_active ?? true,
          company_id: selectedCompanyId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-centers", selectedCompanyId] });
      toast.success("Cost center created successfully");
    },
    onError: (error) => toast.error(`Failed to create cost center: ${error.message}`),
  });
};

// ============ Budgets ============
export const useCreateBudget = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (budget: {
      budget_code: string;
      budget_name: string;
      fiscal_year: string;
      budget_period?: string;
      total_budget_amount: number;
      status?: string;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const startDate = `${budget.fiscal_year}-01-01`;
      const endDate = `${budget.fiscal_year}-12-31`;
      
      const { data, error } = await supabase
        .from("budgets")
        .insert([{
          budget_code: budget.budget_code,
          budget_name: budget.budget_name,
          fiscal_year: parseInt(budget.fiscal_year),
          budget_period: budget.budget_period || "annual",
          total_budget_amount: budget.total_budget_amount,
          status: budget.status || "draft",
          start_date: startDate,
          end_date: endDate,
          company_id: selectedCompanyId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets", selectedCompanyId] });
      toast.success("Budget created successfully");
    },
    onError: (error) => toast.error(`Failed to create budget: ${error.message}`),
  });
};

// ============ Cheque Register ============
export const useCreateCheque = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (cheque: {
      cheque_number: string;
      bank_account_id: string;
      cheque_date: string;
      payee_name: string;
      amount: number;
      status: string;
      reference?: string;
      cheque_type?: string;
      payment_id?: string;
      ar_receipt_id?: string;
    }) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data, error } = await supabase
        .from("cheque_register")
        .insert([{
          cheque_number: cheque.cheque_number,
          bank_account_id: cheque.bank_account_id,
          cheque_date: cheque.cheque_date,
          amount: cheque.amount,
          status: cheque.status,
          payee: cheque.payee_name,
          company_id: selectedCompanyId,
          cheque_type: cheque.cheque_type || "outgoing",
          reference: cheque.reference,
          payment_id: cheque.payment_id,
          ar_receipt_id: cheque.ar_receipt_id,
        } as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheque-register", selectedCompanyId] });
      toast.success("Cheque recorded successfully");
    },
    onError: (error) => toast.error(`Failed to record cheque: ${error.message}`),
  });
};

export const useUpdateChequeStatus = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async ({ chequeId, status, clearedDate }: { chequeId: string; status: string; clearedDate?: string }) => {
      const updateData: any = { status };
      if (clearedDate) updateData.cleared_date = clearedDate;
      
      const { error } = await supabase
        .from("cheque_register")
        .update(updateData)
        .eq("id", chequeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheque-register", selectedCompanyId] });
      toast.success("Cheque status updated");
    },
    onError: (error) => toast.error(`Failed to update cheque: ${error.message}`),
  });
};

// ============ Recurring Entries (Toggle/Process) ============
export const useToggleRecurringEntry = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async ({ entryId, isActive }: { entryId: string; isActive: boolean }) => {
      const { error } = await (supabase as any)
        .from("recurring_journal_entries")
        .update({ is_active: isActive })
        .eq("id", entryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-entries", selectedCompanyId] });
    },
    onError: (error: any) => toast.error(`Failed to update: ${error.message}`),
  });
};

export const useProcessRecurringEntry = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (entryId: string) => {
      // Fetch the recurring entry with its template
      const { data: recurringEntry, error: fetchError } = await (supabase as any)
        .from("recurring_journal_entries")
        .select("*")
        .eq("id", entryId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Generate unique entry number
      const entryNumber = `REC-${Date.now()}`;
      
      // Create a new journal entry from the template
      const { data: journalEntry, error: journalError } = await supabase
        .from("journal_entries")
        .insert([{
          entry_number: entryNumber,
          entry_date: new Date().toISOString().split("T")[0],
          description: recurringEntry.description || recurringEntry.entry_name,
          reference: `REC-${recurringEntry.entry_name || entryId}`,
          total_debit: recurringEntry.amount || 0,
          total_credit: recurringEntry.amount || 0,
          status: "posted",
          posted_at: new Date().toISOString(),
          company_id: selectedCompanyId,
        }])
        .select()
        .single();
      
      if (journalError) throw journalError;
      
      // Update last run date and calculate next run date
      const nextRunDate = new Date();
      const frequency = recurringEntry.frequency || "monthly";
      switch (frequency) {
        case "daily":
          nextRunDate.setDate(nextRunDate.getDate() + 1);
          break;
        case "weekly":
          nextRunDate.setDate(nextRunDate.getDate() + 7);
          break;
        case "monthly":
          nextRunDate.setMonth(nextRunDate.getMonth() + 1);
          break;
        case "quarterly":
          nextRunDate.setMonth(nextRunDate.getMonth() + 3);
          break;
        case "yearly":
          nextRunDate.setFullYear(nextRunDate.getFullYear() + 1);
          break;
      }
      
      await (supabase as any)
        .from("recurring_journal_entries")
        .update({
          last_run_date: new Date().toISOString().split("T")[0],
          next_run_date: nextRunDate.toISOString().split("T")[0],
        })
        .eq("id", entryId);
      
      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-entries", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries", selectedCompanyId] });
      toast.success("Recurring entry processed");
    },
    onError: (error: any) => toast.error(`Failed to process: ${error.message}`),
  });
};

// ============ DELETE & UPDATE MUTATIONS FOR EDIT/DELETE FEATURE ============

export const useDeleteARInvoice = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Fetch invoice to get journal_entry_id
      const { data: invoice } = await supabase
        .from("ar_invoices")
        .select("id, journal_entry_id")
        .eq("id", id)
        .single();

      // 2. Delete receipt allocations linked to this invoice
      await supabase.from("ar_receipt_allocations").delete().eq("invoice_id", id);

      // 3. Reverse and delete JE if exists
      if (invoice?.journal_entry_id) {
        const { reverseAndDeleteJournalEntry } = await import("@/lib/gl-posting-utils");
        await reverseAndDeleteJournalEntry(invoice.journal_entry_id);
      }

      // 4. Delete invoice lines then invoice
      await supabase.from("ar_invoice_lines").delete().eq("invoice_id", id);
      const { error } = await supabase.from("ar_invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      const effectiveCompanyId = getEffectiveCompanyId();
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ar-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", effectiveCompanyId] });
      toast.success("AR Invoice deleted with JE reversal");
    },
    onError: (error) => toast.error(`Failed to delete: ${error.message}`),
  });
};

export const useDeleteAPInvoice = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Fetch invoice to get journal_entry_id
      const { data: invoice } = await supabase
        .from("ap_invoices")
        .select("id, journal_entry_id")
        .eq("id", id)
        .single();

      // 2. Delete payment allocations linked to this invoice
      await supabase.from("ap_payment_allocations").delete().eq("invoice_id", id);

      // 3. Reverse and delete JE if exists
      if (invoice?.journal_entry_id) {
        const { reverseAndDeleteJournalEntry } = await import("@/lib/gl-posting-utils");
        await reverseAndDeleteJournalEntry(invoice.journal_entry_id);
      }

      // 4. Delete invoice lines then invoice
      await supabase.from("ap_invoice_lines").delete().eq("invoice_id", id);
      const { error } = await supabase.from("ap_invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      const effectiveCompanyId = getEffectiveCompanyId();
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ap-payments"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", effectiveCompanyId] });
      toast.success("AP Invoice deleted with JE reversal");
    },
    onError: (error) => toast.error(`Failed to delete: ${error.message}`),
  });
};

// ============ Force Delete: AP Payment ============
export const useDeleteAPPayment = () => {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId } = useCompany();
  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Fetch payment
      const { data: payment } = await supabase
        .from("ap_payments")
        .select("id, journal_entry_id, bank_account_id, amount")
        .eq("id", id)
        .single();
      if (!payment) throw new Error("Payment not found");

      // 2. Delete allocations
      await supabase.from("ap_payment_allocations").delete().eq("payment_id", id);

      // 2b. Delete linked cheque register entries
      await (supabase as any).from("cheque_register").delete().eq("payment_id", id);

      // 3. Delete linked bank transactions
      await supabase.from("bank_transactions").delete().eq("reference", `AP-PAY-${id}`);

      // 4. Reverse bank account balance (add amount back)
      if (payment.bank_account_id) {
        const { data: bankAcc } = await supabase
          .from("bank_accounts")
          .select("id, current_balance")
          .eq("id", payment.bank_account_id)
          .single();
        if (bankAcc) {
          await supabase.from("bank_accounts").update({
            current_balance: Number(bankAcc.current_balance || 0) + Number(payment.amount || 0)
          }).eq("id", payment.bank_account_id);
        }
      }

      // 5. Reverse and delete JE
      if (payment.journal_entry_id) {
        const { reverseAndDeleteJournalEntry } = await import("@/lib/gl-posting-utils");
        await reverseAndDeleteJournalEntry(payment.journal_entry_id);
      }

      // 6. Delete payment lines (direct payments)
      await supabase.from("ap_payment_lines").delete().eq("payment_id", id);

      // 7. Delete payment
      const { error } = await supabase.from("ap_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      const effectiveCompanyId = getEffectiveCompanyId();
      queryClient.invalidateQueries({ queryKey: ["ap-payments"] });
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", effectiveCompanyId] });
      toast.success("AP Payment deleted with JE & bank reversal");
    },
    onError: (error) => toast.error(`Failed to delete payment: ${error.message}`),
  });
};

// ============ Force Delete: AR Receipt ============
export const useDeleteARReceipt = () => {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId } = useCompany();
  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Fetch receipt
      const { data: receipt } = await supabase
        .from("ar_receipts")
        .select("id, journal_entry_id, bank_account_id, amount")
        .eq("id", id)
        .single();
      if (!receipt) throw new Error("Receipt not found");

      // 2. Delete allocations
      await supabase.from("ar_receipt_allocations").delete().eq("receipt_id", id);

      // 2b. Delete linked cheque register entries
      await (supabase as any).from("cheque_register").delete().eq("ar_receipt_id", id);

      // 3. Delete linked bank transactions
      await supabase.from("bank_transactions").delete().eq("reference", `AR-REC-${id}`);

      // 4. Reverse bank account balance (subtract amount back)
      if (receipt.bank_account_id) {
        const { data: bankAcc } = await supabase
          .from("bank_accounts")
          .select("id, current_balance")
          .eq("id", receipt.bank_account_id)
          .single();
        if (bankAcc) {
          await supabase.from("bank_accounts").update({
            current_balance: Number(bankAcc.current_balance || 0) - Number(receipt.amount || 0)
          }).eq("id", receipt.bank_account_id);
        }
      }

      // 5. Reverse and delete JE
      if (receipt.journal_entry_id) {
        const { reverseAndDeleteJournalEntry } = await import("@/lib/gl-posting-utils");
        await reverseAndDeleteJournalEntry(receipt.journal_entry_id);
      }

      // 6. Delete receipt
      const { error } = await supabase.from("ar_receipts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      const effectiveCompanyId = getEffectiveCompanyId();
      queryClient.invalidateQueries({ queryKey: ["ar-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", effectiveCompanyId] });
      toast.success("AR Receipt deleted with JE & bank reversal");
    },
    onError: (error) => toast.error(`Failed to delete receipt: ${error.message}`),
  });
};

export const useDeleteItem = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", selectedCompanyId] });
      toast.success("Item deleted successfully");
    },
    onError: (error) => toast.error(`Failed to delete: ${error.message}`),
  });
};

export const useDeleteSalesOrder = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("sales_order_lines").delete().eq("sales_order_id", id);
      const { error } = await supabase.from("sales_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      toast.success("Sales order deleted successfully");
    },
    onError: (error) => toast.error(`Failed to delete: ${error.message}`),
  });
};

export const useDeletePurchaseOrder = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("purchase_order_lines").delete().eq("purchase_order_id", id);
      const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", selectedCompanyId] });
      toast.success("Purchase order deleted successfully");
    },
    onError: (error) => toast.error(`Failed to delete: ${error.message}`),
  });
};

export const useDeleteARCreditNote = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_credit_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar-credit-notes", selectedCompanyId] });
      toast.success("Credit note deleted successfully");
    },
    onError: (error) => toast.error(`Failed to delete: ${error.message}`),
  });
};

export const useDeleteAPDebitNote = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ap_debit_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-debit-notes", selectedCompanyId] });
      toast.success("Debit note deleted successfully");
    },
    onError: (error) => toast.error(`Failed to delete: ${error.message}`),
  });
};

// ============ UPDATE MUTATIONS FOR AP/AR INVOICES ============

export const useUpdateAPInvoice = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  return useMutation({
    mutationFn: async ({ id, data, lines }: {
      id: string;
      data: {
        vendor_id: string;
        invoice_number: string;
        vendor_bill_number?: string;
        invoice_date: string;
        due_date: string;
        subtotal?: number;
        total_amount: number;
        tax_amount?: number;
        wht_amount?: number;
        notes?: string;
        route_id?: string;
        bus_id?: string;
        school_route_id?: string;
      };
      lines: Array<{
        description: string;
        quantity: number;
        unit_price: number;
        tax_amount?: number;
        tax_code?: string;
        line_total: number;
        account_id?: string;
      }>;
    }) => {
      const effectiveCompanyId = getEffectiveCompanyId();
      
      const { error: headerError } = await supabase
        .from("ap_invoices")
        .update({
          vendor_id: data.vendor_id,
          invoice_number: data.invoice_number,
          vendor_bill_number: data.vendor_bill_number || null,
          invoice_date: data.invoice_date,
          due_date: data.due_date,
          subtotal: data.subtotal,
          total_amount: data.total_amount,
          tax_amount: data.tax_amount,
          wht_amount: data.wht_amount,
          balance: data.total_amount - (data.wht_amount || 0),
          notes: data.notes,
          route_id: data.route_id || null,
          bus_id: data.bus_id || null,
          school_route_id: data.school_route_id || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", id);
      if (headerError) throw headerError;

      // Delete old lines, insert new
      await supabase.from("ap_invoice_lines").delete().eq("invoice_id", id);
      if (lines.length > 0) {
        const lineData = lines.map(l => ({
          invoice_id: id,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          tax_amount: l.tax_amount,
          tax_code: l.tax_code,
          line_total: l.line_total,
          account_id: l.account_id,
          company_id: effectiveCompanyId,
        }));
        const { error: linesError } = await supabase.from("ap_invoice_lines").insert(lineData);
        if (linesError) throw linesError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
      toast.success("AP Invoice updated successfully");
    },
    onError: (error) => toast.error(`Failed to update AP Invoice: ${error.message}`),
  });
};

export const useUpdateARInvoice = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  return useMutation({
    mutationFn: async ({ id, data, lines }: {
      id: string;
      data: {
        customer_id: string;
        invoice_number: string;
        invoice_date: string;
        due_date: string;
        total_amount: number;
        tax_amount?: number;
        notes?: string;
        bus_id?: string;
        bus_no?: string;
        bus_type?: string;
        bus_category_id?: string;
        bus_sub_category_id?: string;
      };
      lines: Array<{
        description: string;
        quantity: number;
        unit_price: number;
        line_total: number;
        tax_code?: string;
        account_id?: string;
      }>;
    }) => {
      const effectiveCompanyId = getEffectiveCompanyId();
      
      const { error: headerError } = await supabase
        .from("ar_invoices")
        .update({
          customer_id: data.customer_id,
          invoice_number: data.invoice_number,
          invoice_date: data.invoice_date,
          due_date: data.due_date,
          total_amount: data.total_amount,
          tax_amount: data.tax_amount,
          balance: data.total_amount,
          notes: data.notes,
          bus_id: data.bus_id || null,
          bus_no: data.bus_no || null,
          bus_type: data.bus_type || null,
          bus_category_id: data.bus_category_id || null,
          bus_sub_category_id: data.bus_sub_category_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (headerError) throw headerError;

      await supabase.from("ar_invoice_lines").delete().eq("invoice_id", id);
      if (lines.length > 0) {
        const lineData = lines.map(l => ({
          invoice_id: id,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          line_total: l.line_total,
          tax_code: l.tax_code,
          account_id: l.account_id,
          company_id: effectiveCompanyId,
        }));
        const { error: linesError } = await supabase.from("ar_invoice_lines").insert(lineData);
        if (linesError) throw linesError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
      toast.success("AR Invoice updated successfully");
    },
    onError: (error) => toast.error(`Failed to update AR Invoice: ${error.message}`),
  });
};

// ============ Delete Journal Entry (Testing Mode) ============
export const useDeleteJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { reverseAndDeleteJournalEntry } = await import("@/lib/gl-posting-utils");
      const result = await reverseAndDeleteJournalEntry(id);
      if (!result.success) {
        throw new Error(result.error || "Failed to delete journal entry");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
      toast.success("Journal entry deleted and COA balances reversed");
    },
    onError: (error) => toast.error(`Failed to delete journal entry: ${error.message}`),
  });
};

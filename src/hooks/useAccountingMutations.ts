// Centralized mutations for all accounting modules
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============ Journal Entries ============
export const useCreateJournalEntry = () => {
  const queryClient = useQueryClient();
  
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
      // Create journal entry
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
        }])
        .select()
        .single();
      
      if (entryError) throw entryError;
      
      // Create journal entry lines
      const lines = entry.lines.map((line) => ({
        journal_entry_id: journalEntry.id,
        account_id: line.account_id,
        description: line.description || "",
        debit: line.debit_amount || 0,
        credit: line.credit_amount || 0,
        cost_center_id: line.cost_center_id,
      }));
      
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(lines);
      
      if (linesError) throw linesError;
      
      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      toast.success("Journal entry created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create journal entry: ${error.message}`);
    },
  });
};

export const usePostJournalEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entryId: string) => {
      // Get entry with lines
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
      
      // Update account balances
      for (const line of entry.journal_entry_lines) {
        const netAmount = (line.debit || 0) - (line.credit || 0);
        
        // Update directly
        const { data: account } = await supabase
          .from("chart_of_accounts")
          .select("current_balance, account_type")
          .eq("id", line.account_id)
          .single();
        
        if (account) {
          // For assets/expenses, debits increase; for liabilities/equity/revenue, credits increase
          const isDebitNormal = ["asset", "expense"].includes(account.account_type);
          const adjustment = isDebitNormal ? netAmount : -netAmount;
          
          await supabase
            .from("chart_of_accounts")
            .update({ current_balance: (account.current_balance || 0) + adjustment })
            .eq("id", line.account_id);
        }
      }
      
      // Update entry status
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
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
      toast.success("Journal entry posted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to post journal entry: ${error.message}`);
    },
  });
};

export const useApproveJournalEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ entryId, level }: { entryId: string; level: number }) => {
      const statusMap: Record<number, "draft" | "posted" | "void"> = {
        1: "draft",
        2: "posted",
      };
      
      const { error } = await supabase
        .from("journal_entries")
        .update({ 
          status: statusMap[level] || ("posted" as const),
          approved_at: new Date().toISOString(),
        })
        .eq("id", entryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      toast.success("Journal entry approved");
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });
};

// ============ AR Invoices ============
export const useCreateARInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invoice: {
      invoice_number: string;
      customer_id: string;
      invoice_date: string;
      due_date: string;
      total_amount: number;
      tax_amount?: number;
      notes?: string;
      lines?: Array<{
        description: string;
        quantity: number;
        unit_price: number;
        line_total: number;
        account_id?: string;
        tax_code?: string;
      }>;
    }) => {
      const { data, error } = await supabase
        .from("ar_invoices")
        .insert([{
          ...invoice,
          balance: invoice.total_amount,
          status: "unpaid",
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Create invoice lines if provided
      if (invoice.lines?.length) {
        const lines = invoice.lines.map(line => ({
          invoice_id: data.id,
          ...line,
        }));
        
        await supabase.from("ar_invoice_lines").insert(lines);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ar-summary"] });
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
      allocations?: Array<{
        invoice_id: string;
        allocated_amount: number;
      }>;
    }) => {
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
          status: "posted",
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Create allocations and update invoice balances
      if (receipt.allocations?.length) {
        for (const alloc of receipt.allocations) {
          await supabase.from("ar_receipt_allocations").insert([{
            receipt_id: data.id,
            invoice_id: alloc.invoice_id,
            allocated_amount: alloc.allocated_amount,
          }]);
          
          // Update invoice balance
          const { data: invoice } = await supabase
            .from("ar_invoices")
            .select("balance, total_amount, paid_amount")
            .eq("id", alloc.invoice_id)
            .single();
          
          if (invoice) {
            const newPaid = (invoice.paid_amount || 0) + alloc.allocated_amount;
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
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ar-summary"] });
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
  
  return useMutation({
    mutationFn: async (invoice: {
      invoice_number: string;
      vendor_id: string;
      invoice_date: string;
      due_date: string;
      total_amount: number;
      tax_amount?: number;
      wht_amount?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("ap_invoices")
        .insert([{
          ...invoice,
          balance: invoice.total_amount - (invoice.wht_amount || 0),
          status: "unpaid",
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ap-summary"] });
      toast.success("Vendor invoice recorded successfully");
    },
    onError: (error) => {
      toast.error(`Failed to record invoice: ${error.message}`);
    },
  });
};

// ============ AP Payments ============
export const useCreateAPPayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payment: {
      payment_number: string;
      vendor_id: string;
      payment_date: string;
      amount: number;
      payment_method: string;
      bank_account_id?: string;
      cheque_number?: string;
      reference?: string;
      notes?: string;
      allocations?: Array<{
        invoice_id: string;
        allocated_amount: number;
        wht_deducted?: number;
      }>;
    }) => {
      const { data, error } = await supabase
        .from("ap_payments")
        .insert([{
          payment_number: payment.payment_number,
          vendor_id: payment.vendor_id,
          payment_date: payment.payment_date,
          amount: payment.amount,
          payment_method: payment.payment_method,
          bank_account_id: payment.bank_account_id,
          cheque_number: payment.cheque_number,
          reference: payment.reference,
          notes: payment.notes,
          status: "posted",
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Create allocations and update invoice balances
      if (payment.allocations?.length) {
        for (const alloc of payment.allocations) {
          await supabase.from("ap_payment_allocations").insert([{
            payment_id: data.id,
            invoice_id: alloc.invoice_id,
            allocated_amount: alloc.allocated_amount,
            wht_deducted: alloc.wht_deducted || 0,
          }]);
          
          // Update invoice balance
          const { data: invoice } = await supabase
            .from("ap_invoices")
            .select("balance, total_amount, paid_amount")
            .eq("id", alloc.invoice_id)
            .single();
          
          if (invoice) {
            const totalPaid = alloc.allocated_amount + (alloc.wht_deducted || 0);
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
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-payments"] });
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ap-summary"] });
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
      const { data, error } = await supabase
        .from("bank_transactions")
        .insert([transaction])
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
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
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] });
      toast.success("Asset registered successfully");
    },
    onError: (error) => {
      toast.error(`Failed to register asset: ${error.message}`);
    },
  });
};

export const useRunDepreciation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (periodId: string) => {
      // Get all active assets
      const { data: assets, error: fetchError } = await supabase
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
      
      if (fetchError) throw fetchError;
      
      const schedules = [];
      
      for (const asset of assets || []) {
        if (!asset.asset_categories) continue;
        
        const monthlyDepreciation = 
          (asset.purchase_cost - (asset.salvage_value || 0)) / 
          ((asset.asset_categories.useful_life_years || 5) * 12);
        
        const newAccumulated = (asset.accumulated_depreciation || 0) + monthlyDepreciation;
        const newNetValue = asset.purchase_cost - newAccumulated;
        
        // Create depreciation schedule entry
        schedules.push({
          asset_id: asset.id,
          period_id: periodId,
          depreciation_date: new Date().toISOString().split("T")[0],
          depreciation_amount: monthlyDepreciation,
          accumulated_depreciation: newAccumulated,
          net_book_value: newNetValue,
          is_posted: false,
        });
        
        // Update asset values
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
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] });
      queryClient.invalidateQueries({ queryKey: ["depreciation-schedule"] });
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
  
  return useMutation({
    mutationFn: async (periodId: string) => {
      // Check for unposted journal entries
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
      queryClient.invalidateQueries({ queryKey: ["financial-periods"] });
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
      const { data, error } = await supabase
        .from("customers")
        .insert([customer])
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
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase
        .from("customers")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
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
      const { data, error } = await supabase
        .from("vendors")
        .insert([vendor])
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
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase
        .from("vendors")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
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
  return useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase.from("ar_credit_notes").insert([data]).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      toast.success("Credit note created");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ AP Debit Notes ============
export const useCreateAPDebitNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase.from("ap_debit_notes").insert([data]).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] });
      toast.success("Debit note created");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ AP Approvals ============
export const useApproveAPInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ap_invoices").update({ approval_status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] });
      toast.success("Invoice approved");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

export const useApproveAPPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ap_payments").update({ approval_status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-payments"] });
      toast.success("Payment approved");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Items & Inventory ============
export const useCreateItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase.from("items").insert([data]).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Item created");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

export const useCreateStockAdjustment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase.from("stock_adjustments").insert([data]).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["item-stock"] });
      toast.success("Stock adjusted");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Purchase Orders & GRN ============
export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const { lines, ...poData } = data;
      const { data: result, error } = await supabase.from("purchase_orders").insert([{ ...poData, status: "draft" }]).select().single();
      if (error) throw error;
      if (lines?.length) {
        await supabase.from("purchase_order_lines").insert(lines.map((l: any) => ({ ...l, purchase_order_id: result.id })));
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Purchase order created");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

export const useCreateGoodsReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const { lines, ...grnData } = data;
      const { data: result, error } = await supabase.from("goods_receipt_notes").insert([{ ...grnData, status: "received" }]).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goods-receipt-notes"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("GRN recorded");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

// ============ Recurring Entries ============
export const useCreateRecurringEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase.from("recurring_journal_entries").insert([data]).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-entries"] });
      toast.success("Recurring entry created");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

export const useRunRecurringEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_journal_entries").update({ last_run_date: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-entries"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      toast.success("Entry executed");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

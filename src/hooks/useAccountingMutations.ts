// Centralized mutations for all accounting modules
// All mutations inject company_id for multi-company data isolation
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";

// ============ Journal Entries ============
export const useCreateJournalEntry = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
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
          company_id: selectedCompanyId,
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
        company_id: selectedCompanyId,
      }));
      
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(lines);
      
      if (linesError) throw linesError;
      
      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries", selectedCompanyId] });
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
      queryClient.invalidateQueries({ queryKey: ["journal-entries", selectedCompanyId] });
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
  const { selectedCompanyId } = useCompany();
  
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
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { lines, ...headerData } = invoice;
      
      const { data, error } = await supabase
        .from("ar_invoices")
        .insert([{
          ...headerData,
          balance: invoice.total_amount,
          status: "unpaid",
          company_id: selectedCompanyId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      if (lines?.length) {
        const lineData = lines.map(line => ({
          invoice_id: data.id,
          ...line,
          company_id: selectedCompanyId,
        }));
        
        await supabase.from("ar_invoice_lines").insert(lineData);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar-invoices", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["ar-summary", selectedCompanyId] });
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
  const { selectedCompanyId } = useCompany();
  
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
      if (!selectedCompanyId) throw new Error("No company selected");
      
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
          company_id: selectedCompanyId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      if (receipt.allocations?.length) {
        for (const alloc of receipt.allocations) {
          await supabase.from("ar_receipt_allocations").insert([{
            receipt_id: data.id,
            invoice_id: alloc.invoice_id,
            allocated_amount: alloc.allocated_amount,
            company_id: selectedCompanyId,
          }]);
          
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
      queryClient.invalidateQueries({ queryKey: ["ar-receipts", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["ar-invoices", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["ar-summary", selectedCompanyId] });
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
  const { selectedCompanyId } = useCompany();
  
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
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data, error } = await supabase
        .from("ap_invoices")
        .insert([{
          ...invoice,
          balance: invoice.total_amount - (invoice.wht_amount || 0),
          status: "unpaid",
          company_id: selectedCompanyId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-invoices", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["ap-summary", selectedCompanyId] });
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
  const { selectedCompanyId } = useCompany();
  
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
      if (!selectedCompanyId) throw new Error("No company selected");
      
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
          company_id: selectedCompanyId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      if (payment.allocations?.length) {
        for (const alloc of payment.allocations) {
          await supabase.from("ap_payment_allocations").insert([{
            payment_id: data.id,
            invoice_id: alloc.invoice_id,
            allocated_amount: alloc.allocated_amount,
            wht_deducted: alloc.wht_deducted || 0,
            company_id: selectedCompanyId,
          }]);
          
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
      queryClient.invalidateQueries({ queryKey: ["ap-payments", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["ap-invoices", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["ap-summary", selectedCompanyId] });
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets", selectedCompanyId] });
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
  const { selectedCompanyId } = useCompany();
  
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
      
      const { data, error } = await supabase
        .from("customers")
        .insert([{
          ...customer,
          company_id: selectedCompanyId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", selectedCompanyId] });
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
  const { selectedCompanyId } = useCompany();
  
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
      
      const { data, error } = await supabase
        .from("vendors")
        .insert([{
          ...vendor,
          company_id: selectedCompanyId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors", selectedCompanyId] });
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
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ap_invoices").update({ approval_status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-invoices", selectedCompanyId] });
      toast.success("Invoice approved");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

export const useApproveAPPayment = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ap_payments").update({ approval_status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-payments", selectedCompanyId] });
      toast.success("Payment approved");
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

// ============ Recurring Entries ============
export const useCreateRecurringEntry = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (data: any) => {
      if (!selectedCompanyId) throw new Error("No company selected");
      
      const { data: result, error } = await supabase
        .from("recurring_journal_entries" as any)
        .insert([{ ...data, company_id: selectedCompanyId }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-entries", selectedCompanyId] });
      toast.success("Recurring entry created");
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });
};

export const useRunRecurringEntry = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_journal_entries" as any).update({ last_run_date: new Date().toISOString().split('T')[0] }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-entries", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries", selectedCompanyId] });
      toast.success("Entry executed");
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
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fund-transfers", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions", selectedCompanyId] });
      toast.success("Fund transfer completed");
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
      
      const { data: asset, error: assetError } = await supabase.from("fixed_assets").select("*").eq("id", data.asset_id).single();
      if (assetError) throw assetError;
      
      const nbv = asset.current_value || 0;
      const gainLoss = (data.disposal_value || 0) - nbv;
      
      const { data: result, error } = await supabase.from("asset_disposals").insert([{
        ...data,
        net_book_value: nbv,
        accumulated_depreciation: asset.accumulated_depreciation || 0,
        gain_loss: gainLoss,
        approval_status: "pending",
        company_id: selectedCompanyId,
      }]).select().single();
      if (error) throw error;
      
      await supabase.from("fixed_assets").update({ status: "disposed" }).eq("id", data.asset_id);
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-disposals", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["fixed-assets", selectedCompanyId] });
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
  const { selectedCompanyId } = useCompany();
  
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments", selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["items", selectedCompanyId] });
      toast.success("Stock adjustment approved");
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
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheque-register", selectedCompanyId] });
      toast.success("Cheque issued successfully");
    },
    onError: (error) => toast.error(`Failed to issue cheque: ${error.message}`),
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

// Company-aware mutation hooks for multi-company architecture
// These hooks automatically include company_id in all insert operations

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompanyOptional } from "@/contexts/CompanyContext";

// ============ Journal Entries ============
export const useCompanyCreateJournalEntry = () => {
  const queryClient = useQueryClient();
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;
  
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
      if (!companyId) {
        throw new Error("No company selected");
      }

      // Create journal entry with company_id
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
          company_id: companyId,
        }])
        .select()
        .single();
      
      if (entryError) throw entryError;
      
      // Create journal entry lines with company_id
      const lines = entry.lines.map((line) => ({
        journal_entry_id: journalEntry.id,
        account_id: line.account_id,
        description: line.description || "",
        debit: line.debit_amount || 0,
        credit: line.credit_amount || 0,
        cost_center_id: line.cost_center_id,
        company_id: companyId,
      }));
      
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(lines);
      
      if (linesError) throw linesError;
      
      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries", companyId] });
      toast.success("Journal entry created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create journal entry: ${error.message}`);
    },
  });
};

// ============ AR Invoices ============
export const useCompanyCreateARInvoice = () => {
  const queryClient = useQueryClient();
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;
  
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
      if (!companyId) {
        throw new Error("No company selected");
      }

      // Resolve effective company for consolidated GL
      const effectiveCompanyId = companyContext?.getEffectiveCompanyId?.() || companyId;
      const businessUnitCode = companyContext?.getBusinessUnitCode?.() || null;

      const { lines, ...headerData } = invoice;
      
      const { data, error } = await supabase
        .from("ar_invoices")
        .insert([{
          ...headerData,
          balance: invoice.total_amount,
          status: "unpaid",
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode,
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Create invoice lines if provided
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
        const { resolveCustomerARAccounts } = await import("@/hooks/useCustomerCategories");
        const resolved = await resolveCustomerARAccounts(invoice.customer_id, effectiveCompanyId);

        // Fetch tax_payable_account_id for VAT separation
        const { data: glSettings } = await (supabase as any)
          .from("gl_settings")
          .select("tax_payable_account_id")
          .eq("company_id", effectiveCompanyId)
          .maybeSingle();
        const taxPayableId = glSettings?.tax_payable_account_id || null;

        if (resolved.missingAccounts.length > 0 && invoice.total_amount > 0) {
          console.error("AR GL missing accounts:", resolved.missingAccounts);
          toast.error(`GL Config Missing: ${resolved.missingAccounts.join("; ")}. Configure in Settings → Core GL or Customer Categories.`, { duration: 8000 });
        }

        if (resolved.arAccountId && resolved.revenueAccountId && invoice.total_amount > 0) {
          const { postARInvoiceToGL } = await import("@/lib/gl-posting-utils");
          const taxAmount = invoice.tax_amount || 0;
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
          });
          if (glResult.success && glResult.journalEntryId) {
            await (supabase as any)
              .from("ar_invoices")
              .update({ journal_entry_id: glResult.journalEntryId })
              .eq("id", data.id);
          } else if (!glResult.success) {
            toast.error(`AR Invoice created but GL posting failed: ${glResult.error}`, { duration: 8000 });
          }
        }
      } catch (glError: any) {
        toast.error(`AR Invoice created but GL posting error: ${glError?.message || 'Unknown'}`, { duration: 8000 });
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar-invoices", companyId] });
      queryClient.invalidateQueries({ queryKey: ["ar-summary", companyId] });
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
export const useCompanyCreateARReceipt = () => {
  const queryClient = useQueryClient();
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;
  
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
      if (!companyId) {
        throw new Error("No company selected");
      }

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
          company_id: companyId,
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
            company_id: companyId,
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
      queryClient.invalidateQueries({ queryKey: ["ar-receipts", companyId] });
      queryClient.invalidateQueries({ queryKey: ["ar-invoices", companyId] });
      queryClient.invalidateQueries({ queryKey: ["ar-summary", companyId] });
      toast.success("Receipt recorded successfully");
    },
    onError: (error) => {
      toast.error(`Failed to record receipt: ${error.message}`);
    },
  });
};

// ============ AP Invoices ============
export const useCompanyCreateAPInvoice = () => {
  const queryClient = useQueryClient();
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;
  
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
      lines?: Array<{
        description: string;
        quantity?: number;
        unit_price: number;
        line_total: number;
        account_id?: string;
        tax_code?: string;
      }>;
    }) => {
      if (!companyId) {
        throw new Error("No company selected");
      }

      // Resolve effective company for consolidated GL
      const effectiveCompanyId = companyContext?.getEffectiveCompanyId?.() || companyId;
      const businessUnitCode = companyContext?.getBusinessUnitCode?.() || null;

      const { lines, ...headerData } = invoice;

      const { data, error } = await supabase
        .from("ap_invoices")
        .insert([{
          ...headerData,
          balance: invoice.total_amount - (invoice.wht_amount || 0),
          status: "unpaid",
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode,
        }])
        .select()
        .single();
      
      if (error) throw error;

      // Create invoice lines if provided
      if (lines?.length) {
        const lineData = lines.map(line => ({
          invoice_id: data.id,
          description: line.description,
          quantity: line.quantity || 1,
          unit_price: line.unit_price,
          line_total: line.line_total,
          account_id: line.account_id || null,
          tax_code: line.tax_code || null,
          company_id: effectiveCompanyId,
        }));
        await supabase.from("ap_invoice_lines").insert(lineData);
      }

      // ========== AUTO GL POSTING: DR Expense, CR Trade Payable ==========
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

          // Build per-line expense entries WITH tax amounts
          const expenseLines = (lines || []).map(line => ({
            accountId: line.account_id || defaultExpenseAccountId,
            amount: line.line_total || 0,
            taxAmount: (line as any).tax_amount || 0,
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
          });

          if (glResult.success && glResult.journalEntryId) {
            await (supabase as any)
              .from("ap_invoices")
              .update({ journal_entry_id: glResult.journalEntryId })
              .eq("id", data.id);
          } else if (!glResult.success) {
            toast.error(`AP Invoice created but GL posting failed: ${glResult.error}`, { duration: 8000 });
          }
        }
      } catch (glError: any) {
        toast.error(`AP Invoice created but GL posting error: ${glError?.message || 'Unknown'}`, { duration: 8000 });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ap-invoices", companyId] });
      queryClient.invalidateQueries({ queryKey: ["ap-summary", companyId] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success("Vendor invoice recorded successfully");
    },
    onError: (error) => {
      toast.error(`Failed to record invoice: ${error.message}`);
    },
  });
};

// ============ AP Payments ============
export const useCompanyCreateAPPayment = () => {
  const queryClient = useQueryClient();
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;
  
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
      if (!companyId) {
        throw new Error("No company selected");
      }

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
          company_id: companyId,
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
            company_id: companyId,
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
      queryClient.invalidateQueries({ queryKey: ["ap-payments", companyId] });
      queryClient.invalidateQueries({ queryKey: ["ap-invoices", companyId] });
      queryClient.invalidateQueries({ queryKey: ["ap-summary", companyId] });
      toast.success("Payment recorded successfully");
    },
    onError: (error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });
};

// ============ Customers ============
export const useCompanyCreateCustomer = () => {
  const queryClient = useQueryClient();
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;
  
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
      if (!companyId) {
        throw new Error("No company selected");
      }

      const { data, error } = await supabase
        .from("customers")
        .insert([{ ...customer, company_id: companyId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", companyId] });
      toast.success("Customer created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create customer: ${error.message}`);
    },
  });
};

// ============ Vendors ============
export const useCompanyCreateVendor = () => {
  const queryClient = useQueryClient();
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;
  
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
      if (!companyId) {
        throw new Error("No company selected");
      }

      const { data, error } = await supabase
        .from("vendors")
        .insert([{ ...vendor, company_id: companyId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors", companyId] });
      toast.success("Vendor created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create vendor: ${error.message}`);
    },
  });
};

// ============ Bank Accounts ============
export const useCompanyCreateBankAccount = () => {
  const queryClient = useQueryClient();
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;
  
  return useMutation({
    mutationFn: async (account: {
      account_code: string;
      account_name: string;
      account_number: string;
      bank_name: string;
      branch?: string;
      currency?: string;
      opening_balance?: number;
      gl_account_id?: string;
    }) => {
      if (!companyId) {
        throw new Error("No company selected");
      }

      const { data, error } = await supabase
        .from("bank_accounts")
        .insert([{ 
          ...account, 
          company_id: companyId,
          current_balance: account.opening_balance || 0,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", companyId] });
      toast.success("Bank account created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create bank account: ${error.message}`);
    },
  });
};

// ============ Fixed Assets ============
export const useCompanyCreateFixedAsset = () => {
  const queryClient = useQueryClient();
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;
  
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
      if (!companyId) {
        throw new Error("No company selected");
      }

      const { data, error } = await supabase
        .from("fixed_assets")
        .insert([{
          ...asset,
          current_value: asset.purchase_cost,
          accumulated_depreciation: 0,
          status: "active",
          company_id: companyId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets", companyId] });
      toast.success("Asset registered successfully");
    },
    onError: (error) => {
      toast.error(`Failed to register asset: ${error.message}`);
    },
  });
};

// ============ Chart of Accounts ============
// Note: company_id column added via migration - types will update after migration sync
export const useCompanyCreateAccount = () => {
  const queryClient = useQueryClient();
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;
  const effectiveCompanyId = companyContext?.getEffectiveCompanyId?.() || companyId;
  
  return useMutation({
    mutationFn: async (account: {
      account_code: string;
      account_name: string;
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense";
      parent_account_id?: string;
      is_header?: boolean;
      description?: string;
      // Level fields for 5-level COA structure
      level1?: string | null;
      level2?: string | null;
      level3?: string | null;
      level4?: string | null;
      level5?: string | null;
      account_level?: number;
      gl_code?: string;
    }) => {
      if (!effectiveCompanyId) {
        throw new Error("No company selected");
      }

      // Use raw insert to include company_id and level fields
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .insert([{ 
          account_code: account.account_code,
          account_name: account.account_name,
          account_type: account.account_type,
          parent_account_id: account.parent_account_id,
          is_header: account.is_header,
          description: account.description,
          is_active: true,
          current_balance: 0,
          company_id: effectiveCompanyId,
          // Level fields for tree structure
          level1: account.level1,
          level2: account.level2,
          level3: account.level3,
          level4: account.level4,
          level5: account.level5,
          account_level: account.account_level,
          gl_code: account.gl_code,
        } as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", effectiveCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts-all", effectiveCompanyId] });
      toast.success("Account created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create account: ${error.message}`);
    },
  });
};

// ============ Update Chart of Accounts ============
export const useCompanyUpdateAccount = () => {
  const queryClient = useQueryClient();
  const companyContext = useCompanyOptional();
  const companyId = companyContext?.selectedCompanyId;
  const effectiveCompanyId = companyContext?.getEffectiveCompanyId?.() || companyId;
  
  return useMutation({
    mutationFn: async (account: {
      id: string;
      account_code?: string;
      account_name?: string;
      account_type?: string;
      parent_account_id?: string | null;
      is_header?: boolean;
      is_active?: boolean;
      description?: string;
    }) => {
      if (!effectiveCompanyId) {
        throw new Error("No company selected");
      }

      const { id, ...updates } = account;
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .update(updates as any)
        .eq("id", id)
        .eq("company_id", effectiveCompanyId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", effectiveCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts-all", effectiveCompanyId] });
      toast.success("Account updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update account: ${error.message}`);
    },
  });
};

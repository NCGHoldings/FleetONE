import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { format } from "date-fns";

// Helper function to update COA balances after journal entry creation
// This follows proper double-entry bookkeeping rules:
// - Assets and Expenses are "debit normal" (debit increases balance)
// - Liabilities, Equity, and Revenue are "credit normal" (credit increases balance)
async function updateAccountBalancesFromJournalEntry(journalEntryId: string) {
  // Fetch journal entry lines with account information
  const { data: lines, error: linesError } = await supabase
    .from("journal_entry_lines")
    .select(`
      account_id,
      debit,
      credit
    `)
    .eq("journal_entry_id", journalEntryId);

  if (linesError) {
    console.error("Error fetching journal entry lines:", linesError);
    throw linesError;
  }

  if (!lines || lines.length === 0) return;

  // Update each account balance
  for (const line of lines) {
    if (!line.account_id) continue;

    // Fetch account type and current balance
    const { data: account, error: accountError } = await supabase
      .from("chart_of_accounts")
      .select("current_balance, account_type")
      .eq("id", line.account_id)
      .single();

    if (accountError || !account) {
      console.error("Error fetching account:", accountError);
      continue;
    }

    // Calculate net amount (debit - credit)
    const netAmount = (line.debit || 0) - (line.credit || 0);

    // Determine balance adjustment based on account type
    // Debit normal accounts: asset, expense
    // Credit normal accounts: liability, equity, revenue
    const isDebitNormal = ["asset", "expense"].includes(account.account_type || "");
    const adjustment = isDebitNormal ? netAmount : -netAmount;

    // Update account balance
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

export interface SchoolBusFinanceSettings {
  id: string;
  company_id: string;
  branch_id: string | null;
  trade_receivable_account_id: string | null;
  sbs_collection_account_id: string | null;
  bank_account_id: string | null;
  branch_gl_account_id: string | null; // Direct COA account mapping for branch payments
  cash_account_id: string | null;
  auto_post_invoices: boolean;
  auto_post_payments: boolean;
  invoice_prefix: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ARInvoiceBatch {
  id: string;
  company_id: string;
  branch_id: string | null;
  batch_number: string;
  invoice_month: string;
  total_students: number;
  total_amount: number;
  total_invoices: number;
  status: string;
  created_by: string | null;
  created_at: string;
  posted_at: string | null;
  journal_entry_id: string | null;
}

// Fetch finance settings for all branches
export function useSchoolBusFinanceSettings() {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["school-bus-finance-settings", selectedCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_bus_finance_settings")
        .select(`
          *,
          branch:school_branches(id, branch_name, branch_code),
          trade_receivable_account:chart_of_accounts!school_bus_finance_settings_trade_receivable_account_id_fkey(id, account_code, account_name),
          sbs_collection_account:chart_of_accounts!school_bus_finance_settings_sbs_collection_account_id_fkey(id, account_code, account_name),
          branch_gl_account:chart_of_accounts!school_bus_finance_settings_branch_gl_account_id_fkey(id, account_code, account_name),
          cash_account:chart_of_accounts!school_bus_finance_settings_cash_account_id_fkey(id, account_code, account_name)
        `)
        .eq("company_id", selectedCompanyId);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
}

// Get settings for a specific branch, falling back to default settings if not found
export function useBranchFinanceSettings(branchId: string | null) {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["school-bus-finance-settings", selectedCompanyId, branchId],
    queryFn: async () => {
      // First try to get branch-specific settings
      if (branchId) {
        const { data: branchSettings } = await supabase
          .from("school_bus_finance_settings")
          .select("*")
          .eq("company_id", selectedCompanyId)
          .eq("branch_id", branchId)
          .maybeSingle();

        if (branchSettings) {
          return branchSettings;
        }
      }

      // Fallback to default settings (branch_id is null)
      const { data: defaultSettings, error } = await supabase
        .from("school_bus_finance_settings")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .is("branch_id", null)
        .maybeSingle();

      if (error) throw error;
      return defaultSettings;
    },
    enabled: !!selectedCompanyId,
  });
}

// Update or create finance settings
export function useUpdateSchoolBusFinanceSettings() {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (settings: Partial<SchoolBusFinanceSettings> & { branch_id?: string | null }) => {
      const { data: existing } = await supabase
        .from("school_bus_finance_settings")
        .select("id")
        .eq("company_id", selectedCompanyId)
        .eq("branch_id", settings.branch_id ?? null)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("school_bus_finance_settings")
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("school_bus_finance_settings")
          .insert({
            ...settings,
            company_id: selectedCompanyId,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-bus-finance-settings"] });
      toast.success("Finance settings updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });
}

// Get ALL active students for bulk AR invoicing
export function useStudentsForBulkAR(branchId: string | null) {
  return useQuery({
    queryKey: ["students-bulk-ar", branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_students")
        .select("*")
        .eq("branch_id", branchId)
        .eq("is_active", true)
        .gt("current_amount_due", 0) // All students with amount due > 0
        .order("student_name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!branchId,
  });
}

// Generate bulk AR invoices
export function useGenerateBulkARInvoices() {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();

  return useMutation({
    mutationFn: async ({
      branchId,
      invoiceMonth,
      students,
      settings,
    }: {
      branchId: string;
      invoiceMonth: Date;
      students: Array<{
        id: string;
        student_name: string;
        payment_balance: number;
        current_amount_due: number;
        fixed_monthly_amount?: number;
      }>;
      settings: SchoolBusFinanceSettings;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get batch number
      const { data: batchData } = await supabase.rpc("generate_sbs_batch_number");
      const batchNumber = batchData || `SBS-BATCH-${format(new Date(), "yyyyMMdd")}-0001`;

      // Calculate totals using current_amount_due
      const totalAmount = students.reduce((sum, s) => sum + (s.current_amount_due || s.fixed_monthly_amount || 0), 0);

      // Create batch record
      const { data: batch, error: batchError } = await supabase
        .from("school_ar_invoice_batches")
        .insert({
          company_id: selectedCompanyId,
          branch_id: branchId,
          batch_number: batchNumber,
          invoice_month: format(invoiceMonth, "yyyy-MM-dd"),
          total_students: students.length,
          total_amount: totalAmount,
          total_invoices: students.length,
          status: "pending",
          created_by: user?.id,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Get branch info for customer naming
      const { data: branchData } = await supabase
        .from("school_branches")
        .select("branch_name, branch_code")
        .eq("id", branchId)
        .single();

      const branchCode = branchData?.branch_code || "SBS";
      const branchName = branchData?.branch_name || "School Bus";

      // Create individual school invoices
      const invoicePromises = students.map(async (student, index) => {
        const invoiceNumber = `${settings.invoice_prefix}-${format(invoiceMonth, "yyyyMM")}-${String(index + 1).padStart(5, "0")}`;
        const amount = student.current_amount_due || student.fixed_monthly_amount || 0;

        const { data, error } = await supabase
          .from("school_ar_invoices")
          .insert({
            batch_id: batch.id,
            student_id: student.id,
            invoice_number: invoiceNumber,
            invoice_month: format(invoiceMonth, "yyyy-MM-dd"),
            amount: amount,
            status: "pending",
            paid_amount: 0,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      });

      await Promise.all(invoicePromises);

      // If auto-post enabled, create journal entry AND link to Finance ERP AR
      if (settings.auto_post_invoices && settings.trade_receivable_account_id && settings.sbs_collection_account_id) {
        // Get or create a customer for this branch in Finance ERP
        let customerId: string | null = null;
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id")
          .eq("company_id", selectedCompanyId)
          .eq("customer_code", `SBS-${branchCode}`)
          .maybeSingle();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const { data: newCustomer, error: customerError } = await supabase
            .from("customers")
            .insert({
              company_id: selectedCompanyId,
              customer_code: `SBS-${branchCode}`,
              customer_name: `School Bus Students - ${branchName}`,
              is_active: true,
            })
            .select()
            .single();

          if (!customerError && newCustomer) {
            customerId = newCustomer.id;
          }
        }

        // Create Finance ERP AR Invoice (aggregated for the batch)
        let arInvoiceId: string | null = null;
        if (customerId) {
          const { data: arInvoice, error: arError } = await supabase
            .from("ar_invoices")
            .insert({
              company_id: selectedCompanyId,
              customer_id: customerId,
              invoice_number: batchNumber,
              invoice_date: format(new Date(), "yyyy-MM-dd"),
              due_date: format(new Date(new Date().setDate(new Date().getDate() + 30)), "yyyy-MM-dd"),
              total_amount: totalAmount,
              balance: totalAmount,
              status: "unpaid",
              reference: `School Bus Batch: ${batchNumber}`,
              notes: `Auto-generated from School Bus module for ${students.length} students`,
            })
            .select()
            .single();

          if (!arError && arInvoice) {
            arInvoiceId = arInvoice.id;
          }
        }

        const entryNumber = `SBS-JE-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        // Create journal entry
        const { data: journalEntry, error: jeError } = await supabase
          .from("journal_entries")
          .insert({
            entry_number: entryNumber,
            entry_date: format(new Date(), "yyyy-MM-dd"),
            description: `School Bus AR - Batch ${batchNumber} - ${format(invoiceMonth, "MMM yyyy")}`,
            reference: batchNumber,
            total_debit: totalAmount,
            total_credit: totalAmount,
            status: "posted",
            company_id: selectedCompanyId,
            posted_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (jeError) throw jeError;

        // Link AR Invoice to Journal Entry
        if (arInvoiceId) {
          await supabase
            .from("ar_invoices")
            .update({ journal_entry_id: journalEntry.id })
            .eq("id", arInvoiceId);
        }

        // Create journal entry lines
        const { error: linesError } = await supabase
          .from("journal_entry_lines")
          .insert([
            {
              journal_entry_id: journalEntry.id,
              account_id: settings.trade_receivable_account_id,
              description: `School Bus AR - ${students.length} students`,
              debit: totalAmount,
              credit: 0,
              company_id: selectedCompanyId,
            },
            {
              journal_entry_id: journalEntry.id,
              account_id: settings.sbs_collection_account_id,
              description: `School Bus Collection - ${format(invoiceMonth, "MMM yyyy")}`,
              debit: 0,
              credit: totalAmount,
              company_id: selectedCompanyId,
            },
          ]);

        if (linesError) throw linesError;

        // UPDATE COA BALANCES - Critical for proper accounting
        await updateAccountBalancesFromJournalEntry(journalEntry.id);

        // Update batch with journal entry ID
        await supabase
          .from("school_ar_invoice_batches")
          .update({
            status: "posted",
            posted_at: new Date().toISOString(),
            journal_entry_id: journalEntry.id,
          })
          .eq("id", batch.id);

        // Update individual school invoices status and link to AR invoice
        await supabase
          .from("school_ar_invoices")
          .update({ 
            status: "posted",
            ar_invoice_id: arInvoiceId,
          })
          .eq("batch_id", batch.id);
      }

      return batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-ar-batches"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["students-bulk-ar"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("AR invoices generated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to generate AR invoices: ${error.message}`);
    },
  });
}

// Post payment to GL
export function usePostPaymentToGL() {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();

  return useMutation({
    mutationFn: async ({
      paymentId,
      amount,
      branchId,
      studentName,
      paymentMethod,
      referenceNo,
    }: {
      paymentId: string;
      amount: number;
      branchId: string;
      studentName: string;
      paymentMethod: string;
      referenceNo?: string;
    }) => {
      // Get finance settings for this branch
      const { data: settings } = await supabase
        .from("school_bus_finance_settings")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .eq("branch_id", branchId)
        .maybeSingle();

      // Try default settings if no branch-specific settings
      let effectiveSettings = settings;
      if (!settings) {
        const { data: defaultSettings } = await supabase
          .from("school_bus_finance_settings")
          .select("*")
          .eq("company_id", selectedCompanyId)
          .is("branch_id", null)
          .maybeSingle();
        effectiveSettings = defaultSettings;
      }

      if (!effectiveSettings) {
        throw new Error("Finance settings not configured for this branch");
      }

      if (!effectiveSettings.trade_receivable_account_id) {
        throw new Error("Trade Receivables account not configured");
      }

      // Use branch_gl_account_id directly (from COA) instead of looking up from bank_accounts
      // Priority: branch_gl_account_id > cash_account_id
      const bankGLAccountId = effectiveSettings.branch_gl_account_id || effectiveSettings.cash_account_id;

      if (!bankGLAccountId) {
        throw new Error("Bank/Cash GL account not configured for this branch. Please configure in School Bus Finance Settings.");
      }

      // Create journal entry
      const entryNumber = `SBS-PAY-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: format(new Date(), "yyyy-MM-dd"),
          description: `School Bus Payment - ${studentName}`,
          reference: referenceNo || paymentId,
          total_debit: amount,
          total_credit: amount,
          status: "posted",
          company_id: selectedCompanyId,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // Create journal entry lines
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: bankGLAccountId,
            description: `Payment received - ${paymentMethod}`,
            debit: amount,
            credit: 0,
            company_id: selectedCompanyId,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: effectiveSettings.trade_receivable_account_id,
            description: `School Bus Payment - ${studentName}`,
            debit: 0,
            credit: amount,
            company_id: selectedCompanyId,
          },
        ]);

      if (linesError) throw linesError;

      // UPDATE COA BALANCES - Critical for proper accounting
      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      // Update payment record with GL info
      await supabase
        .from("school_payment_transactions")
        .update({
          gl_posted: true,
          journal_entry_id: journalEntry.id,
        })
        .eq("id", paymentId);

      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
      queryClient.invalidateQueries({ queryKey: ["school-students"] });
      queryClient.invalidateQueries({ queryKey: ["school-ar-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      toast.success("Payment posted to GL successfully");
    },
    onError: (error) => {
      console.error("GL posting error:", error);
      // Don't show error toast - payment was still recorded
    },
  });
}

// Fetch AR invoice batches
export function useARInvoiceBatches(branchId?: string) {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["school-ar-batches", selectedCompanyId, branchId],
    queryFn: async () => {
      let query = supabase
        .from("school_ar_invoice_batches")
        .select(`
          *,
          branch:school_branches(id, branch_name, branch_code),
          journal_entry:journal_entries(id, entry_number, status)
        `)
        .eq("company_id", selectedCompanyId)
        .order("created_at", { ascending: false });

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompanyId,
  });
}

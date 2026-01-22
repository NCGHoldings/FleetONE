import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { format } from "date-fns";

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

      // Create individual invoices
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
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      });

      await Promise.all(invoicePromises);

      // If auto-post enabled, create journal entry
      if (settings.auto_post_invoices && settings.trade_receivable_account_id && settings.sbs_collection_account_id) {
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

        // Update batch with journal entry ID
        await supabase
          .from("school_ar_invoice_batches")
          .update({
            status: "posted",
            posted_at: new Date().toISOString(),
            journal_entry_id: journalEntry.id,
          })
          .eq("id", batch.id);

        // Update individual invoices status
        await supabase
          .from("school_ar_invoices")
          .update({ status: "posted" })
          .eq("batch_id", batch.id);
      }

      return batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-ar-batches"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["students-bulk-ar"] });
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

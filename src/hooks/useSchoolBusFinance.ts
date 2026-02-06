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

// Helper to convert empty strings to null for UUID fields
function sanitizeSettingsForDB(settings: Record<string, any>): Record<string, any> {
  const uuidFields = [
    'trade_receivable_account_id',
    'sbs_collection_account_id',
    'bank_account_id',
    'branch_gl_account_id',
    'cash_account_id',
    'expense_account_id',
    'fuel_expense_account_id',
    'fuel_bank_account_id',
    'maintenance_expense_account_id',
    'salary_expense_account_id',
    'expense_cash_account_id',
    'branch_id',
  ];
  
  const sanitized = { ...settings };
  uuidFields.forEach(field => {
    if (sanitized[field] === '' || sanitized[field] === undefined) {
      sanitized[field] = null;
    }
  });
  
  return sanitized;
}

// Update or create finance settings
export function useUpdateSchoolBusFinanceSettings() {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (settings: Partial<SchoolBusFinanceSettings> & { branch_id?: string | null }) => {
      // Sanitize empty strings to null for UUID fields
      const sanitizedSettings = sanitizeSettingsForDB(settings);
      
      const { data: existing } = await supabase
        .from("school_bus_finance_settings")
        .select("id")
        .eq("company_id", selectedCompanyId)
        .is("branch_id", sanitizedSettings.branch_id ?? null)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("school_bus_finance_settings")
          .update({
            ...sanitizedSettings,
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
            ...sanitizedSettings,
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

// Helper to process students in chunks for performance
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Generate bulk AR invoices - creates INDIVIDUAL entries per student
export function useGenerateBulkARInvoices() {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode, isNCGHoldingOrSubCompany } = useCompany();
  
  // Use consolidated GL for NCG Holding hierarchy
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  return useMutation({
    mutationFn: async ({
      branchId,
      invoiceMonth,
      students,
      settings,
      onProgress,
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
      onProgress?: (processed: number, total: number) => void;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get batch number for tracking
      const { data: batchData } = await supabase.rpc("generate_sbs_batch_number");
      const batchNumber = batchData || `SBS-BATCH-${format(new Date(), "yyyyMMdd")}-0001`;

      // Calculate totals using current_amount_due
      const totalAmount = students.reduce((sum, s) => sum + (s.current_amount_due || s.fixed_monthly_amount || 0), 0);

      // Create batch record for tracking
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

      // Only proceed with finance integration if auto-post is enabled and accounts are configured
      if (!settings.auto_post_invoices || !settings.trade_receivable_account_id || !settings.sbs_collection_account_id) {
        // Create basic school invoices without finance integration
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
        return batch;
      }

      // Get or create a customer for this branch in Finance ERP
      let customerId: string | null = null;
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("company_id", effectiveCompanyId)
        .eq("customer_code", `SBS-${branchCode}`)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            company_id: effectiveCompanyId,
            business_unit_code: businessUnitCode || 'SBO',
            customer_code: `SBS-${branchCode}`,
            customer_name: `School Bus Students - ${branchName}`,
            is_active: true,
          } as any)
          .select()
          .single();

        if (!customerError && newCustomer) {
          customerId = newCustomer.id;
        }
      }

      // Process students in chunks for performance (50 at a time)
      const CHUNK_SIZE = 50;
      const chunks = chunkArray(students, CHUNK_SIZE);
      let processedCount = 0;

      for (const chunk of chunks) {
        // Process each chunk in parallel
        await Promise.all(chunk.map(async (student, indexInChunk) => {
          const globalIndex = processedCount + indexInChunk + 1;
          const amount = student.current_amount_due || student.fixed_monthly_amount || 0;
          
          // Generate unique identifiers for this student
          const studentShortId = student.id.substring(0, 4).toUpperCase();
          const invoiceNumber = `${settings.invoice_prefix}-${format(invoiceMonth, "yyyyMM")}-${String(globalIndex).padStart(5, "0")}`;
          const entryNumber = `SBS-JE-${format(new Date(), "yyyyMMdd")}-${studentShortId}`;
          
          // 1. Create individual Journal Entry for this student
          const { data: journalEntry, error: jeError } = await supabase
            .from("journal_entries")
            .insert({
              entry_number: entryNumber,
              entry_date: format(new Date(), "yyyy-MM-dd"),
              description: `School Bus AR - ${student.student_name}`,
              reference: invoiceNumber,
              total_debit: amount,
              total_credit: amount,
              status: "posted",
              company_id: effectiveCompanyId,
              business_unit_code: businessUnitCode || 'SBO',
              business_unit_id: selectedCompanyId,
              posted_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (jeError) {
            console.error(`JE error for ${student.student_name}:`, jeError);
            throw jeError;
          }

          // 2. Create journal entry lines for this student
          const { error: linesError } = await supabase
            .from("journal_entry_lines")
            .insert([
              {
                journal_entry_id: journalEntry.id,
                account_id: settings.trade_receivable_account_id,
                description: `AR - ${student.student_name} (${invoiceNumber})`,
                debit: amount,
                credit: 0,
                company_id: effectiveCompanyId,
              },
              {
                journal_entry_id: journalEntry.id,
                account_id: settings.sbs_collection_account_id,
                description: `Collection - ${student.student_name}`,
                debit: 0,
                credit: amount,
                company_id: effectiveCompanyId,
              },
            ]);

          if (linesError) {
            console.error(`JE lines error for ${student.student_name}:`, linesError);
            throw linesError;
          }

          // 3. Update COA balances for this entry
          await updateAccountBalancesFromJournalEntry(journalEntry.id);

          // 4. Create individual Finance ERP AR Invoice for this student
          let arInvoiceId: string | null = null;
          if (customerId) {
            const { data: arInvoice, error: arError } = await supabase
              .from("ar_invoices")
              .insert({
                company_id: effectiveCompanyId,
                business_unit_code: businessUnitCode || 'SBO',
                customer_id: customerId,
                invoice_number: invoiceNumber,
                invoice_date: format(new Date(), "yyyy-MM-dd"),
                due_date: format(new Date(new Date().setDate(new Date().getDate() + 30)), "yyyy-MM-dd"),
                total_amount: amount,
                balance: amount,
                paid_amount: 0,
                status: "unpaid",
                reference: `${student.student_name} - ${format(invoiceMonth, "MMM yyyy")}`,
                notes: `School Bus AR for ${student.student_name}`,
                journal_entry_id: journalEntry.id,
              } as any)
              .select()
              .single();

            if (!arError && arInvoice) {
              arInvoiceId = arInvoice.id;
            }
          }

          // 5. Create school invoice linked to Finance AR invoice and Journal Entry
          const { error: schoolInvError } = await supabase
            .from("school_ar_invoices")
            .insert({
              batch_id: batch.id,
              student_id: student.id,
              invoice_number: invoiceNumber,
              invoice_month: format(invoiceMonth, "yyyy-MM-dd"),
              amount: amount,
              status: "posted",
              paid_amount: 0,
              ar_invoice_id: arInvoiceId,
              journal_entry_id: journalEntry.id,
            });

          if (schoolInvError) {
            console.error(`School invoice error for ${student.student_name}:`, schoolInvError);
            throw schoolInvError;
          }
        }));

        // Update progress
        processedCount += chunk.length;
        onProgress?.(processedCount, students.length);
      }

      // Update batch status to posted
      await supabase
        .from("school_ar_invoice_batches")
        .update({
          status: "posted",
          posted_at: new Date().toISOString(),
        })
        .eq("id", batch.id);

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
      toast.success("Individual AR invoices generated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to generate AR invoices: ${error.message}`);
    },
  });
}

// Post payment to GL
export function usePostPaymentToGL() {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  
  // Use consolidated GL for NCG Holding hierarchy
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

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

      // Create journal entry - use CONSOLIDATED GL for NCG Holding hierarchy
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
          company_id: effectiveCompanyId, // Use NCG Holding for consolidated GL
          business_unit_code: businessUnitCode || 'SBO', // Tag with business unit
          business_unit_id: selectedCompanyId, // Original company for reference
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // Create journal entry lines - use consolidated company ID
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: bankGLAccountId,
            description: `Payment received - ${paymentMethod}`,
            debit: amount,
            credit: 0,
            company_id: effectiveCompanyId, // Use consolidated GL company
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: effectiveSettings.trade_receivable_account_id,
            description: `School Bus Payment - ${studentName}`,
            debit: 0,
            credit: amount,
            company_id: effectiveCompanyId, // Use consolidated GL company
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

// Check for orphaned school invoices without Finance AR link
export function useOrphanedSchoolInvoices() {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["orphaned-school-invoices", selectedCompanyId],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("school_ar_invoices")
        .select(`
          id,
          invoice_number,
          amount,
          paid_amount,
          status,
          ar_invoice_id,
          student:school_students(id, student_name, branch_id),
          batch:school_ar_invoice_batches!inner(company_id)
        `, { count: 'exact' })
        .is("ar_invoice_id", null)
        .in("status", ["posted", "partial", "paid"]);

      if (error) throw error;
      
      // Filter by company
      const filtered = data?.filter((inv: any) => 
        inv.batch?.company_id === selectedCompanyId
      ) || [];
      
      return {
        orphanedInvoices: filtered,
        totalOrphaned: filtered.length,
      };
    },
    enabled: !!selectedCompanyId,
  });
}

// Backfill missing AR Invoice links
export function useBackfillARInvoiceLinks() {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  return useMutation({
    mutationFn: async () => {
      // 1. Get default finance settings
      const { data: defaultSettings } = await supabase
        .from("school_bus_finance_settings")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .is("branch_id", null)
        .maybeSingle();

      if (!defaultSettings?.trade_receivable_account_id || !defaultSettings?.sbs_collection_account_id) {
        throw new Error("Please configure Trade Receivable and SBS Collection accounts in Finance Settings first");
      }

      // 2. Find orphaned school_ar_invoices without ar_invoice_id
      const { data: orphanedInvoices, error: fetchError } = await supabase
        .from("school_ar_invoices")
        .select(`
          id,
          invoice_number,
          invoice_month,
          amount,
          paid_amount,
          status,
          student:school_students(id, student_name, branch_id),
          batch:school_ar_invoice_batches!inner(company_id, branch_id)
        `)
        .is("ar_invoice_id", null)
        .in("status", ["posted", "partial", "paid"]);

      if (fetchError) throw fetchError;

      // Filter by company
      const toFix = orphanedInvoices?.filter((inv: any) => 
        inv.batch?.company_id === selectedCompanyId
      ) || [];

      if (toFix.length === 0) {
        return { fixed: 0, message: "All invoices are already linked to Finance AR" };
      }

      // 3. Get or create SBS customer in Finance
      let customerId: string | null = null;
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("company_id", effectiveCompanyId)
        .eq("customer_code", "SBS-DEFAULT")
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            company_id: effectiveCompanyId,
            business_unit_code: businessUnitCode || 'SBO',
            customer_code: "SBS-DEFAULT",
            customer_name: "School Bus Students (Backfill)",
            is_active: true,
          } as any)
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer?.id || null;
      }

      if (!customerId) {
        throw new Error("Failed to create Finance customer for SBS");
      }

      // 4. Create Finance AR Invoices for each orphaned school invoice
      let fixedCount = 0;
      for (const inv of toFix) {
        try {
          // Determine correct status based on payment
          let arStatus = "unpaid";
          if (inv.status === "paid") {
            arStatus = "paid";
          } else if ((inv.paid_amount || 0) > 0) {
            arStatus = "partial";
          }

          // Create Finance AR Invoice
          const { data: arInvoice, error: arError } = await supabase
            .from("ar_invoices")
            .insert({
              company_id: effectiveCompanyId,
              business_unit_code: businessUnitCode || 'SBO',
              customer_id: customerId,
              invoice_number: inv.invoice_number,
              invoice_date: inv.invoice_month,
              due_date: inv.invoice_month, // Same as invoice date for simplicity
              total_amount: inv.amount,
              balance: (inv.amount || 0) - (inv.paid_amount || 0),
              paid_amount: inv.paid_amount || 0,
              status: arStatus,
              reference: `Backfill: ${(inv.student as any)?.student_name || 'Unknown Student'}`,
              notes: `School Bus AR Invoice (backfilled)`,
            } as any)
            .select()
            .single();

          if (arError) {
            console.error(`Failed to create AR invoice for ${inv.invoice_number}:`, arError);
            continue;
          }

          // Link school invoice to Finance AR invoice
          const { error: updateError } = await supabase
            .from("school_ar_invoices")
            .update({ ar_invoice_id: arInvoice.id })
            .eq("id", inv.id);

          if (updateError) {
            console.error(`Failed to link invoice ${inv.invoice_number}:`, updateError);
            continue;
          }

          fixedCount++;
        } catch (err) {
          console.error(`Error processing invoice ${inv.invoice_number}:`, err);
        }
      }

      return { fixed: fixedCount, total: toFix.length, message: `Fixed ${fixedCount} of ${toFix.length} invoices` };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["orphaned-school-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["school-ar-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      toast.success(result.message);
    },
    onError: (error) => {
      toast.error(`Failed to backfill AR invoices: ${error.message}`);
    },
  });
}

// Sync payment to Finance AR manually (for invoices that had NULL ar_invoice_id)
export async function syncPaymentToFinanceAR(
  schoolInvoiceId: string,
  paidAmount: number,
  totalAmount: number,
  effectiveCompanyId: string,
  businessUnitCode: string | null,
  customerId: string
): Promise<string | null> {
  // First check if ar_invoice_id already exists
  const { data: schoolInv } = await supabase
    .from("school_ar_invoices")
    .select("ar_invoice_id, invoice_number, invoice_month, student:school_students(student_name)")
    .eq("id", schoolInvoiceId)
    .single();

  if (!schoolInv) return null;

  // If ar_invoice_id exists, update it
  if (schoolInv.ar_invoice_id) {
    const balance = totalAmount - paidAmount;
    const status = balance <= 0 ? "paid" : paidAmount > 0 ? "partial" : "unpaid";
    
    await supabase
      .from("ar_invoices")
      .update({
        paid_amount: paidAmount,
        balance: balance,
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", schoolInv.ar_invoice_id);

    return schoolInv.ar_invoice_id;
  }

  // Create new AR invoice if missing
  const arStatus = paidAmount >= totalAmount ? "paid" : paidAmount > 0 ? "partial" : "unpaid";
  
  const { data: arInvoice, error } = await supabase
    .from("ar_invoices")
    .insert({
      company_id: effectiveCompanyId,
      business_unit_code: businessUnitCode || 'SBO',
      customer_id: customerId,
      invoice_number: schoolInv.invoice_number,
      invoice_date: schoolInv.invoice_month,
      due_date: schoolInv.invoice_month,
      total_amount: totalAmount,
      balance: totalAmount - paidAmount,
      paid_amount: paidAmount,
      status: arStatus,
      reference: `${(schoolInv.student as any)?.student_name || 'Student'}`,
      notes: `School Bus AR Invoice (auto-linked on payment)`,
    } as any)
    .select()
    .single();

  if (error) {
    console.error("Failed to create Finance AR invoice:", error);
    return null;
  }

  // Link back to school invoice
  await supabase
    .from("school_ar_invoices")
    .update({ ar_invoice_id: arInvoice.id })
    .eq("id", schoolInvoiceId);

  return arInvoice.id;
}

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
  advance_payments_liability_account_id: string | null; // Liability COA for student overpayments
  auto_post_invoices: boolean;
  auto_post_payments: boolean;
  invoice_prefix: string;
  billing_percentage: number; // Default monthly charge percentage (e.g., 80 = charge 80% of fixed amount)
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

// Validate that the COA accounts referenced by a settings row belong to the
// effective (active/consolidated) company. Returns the IDs of any accounts
// that belong to a *different* company so callers can fail loudly instead of
// silently posting JE lines into the wrong company's COA.
export async function validateGLAccountsBelongToCompany(
  settings: { trade_receivable_account_id?: string | null; sbs_collection_account_id?: string | null; advance_payments_liability_account_id?: string | null } | null | undefined,
  effectiveCompanyId: string,
): Promise<{ ok: boolean; mismatched: Array<{ id: string; account_code: string; company_id: string }> }> {
  if (!settings) return { ok: false, mismatched: [] };
  const ids = [
    settings.trade_receivable_account_id,
    settings.sbs_collection_account_id,
    settings.advance_payments_liability_account_id,
  ].filter((x): x is string => !!x);
  if (ids.length === 0) return { ok: false, mismatched: [] };

  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("id, account_code, company_id")
    .in("id", ids);
  if (error) throw error;

  const mismatched = (data || []).filter((a) => a.company_id !== effectiveCompanyId);
  return { ok: mismatched.length === 0, mismatched };
}

// Get settings for a specific branch, falling back to default settings if not found.
// IMPORTANT: any cross-company fallback is only honoured when the COA accounts on
// that fallback row also belong to the active (effective) company. Otherwise we
// would happily post JE lines into another company's COA — which is exactly the
// Katunayaka bug that left invoices invisible and balances unupdated.
export function useBranchFinanceSettings(branchId: string | null) {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["school-bus-finance-settings", selectedCompanyId, effectiveCompanyId, branchId],
    queryFn: async () => {
      const hasConfiguredAccounts = (s: any) =>
        s && s.trade_receivable_account_id && s.sbs_collection_account_id;

      const accountsBelongToEffectiveCompany = async (s: any) => {
        if (!s) return false;
        const v = await validateGLAccountsBelongToCompany(s, effectiveCompanyId);
        return v.ok;
      };

      // First try to get branch-specific settings for selected company
      if (branchId) {
        const { data: branchSettings } = await supabase
          .from("school_bus_finance_settings")
          .select("*")
          .eq("company_id", selectedCompanyId)
          .eq("branch_id", branchId)
          .maybeSingle();

        if (hasConfiguredAccounts(branchSettings) && (await accountsBelongToEffectiveCompany(branchSettings))) {
          return branchSettings;
        }

        // Fallback: search across ALL companies for this branch with configured accounts,
        // but only accept rows whose COA accounts belong to the EFFECTIVE company.
        const { data: crossCandidates } = await supabase
          .from("school_bus_finance_settings")
          .select("*")
          .eq("branch_id", branchId)
          .not("trade_receivable_account_id", "is", null)
          .not("sbs_collection_account_id", "is", null);

        for (const candidate of crossCandidates || []) {
          if (await accountsBelongToEffectiveCompany(candidate)) {
            return candidate;
          }
        }
      }

      // Fallback to default settings (branch_id is null) for selected company
      const { data: defaultSettings } = await supabase
        .from("school_bus_finance_settings")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .is("branch_id", null)
        .maybeSingle();

      if (hasConfiguredAccounts(defaultSettings) && (await accountsBelongToEffectiveCompany(defaultSettings))) {
        return defaultSettings;
      }

      // Final fallback: any default settings with COA accounts that belong to
      // the effective company.
      const { data: anyDefaults, error } = await supabase
        .from("school_bus_finance_settings")
        .select("*")
        .is("branch_id", null)
        .not("trade_receivable_account_id", "is", null)
        .not("sbs_collection_account_id", "is", null);

      if (error) throw error;
      for (const candidate of anyDefaults || []) {
        if (await accountsBelongToEffectiveCompany(candidate)) {
          return candidate;
        }
      }

      return defaultSettings ?? null;
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
    'advance_payments_liability_account_id',
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

// RPC-based helper to update advance_payments_liability_account_id
// This bypasses PostgREST schema cache validation entirely because RPC calls
// go directly to a database function, not through PostgREST's table column routing
async function patchLiabilityAccount(settingId: string, liabilityAccountId: string | null): Promise<void> {
  console.log('[patchLiabilityAccount] START - settingId:', settingId, 'liabilityAccountId:', liabilityAccountId);
  try {
    const { data, error } = await supabase.rpc('update_liability_account_setting' as any, {
      p_setting_id: settingId,
      p_account_id: liabilityAccountId,
    });
    console.log('[patchLiabilityAccount] RPC response - data:', data, 'error:', error);
    if (error) {
      console.error('[patchLiabilityAccount] RPC FAILED:', error.message, error.details, error.hint);
    } else {
      console.log('[patchLiabilityAccount] SUCCESS - liability account saved via RPC');
    }
  } catch (e) {
    console.error('[patchLiabilityAccount] EXCEPTION:', e);
  }
}

// Update or create finance settings
export function useUpdateSchoolBusFinanceSettings() {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (settings: Partial<SchoolBusFinanceSettings> & { branch_id?: string | null }) => {
      // Sanitize empty strings to null for UUID fields
      const sanitizedSettings = sanitizeSettingsForDB(settings);

      // Use .limit(1).order() instead of .maybeSingle() to avoid errors when
      // duplicate rows exist (maybeSingle throws on multiple matches, causing 
      // INSERT of a new row instead of UPDATE — this created 19+ duplicate rows)
      const branchId = sanitizedSettings.branch_id ?? null;
      let existingQuery = supabase
        .from("school_bus_finance_settings")
        .select("id")
        .eq("company_id", selectedCompanyId)
        .order("created_at", { ascending: true })
        .limit(1);
      
      if (branchId === null) {
        existingQuery = existingQuery.is("branch_id", null);
      } else {
        existingQuery = existingQuery.eq("branch_id", branchId);
      }
      
      const { data: existingRows } = await existingQuery;
      const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

      // Always strip advance_payments_liability_account_id from PostgREST calls
      // PostgREST silently drops this field if its schema cache hasn't reloaded
      // We save it separately via RPC which bypasses PostgREST entirely
      const { advance_payments_liability_account_id: liabilityVal, ...settingsForPostgREST } = sanitizedSettings;

      if (existing) {
        const { data, error } = await supabase
          .from("school_bus_finance_settings")
          .update({
            ...settingsForPostgREST,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;

        // Always save liability account via RPC (bypasses PostgREST schema cache)
        if (liabilityVal !== undefined) {
          await patchLiabilityAccount(existing.id, liabilityVal);
        }

        return data;
      } else {
        const { data, error } = await supabase
          .from("school_bus_finance_settings")
          .insert({
            ...settingsForPostgREST,
            company_id: selectedCompanyId,
          } as any)
          .select()
          .single();

        if (error) throw error;

        // Always save liability account via RPC for new records too
        if (liabilityVal !== undefined && data?.id) {
          await patchLiabilityAccount(data.id, liabilityVal);
        }

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
        // .gt("current_amount_due", 0) // REMOVED: We need to bill all active students, even if balance is 0
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
      billingPercentage,
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
        bus_reg_no?: string | null;
      }>;
      settings: SchoolBusFinanceSettings;
      billingPercentage?: number;
      onProgress?: (processed: number, total: number) => void;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // ── Duplicate guard: check if batch already exists for this branch + month ──
      const monthStr = format(invoiceMonth, "yyyy-MM-dd");
      const { data: existingBatch } = await supabase
        .from("school_ar_invoice_batches")
        .select("id, batch_number, status")
        .eq("branch_id", branchId)
        .eq("invoice_month", monthStr)
        .maybeSingle();

      if (existingBatch) {
        throw new Error(
          `Invoices already generated for ${format(invoiceMonth, "MMMM yyyy")} (Batch: ${existingBatch.batch_number}). Please delete the existing batch before regenerating.`
        );
      }

      // Get batch number for tracking
      const { data: batchData } = await supabase.rpc("generate_sbs_batch_number");
      const batchNumber = batchData || `SBS-BATCH-${format(new Date(), "yyyyMMdd")}-0001`;

      // Fetch buses to map category_id and bus_id
      const { data: buses } = await supabase.from("buses").select("id, bus_no, category_id");
      const busMap = new Map();
      buses?.forEach(b => {
        if (b.bus_no) {
          busMap.set(b.bus_no, { id: b.id, category_id: b.category_id });
        }
      });

      // Calculate totals using billing percentage
      const effectivePercentage = billingPercentage ?? settings.billing_percentage ?? 80;
      const totalAmount = students.reduce((sum, s) => {
        const fixedAmount = s.fixed_monthly_amount || 0;
        const chargeAmount = fixedAmount * (effectivePercentage / 100);
        const outstanding = Math.abs(Math.min(s.payment_balance || 0, 0));
        const credit = s.payment_balance > 0 ? s.payment_balance : 0;
        return sum + Math.max(0, chargeAmount + outstanding - credit);
      }, 0);

      // Create batch record for tracking
      // Use selectedCompanyId for the operational batch row, but if user selected a
      // parent company directly (e.g. NCG Holding/NCG Test), fall back to the
      // canonical School Bus Operations sub-company so batches don't land on the parent.
      const NCG_HOLDING = 'a0000000-0000-0000-0000-000000000001';
      const NCG_TEST = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020';
      const SCHOOL_BUS_OPS_LIVE = 'a0000000-0000-0000-0000-000000000002';
      const SCHOOL_BUS_OPS_TEST = '0fba4a2f-598b-47e8-b863-283d00380b06';
      const batchCompanyId =
        selectedCompanyId === NCG_HOLDING ? SCHOOL_BUS_OPS_LIVE :
        selectedCompanyId === NCG_TEST ? SCHOOL_BUS_OPS_TEST :
        selectedCompanyId;

      const { data: batch, error: batchError } = await supabase
        .from("school_ar_invoice_batches")
        .insert({
          company_id: batchCompanyId,
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

      // --- FIX: Get max invoice number for this prefix to avoid collisions across different branches ---
      const invoicePrefixMatch = `${settings.invoice_prefix}-${format(invoiceMonth, "yyyyMM")}`;
      const { data: maxInvData } = await supabase
        .from("school_ar_invoices")
        .select("invoice_number")
        .ilike("invoice_number", `${invoicePrefixMatch}-%`)
        .order("invoice_number", { ascending: false })
        .limit(1);

      let startInvoiceCounter = 1;
      if (maxInvData && maxInvData.length > 0) {
        const match = maxInvData[0].invoice_number.match(/-(\d+)$/);
        if (match) {
          startInvoiceCounter = parseInt(match[1], 10) + 1;
        }
      }
      // ------------------------------------------------------------------------------------------------

      // Only proceed with finance integration if auto-post is enabled and accounts are configured
      if (!settings.auto_post_invoices || !settings.trade_receivable_account_id || !settings.sbs_collection_account_id) {
        // Create basic school invoices without finance integration
        const invoicePromises = students.map(async (student, index) => {
          const invoiceNumber = `${settings.invoice_prefix}-${format(invoiceMonth, "yyyyMM")}-${String(startInvoiceCounter + index).padStart(5, "0")}`;
          // Net of existing credit balance
          // Apply billing percentage to fixed amount, then add outstanding
          const fixedAmount = student.fixed_monthly_amount || 0;
          const amount = Math.max(0, fixedAmount * (effectivePercentage / 100));

          const advanceApplyAmount = Math.max(0, Math.min(student.payment_balance || 0, amount));
          const status = advanceApplyAmount >= amount ? "paid" : advanceApplyAmount > 0 ? "partial" : "posted";

          const { data, error } = await supabase
            .from("school_ar_invoices")
            .insert({
              batch_id: batch.id,
              student_id: student.id,
              invoice_number: invoiceNumber,
              invoice_month: format(invoiceMonth, "yyyy-MM-dd"),
              amount: amount,
              status: status,
              paid_amount: advanceApplyAmount,
            })
            .select()
            .single();

          if (error) throw error;
          
          // CRITICAL: Update the student's actual balance and amount due mathematically safely
          const updatedPaymentBalance = (student.payment_balance || 0) - amount;
          
          await supabase
            .from("school_students")
            .update({
              current_amount_due: Math.max(0, -updatedPaymentBalance),
              payment_balance: updatedPaymentBalance
            })
            .eq("id", student.id);

          return data;
        });

        await Promise.all(invoicePromises);
        return batch;
      }

      // ── Validate the COA accounts on the settings actually belong to the
      //    effective company. If they don't, refuse to post — otherwise we
      //    silently write JE lines into another company's COA (the bug that
      //    caused 33 Katunayaka invoices to vanish on 2026-04-21).
      const accountValidation = await validateGLAccountsBelongToCompany(settings, effectiveCompanyId);
      if (!accountValidation.ok) {
        const codes = accountValidation.mismatched.map((a) => a.account_code).join(", ");
        throw new Error(
          `Cannot post AR for ${branchName}: GL accounts (${codes}) belong to a different company. ` +
          `Open Settings → School Bus Finance → ${branchName} and re-pick the Trade Receivable / Sales / Advance accounts under the active company.`,
        );
      }

      // ── Get or create the per-branch customer in Finance ERP.
      // customers.customer_code has a GLOBAL UNIQUE constraint, so we search
      // by (business_unit_code, customer_code) regardless of company first
      // and migrate the row to the effective company if it lives elsewhere.
      // Throws on failure instead of silently nulling customerId — that was
      // the silent-skip that hid 33 invoices.
      let customerId: string | null = null;
      const customerCode = `SBS-${branchCode}`;
      const { data: anyExisting, error: lookupErr } = await supabase
        .from("customers")
        .select("id, company_id")
        .eq("business_unit_code", "SBO")
        .eq("customer_code", customerCode)
        .maybeSingle();
      if (lookupErr) throw lookupErr;

      if (anyExisting) {
        customerId = anyExisting.id;
        if (anyExisting.company_id !== effectiveCompanyId) {
          // One-shot migration so the customer lines up with the active company's
          // AR ledger. Safe because customer_code is the global natural key.
          // CRITICAL: verify the row actually moved — RLS can silently no-op the
          // UPDATE when the existing row is on a different tenant. That was the
          // root cause of the 197 Nuwara Eliya invoices missing from AR on
          // 2026-04-21: customer SBS-NUW lived on NCG Test, the user was on
          // NCG Holding, the UPDATE returned no error AND no rows changed.
          const { data: migrated, error: migrateErr } = await supabase
            .from("customers")
            .update({ company_id: effectiveCompanyId })
            .eq("id", anyExisting.id)
            .select("id, company_id");
          if (migrateErr) throw migrateErr;
          if (!migrated || migrated.length === 0 || migrated[0].company_id !== effectiveCompanyId) {
            throw new Error(
              `Cannot post AR for ${branchName}: customer ${customerCode} exists on a different company and could not be migrated (tenant access blocked). ` +
              `Ask an admin to run: UPDATE customers SET company_id = '${effectiveCompanyId}' WHERE customer_code = '${customerCode}';`
            );
          }
        }
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            company_id: effectiveCompanyId,
            business_unit_code: "SBO",
            customer_code: customerCode,
            customer_name: `School Bus Students - ${branchName}`,
            is_active: true,
          } as any)
          .select()
          .single();

        if (customerError || !newCustomer) {
          throw new Error(
            `Customer setup failed for ${branchName} (${customerCode}): ${customerError?.message || "unknown error"}`,
          );
        }
        customerId = newCustomer.id;
      }

      // Process students in chunks for performance (50 at a time)
      const CHUNK_SIZE = 50;
      const chunks = chunkArray(students, CHUNK_SIZE);
      let processedCount = 0;

      for (const chunk of chunks) {
        // Process each chunk in parallel
        await Promise.all(chunk.map(async (student, indexInChunk) => {
          // Use the startInvoiceCounter so that numbers don't collide across branches
          const invoiceCounter = startInvoiceCounter + processedCount + indexInChunk;
          
          // Net of existing credit balance
          // Apply billing percentage to fixed amount, then add outstanding
          const fixedAmount = student.fixed_monthly_amount || 0;
          const amount = Math.max(0, fixedAmount * (effectivePercentage / 100));
          
          // Generate unique identifiers for this student
          const randSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
          const invoiceNumber = `${settings.invoice_prefix}-${format(invoiceMonth, "yyyyMM")}-${String(invoiceCounter).padStart(5, "0")}`;
          const entryNumber = `SBS-JE-${format(new Date(), "yyyyMM")}-${randSuffix}-${student.id.substring(0, 4).toUpperCase()}`;
          
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
              business_unit_code: 'SBO',
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

          // 3b. Auto-apply student advance balance if they have credit (payment_balance > 0)
          // This creates: DR Advance Payments Liability / CR Trade Receivables
          const liabilityAccountId = settings.advance_payments_liability_account_id;
          const advanceApplyAmount = Math.max(0, Math.min(student.payment_balance || 0, amount));
          
          if (liabilityAccountId && advanceApplyAmount > 0) {
            const advRand = Math.random().toString(36).substring(2, 8).toUpperCase();
            const advanceEntryNumber = `SBS-ADV-${format(new Date(), "yyyyMM")}-${advRand}`;

            const { data: advanceJE, error: advJEError } = await supabase
              .from("journal_entries")
              .insert({
                entry_number: advanceEntryNumber,
                entry_date: format(new Date(), "yyyy-MM-dd"),
                description: `Advance balance applied - ${student.student_name}`,
                reference: invoiceNumber,
                total_debit: advanceApplyAmount,
                total_credit: advanceApplyAmount,
                status: "posted",
                company_id: effectiveCompanyId,
                business_unit_code: 'SBO',
                business_unit_id: selectedCompanyId,
                posted_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (!advJEError && advanceJE) {
              await supabase
                .from("journal_entry_lines")
                .insert([
                  {
                    journal_entry_id: advanceJE.id,
                    account_id: liabilityAccountId,
                    description: `Advance applied - ${student.student_name}`,
                    debit: advanceApplyAmount,
                    credit: 0,
                    company_id: effectiveCompanyId,
                  },
                  {
                    journal_entry_id: advanceJE.id,
                    account_id: settings.trade_receivable_account_id,
                    description: `Advance settled against invoice - ${student.student_name}`,
                    debit: 0,
                    credit: advanceApplyAmount,
                    company_id: effectiveCompanyId,
                  },
                ]);

              await updateAccountBalancesFromJournalEntry(advanceJE.id);
            }
          }
          // 4. Create individual Finance ERP AR Invoice for this student
          let arInvoiceId: string | null = null;
          if (customerId) {
            const netBalanceRemaining = amount - advanceApplyAmount;
            const arStatus = advanceApplyAmount >= amount ? "paid" : advanceApplyAmount > 0 ? "partial" : "unpaid";

            const { data: arInvoice, error: arError } = await supabase
              .from("ar_invoices")
              .insert({
                company_id: effectiveCompanyId,
                business_unit_code: 'SBO',
                customer_id: customerId,
                invoice_number: invoiceNumber,
                invoice_date: format(new Date(), "yyyy-MM-dd"),
                due_date: format(new Date(new Date().setDate(new Date().getDate() + 30)), "yyyy-MM-dd"),
                total_amount: amount,
                balance: netBalanceRemaining,
                paid_amount: advanceApplyAmount,
                status: arStatus,
                reference: `${student.student_name} - ${format(invoiceMonth, "MMM yyyy")}`,
                notes: `School Bus AR for ${student.student_name}`,
                journal_entry_id: journalEntry.id,
                bus_no: student.bus_reg_no || null,
                bus_id: student.bus_reg_no ? busMap.get(student.bus_reg_no)?.id || null : null,
                bus_category_id: student.bus_reg_no ? busMap.get(student.bus_reg_no)?.category_id || null : null,
              } as any)
              .select()
              .single();

            if (arError || !arInvoice) {
              // Fail loudly — silent failure here is what made 33 invoices vanish.
              throw new Error(
                `Finance AR invoice creation failed for ${student.student_name} (${invoiceNumber}): ${arError?.message || 'unknown error'}`,
              );
            }
            arInvoiceId = arInvoice.id;
          }

          // 5. Create school invoice linked to Finance AR invoice and Journal Entry
          const status = advanceApplyAmount >= amount ? "paid" : advanceApplyAmount > 0 ? "partial" : "posted";
          
          const { error: schoolInvError } = await supabase
            .from("school_ar_invoices")
            .insert({
              batch_id: batch.id,
              student_id: student.id,
              invoice_number: invoiceNumber,
              invoice_month: format(invoiceMonth, "yyyy-MM-dd"),
              amount: amount,
              status: status,
              paid_amount: advanceApplyAmount,
              ar_invoice_id: arInvoiceId,
              journal_entry_id: journalEntry.id,
            });

          if (schoolInvError) {
            console.error(`School invoice error for ${student.student_name}:`, schoolInvError);
            throw schoolInvError;
          }
          
          // CRITICAL: Update the student's actual balance and amount due mathematically safely
          const updatedPaymentBalance = (student.payment_balance || 0) - amount;

          await supabase
            .from("school_students")
            .update({
              current_amount_due: Math.max(0, -updatedPaymentBalance),
              payment_balance: updatedPaymentBalance
            })
            .eq("id", student.id);
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

// ─────────────────────────────────────────────────────────────────────────────
// Drift detection + self-heal: count school invoices that have a JE but no AR,
// and let an admin repair them in-place for the active company + branch + month.
// ─────────────────────────────────────────────────────────────────────────────

export function useOrphanARCount(branchId: string | null, invoiceMonth: Date | null) {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["sbo-orphan-ar-count", effectiveCompanyId, branchId, invoiceMonth?.toISOString().slice(0, 7)],
    queryFn: async () => {
      if (!branchId || !invoiceMonth || !effectiveCompanyId) return 0;
      const monthStart = format(new Date(invoiceMonth.getFullYear(), invoiceMonth.getMonth(), 1), "yyyy-MM-dd");
      const monthEnd = format(new Date(invoiceMonth.getFullYear(), invoiceMonth.getMonth() + 1, 0), "yyyy-MM-dd");

      const { count } = await supabase
        .from("school_ar_invoices")
        .select("id, school_students!inner(branch_id)", { count: "exact", head: true })
        .eq("school_students.branch_id", branchId)
        .gte("invoice_month", monthStart)
        .lte("invoice_month", monthEnd)
        .is("ar_invoice_id", null)
        .not("journal_entry_id", "is", null);

      return count || 0;
    },
    enabled: !!branchId && !!invoiceMonth && !!effectiveCompanyId,
  });
}

export function useRepairOrphanARs() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useMutation({
    mutationFn: async ({ branchId, invoiceMonth }: { branchId: string; invoiceMonth: Date }) => {
      if (!effectiveCompanyId) throw new Error("No active company");

      const monthStart = format(new Date(invoiceMonth.getFullYear(), invoiceMonth.getMonth(), 1), "yyyy-MM-dd");
      const monthEnd = format(new Date(invoiceMonth.getFullYear(), invoiceMonth.getMonth() + 1, 0), "yyyy-MM-dd");

      const { data: branch, error: brErr } = await supabase
        .from("school_branches")
        .select("id, branch_name, branch_code")
        .eq("id", branchId)
        .single();
      if (brErr || !branch) throw brErr || new Error("Branch not found");
      const customerCode = `SBS-${branch.branch_code}`;

      const { data: customer } = await supabase
        .from("customers")
        .select("id, company_id")
        .eq("customer_code", customerCode)
        .eq("business_unit_code", "SBO")
        .maybeSingle();

      let customerId = customer?.id || null;
      if (!customerId) {
        const { data: newC, error: cErr } = await supabase
          .from("customers")
          .insert({
            company_id: effectiveCompanyId,
            business_unit_code: "SBO",
            customer_code: customerCode,
            customer_name: `School Bus Students - ${branch.branch_name}`,
            is_active: true,
          } as any)
          .select("id")
          .single();
        if (cErr || !newC) throw cErr || new Error("Customer create failed");
        customerId = newC.id;
      } else if (customer && customer.company_id !== effectiveCompanyId) {
        const { data: migrated, error: mErr } = await supabase
          .from("customers")
          .update({ company_id: effectiveCompanyId })
          .eq("id", customer.id)
          .select("id, company_id");
        if (mErr) throw mErr;
        if (!migrated || migrated.length === 0) {
          throw new Error(
            `Customer ${customerCode} exists on another company and tenant access blocks the migration. Ask an admin to run a one-line SQL UPDATE.`,
          );
        }
      }

      const { data: studentIds } = await supabase
        .from("school_students")
        .select("id, student_name")
        .eq("branch_id", branchId);
      const studentMap = new Map((studentIds || []).map((s) => [s.id, s.student_name]));

      const { data: orphans, error: oErr } = await supabase
        .from("school_ar_invoices")
        .select("id, invoice_number, amount, paid_amount, invoice_month, status, journal_entry_id, student_id, school_students!inner(branch_id)")
        .eq("school_students.branch_id", branchId)
        .gte("invoice_month", monthStart)
        .lte("invoice_month", monthEnd)
        .is("ar_invoice_id", null)
        .not("journal_entry_id", "is", null);
      if (oErr) throw oErr;
      if (!orphans || orphans.length === 0) return { repaired: 0 };

      let repaired = 0;
      for (const o of orphans) {
        const paid = Number(o.paid_amount || 0);
        const total = Number(o.amount || 0);
        const status = paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid";
        const invoiceDate = o.invoice_month || format(new Date(), "yyyy-MM-dd");
        const dueDate = format(new Date(new Date(invoiceDate).getTime() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");

        const { data: ar, error: arErr } = await supabase
          .from("ar_invoices")
          .insert({
            company_id: effectiveCompanyId,
            business_unit_code: "SBO",
            customer_id: customerId,
            invoice_number: o.invoice_number,
            invoice_date: invoiceDate,
            due_date: dueDate,
            total_amount: total,
            paid_amount: paid,
            balance: total - paid,
            status,
            reference: `${studentMap.get(o.student_id) || ""} (repair)`,
            notes: `Repaired from school_ar_invoices on ${format(new Date(), "yyyy-MM-dd")}`,
            journal_entry_id: o.journal_entry_id,
          } as any)
          .select("id")
          .single();
        if (arErr || !ar) {
          console.warn(`Repair failed for ${o.invoice_number}:`, arErr?.message);
          continue;
        }

        const { error: linkErr } = await supabase
          .from("school_ar_invoices")
          .update({ ar_invoice_id: ar.id })
          .eq("id", o.id);
        if (!linkErr) repaired++;
      }

      return { repaired };
    },
    onSuccess: ({ repaired }) => {
      queryClient.invalidateQueries({ queryKey: ["sbo-orphan-ar-count"] });
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
      toast.success(`Repaired ${repaired} orphan AR invoice${repaired === 1 ? "" : "s"}`);
    },
    onError: (e: any) => {
      toast.error(`Repair failed: ${e?.message || "unknown error"}`);
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
      fixedAmount,
      overpaymentAmount,
      previousBalance,
      customArAccountId,
      customBankAccountId,
      studentId,
    }: {
      paymentId: string;
      amount: number;
      branchId: string;
      studentName: string;
      paymentMethod: string;
      referenceNo?: string;
      fixedAmount?: number;        // The fixed monthly amount due
      overpaymentAmount?: number;  // Positive if student overpaid (credit balance)
      previousBalance?: number;    // Student's credit balance from previous months (positive = credit)
      customArAccountId?: string;  // Override Trade Receivables account (e.g. for Suspense)
      customBankAccountId?: string; // Override Bank account (e.g. for Suspense -> AR reversals)
      studentId?: string;          // Added: Student ID to update operational record
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
      if (!settings || !settings.trade_receivable_account_id) {
        // Fallback 1: Any company's settings for this branch with configured accounts
        const { data: crossBranchSettings } = await supabase
          .from("school_bus_finance_settings")
          .select("*")
          .eq("branch_id", branchId)
          .not("trade_receivable_account_id", "is", null)
          .not("sbs_collection_account_id", "is", null)
          .limit(1)
          .maybeSingle();

        if (crossBranchSettings) {
          effectiveSettings = crossBranchSettings;
        } else {
          // Fallback 2: Default settings (branch_id is null) for selected company
          const { data: defaultSettings } = await supabase
            .from("school_bus_finance_settings")
            .select("*")
            .eq("company_id", selectedCompanyId)
            .is("branch_id", null)
            .maybeSingle();
          effectiveSettings = defaultSettings;

          // Fallback 3: Any default settings with configured accounts
          if (!effectiveSettings || !effectiveSettings.trade_receivable_account_id) {
            const { data: anyDefault } = await supabase
              .from("school_bus_finance_settings")
              .select("*")
              .is("branch_id", null)
              .not("trade_receivable_account_id", "is", null)
              .not("sbs_collection_account_id", "is", null)
              .limit(1)
              .maybeSingle();
            if (anyDefault) effectiveSettings = anyDefault;
          }
        }
      }

      if (!effectiveSettings) {
        console.warn("No finance settings found for branch", branchId, "- skipping GL posting");
        return null; // Gracefully skip GL posting instead of blocking the payment
      }

      if (!customArAccountId && !effectiveSettings.trade_receivable_account_id) {
        throw new Error("Trade Receivables account not configured");
      }

      // Guard against cross-company COA leakage (same root cause as Katunayaka).
      const paymentValidation = await validateGLAccountsBelongToCompany(effectiveSettings, effectiveCompanyId);
      if (!paymentValidation.ok) {
        const codes = paymentValidation.mismatched.map((a) => a.account_code).join(", ");
        throw new Error(
          `Cannot post payment: GL accounts (${codes}) belong to a different company. ` +
          `Open Settings → School Bus Finance for this branch and re-pick the Trade Receivable / Sales / Advance accounts under the active company.`,
        );
      }

      // Use branch_gl_account_id directly (from COA) instead of looking up from bank_accounts
      // Priority: customBankAccountId > branch_gl_account_id > cash_account_id
      const bankGLAccountId = customBankAccountId || effectiveSettings.branch_gl_account_id || effectiveSettings.cash_account_id;

      if (!bankGLAccountId) {
        throw new Error("Bank/Cash GL account not configured for this branch. Please configure in School Bus Finance Settings.");
      }

      // Determine if there's an overpayment that should go to liability
      // OR if there's a credit to consume from previous overpayment
      // Fetch liability account via RPC since PostgREST schema cache may not include it
      let liabilityAccountId: string | null = null;
      try {
        const { data: rpcResult } = await supabase.rpc('get_liability_account_setting' as any, {
          p_setting_id: effectiveSettings.id,
        });
        liabilityAccountId = rpcResult as string | null;
      } catch {
        // Fallback to direct field access (may be null if PostgREST cache is stale)
        liabilityAccountId = effectiveSettings.advance_payments_liability_account_id;
      }

      // === CREDIT BALANCE LOGIC ===
      // Scenario 1: Overpayment (paid > amountDue) → CR Advance Liability
      // Scenario 2: Credit Consumption (has existing credit, paid < fixedAmount) → DR Advance Liability
      // Scenario 3: Exact payment → No liability entry
      const existingCredit = (previousBalance && previousBalance > 0) ? previousBalance : 0;
      const amountDue = fixedAmount || amount;
      const shortfall = amountDue - amount; // How much less than due was paid
      const creditToConsume = Math.min(existingCredit, Math.max(0, shortfall)); // Draw from credit

      const hasOverpayment = overpaymentAmount && overpaymentAmount > 0 && liabilityAccountId;
      const hasCreditConsumption = creditToConsume > 0 && liabilityAccountId;

      // Determine Trade Receivable credit amount:
      // - Overpay: CR only the actual amount consumed for AR (cash received - overpayment)
      // - Credit consume: CR the full due amount (shortfall covered by liability DR)
      // - Exact: CR the payment amount
      let tradeReceivableCredit: number;
      let liabilityCredit = 0; // CR to Advance Liability (overpayment)
      let liabilityDebit = 0;  // DR from Advance Liability (credit consumption)

      if (hasOverpayment) {
        tradeReceivableCredit = amount - overpaymentAmount!;
        liabilityCredit = overpaymentAmount!;
      } else if (hasCreditConsumption) {
        tradeReceivableCredit = amount + creditToConsume; // Full due covered by cash + credit
        liabilityDebit = creditToConsume;
      } else {
        tradeReceivableCredit = amount;
      }

      // Create journal entry - use CONSOLIDATED GL for NCG Holding hierarchy
      const totalDebitAmount = amount + liabilityDebit;
      const totalCreditAmount = tradeReceivableCredit + liabilityCredit;
      const entryNumber = `SBS-PAY-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: format(new Date(), "yyyy-MM-dd"),
          description: `School Bus Payment - ${studentName}${hasOverpayment ? " (includes advance)" : hasCreditConsumption ? " (credit applied)" : ""}`,
          reference: referenceNo || paymentId,
          total_debit: totalDebitAmount,
          total_credit: totalCreditAmount,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: 'SBO',
          business_unit_id: selectedCompanyId,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // Build journal entry lines
      // DR: Bank/Cash (full amount received)
      // CR: Trade Receivables (fixed amount or full if no overpayment)
      // CR: Advance Payments Liability (overpayment portion, if applicable)
      const jeLines: Array<{
        journal_entry_id: string;
        account_id: string;
        description: string;
        debit: number;
        credit: number;
        company_id: string;
      }> = [
        {
          journal_entry_id: journalEntry.id,
          account_id: bankGLAccountId,
          description: `Payment received - ${paymentMethod}`,
          debit: amount,
          credit: 0,
          company_id: effectiveCompanyId,
        },
        {
          journal_entry_id: journalEntry.id,
          account_id: customArAccountId || effectiveSettings.trade_receivable_account_id!,
          description: `School Bus Payment - ${studentName}`,
          debit: 0,
          credit: tradeReceivableCredit,
          company_id: effectiveCompanyId,
        },
      ];

      // Add liability line for OVERPAYMENT (CR Advance Payments Liability)
      if (hasOverpayment && liabilityAccountId) {
        jeLines.push({
          journal_entry_id: journalEntry.id,
          account_id: liabilityAccountId,
          description: `Advance payment credited - ${studentName}`,
          debit: 0,
          credit: liabilityCredit,
          company_id: effectiveCompanyId,
        });
      }

      // Add liability line for CREDIT CONSUMPTION (DR Advance Payments Liability)
      if (hasCreditConsumption && liabilityAccountId) {
        jeLines.push({
          journal_entry_id: journalEntry.id,
          account_id: liabilityAccountId,
          description: `Credit applied from advance - ${studentName}`,
          debit: liabilityDebit,
          credit: 0,
          company_id: effectiveCompanyId,
        });
      }

      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(jeLines);

      if (linesError) {
        // CLEANUP: If lines fail, delete the orphaned Journal Entry header
        await supabase.from("journal_entries").delete().eq("id", journalEntry.id);
        throw linesError;
      }

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

      // Find the actual bank_account_id by linking it to the GL account used
      let physicalBankAccountId = effectiveSettings.bank_account_id;
      if (!physicalBankAccountId && bankGLAccountId) {
        const { data: linkedBank } = await supabase
          .from("bank_accounts")
          .select("id")
          .eq("gl_account_id", bankGLAccountId)
          .limit(1)
          .maybeSingle();
        if (linkedBank) {
          physicalBankAccountId = linkedBank.id;
        }
      }

      // Create AR Receipt record in Finance module
      try {
        const receiptNumber = `SBS-REC-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        // Get or create SBS customer
        let receiptCustomerId: string | null = null;
        const { data: existingCust } = await supabase
          .from("customers")
          .select("id")
          .eq("company_id", effectiveCompanyId)
          .eq("customer_code", "SBS-DEFAULT")
          .maybeSingle();
        
        receiptCustomerId = existingCust?.id || null;
        if (!receiptCustomerId) {
          const { data: newCust } = await supabase
            .from("customers")
            .insert({
              company_id: effectiveCompanyId,
              business_unit_code: 'SBO',
              customer_code: "SBS-DEFAULT",
              customer_name: "School Bus Students",
              is_active: true,
            } as any)
            .select()
            .single();
          receiptCustomerId = newCust?.id || null;
        }

        const { data: arReceipt } = await supabase
          .from("ar_receipts")
          .insert({
            company_id: effectiveCompanyId,
            business_unit_code: 'SBO',
            customer_id: receiptCustomerId,
            receipt_number: receiptNumber,
            receipt_date: format(new Date(), "yyyy-MM-dd"),
            amount: amount,
            payment_method: paymentMethod === 'Bank Transfer' ? 'bank_transfer' : paymentMethod.toLowerCase(),
            reference: referenceNo || paymentId,
            status: 'posted',
            journal_entry_id: journalEntry.id,
            bank_account_id: physicalBankAccountId || null,
            notes: `School Bus Payment - ${studentName}`,
            is_advance: (overpaymentAmount && overpaymentAmount > 0) ? true : false,
          } as any)
          .select()
          .single();

        // Link AR receipt back to payment transaction
        if (arReceipt) {
          await supabase
            .from("school_payment_transactions")
            .update({ ar_receipt_id: arReceipt.id })
            .eq("id", paymentId);
            
          // CRITICAL FIX: Update the operational student record to mark them as paid
          if (studentId) {
            await supabase
              .from("school_students")
              .update({
                payment_status: 'paid',
                last_payment_date: format(new Date(), "yyyy-MM-dd")
              })
              .eq("id", studentId);
          }

          // If a bank account is configured, record the bank transaction and update balance
          if (physicalBankAccountId && amount > 0) {
            const { error: btErr } = await supabase.from("bank_transactions").insert([{
              bank_account_id: physicalBankAccountId,
              transaction_date: format(new Date(), "yyyy-MM-dd"),
              transaction_type: "receipt",
              description: `School Bus Payment from ${studentName} - ${receiptNumber}`,
              debit_amount: amount,
              credit_amount: 0,
              reference: referenceNo || paymentId,
              company_id: effectiveCompanyId,
              source_type: "ar_receipt",
              source_id: arReceipt.id,
            }]);
            
            if (btErr) console.error("Bank transaction insert failed:", btErr);

            // Update running balance on the bank account
            const { data: bankAccount } = await supabase
              .from("bank_accounts")
              .select("current_balance")
              .eq("id", physicalBankAccountId)
              .single();

            if (bankAccount) {
              await supabase
                .from("bank_accounts")
                .update({ current_balance: (bankAccount.current_balance || 0) + amount })
                .eq("id", physicalBankAccountId);
            }
          }
        }
      } catch (receiptError) {
        console.error("AR Receipt creation failed (non-critical):", receiptError);
      }

      // ------------------------------------------------------------------------------------------------
      // CRITICAL FIX: Synchronize with Finance AR Invoices
      // The database trigger 'update_student_balance_on_payment_trigger' has already run
      // and marked school_ar_invoices as 'paid' or 'partial'. Now we must push that to ar_invoices.
      // ------------------------------------------------------------------------------------------------
      try {
        if (studentId) {
          const { data: updatedInvoices } = await supabase
            .from("school_ar_invoices")
            .select("id, amount, paid_amount, status, ar_invoice_id")
            .eq("student_id", studentId)
            .in("status", ["paid", "partial"]);

          if (updatedInvoices && updatedInvoices.length > 0) {
            // Get or create SBS customer
            let customerId: string | null = null;
            const { data: existingCustomer } = await supabase
              .from("customers")
              .select("id")
              .eq("company_id", effectiveCompanyId || '')
              .eq("customer_code", "SBS-DEFAULT")
              .maybeSingle();

            if (existingCustomer) {
              customerId = existingCustomer.id;
            } else {
              const { data: newCustomer } = await supabase
                .from("customers")
                .insert({
                  company_id: effectiveCompanyId,
                  business_unit_code: 'SBO',
                  customer_code: "SBS-DEFAULT",
                  customer_name: "School Bus Students",
                  is_active: true,
                } as any)
                .select()
                .single();
              customerId = newCustomer?.id || null;
            }

            if (customerId) {
              for (const inv of updatedInvoices) {
                await syncPaymentToFinanceAR(
                  inv.id,
                  inv.paid_amount || 0,
                  inv.amount || 0,
                  effectiveCompanyId || '',
                  businessUnitCode || 'SBO',
                  customerId
                );
              }
            }
          }
        }
      } catch (arSyncErr) {
        console.error("Finance AR Sync failed (non-critical):", arSyncErr);
      }

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
  });
}

// Post grouped payments to GL (Single Bank Transaction, Multiple AR Credits)
export function usePostGroupedPaymentToGL() {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  return useMutation({
    mutationFn: async ({
      totalAmount,
      branchId,
      paymentMethod,
      referenceNo,
      description,
      allocations,
    }: {
      totalAmount: number;
      branchId: string;
      paymentMethod: string;
      referenceNo?: string;
      description?: string;
      customBankAccountId?: string;
      allocations: Array<{
        paymentId: string;
        amount: number;
        studentName: string;
        studentId: string;
        fixedAmount?: number;
        overpaymentAmount?: number;
        previousBalance?: number;
        customArAccountId?: string;
      }>;
    }) => {
      // Get finance settings
      let effectiveSettings: any = null;
      const { data: branchSettings } = await supabase
        .from("school_bus_finance_settings")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .eq("branch_id", branchId)
        .maybeSingle();

      if (branchSettings && branchSettings.trade_receivable_account_id) {
        effectiveSettings = branchSettings;
      } else {
        const { data: crossBranchSettings } = await supabase
          .from("school_bus_finance_settings")
          .select("*")
          .eq("branch_id", branchId)
          .not("trade_receivable_account_id", "is", null)
          .not("sbs_collection_account_id", "is", null)
          .limit(1)
          .maybeSingle();
        
        if (crossBranchSettings) effectiveSettings = crossBranchSettings;
        else {
          const { data: defSettings } = await supabase
            .from("school_bus_finance_settings")
            .select("*")
            .eq("company_id", selectedCompanyId)
            .is("branch_id", null)
            .maybeSingle();
          
          if (defSettings && defSettings.trade_receivable_account_id) effectiveSettings = defSettings;
          else {
            const { data: anyDef } = await supabase
              .from("school_bus_finance_settings")
              .select("*")
              .is("branch_id", null)
              .not("trade_receivable_account_id", "is", null)
              .limit(1)
              .maybeSingle();
            if (anyDef) effectiveSettings = anyDef;
          }
        }
      }

      if (!effectiveSettings) {
        console.warn("No finance settings found for branch", branchId, "- skipping GL posting");
        return null;
      }

      const paymentValidation = await validateGLAccountsBelongToCompany(effectiveSettings, effectiveCompanyId);
      if (!paymentValidation.ok) {
        const codes = paymentValidation.mismatched.map((a) => a.account_code).join(", ");
        throw new Error(`Cannot post payment: GL accounts (${codes}) belong to a different company.`);
      }

      const bankGLAccountId = customBankAccountId || effectiveSettings.branch_gl_account_id || effectiveSettings.cash_account_id;
      if (!bankGLAccountId) {
        throw new Error("Bank/Cash GL account not configured for this branch and no override was provided.");
      }

      let liabilityAccountId: string | null = null;
      try {
        const { data: rpcResult } = await supabase.rpc('get_liability_account_setting' as any, { p_setting_id: effectiveSettings.id });
        liabilityAccountId = rpcResult as string | null;
      } catch {
        liabilityAccountId = effectiveSettings.advance_payments_liability_account_id;
      }

      let totalTradeReceivableCredit = 0;
      let totalLiabilityCredit = 0;
      let totalLiabilityDebit = 0;
      
      const jeLines: any[] = [];

      allocations.forEach(alloc => {
        const existingCredit = (alloc.previousBalance && alloc.previousBalance > 0) ? alloc.previousBalance : 0;
        const amountDue = alloc.fixedAmount || alloc.amount;
        const shortfall = amountDue - alloc.amount;
        const creditToConsume = Math.min(existingCredit, Math.max(0, shortfall));
        
        const hasOverpayment = alloc.overpaymentAmount && alloc.overpaymentAmount > 0 && liabilityAccountId;
        const hasCreditConsumption = creditToConsume > 0 && liabilityAccountId;

        let trCredit = 0;
        let lCredit = 0;
        let lDebit = 0;

        if (hasOverpayment) {
          trCredit = alloc.amount - alloc.overpaymentAmount!;
          lCredit = alloc.overpaymentAmount!;
        } else if (hasCreditConsumption) {
          trCredit = alloc.amount + creditToConsume;
          lDebit = creditToConsume;
        } else {
          trCredit = alloc.amount;
        }

        totalTradeReceivableCredit += trCredit;
        totalLiabilityCredit += lCredit;
        totalLiabilityDebit += lDebit;

        jeLines.push({
          account_id: alloc.customArAccountId || effectiveSettings!.trade_receivable_account_id!,
          description: `School Bus Payment - ${alloc.studentName}`,
          debit: 0,
          credit: trCredit,
          company_id: effectiveCompanyId,
        });

        if (hasOverpayment && liabilityAccountId) {
          jeLines.push({
            account_id: liabilityAccountId,
            description: `Advance payment credited - ${alloc.studentName}`,
            debit: 0,
            credit: lCredit,
            company_id: effectiveCompanyId,
          });
        }

        if (hasCreditConsumption && liabilityAccountId) {
          jeLines.push({
            account_id: liabilityAccountId,
            description: `Credit applied from advance - ${alloc.studentName}`,
            debit: lDebit,
            credit: 0,
            company_id: effectiveCompanyId,
          });
        }
      });

      const totalDebitAmount = totalAmount + totalLiabilityDebit;
      const totalCreditAmount = totalTradeReceivableCredit + totalLiabilityCredit;
      const entryNumber = `SBS-PAY-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: format(new Date(), "yyyy-MM-dd"),
          description: description || `Grouped School Bus Payment - ${allocations.length} Student(s)`,
          reference: referenceNo || allocations[0]?.paymentId,
          total_debit: totalDebitAmount,
          total_credit: totalCreditAmount,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: 'SBO',
          business_unit_id: selectedCompanyId,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      const allLines = [
        {
          journal_entry_id: journalEntry.id,
          account_id: bankGLAccountId,
          description: description || `Payment received - ${paymentMethod}`,
          debit: totalAmount,
          credit: 0,
          company_id: effectiveCompanyId,
        },
        ...jeLines.map(line => ({ ...line, journal_entry_id: journalEntry.id }))
      ];

      const { error: linesError } = await supabase.from("journal_entry_lines").insert(allLines);
      if (linesError) throw linesError;

      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      // Find the actual bank_account_id by linking it to the GL account used
      let physicalBankAccountId = effectiveSettings.bank_account_id;
      if (!physicalBankAccountId && bankGLAccountId) {
        const { data: linkedBank } = await supabase
          .from("bank_accounts")
          .select("id")
          .eq("gl_account_id", bankGLAccountId)
          .limit(1)
          .maybeSingle();
        if (linkedBank) {
          physicalBankAccountId = linkedBank.id;
        }
      }

      let receiptCustomerId: string | null = null;
      const { data: existingCust } = await supabase
        .from("customers")
        .select("id")
        .eq("company_id", effectiveCompanyId)
        .eq("customer_code", "SBS-DEFAULT")
        .maybeSingle();
      
      receiptCustomerId = existingCust?.id || null;
      if (!receiptCustomerId) {
        const { data: newCust } = await supabase
          .from("customers")
          .insert({
            company_id: effectiveCompanyId,
            business_unit_code: 'SBO',
            customer_code: "SBS-DEFAULT",
            customer_name: "School Bus Students",
            is_active: true,
          } as any)
          .select()
          .single();
        receiptCustomerId = newCust?.id || null;
      }

      for (const alloc of allocations) {
        await supabase
          .from("school_payment_transactions")
          .update({
            gl_posted: true,
            journal_entry_id: journalEntry.id,
          })
          .eq("id", alloc.paymentId);

        try {
          const receiptNumber = `SBS-REC-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          const { data: arReceipt } = await supabase
            .from("ar_receipts")
            .insert({
              company_id: effectiveCompanyId,
              business_unit_code: 'SBO',
              customer_id: receiptCustomerId,
              receipt_number: receiptNumber,
              receipt_date: format(new Date(), "yyyy-MM-dd"),
              amount: alloc.amount,
              payment_method: paymentMethod === 'Bank Transfer' ? 'bank_transfer' : paymentMethod.toLowerCase(),
              reference: referenceNo || alloc.paymentId,
              status: 'posted',
              journal_entry_id: journalEntry.id,
              bank_account_id: physicalBankAccountId || null,
              notes: `School Bus Payment - ${alloc.studentName}`,
              is_advance: (alloc.overpaymentAmount && alloc.overpaymentAmount > 0) ? true : false,
            } as any)
            .select()
            .single();

          if (arReceipt) {
            await supabase
              .from("school_payment_transactions")
              .update({ ar_receipt_id: arReceipt.id })
              .eq("id", alloc.paymentId);
          }
          
          // CRITICAL FIX: Update the operational student record to mark them as paid
          if (alloc.studentId) {
            await supabase
              .from("school_students")
              .update({
                payment_status: 'paid',
                last_payment_date: format(new Date(), "yyyy-MM-dd")
              })
              .eq("id", alloc.studentId);
          }
        } catch (receiptError) {
          console.error("AR Receipt creation failed:", receiptError);
        }

        // ------------------------------------------------------------------------------------------------
        // CRITICAL FIX: Synchronize with Finance AR Invoices for Grouped Payments
        // The database trigger 'update_student_balance_on_payment_trigger' has already run
        // and marked school_ar_invoices as 'paid' or 'partial'. Now we must push that to ar_invoices.
        // ------------------------------------------------------------------------------------------------
        try {
          if (alloc.studentId) {
            const { data: updatedInvoices } = await supabase
              .from("school_ar_invoices")
              .select("id, amount, paid_amount, status, ar_invoice_id")
              .eq("student_id", alloc.studentId)
              .in("status", ["paid", "partial"]);

            if (updatedInvoices && updatedInvoices.length > 0 && receiptCustomerId) {
              for (const inv of updatedInvoices) {
                await syncPaymentToFinanceAR(
                  inv.id,
                  inv.paid_amount || 0,
                  inv.amount || 0,
                  effectiveCompanyId || '',
                  businessUnitCode || 'SBO',
                  receiptCustomerId
                );
              }
            }
          }
        } catch (arSyncErr) {
          console.error("Finance AR Sync failed in grouped payment:", arSyncErr);
        }
      }

      if (physicalBankAccountId && totalAmount > 0) {
        const { error: btErr } = await supabase.from("bank_transactions").insert([{
          bank_account_id: physicalBankAccountId,
          transaction_date: format(new Date(), "yyyy-MM-dd"),
          transaction_type: "receipt",
          description: description || `Grouped School Bus Payment - ${referenceNo || ''}`,
          debit_amount: totalAmount,
          credit_amount: 0,
          reference: referenceNo,
          company_id: effectiveCompanyId,
          source_type: "journal_entry",
          source_id: journalEntry.id,
        }]);
        
        if (btErr) console.error("Grouped bank transaction insert failed:", btErr);

        const { data: bankAccount } = await supabase
          .from("bank_accounts")
          .select("current_balance")
          .eq("id", physicalBankAccountId)
          .single();

        if (bankAccount) {
          await supabase
            .from("bank_accounts")
            .update({ current_balance: (bankAccount.current_balance || 0) + totalAmount })
            .eq("id", physicalBankAccountId);
        }
      }

      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
      queryClient.invalidateQueries({ queryKey: ["school-students"] });
      queryClient.invalidateQueries({ queryKey: ["school-ar-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      toast.success("Grouped payment posted to GL successfully");
    },
    onError: (error) => {
      console.error("Grouped GL posting error:", error);
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
            business_unit_code: 'SBO',
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
              business_unit_code: 'SBO',
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
      business_unit_code: 'SBO',
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

// Delete an AR invoice batch and all related records (invoices, journal entries)
export function useDeleteARBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId: string) => {
      // 1. Get all school_ar_invoices for this batch (with linked ar_invoice_id and journal refs)
      const { data: schoolInvoices, error: fetchErr } = await supabase
        .from("school_ar_invoices")
        .select("id, ar_invoice_id, invoice_number, journal_entry_id, student_id, amount")
        .eq("batch_id", batchId);

      if (fetchErr) throw fetchErr;

      // 2. Get the batch itself (for journal_entry_id)
      const { data: batch } = await supabase
        .from("school_ar_invoice_batches")
        .select("id, journal_entry_id")
        .eq("id", batchId)
        .single();

      // 3. Collect AR invoice IDs to delete from Finance ERP
      const arInvoiceIds = (schoolInvoices || [])
        .map((si) => si.ar_invoice_id)
        .filter(Boolean) as string[];

      // 4. Delete school_ar_invoices AND reverse student balances
      if (schoolInvoices && schoolInvoices.length > 0) {
        // Reverse student balances back to original
        for (const inv of schoolInvoices) {
           if (inv.student_id && inv.amount) {
              const { data: currentStudent } = await supabase
                 .from("school_students")
                 .select("current_amount_due, payment_balance")
                 .eq("id", inv.student_id)
                 .single();
                 
              if (currentStudent) {
                 await supabase
                    .from("school_students")
                    .update({
                       current_amount_due: Math.max(0, (currentStudent.current_amount_due || 0) - inv.amount),
                       payment_balance: (currentStudent.payment_balance || 0) + inv.amount
                    })
                    .eq("id", inv.student_id);
              }
           }
           
           // Void the individual journal entry
           if (inv.journal_entry_id) {
              await supabase
                .from("journal_entries")
                .update({ status: "void", notes: "Voided: AR individual invoice deleted" })
                .eq("id", inv.journal_entry_id);
           }
        }
        
        const { error } = await supabase
          .from("school_ar_invoices")
          .delete()
          .eq("batch_id", batchId);
        if (error) throw error;
      }

      // 5. Delete linked Finance AR invoice lines + invoices
      for (const arId of arInvoiceIds) {
        await supabase.from("ar_invoice_lines").delete().eq("invoice_id", arId);
        await supabase.from("ar_invoices").delete().eq("id", arId);
      }

      // 6. Void batch journal entry if exists
      if (batch?.journal_entry_id) {
        await supabase
          .from("journal_entries")
          .update({ status: "void", notes: "Voided: AR batch deleted" })
          .eq("id", batch.journal_entry_id);
      }

      // 7. Delete the batch record
      const { error: batchDelErr } = await supabase
        .from("school_ar_invoice_batches")
        .delete()
        .eq("id", batchId);

      if (batchDelErr) throw batchDelErr;

      return { deletedInvoices: schoolInvoices?.length || 0 };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["school-ar-batches"] });
      queryClient.invalidateQueries({ queryKey: ["students-bulk-ar"] });
      toast.success(`Deleted batch with ${result.deletedInvoices} invoices`);
    },
    onError: (error) => {
      toast.error(`Failed to delete batch: ${error.message}`);
    },
  });
}

// Check if a batch already exists for a branch + month
export function useExistingBatch(branchId: string | null, invoiceMonth: Date | null, enabled: boolean) {
  return useQuery({
    queryKey: ["existing-ar-batch", branchId, invoiceMonth ? format(invoiceMonth, "yyyy-MM-dd") : null],
    queryFn: async () => {
      if (!branchId || !invoiceMonth) return null;
      const monthStr = format(invoiceMonth, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("school_ar_invoice_batches")
        .select("id, batch_number, status, total_students, total_amount, created_at")
        .eq("branch_id", branchId)
        .eq("invoice_month", monthStr)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!branchId && !!invoiceMonth && enabled,
  });
}

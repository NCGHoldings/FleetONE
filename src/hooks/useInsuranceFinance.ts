/**
 * Insurance Finance Integration Hook
 * Handles GL posting for insurance premiums, monthly amortization, and claims:
 * - Premium: DR Prepaid Insurance / CR Bank
 * - Monthly Expense: DR Insurance Expense / CR Prepaid Insurance
 * - Claim Recovery: DR Insurance Claims Receivable / CR Insurance Expense
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { format } from "date-fns";

export interface InsuranceFinanceSettings {
  id?: string;
  company_id?: string;
  prepaid_insurance_account_id: string | null;
  insurance_expense_account_id: string | null;
  claims_receivable_account_id: string | null;
  claims_income_account_id: string | null;
  bank_account_id: string | null;
  auto_post_premium: boolean;
  auto_amortize_monthly: boolean;
  gl_prefix: string;
}

export interface InsurancePremiumForGL {
  policyId?: string;
  policyNumber: string;
  vehicleNo?: string;
  insuranceProvider: string;
  premiumAmount: number;
  premiumDate: string;
  coverageStartDate: string;
  coverageEndDate: string;
  coverageMonths: number;
  insuranceType: string; // comprehensive, third-party, etc.
}

export interface InsuranceClaimForGL {
  claimId?: string;
  policyNumber: string;
  vehicleNo?: string;
  claimAmount: number;
  claimDate: string;
  claimType: string;
  description: string;
}

// Helper function to update COA balances after journal entry creation
async function updateAccountBalancesFromJournalEntry(journalEntryId: string) {
  const { data: lines, error: linesError } = await supabase
    .from("journal_entry_lines")
    .select("account_id, debit, credit")
    .eq("journal_entry_id", journalEntryId);

  if (linesError) {
    console.error("Error fetching journal entry lines:", linesError);
    throw linesError;
  }

  if (!lines || lines.length === 0) return;

  for (const line of lines) {
    if (!line.account_id) continue;

    const { data: account, error: accountError } = await supabase
      .from("chart_of_accounts")
      .select("current_balance, account_type")
      .eq("id", line.account_id)
      .single();

    if (accountError || !account) continue;

    const netAmount = (line.debit || 0) - (line.credit || 0);
    const isDebitNormal = ["asset", "expense"].includes(account.account_type || "");
    const adjustment = isDebitNormal ? netAmount : -netAmount;

    await supabase
      .from("chart_of_accounts")
      .update({
        current_balance: (account.current_balance || 0) + adjustment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", line.account_id);
  }
}

// Fetch insurance finance settings
export function useInsuranceFinanceSettings() {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["insurance-finance-settings", effectiveCompanyId],
    queryFn: async (): Promise<InsuranceFinanceSettings | null> => {
      const { data, error } = await supabase
        .from("module_finance_settings")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .eq("module_name", "insurance")
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching insurance finance settings:", error);
      }

      if (data?.settings) {
        return data.settings as InsuranceFinanceSettings;
      }

      return {
        prepaid_insurance_account_id: null,
        insurance_expense_account_id: null,
        claims_receivable_account_id: null,
        claims_income_account_id: null,
        bank_account_id: null,
        auto_post_premium: false,
        auto_amortize_monthly: false,
        gl_prefix: "INS",
      };
    },
  });
}

// Save insurance finance settings
export function useSaveInsuranceFinanceSettings() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useMutation({
    mutationFn: async (settings: InsuranceFinanceSettings) => {
      const { data, error } = await supabase
        .from("module_finance_settings")
        .upsert({
          company_id: effectiveCompanyId,
          module_name: "insurance",
          settings: settings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "company_id,module_name",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance-finance-settings"] });
      toast.success("Insurance finance settings saved");
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
}

// Post insurance premium payment to GL
// DR Prepaid Insurance (Asset) | CR Bank (Asset)
export function usePostInsurancePremiumToGL() {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  return useMutation({
    mutationFn: async ({
      premium,
      settings,
    }: {
      premium: InsurancePremiumForGL;
      settings: InsuranceFinanceSettings;
    }) => {
      if (!settings.prepaid_insurance_account_id) {
        throw new Error("Prepaid Insurance account not configured");
      }
      if (!settings.bank_account_id) {
        throw new Error("Bank account not configured for insurance payments");
      }

      const prefix = settings.gl_prefix || "INS";
      const entryNumber = `${prefix}-PREM-${format(new Date(), "yyyyMMddHHmmss")}`;

      // 1. Create Journal Entry
      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: premium.premiumDate,
          description: `Insurance Premium - ${premium.insuranceProvider} - Policy ${premium.policyNumber}${premium.vehicleNo ? ` (${premium.vehicleNo})` : ""}`,
          reference: premium.policyNumber,
          total_debit: premium.premiumAmount,
          total_credit: premium.premiumAmount,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode || "FLEET",
          business_unit_id: selectedCompanyId,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      // 2. Create journal entry lines
      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: settings.prepaid_insurance_account_id,
            description: `Prepaid Insurance - ${premium.insuranceType} - ${premium.policyNumber}`,
            debit: premium.premiumAmount,
            credit: 0,
            company_id: effectiveCompanyId,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: settings.bank_account_id,
            description: `Premium payment to ${premium.insuranceProvider}`,
            debit: 0,
            credit: premium.premiumAmount,
            company_id: effectiveCompanyId,
          },
        ]);

      if (linesError) throw linesError;

      // 3. Update COA balances
      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      // 4. Update bank account balance
      const { data: bankAccount } = await supabase
        .from("bank_accounts")
        .select("id, current_balance")
        .eq("gl_account_id", settings.bank_account_id)
        .maybeSingle();

      if (bankAccount) {
        await supabase
          .from("bank_accounts")
          .update({
            current_balance: (bankAccount.current_balance || 0) - premium.premiumAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bankAccount.id);

        await supabase
          .from("bank_transactions")
          .insert({
            bank_account_id: bankAccount.id,
            company_id: effectiveCompanyId,
            transaction_date: premium.premiumDate,
            transaction_type: "payment",
            description: `Insurance Premium - ${premium.insuranceProvider} - ${premium.policyNumber}`,
            reference: premium.policyNumber,
            debit_amount: premium.premiumAmount,
            credit_amount: 0,
            running_balance: (bankAccount.current_balance || 0) - premium.premiumAmount,
            journal_entry_id: journalEntry.id,
          });
      }

      return {
        journalEntryId: journalEntry.id,
        entryNumber: journalEntry.entry_number,
        monthlyAmortization: premium.coverageMonths > 0 ? premium.premiumAmount / premium.coverageMonths : 0,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      toast.success("Insurance premium posted to GL");
    },
    onError: (error) => {
      toast.error(`Failed to post premium: ${error.message}`);
    },
  });
}

// Post monthly insurance expense amortization to GL
// DR Insurance Expense | CR Prepaid Insurance
export function usePostInsuranceAmortizationToGL() {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  return useMutation({
    mutationFn: async ({
      policyNumber,
      monthlyAmount,
      expenseMonth,
      insuranceProvider,
      vehicleNo,
      settings,
    }: {
      policyNumber: string;
      monthlyAmount: number;
      expenseMonth: string;
      insuranceProvider: string;
      vehicleNo?: string;
      settings: InsuranceFinanceSettings;
    }) => {
      if (!settings.insurance_expense_account_id) {
        throw new Error("Insurance Expense account not configured");
      }
      if (!settings.prepaid_insurance_account_id) {
        throw new Error("Prepaid Insurance account not configured");
      }

      const prefix = settings.gl_prefix || "INS";
      const entryNumber = `${prefix}-EXP-${format(new Date(), "yyyyMMddHHmmss")}`;

      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: format(new Date(), "yyyy-MM-dd"),
          description: `Insurance Amortization - ${expenseMonth} - ${insuranceProvider}${vehicleNo ? ` (${vehicleNo})` : ""}`,
          reference: policyNumber,
          total_debit: monthlyAmount,
          total_credit: monthlyAmount,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode || "FLEET",
          business_unit_id: selectedCompanyId,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: settings.insurance_expense_account_id,
            description: `Insurance Expense - ${expenseMonth}`,
            debit: monthlyAmount,
            credit: 0,
            company_id: effectiveCompanyId,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: settings.prepaid_insurance_account_id,
            description: `Prepaid Insurance amortization - ${expenseMonth}`,
            debit: 0,
            credit: monthlyAmount,
            company_id: effectiveCompanyId,
          },
        ]);

      if (linesError) throw linesError;

      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      return {
        journalEntryId: journalEntry.id,
        entryNumber: journalEntry.entry_number,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success("Insurance expense amortization posted");
    },
    onError: (error) => {
      toast.error(`Failed to post amortization: ${error.message}`);
    },
  });
}

// Post insurance claim recovery to GL
// DR Insurance Claims Receivable (or Bank if already received) | CR Insurance Claims Income
export function usePostInsuranceClaimToGL() {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  return useMutation({
    mutationFn: async ({
      claim,
      settings,
      received = false,
    }: {
      claim: InsuranceClaimForGL;
      settings: InsuranceFinanceSettings;
      received?: boolean;
    }) => {
      const debitAccountId = received
        ? settings.bank_account_id
        : settings.claims_receivable_account_id;

      const creditAccountId = settings.claims_income_account_id || settings.insurance_expense_account_id;

      if (!debitAccountId) {
        throw new Error(received ? "Bank account not configured" : "Claims receivable account not configured");
      }
      if (!creditAccountId) {
        throw new Error("Claims income/expense account not configured");
      }

      const prefix = settings.gl_prefix || "INS";
      const entryNumber = `${prefix}-CLM-${format(new Date(), "yyyyMMddHHmmss")}`;

      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: claim.claimDate,
          description: `Insurance Claim - ${claim.claimType} - ${claim.policyNumber}${claim.vehicleNo ? ` (${claim.vehicleNo})` : ""}`,
          reference: claim.claimId || claim.policyNumber,
          total_debit: claim.claimAmount,
          total_credit: claim.claimAmount,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode || "FLEET",
          business_unit_id: selectedCompanyId,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (jeError) throw jeError;

      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert([
          {
            journal_entry_id: journalEntry.id,
            account_id: debitAccountId!,
            description: received
              ? `Insurance claim received - ${claim.description}`
              : `Insurance claim receivable - ${claim.description}`,
            debit: claim.claimAmount,
            credit: 0,
            company_id: effectiveCompanyId,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: creditAccountId!,
            description: `Insurance claim recovery - ${claim.claimType}`,
            debit: 0,
            credit: claim.claimAmount,
            company_id: effectiveCompanyId,
          },
        ]);

      if (linesError) throw linesError;

      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      return {
        journalEntryId: journalEntry.id,
        entryNumber: journalEntry.entry_number,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success("Insurance claim posted to GL");
    },
    onError: (error) => {
      toast.error(`Failed to post claim: ${error.message}`);
    },
  });
}

/**
 * Route Permit Finance Integration Hook
 * Posts permit costs and renewals to GL:
 * - Short-term permits: DR Permit Expense / CR Bank
 * - Annual permits: DR Prepaid Permits / CR Bank (then monthly amortization)
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { format } from "date-fns";

export interface RoutePermitFinanceSettings {
  id?: string;
  company_id?: string;
  permit_expense_account_id: string | null;
  prepaid_permits_account_id: string | null;
  bank_account_id: string | null;
  auto_post_on_renewal: boolean;
  gl_prefix: string;
}

export interface PermitCostForGL {
  permitId?: string;
  permitNumber: string;
  routeName?: string;
  vehicleNo?: string;
  permitType: "temporary" | "annual" | "renewal" | "new";
  amount: number;
  paymentDate: string;
  expiryDate?: string;
  coverageMonths?: number;
  description?: string;
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

// Fetch route permit finance settings
export function useRoutePermitFinanceSettings() {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["route-permit-finance-settings", effectiveCompanyId],
    queryFn: async (): Promise<RoutePermitFinanceSettings | null> => {
      const { data, error } = await supabase
        .from("module_finance_settings")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .eq("module_name", "route_permits")
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching route permit finance settings:", error);
      }

      if (data?.settings) {
        return data.settings as unknown as RoutePermitFinanceSettings;
      }

      return {
        permit_expense_account_id: null,
        prepaid_permits_account_id: null,
        bank_account_id: null,
        auto_post_on_renewal: false,
        gl_prefix: "PERM",
      };
    },
  });
}

// Save route permit finance settings
export function useSaveRoutePermitFinanceSettings() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useMutation({
    mutationFn: async (settings: RoutePermitFinanceSettings) => {
      const { data, error } = await (supabase as any)
        .from("module_finance_settings")
        .upsert({
          company_id: effectiveCompanyId,
          module_name: "route_permits",
          settings: settings as any,
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
      queryClient.invalidateQueries({ queryKey: ["route-permit-finance-settings"] });
      toast.success("Route permit finance settings saved");
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
}

// Post permit cost to GL
export function usePostPermitCostToGL() {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  return useMutation({
    mutationFn: async ({
      permit,
      settings,
    }: {
      permit: PermitCostForGL;
      settings: RoutePermitFinanceSettings;
    }) => {
      if (permit.amount <= 0) {
        throw new Error("Permit cost must be greater than zero");
      }

      if (!settings.bank_account_id) {
        throw new Error("Bank account not configured for permit payments");
      }

      // Determine debit account based on permit type
      let debitAccountId: string | null = null;
      let isPrePaid = false;

      if (permit.permitType === "annual" && permit.coverageMonths && permit.coverageMonths > 1) {
        // Annual permits - capitalize as prepaid then amortize monthly
        debitAccountId = settings.prepaid_permits_account_id || settings.permit_expense_account_id;
        isPrePaid = !!settings.prepaid_permits_account_id;
      } else {
        // Temporary / short-term - expense immediately
        debitAccountId = settings.permit_expense_account_id;
      }

      if (!debitAccountId) {
        throw new Error("Permit expense/prepaid account not configured");
      }

      const prefix = settings.gl_prefix || "PERM";
      const permitTypeLabel = permit.permitType.charAt(0).toUpperCase() + permit.permitType.slice(1);
      const entryNumber = `${prefix}-${format(new Date(), "yyyyMMddHHmmss")}`;

      // 1. Create Journal Entry
      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: permit.paymentDate,
          description: `${permitTypeLabel} Permit - ${permit.permitNumber}${permit.routeName ? ` (${permit.routeName})` : ""}${permit.vehicleNo ? ` - ${permit.vehicleNo}` : ""}`,
          reference: permit.permitNumber,
          total_debit: permit.amount,
          total_credit: permit.amount,
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
            account_id: debitAccountId,
            description: isPrePaid
              ? `Prepaid Permit - ${permit.permitNumber}`
              : `Permit Expense - ${permit.permitNumber}`,
            debit: permit.amount,
            credit: 0,
            company_id: effectiveCompanyId,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: settings.bank_account_id!,
            description: `Permit payment - ${permit.permitNumber}`,
            debit: 0,
            credit: permit.amount,
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
            current_balance: (bankAccount.current_balance || 0) - permit.amount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bankAccount.id);

        await supabase
          .from("bank_transactions")
          .insert({
            bank_account_id: bankAccount.id,
            company_id: effectiveCompanyId,
            transaction_date: permit.paymentDate,
            transaction_type: "payment",
            description: `${permitTypeLabel} Permit - ${permit.permitNumber}`,
            reference: permit.permitNumber,
            debit_amount: permit.amount,
            credit_amount: 0,
            running_balance: (bankAccount.current_balance || 0) - permit.amount,
            journal_entry_id: journalEntry.id,
          });
      }

      return {
        journalEntryId: journalEntry.id,
        entryNumber: journalEntry.entry_number,
        monthlyAmortization: isPrePaid && permit.coverageMonths
          ? permit.amount / permit.coverageMonths
          : 0,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      toast.success("Permit cost posted to GL");
    },
    onError: (error) => {
      toast.error(`Failed to post permit cost: ${error.message}`);
    },
  });
}

// Post monthly permit amortization
// DR Permit Expense | CR Prepaid Permits
export function usePostPermitAmortizationToGL() {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  return useMutation({
    mutationFn: async ({
      permitNumber,
      monthlyAmount,
      expenseMonth,
      routeName,
      settings,
    }: {
      permitNumber: string;
      monthlyAmount: number;
      expenseMonth: string;
      routeName?: string;
      settings: RoutePermitFinanceSettings;
    }) => {
      if (!settings.permit_expense_account_id) {
        throw new Error("Permit expense account not configured");
      }
      if (!settings.prepaid_permits_account_id) {
        throw new Error("Prepaid permits account not configured");
      }

      const prefix = settings.gl_prefix || "PERM";
      const entryNumber = `${prefix}-AMORT-${format(new Date(), "yyyyMMddHHmmss")}`;

      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: format(new Date(), "yyyy-MM-dd"),
          description: `Permit Amortization - ${expenseMonth} - ${permitNumber}${routeName ? ` (${routeName})` : ""}`,
          reference: permitNumber,
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
            account_id: settings.permit_expense_account_id!,
            description: `Permit expense - ${expenseMonth}`,
            debit: monthlyAmount,
            credit: 0,
            company_id: effectiveCompanyId,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: settings.prepaid_permits_account_id!,
            description: `Prepaid permit amortization - ${expenseMonth}`,
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
      toast.success("Permit amortization posted");
    },
    onError: (error) => {
      toast.error(`Failed to post amortization: ${error.message}`);
    },
  });
}

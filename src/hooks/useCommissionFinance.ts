/**
 * Commission Finance Integration Hook
 * Posts commission payouts to GL when commissions are marked as paid:
 * DR Commission Expense | CR Bank/Cash
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { format } from "date-fns";

export interface CommissionFinanceSettings {
  commission_expense_account_id: string | null;
  bank_account_id: string | null;
  auto_post_on_paid: boolean;
  gl_prefix: string;
}

export interface CommissionPayoutForGL {
  commissionIds: string[];
  staffName: string;
  staffId: string;
  totalAmount: number;
  payoutDate: string;
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

// Fetch commission finance settings
export function useCommissionFinanceSettings() {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["commission-finance-settings", effectiveCompanyId],
    queryFn: async (): Promise<CommissionFinanceSettings> => {
      const { data, error } = await supabase
        .from("module_finance_settings")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .eq("module_name", "commissions")
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching commission finance settings:", error);
      }

      if (data?.settings) {
        return data.settings as CommissionFinanceSettings;
      }

      return {
        commission_expense_account_id: null,
        bank_account_id: null,
        auto_post_on_paid: false,
        gl_prefix: "COMM",
      };
    },
  });
}

// Save commission finance settings
export function useSaveCommissionFinanceSettings() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useMutation({
    mutationFn: async (settings: CommissionFinanceSettings) => {
      const { data, error } = await supabase
        .from("module_finance_settings")
        .upsert({
          company_id: effectiveCompanyId,
          module_name: "commissions",
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
      queryClient.invalidateQueries({ queryKey: ["commission-finance-settings"] });
      toast.success("Commission finance settings saved");
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
}

// Post commission payout to GL
// DR Commission Expense | CR Bank/Cash
export function usePostCommissionPayoutToGL() {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  return useMutation({
    mutationFn: async ({
      payout,
      settings,
    }: {
      payout: CommissionPayoutForGL;
      settings: CommissionFinanceSettings;
    }) => {
      if (!settings.commission_expense_account_id) {
        throw new Error("Commission Expense account not configured in Finance Settings");
      }
      if (!settings.bank_account_id) {
        throw new Error("Bank/Cash account not configured for commission payments");
      }
      if (payout.totalAmount <= 0) {
        throw new Error("Commission payout amount must be greater than zero");
      }

      const prefix = settings.gl_prefix || "COMM";
      const entryNumber = `${prefix}-${format(new Date(), "yyyyMMddHHmmss")}`;

      // 1. Create Journal Entry
      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: payout.payoutDate,
          description: payout.description || `Commission Payout - ${payout.staffName} (${payout.commissionIds.length} commissions)`,
          reference: `COMM-${payout.staffId}-${payout.payoutDate}`,
          total_debit: payout.totalAmount,
          total_credit: payout.totalAmount,
          status: "posted",
          company_id: effectiveCompanyId,
          business_unit_code: businessUnitCode || "HQ",
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
            account_id: settings.commission_expense_account_id,
            description: `Commission Expense - ${payout.staffName}`,
            debit: payout.totalAmount,
            credit: 0,
            company_id: effectiveCompanyId,
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: settings.bank_account_id,
            description: `Commission payment to ${payout.staffName}`,
            debit: 0,
            credit: payout.totalAmount,
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
            current_balance: (bankAccount.current_balance || 0) - payout.totalAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bankAccount.id);

        await supabase
          .from("bank_transactions")
          .insert({
            bank_account_id: bankAccount.id,
            company_id: effectiveCompanyId,
            transaction_date: payout.payoutDate,
            transaction_type: "payment",
            description: `Commission Payout - ${payout.staffName}`,
            reference: `COMM-${payout.staffId}`,
            debit_amount: payout.totalAmount,
            credit_amount: 0,
            running_balance: (bankAccount.current_balance || 0) - payout.totalAmount,
            journal_entry_id: journalEntry.id,
          });
      }

      // 5. Update commission records with journal entry link
      for (const commId of payout.commissionIds) {
        await supabase
          .from("staff_commissions")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", commId);
      }

      return {
        journalEntryId: journalEntry.id,
        entryNumber: journalEntry.entry_number,
        paidCount: payout.commissionIds.length,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["staff-commissions"] });
      toast.success(`${data.paidCount} commission(s) paid and posted to GL`);
    },
    onError: (error) => {
      toast.error(`Failed to post commission payout: ${error.message}`);
    },
  });
}

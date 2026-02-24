/**
 * Payroll Finance Integration Hook
 * Posts payroll batch processing to GL with proper double-entry bookkeeping:
 * DR Salary Expense + DR Employer EPF/ETF
 * CR PAYE Withholding Payable + CR Employee EPF Payable + CR Net Salary Bank
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { format } from "date-fns";

export interface PayrollFinanceSettings {
  id?: string;
  company_id?: string;
  salary_expense_account_id: string | null;
  employer_epf_expense_account_id: string | null;
  employer_etf_expense_account_id: string | null;
  paye_withholding_account_id: string | null;
  employee_epf_payable_account_id: string | null;
  net_salary_bank_account_id: string | null;
  overtime_expense_account_id: string | null;
  bonus_expense_account_id: string | null;
  auto_post_on_process: boolean;
  gl_prefix: string;
}

export interface PayrollBatchForGL {
  batchId?: string;
  payrollMonth: string; // YYYY-MM
  totalGrossSalary: number;
  totalOvertime: number;
  totalBonus: number;
  totalDeductions: number;
  employerEPF: number;
  employerETF: number;
  employeeEPF: number;
  payeWithholding: number;
  totalNetPay: number;
  staffCount: number;
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

    if (accountError || !account) {
      console.error("Error fetching account:", accountError);
      continue;
    }

    const netAmount = (line.debit || 0) - (line.credit || 0);
    const isDebitNormal = ["asset", "expense"].includes(account.account_type || "");
    const adjustment = isDebitNormal ? netAmount : -netAmount;

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

// Fetch payroll finance settings
export function usePayrollFinanceSettings() {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["payroll-finance-settings", effectiveCompanyId],
    queryFn: async (): Promise<PayrollFinanceSettings | null> => {
      // Try to load from a general settings store keyed by feature
      const { data, error } = await supabase
        .from("module_finance_settings")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .eq("module_name", "payroll")
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching payroll finance settings:", error);
      }

      if (data?.settings) {
        return data.settings as unknown as PayrollFinanceSettings;
      }

      // Return defaults
      return {
        salary_expense_account_id: null,
        employer_epf_expense_account_id: null,
        employer_etf_expense_account_id: null,
        paye_withholding_account_id: null,
        employee_epf_payable_account_id: null,
        net_salary_bank_account_id: null,
        overtime_expense_account_id: null,
        bonus_expense_account_id: null,
        auto_post_on_process: false,
        gl_prefix: "PAY",
      };
    },
  });
}

// Save payroll finance settings
export function useSavePayrollFinanceSettings() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useMutation({
    mutationFn: async (settings: PayrollFinanceSettings) => {
      const { data, error } = await (supabase as any)
        .from("module_finance_settings")
        .upsert({
          company_id: effectiveCompanyId,
          module_name: "payroll",
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
      queryClient.invalidateQueries({ queryKey: ["payroll-finance-settings"] });
      toast.success("Payroll finance settings saved");
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
}

// Post payroll batch to GL
export function usePostPayrollToGL() {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  return useMutation({
    mutationFn: async ({
      batch,
      settings,
    }: {
      batch: PayrollBatchForGL;
      settings: PayrollFinanceSettings;
    }) => {
      // Validate required accounts
      if (!settings.salary_expense_account_id) {
        throw new Error("Salary Expense Account not configured in Payroll Finance Settings");
      }
      if (!settings.net_salary_bank_account_id) {
        throw new Error("Net Salary Bank Account not configured in Payroll Finance Settings");
      }

      const prefix = settings.gl_prefix || "PAY";
      const entryNumber = `${prefix}-${format(new Date(), "yyyyMMddHHmmss")}`;
      const monthLabel = batch.payrollMonth;
      const description = batch.description || `Payroll Processing - ${monthLabel} (${batch.staffCount} staff)`;

      // Calculate total debits and credits
      const totalGrossExpense = batch.totalGrossSalary + batch.totalOvertime + batch.totalBonus;
      const totalEmployerContributions = batch.employerEPF + batch.employerETF;
      const totalDebits = totalGrossExpense + totalEmployerContributions;

      // Credits: employee deductions + net pay
      const totalCredits = batch.employeeEPF + batch.payeWithholding + batch.totalNetPay + totalEmployerContributions;

      // 1. Create Journal Entry
      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: format(new Date(), "yyyy-MM-dd"),
          description,
          reference: `Payroll-${monthLabel}`,
          total_debit: totalDebits,
          total_credit: totalCredits,
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
      const lines: Array<{
        journal_entry_id: string;
        account_id: string;
        description: string;
        debit: number;
        credit: number;
        company_id: string;
      }> = [];

      // DEBIT: Salary Expense
      if (batch.totalGrossSalary > 0) {
        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: settings.salary_expense_account_id,
          description: `Gross Salaries - ${monthLabel}`,
          debit: batch.totalGrossSalary,
          credit: 0,
          company_id: effectiveCompanyId,
        });
      }

      // DEBIT: Overtime Expense (if separate account configured)
      if (batch.totalOvertime > 0) {
        const overtimeAccountId = settings.overtime_expense_account_id || settings.salary_expense_account_id;
        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: overtimeAccountId!,
          description: `Overtime - ${monthLabel}`,
          debit: batch.totalOvertime,
          credit: 0,
          company_id: effectiveCompanyId,
        });
      }

      // DEBIT: Bonus Expense (if separate account configured)
      if (batch.totalBonus > 0) {
        const bonusAccountId = settings.bonus_expense_account_id || settings.salary_expense_account_id;
        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: bonusAccountId!,
          description: `Bonus - ${monthLabel}`,
          debit: batch.totalBonus,
          credit: 0,
          company_id: effectiveCompanyId,
        });
      }

      // DEBIT: Employer EPF Contribution
      if (batch.employerEPF > 0 && settings.employer_epf_expense_account_id) {
        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: settings.employer_epf_expense_account_id,
          description: `Employer EPF Contribution - ${monthLabel}`,
          debit: batch.employerEPF,
          credit: 0,
          company_id: effectiveCompanyId,
        });
      }

      // DEBIT: Employer ETF Contribution
      if (batch.employerETF > 0 && settings.employer_etf_expense_account_id) {
        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: settings.employer_etf_expense_account_id,
          description: `Employer ETF Contribution - ${monthLabel}`,
          debit: batch.employerETF,
          credit: 0,
          company_id: effectiveCompanyId,
        });
      }

      // CREDIT: Employee EPF Payable
      if (batch.employeeEPF > 0 && settings.employee_epf_payable_account_id) {
        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: settings.employee_epf_payable_account_id,
          description: `Employee EPF Deduction Payable - ${monthLabel}`,
          debit: 0,
          credit: batch.employeeEPF,
          company_id: effectiveCompanyId,
        });
      }

      // CREDIT: Employer EPF Payable (same account as employee EPF or separate)
      if (batch.employerEPF > 0 && settings.employee_epf_payable_account_id) {
        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: settings.employee_epf_payable_account_id,
          description: `Employer EPF Payable - ${monthLabel}`,
          debit: 0,
          credit: batch.employerEPF,
          company_id: effectiveCompanyId,
        });
      }

      // CREDIT: Employer ETF Payable
      if (batch.employerETF > 0 && settings.employer_etf_expense_account_id) {
        // ETF payable goes to a liability, fallback to EPF payable if no separate account
        const etfPayableId = settings.employee_epf_payable_account_id || settings.employer_etf_expense_account_id;
        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: etfPayableId!,
          description: `Employer ETF Payable - ${monthLabel}`,
          debit: 0,
          credit: batch.employerETF,
          company_id: effectiveCompanyId,
        });
      }

      // CREDIT: PAYE Withholding Payable
      if (batch.payeWithholding > 0 && settings.paye_withholding_account_id) {
        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: settings.paye_withholding_account_id,
          description: `PAYE Withholding Tax Payable - ${monthLabel}`,
          debit: 0,
          credit: batch.payeWithholding,
          company_id: effectiveCompanyId,
        });
      }

      // CREDIT: Net Salary Bank (payment to employees)
      if (batch.totalNetPay > 0) {
        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: settings.net_salary_bank_account_id!,
          description: `Net Salary Payment - ${monthLabel}`,
          debit: 0,
          credit: batch.totalNetPay,
          company_id: effectiveCompanyId,
        });
      }

      if (lines.length === 0) {
        throw new Error("No journal entry lines to post. Check payroll amounts.");
      }

      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(lines);

      if (linesError) throw linesError;

      // 3. Update COA balances
      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      // 4. Update bank account balance if bank account is linked
      const { data: bankAccount } = await supabase
        .from("bank_accounts")
        .select("id, current_balance")
        .eq("gl_account_id", settings.net_salary_bank_account_id)
        .maybeSingle();

      if (bankAccount && batch.totalNetPay > 0) {
        await supabase
          .from("bank_accounts")
          .update({
            current_balance: (bankAccount.current_balance || 0) - batch.totalNetPay,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bankAccount.id);

        // Create bank transaction
        await supabase
          .from("bank_transactions")
          .insert({
            bank_account_id: bankAccount.id,
            company_id: effectiveCompanyId,
            transaction_date: format(new Date(), "yyyy-MM-dd"),
            transaction_type: "payment",
            description: `Payroll - ${monthLabel} (${batch.staffCount} staff)`,
            reference: `Payroll-${monthLabel}`,
            debit_amount: batch.totalNetPay,
            credit_amount: 0,
            running_balance: (bankAccount.current_balance || 0) - batch.totalNetPay,
            journal_entry_id: journalEntry.id,
          });
      }

      return {
        journalEntryId: journalEntry.id,
        entryNumber: journalEntry.entry_number,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-finance-settings"] });
      toast.success("Payroll posted to General Ledger successfully");
    },
    onError: (error) => {
      toast.error(`Failed to post payroll to GL: ${error.message}`);
    },
  });
}

/**
 * Maintenance Finance Integration Hook
 * Posts completed maintenance costs to GL with proper double-entry bookkeeping:
 * DR Maintenance/Repair Expense | CR Bank/Cash or AP
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { format } from "date-fns";

export interface MaintenanceFinanceSettings {
  id?: string;
  company_id?: string;
  repair_expense_account_id: string | null;
  preventive_maintenance_account_id: string | null;
  emergency_maintenance_account_id: string | null;
  spare_parts_expense_account_id: string | null;
  bank_account_id: string | null;
  auto_post_on_complete: boolean;
  gl_prefix: string;
}

export interface MaintenanceCostForGL {
  maintenanceLogId: string;
  assetId: string;
  assetName?: string;
  maintenanceType: "preventive" | "corrective" | "predictive" | "emergency";
  description: string;
  cost: number;
  maintenanceDate: string;
  paymentMethod: "cash" | "bank" | "credit";
  vendorId?: string;
  vendorName?: string;
  sparePartsCost?: number;
  laborCost?: number;
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

// Fetch maintenance finance settings
export function useMaintenanceFinanceSettings() {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useQuery({
    queryKey: ["maintenance-finance-settings", effectiveCompanyId],
    queryFn: async (): Promise<MaintenanceFinanceSettings | null> => {
      const { data, error } = await supabase
        .from("module_finance_settings")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .eq("module_name", "maintenance")
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching maintenance finance settings:", error);
      }

      if (data?.settings) {
        return data.settings as unknown as MaintenanceFinanceSettings;
      }

      return {
        repair_expense_account_id: null,
        preventive_maintenance_account_id: null,
        emergency_maintenance_account_id: null,
        spare_parts_expense_account_id: null,
        bank_account_id: null,
        auto_post_on_complete: false,
        gl_prefix: "MAINT",
      };
    },
  });
}

// Save maintenance finance settings
export function useSaveMaintenanceFinanceSettings() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useMutation({
    mutationFn: async (settings: MaintenanceFinanceSettings) => {
      const { data, error } = await (supabase as any)
        .from("module_finance_settings")
        .upsert({
          company_id: effectiveCompanyId,
          module_name: "maintenance",
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
      queryClient.invalidateQueries({ queryKey: ["maintenance-finance-settings"] });
      toast.success("Maintenance finance settings saved");
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
}

// Post maintenance cost to GL
export function usePostMaintenanceCostToGL() {
  const queryClient = useQueryClient();
  const { selectedCompanyId, getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  return useMutation({
    mutationFn: async ({
      maintenance,
      settings,
    }: {
      maintenance: MaintenanceCostForGL;
      settings: MaintenanceFinanceSettings;
    }) => {
      if (maintenance.cost <= 0) {
        throw new Error("Maintenance cost must be greater than zero");
      }

      // Determine the correct expense account based on maintenance type
      let expenseAccountId: string | null = null;
      switch (maintenance.maintenanceType) {
        case "preventive":
          expenseAccountId = settings.preventive_maintenance_account_id || settings.repair_expense_account_id;
          break;
        case "emergency":
          expenseAccountId = settings.emergency_maintenance_account_id || settings.repair_expense_account_id;
          break;
        default:
          expenseAccountId = settings.repair_expense_account_id;
      }

      if (!expenseAccountId) {
        throw new Error("Maintenance expense account not configured in Finance Settings");
      }

      // Determine credit account
      let creditAccountId: string;
      if (maintenance.paymentMethod === "credit" && maintenance.vendorId) {
        // Credit purchase - AP
        const { data: payableAccount } = await supabase
          .from("chart_of_accounts")
          .select("id")
          .eq("company_id", effectiveCompanyId)
          .ilike("account_name", "%trade payable%")
          .eq("account_type", "liability")
          .limit(1)
          .maybeSingle();

        if (!payableAccount) {
          throw new Error("Trade Payable account not found. Please configure GL accounts.");
        }
        creditAccountId = payableAccount.id;
      } else {
        if (!settings.bank_account_id) {
          throw new Error("Bank/Cash account not configured in Maintenance Finance Settings");
        }
        creditAccountId = settings.bank_account_id;
      }

      const prefix = settings.gl_prefix || "MAINT";
      const entryNumber = `${prefix}-${format(new Date(), "yyyyMMddHHmmss")}`;

      // 1. Create Journal Entry
      const { data: journalEntry, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          entry_date: maintenance.maintenanceDate,
          description: `${maintenance.maintenanceType.charAt(0).toUpperCase() + maintenance.maintenanceType.slice(1)} Maintenance - ${maintenance.assetName || maintenance.assetId}`,
          reference: maintenance.maintenanceLogId,
          total_debit: maintenance.cost,
          total_credit: maintenance.cost,
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
      const lines: Array<{
        journal_entry_id: string;
        account_id: string;
        description: string;
        debit: number;
        credit: number;
        company_id: string;
      }> = [];

      // Split into spare parts + labor if provided
      if (maintenance.sparePartsCost && maintenance.sparePartsCost > 0 && settings.spare_parts_expense_account_id) {
        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: settings.spare_parts_expense_account_id,
          description: `Spare Parts - ${maintenance.description}`,
          debit: maintenance.sparePartsCost,
          credit: 0,
          company_id: effectiveCompanyId,
        });

        const laborCost = maintenance.cost - maintenance.sparePartsCost;
        if (laborCost > 0) {
          lines.push({
            journal_entry_id: journalEntry.id,
            account_id: expenseAccountId,
            description: `Labor - ${maintenance.description}`,
            debit: laborCost,
            credit: 0,
            company_id: effectiveCompanyId,
          });
        }
      } else {
        // Single expense line
        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: expenseAccountId,
          description: maintenance.description,
          debit: maintenance.cost,
          credit: 0,
          company_id: effectiveCompanyId,
        });
      }

      // Credit line
      lines.push({
        journal_entry_id: journalEntry.id,
        account_id: creditAccountId,
        description: maintenance.paymentMethod === "credit"
          ? `Payable to ${maintenance.vendorName || "Vendor"}`
          : `Payment for maintenance - ${maintenance.assetName || "Asset"}`,
        debit: 0,
        credit: maintenance.cost,
        company_id: effectiveCompanyId,
      });

      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(lines);

      if (linesError) throw linesError;

      // 3. Update COA balances
      await updateAccountBalancesFromJournalEntry(journalEntry.id);

      // 4. Update maintenance log with GL link
      await supabase
        .from("asset_maintenance_logs")
        .update({
          journal_entry_id: journalEntry.id,
          gl_posted: true,
        })
        .eq("id", maintenance.maintenanceLogId);

      // 5. Create AP Invoice if credit purchase
      if (maintenance.paymentMethod === "credit" && maintenance.vendorId) {
        const invoiceNumber = `MAINT-INV-${format(new Date(), "yyyyMMddHHmmss")}`;

        await supabase
          .from("ap_invoices")
          .insert({
            company_id: effectiveCompanyId,
            business_unit_code: businessUnitCode || "FLEET",
            vendor_id: maintenance.vendorId,
            invoice_number: invoiceNumber,
            invoice_date: maintenance.maintenanceDate,
            due_date: format(
              new Date(new Date(maintenance.maintenanceDate).setDate(
                new Date(maintenance.maintenanceDate).getDate() + 30
              )),
              "yyyy-MM-dd"
            ),
            total_amount: maintenance.cost,
            balance: maintenance.cost,
            paid_amount: 0,
            status: "unpaid",
            reference: maintenance.maintenanceLogId,
            notes: `Maintenance - ${maintenance.description}`,
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
      queryClient.invalidateQueries({ queryKey: ["asset-maintenance-logs"] });
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] });
      toast.success("Maintenance cost posted to General Ledger");
    },
    onError: (error) => {
      toast.error(`Failed to post maintenance cost: ${error.message}`);
    },
  });
}

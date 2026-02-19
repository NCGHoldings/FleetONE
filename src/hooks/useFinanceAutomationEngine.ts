/**
 * Finance Automation Engine
 * 
 * Centralized hook that powers automated GL operations:
 * - Auto-runs overdue recurring journal entries
 * - Validates GL balance integrity
 * - Reports automation health status across all modules
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

// ============ Types ============

export interface AutomationHealthStatus {
  module: string;
  label: string;
  status: "healthy" | "warning" | "error" | "disabled";
  message: string;
  lastRun?: string;
  pendingCount?: number;
}

export interface RecurringEntryOverdue {
  id: string;
  entry_name: string;
  frequency: string;
  amount: number;
  next_run_date: string;
  last_run_date: string | null;
  debit_account_id: string;
  credit_account_id: string;
  days_overdue: number;
}

export interface GLBalanceCheck {
  totalAccounts: number;
  discrepancyCount: number;
  discrepancies: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    currentBalance: number;
    calculatedBalance: number;
    difference: number;
  }>;
}

export interface RecentAutoPost {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  total_debit: number;
  created_at: string;
  source: string;
}

// ============ Overdue Recurring Entries ============

export const useOverdueRecurringEntries = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["overdue-recurring-entries", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];

      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await (supabase as any)
        .from("recurring_journal_entries")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .eq("is_active", true)
        .lte("next_run_date", today)
        .order("next_run_date", { ascending: true });

      if (error) throw error;

      return (data || []).map((entry: any) => ({
        ...entry,
        days_overdue: Math.floor(
          (new Date(today).getTime() - new Date(entry.next_run_date).getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      })) as RecurringEntryOverdue[];
    },
    enabled: !!selectedCompanyId,
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
  });
};

// ============ Run All Overdue Entries ============

export const useRunAllOverdueEntries = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (entries: RecurringEntryOverdue[]) => {
      if (!selectedCompanyId) throw new Error("No company selected");

      const { createAndPostJournalEntry, generateEntryNumber } = await import(
        "@/lib/gl-posting-utils"
      );

      const results: Array<{ id: string; success: boolean; error?: string }> = [];

      for (const entry of entries) {
        try {
          const today = new Date().toISOString().split("T")[0];
          const entryNumber = generateEntryNumber("REC");

          const glResult = await createAndPostJournalEntry({
            entry_date: today,
            description: `Auto-Recurring: ${entry.entry_name}`,
            reference: entryNumber,
            company_id: selectedCompanyId,
            lines: [
              {
                account_id: entry.debit_account_id,
                description: entry.entry_name,
                debit: entry.amount,
                credit: 0,
              },
              {
                account_id: entry.credit_account_id,
                description: entry.entry_name,
                debit: 0,
                credit: entry.amount,
              },
            ],
          });

          if (!glResult.success) {
            results.push({ id: entry.id, success: false, error: glResult.error });
            continue;
          }

          // Calculate next run date
          const nextRunDate = new Date(today);
          switch (entry.frequency) {
            case "daily": nextRunDate.setDate(nextRunDate.getDate() + 1); break;
            case "weekly": nextRunDate.setDate(nextRunDate.getDate() + 7); break;
            case "monthly": nextRunDate.setMonth(nextRunDate.getMonth() + 1); break;
            case "quarterly": nextRunDate.setMonth(nextRunDate.getMonth() + 3); break;
            case "yearly": nextRunDate.setFullYear(nextRunDate.getFullYear() + 1); break;
          }

          await (supabase as any)
            .from("recurring_journal_entries")
            .update({
              last_run_date: today,
              next_run_date: nextRunDate.toISOString().split("T")[0],
              run_count: (entry as any).run_count ? (entry as any).run_count + 1 : 1,
            })
            .eq("id", entry.id);

          results.push({ id: entry.id, success: true });
        } catch (err: any) {
          results.push({ id: entry.id, success: false, error: err.message });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      queryClient.invalidateQueries({ queryKey: ["recurring-entries"] });
      queryClient.invalidateQueries({ queryKey: ["overdue-recurring-entries"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });

      if (failCount === 0) {
        toast.success(`✅ All ${successCount} recurring entries posted to GL`);
      } else {
        toast.warning(`${successCount} posted, ${failCount} failed`);
      }
    },
    onError: (error) => toast.error(`Batch run failed: ${error.message}`),
  });
};

// ============ GL Balance Health Check ============

export const useGLBalanceHealthCheck = () => {
  const { selectedCompanyId } = useCompany();

  return useMutation({
    mutationFn: async (): Promise<GLBalanceCheck> => {
      if (!selectedCompanyId) throw new Error("No company selected");

      const { recalculateCOABalances } = await import("@/lib/gl-posting-utils");
      const result = await recalculateCOABalances(selectedCompanyId);

      if (!result.success) {
        throw new Error(result.error || "Balance check failed");
      }

      return {
        totalAccounts: result.discrepancies.length > 0
          ? result.discrepancies.length + 50 // approximate
          : 50,
        discrepancyCount: result.discrepancies.filter((d) => Math.abs(d.difference) > 0.01).length,
        discrepancies: result.discrepancies.filter((d) => Math.abs(d.difference) > 0.01),
      };
    },
  });
};

// ============ Fix Balance Discrepancies ============

export const useFixBalanceDiscrepancies = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (discrepancies: Array<{ accountId: string; calculatedBalance: number }>) => {
      const { fixBalanceDiscrepancies } = await import("@/lib/gl-posting-utils");
      const result = await fixBalanceDiscrepancies(discrepancies);
      if (!result.success) throw new Error(result.error || "Fix failed");
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success(`Fixed ${result.fixed} account balance discrepancies`);
    },
    onError: (error) => toast.error(`Fix failed: ${error.message}`),
  });
};

// ============ Recent Auto-Posted Entries ============

export const useRecentAutoPostEntries = (limit: number = 20) => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["recent-auto-posts", selectedCompanyId, limit],
    queryFn: async () => {
      if (!selectedCompanyId) return [];

      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, entry_number, entry_date, description, total_debit, created_at")
        .eq("company_id", selectedCompanyId)
        .eq("status", "posted")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((e) => {
        // Infer source from reference/description
        let source = "Manual";
        const desc = e.description?.toLowerCase() || "";
        if (desc.includes("recurring")) source = "Recurring";
        else if (desc.includes("depreciation")) source = "Depreciation";
        else if (desc.includes("fund transfer")) source = "Fund Transfer";
        else if (desc.includes("payroll")) source = "Payroll";
        else if (desc.includes("commission")) source = "Commission";
        else if (desc.includes("maintenance")) source = "Maintenance";
        else if (desc.includes("insurance")) source = "Insurance";
        else if (desc.includes("expense")) source = "Expense";
        else if (desc.includes("permit")) source = "Route Permit";
        else if (desc.includes("disposal")) source = "Asset Disposal";
        else if (desc.includes("inv-") || desc.includes("invoice")) source = "AR/AP";
        else if (desc.includes("rct-") || desc.includes("receipt")) source = "Receipt";
        else if (desc.includes("pmt-") || desc.includes("payment")) source = "Payment";

        return { ...e, source } as RecentAutoPost;
      });
    },
    enabled: !!selectedCompanyId,
  });
};

// ============ Module Automation Health ============

export const useModuleAutomationHealth = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["module-automation-health", selectedCompanyId],
    queryFn: async (): Promise<AutomationHealthStatus[]> => {
      if (!selectedCompanyId) return [];

      // Fetch module finance settings
      const { data: settings } = await (supabase as any)
        .from("module_finance_settings")
        .select("*")
        .eq("company_id", selectedCompanyId);

      // Fetch GL settings
      const { data: glSettings } = await supabase
        .from("gl_settings")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .maybeSingle();

      const moduleMap = new Map<string, any>();
      (settings || []).forEach((s: any) => {
        try {
          moduleMap.set(s.module_name, typeof s.settings === "string" ? JSON.parse(s.settings) : s.settings);
        } catch {
          moduleMap.set(s.module_name, s.settings);
        }
      });

      const statuses: AutomationHealthStatus[] = [];

      // Core GL
      statuses.push({
        module: "core_gl",
        label: "Core GL Settings",
        status: glSettings?.trade_receivable_account_id && glSettings?.trade_payable_account_id ? "healthy" : "warning",
        message: glSettings?.trade_receivable_account_id ? "AR/AP accounts configured" : "Missing AR/AP GL account mappings",
      });

      // Payroll
      const payrollSettings = moduleMap.get("payroll");
      statuses.push({
        module: "payroll",
        label: "Payroll",
        status: payrollSettings?.auto_post_on_process ? "healthy" : payrollSettings ? "warning" : "disabled",
        message: payrollSettings?.auto_post_on_process
          ? "Auto-post on process: ON"
          : payrollSettings
          ? "Auto-post disabled — manual GL required"
          : "Not configured",
      });

      // Commissions
      const commSettings = moduleMap.get("commissions");
      statuses.push({
        module: "commissions",
        label: "Commissions",
        status: commSettings?.auto_post_on_paid ? "healthy" : commSettings ? "warning" : "disabled",
        message: commSettings?.auto_post_on_paid
          ? "Auto-post on paid: ON"
          : commSettings
          ? "Auto-post disabled"
          : "Not configured",
      });

      // Maintenance
      const maintSettings = moduleMap.get("maintenance");
      statuses.push({
        module: "maintenance",
        label: "Maintenance",
        status: maintSettings?.auto_post_on_complete ? "healthy" : maintSettings ? "warning" : "disabled",
        message: maintSettings?.auto_post_on_complete
          ? "Auto-post on complete: ON"
          : maintSettings
          ? "Auto-post disabled"
          : "Not configured",
      });

      // Insurance
      const insSettings = moduleMap.get("insurance");
      statuses.push({
        module: "insurance",
        label: "Insurance",
        status: insSettings?.auto_post_premium ? "healthy" : insSettings ? "warning" : "disabled",
        message: insSettings?.auto_post_premium
          ? "Auto-post premiums: ON"
          : insSettings
          ? "Auto-post disabled"
          : "Not configured",
      });

      // Expenses
      const expSettings = moduleMap.get("expense_requests");
      statuses.push({
        module: "expenses",
        label: "Expense Requests",
        status: expSettings?.auto_post_on_approve ? "healthy" : expSettings ? "warning" : "disabled",
        message: expSettings?.auto_post_on_approve
          ? "Auto-post on approve: ON"
          : expSettings
          ? "Auto-post disabled"
          : "Not configured",
      });

      // Route Permits
      const permitSettings = moduleMap.get("route_permits");
      statuses.push({
        module: "permits",
        label: "Route Permits",
        status: permitSettings?.auto_post_on_renewal ? "healthy" : permitSettings ? "warning" : "disabled",
        message: permitSettings?.auto_post_on_renewal
          ? "Auto-post on renewal: ON"
          : permitSettings
          ? "Auto-post disabled"
          : "Not configured",
      });

      return statuses;
    },
    enabled: !!selectedCompanyId,
    refetchInterval: 10 * 60 * 1000, // 10 mins
  });
};

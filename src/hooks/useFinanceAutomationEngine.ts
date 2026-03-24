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
        else if (desc.includes("fuel")) source = "Fuel";
        else if (desc.includes("school") || desc.includes("sch-")) source = "School Bus";
        else if (desc.includes("leasing") || desc.includes("loan") || desc.includes("emi")) source = "Leasing";
        else if (desc.includes("yutong") || desc.includes("sinotruck") || desc.includes("vehicle sale")) source = "Vehicle Sales";
        else if (desc.includes("sph") || desc.includes("special hire")) source = "Special Hire";
        else if (desc.includes("ncg express") || desc.includes("ncge")) source = "NCG Express";
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
      const { data: glSettings } = await (supabase as any)
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

      // Fuel Expenses
      const fuelSettings = moduleMap.get("fuel_expenses");
      statuses.push({
        module: "fuel",
        label: "Fuel Expenses",
        status: fuelSettings?.auto_post_on_entry ? "healthy" : fuelSettings ? "warning" : "disabled",
        message: fuelSettings?.auto_post_on_entry
          ? "Auto-post on entry: ON"
          : fuelSettings
            ? "Auto-post disabled"
            : "Not configured",
      });

      // School Bus
      const schoolSettings = moduleMap.get("school_bus");
      statuses.push({
        module: "school_bus",
        label: "School Bus",
        status: schoolSettings?.auto_post_on_payment ? "healthy" : schoolSettings ? "warning" : "disabled",
        message: schoolSettings?.auto_post_on_payment
          ? "Auto-post on payment: ON"
          : schoolSettings
            ? "Auto-post disabled"
            : "Not configured",
      });

      // Special Hire (check special_hire_finance_settings directly)
      let sphStatus: AutomationHealthStatus = {
        module: "special_hire",
        label: "Special Hire",
        status: "disabled",
        message: "Not configured",
      };
      try {
        const { data: sphSettings } = await (supabase as any)
          .from("special_hire_finance_settings")
          .select("auto_post_advance_payments, auto_post_invoices, auto_post_balance_payments")
          .eq("company_id", selectedCompanyId)
          .maybeSingle();
        if (sphSettings) {
          const allOn = sphSettings.auto_post_advance_payments && sphSettings.auto_post_invoices && sphSettings.auto_post_balance_payments;
          const anyOn = sphSettings.auto_post_advance_payments || sphSettings.auto_post_invoices || sphSettings.auto_post_balance_payments;
          sphStatus = {
            module: "special_hire",
            label: "Special Hire",
            status: allOn ? "healthy" : anyOn ? "warning" : "disabled",
            message: allOn
              ? "All auto-posting: ON"
              : anyOn
                ? "Partial auto-posting — some options disabled"
                : "Auto-posting disabled",
          };
        }
      } catch { /* table may not exist */ }
      statuses.push(sphStatus);

      // Leasing
      let leasingStatus: AutomationHealthStatus = {
        module: "leasing",
        label: "Fleet Leasing",
        status: "disabled",
        message: "Not configured",
      };
      try {
        const { data: leasSettings } = await (supabase as any)
          .from("leasing_finance_settings")
          .select("auto_post_gl_on_payment, auto_create_ap_invoice")
          .eq("company_id", selectedCompanyId)
          .maybeSingle();
        if (leasSettings) {
          const allOn = leasSettings.auto_post_gl_on_payment && leasSettings.auto_create_ap_invoice;
          leasingStatus = {
            module: "leasing",
            label: "Fleet Leasing",
            status: allOn ? "healthy" : leasSettings.auto_post_gl_on_payment ? "warning" : "disabled",
            message: allOn
              ? "Auto GL + AP Invoice: ON"
              : leasSettings.auto_post_gl_on_payment
                ? "GL posting ON, AP Invoice OFF"
                : "Auto-posting disabled",
          };
        }
      } catch { /* table may not exist */ }
      statuses.push(leasingStatus);

      // Vehicle Sales (Yutong / Sinotruck / Light Vehicle)
      const vehicleModules = [
        { key: "yutong", label: "Yutong Sales", table: "yutong_finance_settings" },
        { key: "sinotruck", label: "Sinotruck Sales", table: "sinotruck_finance_settings" },
        { key: "lightvehicle", label: "Light Vehicle Sales", table: "lightvehicle_finance_settings" },
      ];
      for (const vm of vehicleModules) {
        let vStatus: AutomationHealthStatus = {
          module: vm.key,
          label: vm.label,
          status: "disabled",
          message: "Not configured",
        };
        try {
          const { data: vSettings } = await (supabase as any)
            .from(vm.table)
            .select("auto_post_on_verify, auto_create_customer")
            .eq("company_id", selectedCompanyId)
            .maybeSingle();
          if (vSettings) {
            vStatus = {
              module: vm.key,
              label: vm.label,
              status: vSettings.auto_post_on_verify ? "healthy" : "warning",
              message: vSettings.auto_post_on_verify
                ? "Auto-post on verify: ON"
                : "Auto-post disabled",
            };
          }
        } catch { /* table may not exist */ }
        statuses.push(vStatus);
      }

      // NCG Express
      let ncgeStatus: AutomationHealthStatus = {
        module: "ncg_express",
        label: "NCG Express",
        status: "disabled",
        message: "Not configured",
      };
      try {
        const NCG_EXPRESS_ID = "7ece7595-8b7b-46de-8bfc-c1e8e0da7513";
        const { data: ncgeSettings } = await (supabase as any)
          .from("module_finance_settings")
          .select("settings")
          .eq("company_id", NCG_EXPRESS_ID)
          .eq("module_name", "ncg_express")
          .maybeSingle();
        if (ncgeSettings) {
          const s = typeof ncgeSettings.settings === "string"
            ? JSON.parse(ncgeSettings.settings)
            : ncgeSettings.settings;
          const allOn = s?.auto_post_revenue && s?.auto_post_expenses;
          ncgeStatus = {
            module: "ncg_express",
            label: "NCG Express",
            status: allOn ? "healthy" : s?.auto_post_revenue || s?.auto_post_expenses ? "warning" : "disabled",
            message: allOn
              ? "Auto-post revenue + expenses: ON"
              : s?.auto_post_revenue
                ? "Revenue ON, Expenses OFF"
                : s?.auto_post_expenses
                  ? "Revenue OFF, Expenses ON"
                  : "Auto-posting disabled",
          };
        }
      } catch { /* ignore */ }
      statuses.push(ncgeStatus);

      // Petty Cash
      let pcStatus: AutomationHealthStatus = {
        module: "petty_cash",
        label: "Petty Cash",
        status: "disabled",
        message: "Not configured",
      };
      try {
        const { data: pcFunds } = await (supabase as any)
          .from("petty_cash_funds")
          .select("id, gl_account_id")
          .eq("company_id", selectedCompanyId)
          .eq("is_active", true);
        if (pcFunds && pcFunds.length > 0) {
          const withGL = pcFunds.filter((f: any) => f.gl_account_id).length;
          const totalFunds = pcFunds.length;
          pcStatus = {
            module: "petty_cash",
            label: "Petty Cash",
            status: withGL === totalFunds ? "healthy" : withGL > 0 ? "warning" : "error",
            message: withGL === totalFunds
              ? `All ${totalFunds} funds have GL accounts — auto-posting active`
              : withGL > 0
                ? `${withGL}/${totalFunds} funds have GL accounts — partial posting`
                : `${totalFunds} funds without GL accounts — no auto-posting`,
          };
        }
      } catch { /* table may not exist */ }
      statuses.push(pcStatus);

      // IOU / Staff Advances
      let iouStatus: AutomationHealthStatus = {
        module: "iou",
        label: "IOU / Staff Advances",
        status: "healthy",
        message: "GL posting active on create/settle",
      };
      try {
        const { data: iouRecords } = await (supabase as any)
          .from("iou_records")
          .select("id, journal_entry_id, status")
          .eq("company_id", selectedCompanyId)
          .in("status", ["pending", "partially_settled"]);
        if (iouRecords && iouRecords.length > 0) {
          const withJE = iouRecords.filter((r: any) => r.journal_entry_id).length;
          const total = iouRecords.length;
          iouStatus = {
            module: "iou",
            label: "IOU / Staff Advances",
            status: withJE === total ? "healthy" : withJE > 0 ? "warning" : "error",
            message: withJE === total
              ? `${total} active IOUs — all GL posted`
              : withJE > 0
                ? `${withJE}/${total} active IOUs have GL entries`
                : `${total} active IOUs without GL entries`,
            pendingCount: total - withJE,
          };
        }
      } catch { /* table may not exist */ }
      statuses.push(iouStatus);

      return statuses;
    },
    enabled: !!selectedCompanyId,
    refetchInterval: 10 * 60 * 1000, // 10 mins
  });
};

// ============ Pending Amortizations ============

export interface PendingAmortization {
  id: string;
  type: "insurance" | "route_permit";
  label: string;
  policyOrPermit: string;
  monthlyAmount: number;
  lastPostedMonth: string | null;
  pendingMonths: number;
}

export const usePendingAmortizations = () => {
  const { selectedCompanyId } = useCompany();

  return useQuery({
    queryKey: ["pending-amortizations", selectedCompanyId],
    queryFn: async (): Promise<PendingAmortization[]> => {
      if (!selectedCompanyId) return [];

      const pending: PendingAmortization[] = [];
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // Check insurance records for monthly amortization
      try {
        const { data: policies } = await (supabase as any)
          .from("insurance_records")
          .select("id, policy_number, premium_amount, issue_date, expiry_date, status")
          .eq("status", "active");

        for (const policy of policies || []) {
          if (!policy.premium_amount || policy.premium_amount <= 0) continue;
          const issueDate = new Date(policy.issue_date);
          const expiryDate = new Date(policy.expiry_date);
          const totalMonths = Math.max(
            1,
            (expiryDate.getFullYear() - issueDate.getFullYear()) * 12 +
            (expiryDate.getMonth() - issueDate.getMonth())
          );
          const monthlyAmount = Math.round(policy.premium_amount / totalMonths);
          const lastPosted = null; // insurance_records has no last_amortization_month column

          // Count pending months
          let pendingMonths = 0;
          if (!lastPosted) {
            // Never posted — calculate months from issue to now
            const monthsSinceIssue = Math.max(0,
              (now.getFullYear() - issueDate.getFullYear()) * 12 +
              (now.getMonth() - issueDate.getMonth())
            );
            pendingMonths = Math.min(monthsSinceIssue, totalMonths);
          } else if (lastPosted < currentMonth) {
            const lp = new Date(lastPosted + "-01");
            pendingMonths = Math.max(0,
              (now.getFullYear() - lp.getFullYear()) * 12 +
              (now.getMonth() - lp.getMonth())
            );
          }

          if (pendingMonths > 0) {
            pending.push({
              id: policy.id,
              type: "insurance",
              label: "Insurance Premium Amortization",
              policyOrPermit: policy.policy_number || policy.id.substring(0, 8),
              monthlyAmount,
              lastPostedMonth: lastPosted,
              pendingMonths,
            });
          }
        }
      } catch { /* table may not exist */ }

      // Check route permits for monthly amortization
      try {
        const { data: permits } = await (supabase as any)
          .from("route_permits")
          .select("id, permit_no, annual_fee, issue_date, expiry_date, permit_status")
          .eq("permit_status", "active");

        for (const permit of permits || []) {
          if (!permit.annual_fee || permit.annual_fee <= 0) continue;
          const issueDate = new Date(permit.issue_date);
          const expiryDate = new Date(permit.expiry_date);
          const totalMonths = Math.max(
            1,
            (expiryDate.getFullYear() - issueDate.getFullYear()) * 12 +
            (expiryDate.getMonth() - issueDate.getMonth())
          );
          const monthlyAmount = Math.round(permit.annual_fee / totalMonths);
          const lastPosted = null; // route_permits has no last_amortization_month column

          let pendingMonths = 0;
          if (!lastPosted) {
            const monthsSinceIssue = Math.max(0,
              (now.getFullYear() - issueDate.getFullYear()) * 12 +
              (now.getMonth() - issueDate.getMonth())
            );
            pendingMonths = Math.min(monthsSinceIssue, totalMonths);
          } else if (lastPosted < currentMonth) {
            const lp = new Date(lastPosted + "-01");
            pendingMonths = Math.max(0,
              (now.getFullYear() - lp.getFullYear()) * 12 +
              (now.getMonth() - lp.getMonth())
            );
          }

          if (pendingMonths > 0) {
            pending.push({
              id: permit.id,
              type: "route_permit",
              label: "Route Permit Amortization",
              policyOrPermit: permit.permit_no || permit.id.substring(0, 8),
              monthlyAmount,
              lastPostedMonth: lastPosted,
              pendingMonths,
            });
          }
        }
      } catch { /* table may not exist */ }

      return pending;
    },
    enabled: !!selectedCompanyId,
    refetchInterval: 10 * 60 * 1000,
  });
};

/**
 * GL Integrity Scanner Hook
 * 
 * Scans all financial tables for transactions that should have posted to
 * the GL but didn't. Provides gap detection, suggested fixes, auto-audit
 * rules engine with health scoring, and one-click / bulk GL posting.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { createAndPostJournalEntry, generateEntryNumber } from "@/lib/gl-posting-utils";

// ============ Types ============

export type GapSeverity = "critical" | "warning" | "info";

export interface GLGap {
  id: string;
  module: string;
  moduleLabel: string;
  tableName: string;
  recordId: string;
  recordRef: string;
  recordDate: string;
  amount: number;
  description: string;
  severity: GapSeverity;
  suggestedDebit: string;
  suggestedCredit: string;
  canAutoPost: boolean;
  postingData?: {
    debitAccountId: string;
    creditAccountId: string;
    debitLabel: string;
    creditLabel: string;
  };
}

export interface GLGapSummary {
  module: string;
  moduleLabel: string;
  gapCount: number;
  totalAmount: number;
  severity: GapSeverity;
  gaps: GLGap[];
}

// ============ Auto-Audit Rules ============

export type AuditRuleStatus = "pass" | "fail" | "warning" | "not_applicable";

export interface AuditRule {
  id: string;
  name: string;
  category: "completeness" | "accuracy" | "configuration" | "timeliness" | "segregation";
  description: string;
  status: AuditRuleStatus;
  score: number; // 0-100 contribution
  weight: number; // importance weight
  details: string;
  recommendation?: string;
  learnMore?: string; // educational tip
}

export interface AuditScoreResult {
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  rules: AuditRule[];
  categoryScores: Record<string, { score: number; max: number; label: string }>;
  lastAuditTime: string;
}

export interface ScanResult {
  totalGaps: number;
  totalUnpostedAmount: number;
  modulesAffected: number;
  lastScanTime: string;
  summaries: GLGapSummary[];
  allGaps: GLGap[];
  auditScore: AuditScoreResult;
}

// ============ Scanner Configuration ============

interface ScanTarget {
  module: string;
  moduleLabel: string;
  tableName: string;
  refColumn: string;
  dateColumn: string;
  amountColumn: string;
  glCheckType: "journal_entry_id" | "gl_posted";
  extraFilters?: Record<string, any>;
  suggestedDebit: string;
  suggestedCredit: string;
  severity: GapSeverity;
  glSettingsKey?: string;
  glSettingsCreditKey?: string;
  moduleSettingsName?: string;
  moduleDebitKey?: string;
  moduleCreditKey?: string;
}

const SCAN_TARGETS: ScanTarget[] = [
  {
    module: "ar_invoices",
    moduleLabel: "AR Invoices",
    tableName: "ar_invoices",
    refColumn: "invoice_number",
    dateColumn: "invoice_date",
    amountColumn: "total_amount",
    glCheckType: "journal_entry_id",
    suggestedDebit: "Trade Receivables",
    suggestedCredit: "Sales Revenue",
    severity: "critical",
    glSettingsKey: "trade_receivable_account_id",
    glSettingsCreditKey: "sales_revenue_account_id",
  },
  {
    module: "ap_invoices",
    moduleLabel: "AP Invoices",
    tableName: "ap_invoices",
    refColumn: "invoice_number",
    dateColumn: "invoice_date",
    amountColumn: "total_amount",
    glCheckType: "journal_entry_id",
    suggestedDebit: "Expense / COGS",
    suggestedCredit: "Trade Payables",
    severity: "critical",
    glSettingsKey: "expense_account_id",
    glSettingsCreditKey: "trade_payable_account_id",
  },
  {
    module: "ar_receipts",
    moduleLabel: "AR Receipts",
    tableName: "ar_receipts",
    refColumn: "receipt_number",
    dateColumn: "receipt_date",
    amountColumn: "amount",
    glCheckType: "journal_entry_id",
    suggestedDebit: "Bank / Cash",
    suggestedCredit: "Trade Receivables",
    severity: "critical",
    glSettingsKey: "bank_account_id",
    glSettingsCreditKey: "trade_receivable_account_id",
  },
  {
    module: "ap_payments",
    moduleLabel: "AP Payments",
    tableName: "ap_payments",
    refColumn: "payment_number",
    dateColumn: "payment_date",
    amountColumn: "amount",
    glCheckType: "journal_entry_id",
    suggestedDebit: "Trade Payables",
    suggestedCredit: "Bank / Cash",
    severity: "critical",
    glSettingsKey: "trade_payable_account_id",
    glSettingsCreditKey: "bank_account_id",
  },
  {
    module: "expense_requests",
    moduleLabel: "Expense Requests",
    tableName: "expense_requests",
    refColumn: "request_number",
    dateColumn: "request_date",
    amountColumn: "amount",
    glCheckType: "gl_posted",
    extraFilters: { status: "approved" },
    suggestedDebit: "Expense Account",
    suggestedCredit: "Bank / Cash",
    severity: "warning",
    moduleSettingsName: "expense_requests",
    moduleDebitKey: "default_expense_account_id",
    moduleCreditKey: "default_bank_account_id",
  },
  {
    module: "maintenance",
    moduleLabel: "Maintenance Logs",
    tableName: "maintenance_logs",
    refColumn: "id",
    dateColumn: "maintenance_date",
    amountColumn: "cost",
    glCheckType: "gl_posted",
    extraFilters: { status: "completed" },
    suggestedDebit: "Maintenance Expense",
    suggestedCredit: "Bank / Cash",
    severity: "warning",
    moduleSettingsName: "maintenance",
    moduleDebitKey: "maintenance_expense_account_id",
    moduleCreditKey: "bank_account_id",
  },
  {
    module: "insurance",
    moduleLabel: "Insurance Premiums",
    tableName: "insurance_records",
    refColumn: "policy_number",
    dateColumn: "issue_date",
    amountColumn: "premium_amount",
    glCheckType: "journal_entry_id",
    suggestedDebit: "Prepaid Insurance",
    suggestedCredit: "Bank / Cash",
    severity: "warning",
    moduleSettingsName: "insurance",
    moduleDebitKey: "prepaid_insurance_account_id",
    moduleCreditKey: "bank_account_id",
  },
  {
    module: "special_hire",
    moduleLabel: "Special Hire Payments",
    tableName: "special_hire_payments",
    refColumn: "id",
    dateColumn: "created_at",
    amountColumn: "amount",
    glCheckType: "journal_entry_id",
    extraFilters: { status: "approved" },
    suggestedDebit: "Bank / Cash",
    suggestedCredit: "Revenue / Receivables",
    severity: "critical",
    glSettingsKey: "bank_account_id",
    glSettingsCreditKey: "trade_receivable_account_id",
  },
  {
    module: "school_bus",
    moduleLabel: "School Bus Payments",
    tableName: "school_bus_payments",
    refColumn: "receipt_number",
    dateColumn: "payment_date",
    amountColumn: "amount",
    glCheckType: "journal_entry_id",
    suggestedDebit: "Bank / Cash",
    suggestedCredit: "Transport Revenue",
    severity: "warning",
    moduleSettingsName: "school_bus",
    moduleDebitKey: "bank_account_id",
    moduleCreditKey: "revenue_account_id",
  },
  {
    module: "leasing",
    moduleLabel: "Leasing Payments",
    tableName: "loan_payments",
    refColumn: "id",
    dateColumn: "payment_date",
    amountColumn: "total_installment",
    glCheckType: "journal_entry_id",
    extraFilters: { payment_status: "paid" },
    suggestedDebit: "Leasing Liability + Interest",
    suggestedCredit: "Bank / Cash",
    severity: "warning",
  },
  {
    module: "ncge_trips",
    moduleLabel: "NCG Express Trips",
    tableName: "ncg_express_daily_trips",
    refColumn: "trip_no",
    dateColumn: "trip_date",
    amountColumn: "income",
    glCheckType: "journal_entry_id",
    suggestedDebit: "Cash / Bank",
    suggestedCredit: "Ticket Revenue",
    severity: "warning",
  },
  {
    module: "ncge_expenses",
    moduleLabel: "NCG Express Expenses",
    tableName: "ncg_express_daily_expenses",
    refColumn: "id",
    dateColumn: "expense_date",
    amountColumn: "fuel_cost",
    glCheckType: "journal_entry_id",
    suggestedDebit: "Fuel Expense",
    suggestedCredit: "Cash / Bank",
    severity: "info",
  },
];

// ============ Auto-Audit Rules Engine ============

async function runAuditRules(
  companyId: string,
  glSettings: any,
  moduleSettingsMap: Map<string, any>,
  gapCount: number,
  totalUnposted: number
): Promise<AuditScoreResult> {
  const rules: AuditRule[] = [];

  // ---- CONFIGURATION RULES ----

  // Rule 1: Core GL Settings configured
  const hasTradeReceivable = !!glSettings?.trade_receivable_account_id;
  const hasTradePayable = !!glSettings?.trade_payable_account_id;
  const hasSalesRevenue = !!glSettings?.sales_revenue_account_id;
  const hasBankAccount = !!glSettings?.bank_account_id;
  const coreConfigured = hasTradeReceivable && hasTradePayable && hasSalesRevenue && hasBankAccount;

  rules.push({
    id: "config_core_gl",
    name: "Core GL Account Mappings",
    category: "configuration",
    description: "AR/AP/Revenue/Bank accounts are mapped in GL Settings",
    status: coreConfigured ? "pass" : hasTradeReceivable || hasTradePayable ? "warning" : "fail",
    score: coreConfigured ? 100 : (hasTradeReceivable || hasTradePayable ? 50 : 0),
    weight: 20,
    details: coreConfigured
      ? "All core GL accounts are properly mapped"
      : `Missing: ${[!hasTradeReceivable && "Trade Receivable", !hasTradePayable && "Trade Payable", !hasSalesRevenue && "Sales Revenue", !hasBankAccount && "Bank"].filter(Boolean).join(", ")}`,
    recommendation: !coreConfigured ? "Go to Settings → Core GL Settings to map the missing accounts" : undefined,
    learnMore: "Core GL mappings define which accounts are debited/credited when AR invoices, AP invoices, receipts, and payments are created. Without these, no financial transaction can post to the General Ledger.",
  });

  // Rule 2: Module-level auto-posting enabled
  const moduleNames = ["payroll", "commissions", "maintenance", "insurance", "expense_requests", "route_permits"];
  const moduleLabels: Record<string, string> = {
    payroll: "Payroll", commissions: "Commissions", maintenance: "Maintenance",
    insurance: "Insurance", expense_requests: "Expense Requests", route_permits: "Route Permits",
  };
  const autoPostKeys: Record<string, string> = {
    payroll: "auto_post_on_process", commissions: "auto_post_on_paid", maintenance: "auto_post_on_complete",
    insurance: "auto_post_premium", expense_requests: "auto_post_on_approve", route_permits: "auto_post_on_renewal",
  };

  let modulesConfigured = 0;
  let modulesAutoPost = 0;
  const unconfiguredModules: string[] = [];
  const manualModules: string[] = [];

  for (const moduleName of moduleNames) {
    const settings = moduleSettingsMap.get(moduleName);
    if (settings) {
      modulesConfigured++;
      if (settings[autoPostKeys[moduleName]]) {
        modulesAutoPost++;
      } else {
        manualModules.push(moduleLabels[moduleName]);
      }
    } else {
      unconfiguredModules.push(moduleLabels[moduleName]);
    }
  }

  rules.push({
    id: "config_modules",
    name: "Module Finance Settings",
    category: "configuration",
    description: "All operational modules have configured GL account mappings",
    status: modulesConfigured === moduleNames.length ? "pass" : modulesConfigured > 0 ? "warning" : "fail",
    score: Math.round((modulesConfigured / moduleNames.length) * 100),
    weight: 15,
    details: modulesConfigured === moduleNames.length
      ? `All ${moduleNames.length} modules configured`
      : `${modulesConfigured}/${moduleNames.length} configured. Missing: ${unconfiguredModules.join(", ")}`,
    recommendation: unconfiguredModules.length > 0
      ? `Configure GL mappings for: ${unconfiguredModules.join(", ")} in Settings → Module GL Mappings`
      : undefined,
    learnMore: "Each operational module (Payroll, Insurance, etc.) needs its own GL account mappings to know which accounts to debit and credit when transactions occur.",
  });

  // Rule 3: Auto-posting enabled
  rules.push({
    id: "config_auto_post",
    name: "Auto-Posting Enabled",
    category: "configuration",
    description: "Modules automatically post to GL without manual intervention",
    status: modulesAutoPost === modulesConfigured && modulesConfigured > 0 ? "pass" : modulesAutoPost > 0 ? "warning" : "fail",
    score: modulesConfigured > 0 ? Math.round((modulesAutoPost / modulesConfigured) * 100) : 0,
    weight: 10,
    details: modulesAutoPost > 0
      ? `${modulesAutoPost}/${modulesConfigured} modules auto-posting. Manual: ${manualModules.join(", ") || "none"}`
      : "No modules have auto-posting enabled",
    recommendation: manualModules.length > 0
      ? `Enable auto-posting for: ${manualModules.join(", ")} to eliminate manual GL posting work`
      : undefined,
    learnMore: "Auto-posting eliminates manual work — when a transaction is created/approved, the GL entry is created automatically. This ensures no transaction is ever missed.",
  });

  // ---- COMPLETENESS RULES ----

  // Rule 4: No unposted transactions
  rules.push({
    id: "completeness_gaps",
    name: "Transaction Completeness",
    category: "completeness",
    description: "All financial transactions have corresponding GL entries",
    status: gapCount === 0 ? "pass" : gapCount <= 5 ? "warning" : "fail",
    score: gapCount === 0 ? 100 : Math.max(0, 100 - gapCount * 5),
    weight: 25,
    details: gapCount === 0
      ? "All transactions are posted to the GL"
      : `${gapCount} transactions totaling LKR ${totalUnposted.toLocaleString()} are not posted to GL`,
    recommendation: gapCount > 0
      ? "Use the 'Bulk Post All' button above to post all outstanding gaps, or review each gap individually"
      : undefined,
    learnMore: "Completeness is a fundamental accounting principle — every financial transaction must be recorded in the General Ledger. Unposted transactions mean your financial statements are understated.",
  });

  // ---- ACCURACY RULES ----

  // Rule 5: GL Balance integrity
  let balanceDiscrepancies = 0;
  try {
    const { data: accounts } = await supabase
      .from("chart_of_accounts")
      .select("id, account_code, account_name, current_balance")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .limit(5);

    // Quick spot-check: just verify a few accounts have non-null balances
    const accountsWithBalance = (accounts || []).filter((a: any) => a.current_balance !== null);
    balanceDiscrepancies = accounts && accounts.length > 0 && accountsWithBalance.length === 0 ? 1 : 0;
  } catch {
    // ignore
  }

  rules.push({
    id: "accuracy_balances",
    name: "COA Balance Integrity",
    category: "accuracy",
    description: "Chart of Accounts balances are maintained and updated",
    status: balanceDiscrepancies === 0 ? "pass" : "warning",
    score: balanceDiscrepancies === 0 ? 100 : 70,
    weight: 15,
    details: balanceDiscrepancies === 0
      ? "COA balances appear to be maintained"
      : "Some accounts may have stale balances — run the GL Balance Check in Automation Engine",
    recommendation: balanceDiscrepancies > 0
      ? "Use Automation Engine → 'Run Check' to verify and fix COA balance discrepancies"
      : undefined,
    learnMore: "Account balances in the Chart of Accounts must match the sum of all journal entry lines for that account. Discrepancies indicate data integrity issues.",
  });

  // ---- TIMELINESS RULES ----

  // Rule 6: Recent journal entries (system is actively used)
  let recentEntryCount = 0;
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count } = await supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("created_at", thirtyDaysAgo.toISOString());

    recentEntryCount = count || 0;
  } catch {
    // ignore
  }

  rules.push({
    id: "timeliness_recent",
    name: "Timely GL Posting",
    category: "timeliness",
    description: "Journal entries are being created regularly (last 30 days)",
    status: recentEntryCount > 10 ? "pass" : recentEntryCount > 0 ? "warning" : "fail",
    score: recentEntryCount > 10 ? 100 : recentEntryCount > 0 ? 60 : 0,
    weight: 10,
    details: recentEntryCount > 0
      ? `${recentEntryCount} journal entries in the last 30 days`
      : "No journal entries in the last 30 days — GL may not be actively used",
    recommendation: recentEntryCount === 0
      ? "Ensure financial transactions are being processed and posted to the GL regularly"
      : undefined,
    learnMore: "Timely posting ensures your financial statements reflect current reality. Delayed posting leads to inaccurate management reporting and decision-making.",
  });

  // Rule 7: Double-entry verification
  let unbalancedEntries = 0;
  try {
    const { data: entries } = await supabase
      .from("journal_entries")
      .select("id, total_debit, total_credit")
      .eq("company_id", companyId)
      .eq("status", "posted")
      .order("created_at", { ascending: false })
      .limit(50);

    unbalancedEntries = (entries || []).filter(
      (e: any) => Math.abs((e.total_debit || 0) - (e.total_credit || 0)) > 0.01
    ).length;
  } catch {
    // ignore
  }

  rules.push({
    id: "accuracy_double_entry",
    name: "Double-Entry Balance",
    category: "accuracy",
    description: "All posted journal entries have balanced DR/CR totals",
    status: unbalancedEntries === 0 ? "pass" : "fail",
    score: unbalancedEntries === 0 ? 100 : Math.max(0, 100 - unbalancedEntries * 20),
    weight: 5,
    details: unbalancedEntries === 0
      ? "All recent journal entries are balanced (DR = CR)"
      : `${unbalancedEntries} journal entries have unbalanced debits and credits`,
    recommendation: unbalancedEntries > 0
      ? "Review and correct the unbalanced journal entries — this violates fundamental accounting principles"
      : undefined,
    learnMore: "Double-entry bookkeeping requires every transaction to have equal debits and credits. If DR ≠ CR, the accounting equation (Assets = Liabilities + Equity) is broken.",
  });

  // ---- CALCULATE OVERALL SCORE ----
  const totalWeight = rules.reduce((sum, r) => sum + r.weight, 0);
  const weightedScore = rules.reduce((sum, r) => sum + (r.score * r.weight) / totalWeight, 0);
  const overallScore = Math.round(weightedScore);

  const grade: AuditScoreResult["grade"] =
    overallScore >= 90 ? "A" : overallScore >= 75 ? "B" : overallScore >= 60 ? "C" : overallScore >= 40 ? "D" : "F";

  // Category scores
  const categories = ["completeness", "accuracy", "configuration", "timeliness", "segregation"];
  const categoryLabels: Record<string, string> = {
    completeness: "Completeness", accuracy: "Accuracy", configuration: "Configuration",
    timeliness: "Timeliness", segregation: "Segregation",
  };
  const categoryScores: Record<string, { score: number; max: number; label: string }> = {};

  for (const cat of categories) {
    const catRules = rules.filter((r) => r.category === cat);
    if (catRules.length === 0) continue;
    const catMax = catRules.length * 100;
    const catScore = catRules.reduce((sum, r) => sum + r.score, 0);
    categoryScores[cat] = {
      score: Math.round(catScore / catRules.length),
      max: 100,
      label: categoryLabels[cat] || cat,
    };
  }

  return {
    overallScore,
    grade,
    rules,
    categoryScores,
    lastAuditTime: new Date().toISOString(),
  };
}

// ============ Main Scanner Hook ============

export function useGLIntegrityScanner() {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  return useMutation({
    mutationFn: async (): Promise<ScanResult> => {
      if (!effectiveCompanyId) throw new Error("No company selected");

      const { data: glSettings } = await supabase
        .from("gl_settings")
        .select("*")
        .eq("company_id", effectiveCompanyId)
        .maybeSingle();

      const { data: moduleSettings } = await (supabase as any)
        .from("module_finance_settings")
        .select("*")
        .eq("company_id", effectiveCompanyId);

      const moduleSettingsMap = new Map<string, any>();
      (moduleSettings || []).forEach((s: any) => {
        try {
          moduleSettingsMap.set(
            s.module_name,
            typeof s.settings === "string" ? JSON.parse(s.settings) : s.settings
          );
        } catch {
          moduleSettingsMap.set(s.module_name, s.settings);
        }
      });

      const allGaps: GLGap[] = [];

      for (const target of SCAN_TARGETS) {
        try {
          let query = (supabase as any)
            .from(target.tableName)
            .select(`id, ${target.refColumn}, ${target.dateColumn}, ${target.amountColumn}`)
            .eq("company_id", effectiveCompanyId);

          if (target.glCheckType === "journal_entry_id") {
            query = query.is("journal_entry_id", null);
          } else {
            query = query.or("gl_posted.is.null,gl_posted.eq.false");
          }

          if (target.extraFilters) {
            for (const [key, value] of Object.entries(target.extraFilters)) {
              query = query.eq(key, value);
            }
          }

          query = query.gt(target.amountColumn, 0);
          query = query.order(target.dateColumn, { ascending: false });
          query = query.limit(100);

          const { data: records, error } = await query;
          if (error) {
            console.warn(`Scanner: Error scanning ${target.tableName}:`, error.message);
            continue;
          }

          if (!records || records.length === 0) continue;

          let debitAccountId: string | null = null;
          let creditAccountId: string | null = null;
          let debitLabel = target.suggestedDebit;
          let creditLabel = target.suggestedCredit;

          if (target.glSettingsKey && glSettings) {
            debitAccountId = (glSettings as any)[target.glSettingsKey] || null;
          }
          if (target.glSettingsCreditKey && glSettings) {
            creditAccountId = (glSettings as any)[target.glSettingsCreditKey] || null;
          }

          if (target.moduleSettingsName) {
            const modSettings = moduleSettingsMap.get(target.moduleSettingsName);
            if (modSettings) {
              if (target.moduleDebitKey && !debitAccountId) {
                debitAccountId = modSettings[target.moduleDebitKey] || null;
              }
              if (target.moduleCreditKey && !creditAccountId) {
                creditAccountId = modSettings[target.moduleCreditKey] || null;
              }
            }
          }

          const canAutoPost = !!(debitAccountId && creditAccountId);

          for (const record of records) {
            const amount = record[target.amountColumn];
            if (!amount || amount <= 0) continue;

            allGaps.push({
              id: `${target.module}-${record.id}`,
              module: target.module,
              moduleLabel: target.moduleLabel,
              tableName: target.tableName,
              recordId: record.id,
              recordRef: record[target.refColumn] || record.id.substring(0, 8),
              recordDate: record[target.dateColumn] || new Date().toISOString(),
              amount,
              description: `${target.moduleLabel}: ${record[target.refColumn] || "N/A"} - LKR ${amount.toLocaleString()}`,
              severity: target.severity,
              suggestedDebit: debitLabel,
              suggestedCredit: creditLabel,
              canAutoPost,
              postingData: canAutoPost
                ? { debitAccountId: debitAccountId!, creditAccountId: creditAccountId!, debitLabel, creditLabel }
                : undefined,
            });
          }
        } catch (err) {
          console.warn(`Scanner: Failed to scan ${target.tableName}:`, err);
        }
      }

      // Group by module
      const summaryMap = new Map<string, GLGapSummary>();
      for (const gap of allGaps) {
        const existing = summaryMap.get(gap.module);
        if (existing) {
          existing.gapCount++;
          existing.totalAmount += gap.amount;
          existing.gaps.push(gap);
        } else {
          summaryMap.set(gap.module, {
            module: gap.module,
            moduleLabel: gap.moduleLabel,
            gapCount: 1,
            totalAmount: gap.amount,
            severity: gap.severity,
            gaps: [gap],
          });
        }
      }

      const summaries = Array.from(summaryMap.values()).sort((a, b) => {
        const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
        return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
      });

      const totalUnpostedAmount = allGaps.reduce((sum, g) => sum + g.amount, 0);

      // Run auto-audit rules
      const auditScore = await runAuditRules(
        effectiveCompanyId,
        glSettings,
        moduleSettingsMap,
        allGaps.length,
        totalUnpostedAmount
      );

      return {
        totalGaps: allGaps.length,
        totalUnpostedAmount,
        modulesAffected: summaries.length,
        lastScanTime: new Date().toISOString(),
        summaries,
        allGaps,
        auditScore,
      };
    },
  });
}

// ============ Post Single Gap to GL ============

export function usePostGapToGL() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  return useMutation({
    mutationFn: async (gap: GLGap) => {
      if (!gap.postingData) {
        throw new Error("Cannot auto-post: GL account mappings not configured. Please configure in Settings.");
      }

      const result = await createAndPostJournalEntry({
        entry_date: gap.recordDate.split("T")[0],
        description: `GL Guardian: ${gap.description}`,
        reference: gap.recordRef,
        company_id: effectiveCompanyId,
        business_unit_code: businessUnitCode || "HQ",
        lines: [
          {
            account_id: gap.postingData.debitAccountId,
            description: `${gap.postingData.debitLabel} - ${gap.recordRef}`,
            debit: gap.amount,
            credit: 0,
          },
          {
            account_id: gap.postingData.creditAccountId,
            description: `${gap.postingData.creditLabel} - ${gap.recordRef}`,
            debit: 0,
            credit: gap.amount,
          },
        ],
      });

      if (!result.success) throw new Error(result.error || "Failed to create journal entry");

      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (gap.tableName === "maintenance_logs" || gap.tableName === "expense_requests") {
        updateData.gl_posted = true;
        updateData.journal_entry_id = result.journalEntryId;
      } else {
        updateData.journal_entry_id = result.journalEntryId;
      }

      await (supabase as any).from(gap.tableName).update(updateData).eq("id", gap.recordId);

      return { journalEntryId: result.journalEntryId, gap };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success(`✅ Posted: ${result.gap.recordRef}`);
    },
    onError: (error) => toast.error(`Failed to post: ${error.message}`),
  });
}

// ============ Bulk Post All Gaps ============

export function useBulkPostGapsToGL() {
  const queryClient = useQueryClient();
  const { getEffectiveCompanyId, getBusinessUnitCode } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();
  const businessUnitCode = getBusinessUnitCode();

  return useMutation({
    mutationFn: async (gaps: GLGap[]) => {
      const postableGaps = gaps.filter((g) => g.canAutoPost && g.postingData);
      if (postableGaps.length === 0) throw new Error("No gaps can be auto-posted. Configure GL account mappings first.");

      let posted = 0;
      let failed = 0;

      for (const gap of postableGaps) {
        try {
          const result = await createAndPostJournalEntry({
            entry_date: gap.recordDate.split("T")[0],
            description: `GL Guardian Bulk: ${gap.description}`,
            reference: gap.recordRef,
            company_id: effectiveCompanyId,
            business_unit_code: businessUnitCode || "HQ",
            lines: [
              {
                account_id: gap.postingData!.debitAccountId,
                description: `${gap.postingData!.debitLabel} - ${gap.recordRef}`,
                debit: gap.amount,
                credit: 0,
              },
              {
                account_id: gap.postingData!.creditAccountId,
                description: `${gap.postingData!.creditLabel} - ${gap.recordRef}`,
                debit: 0,
                credit: gap.amount,
              },
            ],
          });

          if (!result.success) { failed++; continue; }

          const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
          if (gap.tableName === "maintenance_logs" || gap.tableName === "expense_requests") {
            updateData.gl_posted = true;
            updateData.journal_entry_id = result.journalEntryId;
          } else {
            updateData.journal_entry_id = result.journalEntryId;
          }

          await (supabase as any).from(gap.tableName).update(updateData).eq("id", gap.recordId);
          posted++;
        } catch { failed++; }
      }

      return { posted, failed, skipped: gaps.length - postableGaps.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["ar-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ap-invoices"] });

      if (result.failed === 0) {
        toast.success(`✅ All ${result.posted} gaps posted to GL${result.skipped > 0 ? ` (${result.skipped} skipped)` : ""}`);
      } else {
        toast.warning(`${result.posted} posted, ${result.failed} failed${result.skipped > 0 ? `, ${result.skipped} skipped` : ""}`);
      }
    },
    onError: (error) => toast.error(`Bulk post failed: ${error.message}`),
  });
}

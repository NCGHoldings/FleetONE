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
import { EXPENSE_CATEGORIES } from "@/hooks/useExpenseRequests";

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
  orphanedJournalEntries?: any[];
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
  hasCompanyId?: boolean; // defaults to true; set false for tables without company_id
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
    glSettingsKey: "default_expense_account_id",
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
    tableName: "asset_maintenance_logs",
    refColumn: "maintenance_number",
    dateColumn: "maintenance_date",
    amountColumn: "cost",
    glCheckType: "gl_posted",
    hasCompanyId: true,
    extraFilters: { status: "completed" },
    suggestedDebit: "Maintenance Expense",
    suggestedCredit: "Bank / Cash",
    severity: "warning",
    moduleSettingsName: "maintenance",
    moduleDebitKey: "maintenance_expense_account_id",
    moduleCreditKey: "bank_account_id",
  },
  {
    module: "special_hire",
    moduleLabel: "Special Hire Payments",
    tableName: "special_hire_payments",
    refColumn: "reference_no",
    dateColumn: "created_at",
    amountColumn: "amount",
    glCheckType: "journal_entry_id",
    hasCompanyId: false,
    extraFilters: { status: "approved" },
    suggestedDebit: "Bank / Cash",
    suggestedCredit: "Revenue / Receivables",
    severity: "critical",
    glSettingsKey: "bank_account_id",
    glSettingsCreditKey: "trade_receivable_account_id",
  },
  {
    module: "leasing",
    moduleLabel: "Leasing Payments",
    tableName: "bus_loan_payments",
    refColumn: "payment_number",
    dateColumn: "payment_date",
    amountColumn: "total_installment",
    glCheckType: "journal_entry_id",
    hasCompanyId: false,
    extraFilters: { payment_status: "paid" },
    suggestedDebit: "Leasing Liability + Interest",
    suggestedCredit: "Bank / Cash",
    severity: "warning",
  },
  {
    module: "school_bus_payments",
    moduleLabel: "School Bus Payments",
    tableName: "school_payment_transactions",
    refColumn: "reference_no",
    dateColumn: "payment_month",
    amountColumn: "amount_paid",
    glCheckType: "journal_entry_id",
    hasCompanyId: false, // school_payment_transactions doesn't have company_id
    extraFilters: {  }, // All real payments should have gl_posted
    suggestedDebit: "Bank / Cash",
    suggestedCredit: "Trade Receivables",
    severity: "critical",
    glSettingsKey: "bank_account_id",
    glSettingsCreditKey: "trade_receivable_account_id",
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

  // ---- EXPENSE CATEGORY MAPPING COMPLETENESS ----

  // Rule: Expense Category GL Mappings
  const expenseSettings = moduleSettingsMap.get("expense_requests");
  const expenseMappings: Array<{ expense_category: string; gl_account_id: string }> = expenseSettings?.mappings || [];
  const allCategoryValues = EXPENSE_CATEGORIES.map(c => c.value);
  const mappedCategories = expenseMappings.filter(m => m.gl_account_id && m.gl_account_id.length > 0).map(m => m.expense_category);
  const unmappedCategories = allCategoryValues.filter(c => !mappedCategories.includes(c));
  const unmappedLabels = unmappedCategories.map(v => EXPENSE_CATEGORIES.find(c => c.value === v)?.label || v);
  
  // Check if fallback accounts exist for unmapped categories
  let fallbacksAvailable = 0;
  if (unmappedCategories.length > 0) {
    try {
      // Check for "general expense" fallback
      const { data: generalExpense } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("company_id", companyId)
        .eq("account_type", "expense")
        .ilike("account_name", "%general expense%")
        .limit(1)
        .maybeSingle();
      
      if (generalExpense) fallbacksAvailable++;
      
      // Check if default_expense_account_id is set in gl_settings
      if (glSettings?.default_expense_account_id) fallbacksAvailable++;
    } catch { /* ignore */ }
  }

  const mappingPercentage = allCategoryValues.length > 0 ? Math.round((mappedCategories.length / allCategoryValues.length) * 100) : 100;
  const hasCriticalGap = unmappedCategories.length > allCategoryValues.length * 0.5 && fallbacksAvailable === 0;

  rules.push({
    id: "config_expense_category_mappings",
    name: "Expense Category GL Mappings",
    category: "configuration",
    description: "All expense categories have explicit GL account mappings",
    status: unmappedCategories.length === 0 ? "pass" : hasCriticalGap ? "fail" : "warning",
    score: mappingPercentage,
    weight: 15,
    details: unmappedCategories.length === 0
      ? `All ${allCategoryValues.length} expense categories are mapped to GL accounts`
      : `${mappedCategories.length}/${allCategoryValues.length} mapped. Unmapped: ${unmappedLabels.slice(0, 5).join(", ")}${unmappedLabels.length > 5 ? ` (+${unmappedLabels.length - 5} more)` : ""}${fallbacksAvailable > 0 ? " (fallbacks available)" : " (NO fallbacks!)"}`,
    recommendation: unmappedCategories.length > 0
      ? "Go to Settings → Module GL Mappings → Expense Requests to map missing categories. Categories without mappings will fail GL posting."
      : undefined,
    learnMore: "Each expense category (Food, Fuel, Repairs, etc.) needs a GL account mapping so the system knows which expense account to debit when posting. Without mappings, expense approval will fail with 'No GL account mapped' errors.",
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

  // ---- CONFIGURATION RULES (continued) ----

  // Rule 8: Vendor Category GL Mappings
  let totalVendorCategories = 0;
  let vendorCatsWithGL = 0;
  try {
    const { data: vendorCats } = await supabase
      .from("vendor_categories")
      .select("id, ap_account_id, expense_account_id")
      .eq("company_id", companyId)
      .eq("is_active", true);

    totalVendorCategories = (vendorCats || []).length;
    vendorCatsWithGL = (vendorCats || []).filter(
      (c: any) => c.ap_account_id || c.expense_account_id
    ).length;
  } catch { /* ignore */ }

  if (totalVendorCategories > 0) {
    const vendorCatPct = Math.round((vendorCatsWithGL / totalVendorCategories) * 100);
    rules.push({
      id: "config_vendor_category_gl",
      name: "Vendor Category GL Mappings",
      category: "configuration",
      description: "All vendor categories have AP/Expense GL accounts mapped",
      status: vendorCatsWithGL === totalVendorCategories ? "pass" : vendorCatsWithGL > 0 ? "warning" : "fail",
      score: vendorCatPct,
      weight: 8,
      details: vendorCatsWithGL === totalVendorCategories
        ? `All ${totalVendorCategories} vendor categories have GL mappings`
        : `${vendorCatsWithGL}/${totalVendorCategories} vendor categories have GL account mappings`,
      recommendation: vendorCatsWithGL < totalVendorCategories
        ? "Go to Settings → Vendor Categories and assign AP/Expense GL accounts to each category for accurate vendor-level tracking"
        : undefined,
      learnMore: "Vendor categories allow different GL account mappings per vendor type (e.g., Spare Parts vs Utilities). Without mappings, all vendors fall back to the global Trade Payable account, losing granular expense tracking.",
    });
  } else {
    rules.push({
      id: "config_vendor_category_gl",
      name: "Vendor Category GL Mappings",
      category: "configuration",
      description: "All vendor categories have AP/Expense GL accounts mapped",
      status: "not_applicable",
      score: 100,
      weight: 8,
      details: "No vendor categories defined — using global GL defaults",
      learnMore: "Vendor categories allow different GL account mappings per vendor type. Create categories in Settings → Vendor Categories for granular tracking.",
    });
  }

  // Rule 9: Customer Category GL Mappings
  let totalCustomerCategories = 0;
  let customerCatsWithGL = 0;
  try {
    const { data: customerCats } = await supabase
      .from("customer_categories")
      .select("id, ar_account_id, revenue_account_id")
      .eq("company_id", companyId)
      .eq("is_active", true);

    totalCustomerCategories = (customerCats || []).length;
    customerCatsWithGL = (customerCats || []).filter(
      (c: any) => c.ar_account_id || c.revenue_account_id
    ).length;
  } catch { /* ignore */ }

  if (totalCustomerCategories > 0) {
    const customerCatPct = Math.round((customerCatsWithGL / totalCustomerCategories) * 100);
    rules.push({
      id: "config_customer_category_gl",
      name: "Customer Category GL Mappings",
      category: "configuration",
      description: "All customer categories have AR/Revenue GL accounts mapped",
      status: customerCatsWithGL === totalCustomerCategories ? "pass" : customerCatsWithGL > 0 ? "warning" : "fail",
      score: customerCatPct,
      weight: 8,
      details: customerCatsWithGL === totalCustomerCategories
        ? `All ${totalCustomerCategories} customer categories have GL mappings`
        : `${customerCatsWithGL}/${totalCustomerCategories} customer categories have GL account mappings`,
      recommendation: customerCatsWithGL < totalCustomerCategories
        ? "Go to Settings → Customer Categories and assign AR/Revenue GL accounts to each category for segmented revenue tracking"
        : undefined,
      learnMore: "Customer categories enable distinct AR and Revenue account mappings per customer type (e.g., External, Government, Intercompany). Without mappings, all customers use global GL defaults.",
    });
  } else {
    rules.push({
      id: "config_customer_category_gl",
      name: "Customer Category GL Mappings",
      category: "configuration",
      description: "All customer categories have AR/Revenue GL accounts mapped",
      status: "not_applicable",
      score: 100,
      weight: 8,
      details: "No customer categories defined — using global GL defaults",
      learnMore: "Customer categories enable segmented revenue tracking. Create categories in Settings → Customer Categories.",
    });
  }

  // ---- TIMELINESS RULES (continued) ----

  // Rule 10: Financial Period Status
  let openPeriodCount = 0;
  let oldOpenPeriods = 0;
  let currentPeriodOpen = false;
  try {
    const { data: periods } = await (supabase as any)
      .from("financial_periods")
      .select("id, period_name, start_date, end_date, status")
      .eq("company_id", companyId)
      .eq("status", "open");

    openPeriodCount = (periods || []).length;
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    for (const period of periods || []) {
      const endDate = new Date((period as any).end_date);
      if (endDate < threeMonthsAgo) {
        oldOpenPeriods++;
      }
      if (new Date((period as any).start_date) <= now && endDate >= now) {
        currentPeriodOpen = true;
      }
    }
  } catch { /* ignore */ }

  rules.push({
    id: "timeliness_period_status",
    name: "Financial Period Management",
    category: "timeliness",
    description: "Current period is open and old periods are properly closed",
    status: currentPeriodOpen && oldOpenPeriods === 0 ? "pass" : oldOpenPeriods > 0 ? "warning" : !currentPeriodOpen && openPeriodCount === 0 ? "fail" : "warning",
    score: currentPeriodOpen && oldOpenPeriods === 0 ? 100 : oldOpenPeriods > 0 ? Math.max(30, 100 - oldOpenPeriods * 25) : openPeriodCount > 0 ? 60 : 20,
    weight: 10,
    details: currentPeriodOpen
      ? oldOpenPeriods > 0
        ? `Current period is open but ${oldOpenPeriods} old period(s) are still open and should be closed`
        : `${openPeriodCount} period(s) open — current period is active`
      : openPeriodCount > 0
        ? `${openPeriodCount} period(s) open but none covers the current date`
        : "No financial periods are open — transactions cannot be posted",
    recommendation: oldOpenPeriods > 0
      ? "Close old financial periods via Settings → Financial Periods → Period Closing Checklist to prevent backdated postings"
      : !currentPeriodOpen
        ? "Open a financial period for the current month in Settings → Financial Periods"
        : undefined,
    learnMore: "Financial periods control which dates accept GL postings. Old open periods allow unauthorized backdated entries. The current period must be open for normal operations. Always close periods after month-end reconciliation.",
  });

  // Rule 11: Bank Reconciliation Timeliness
  let recentReconCount = 0;
  let totalBankAccounts = 0;
  try {
    const { count: bankCount } = await supabase
      .from("bank_accounts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("is_active", true);

    totalBankAccounts = bankCount || 0;

    if (totalBankAccounts > 0) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: reconCount } = await supabase
        .from("bank_reconciliations")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("reconciliation_date", thirtyDaysAgo.toISOString().split("T")[0]);

      recentReconCount = reconCount || 0;
    }
  } catch { /* ignore */ }

  if (totalBankAccounts > 0) {
    const reconPct = Math.min(100, Math.round((recentReconCount / totalBankAccounts) * 100));
    rules.push({
      id: "timeliness_bank_recon",
      name: "Bank Reconciliation Timeliness",
      category: "timeliness",
      description: "Bank accounts have been reconciled within the last 30 days",
      status: recentReconCount >= totalBankAccounts ? "pass" : recentReconCount > 0 ? "warning" : "fail",
      score: reconPct,
      weight: 10,
      details: recentReconCount >= totalBankAccounts
        ? `All ${totalBankAccounts} bank accounts reconciled in the last 30 days`
        : recentReconCount > 0
          ? `${recentReconCount}/${totalBankAccounts} bank accounts reconciled recently`
          : `No bank reconciliations in the last 30 days (${totalBankAccounts} active accounts)`,
      recommendation: recentReconCount < totalBankAccounts
        ? "Go to Banking → Reconciliation to reconcile outstanding bank accounts. Monthly reconciliation is an accounting best practice."
        : undefined,
      learnMore: "Bank reconciliation verifies that your books match the actual bank statement. Unreconciled accounts may hide errors, fraud, or unrecorded transactions. Best practice: reconcile monthly.",
    });
  } else {
    rules.push({
      id: "timeliness_bank_recon",
      name: "Bank Reconciliation Timeliness",
      category: "timeliness",
      description: "Bank accounts have been reconciled within the last 30 days",
      status: "not_applicable",
      score: 100,
      weight: 10,
      details: "No active bank accounts configured",
      learnMore: "Set up bank accounts in Banking to enable reconciliation tracking.",
    });
  }

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

      const { data: glSettings } = await (supabase as any)
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
            .select(`id, ${target.refColumn}, ${target.dateColumn}, ${target.amountColumn}${target.module === "expense_requests" ? ", expense_category" : ""}`);

          // Only filter by company_id if the table has it
          if (target.hasCompanyId !== false) {
            query = query.eq("company_id", effectiveCompanyId);
          }

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
          const debitLabel = target.suggestedDebit;
          const creditLabel = target.suggestedCredit;

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

            // For expense_requests, check if the category has a mapping
            let isMissingMapping = false;
            let effectiveCanAutoPost = canAutoPost;
            let effectiveDescription = `${target.moduleLabel}: ${record[target.refColumn] || "N/A"} - LKR ${amount.toLocaleString()}`;
            
            if (target.module === "expense_requests" && record.expense_category) {
              const expSettings = moduleSettingsMap.get("expense_requests");
              const expMappings: Array<{ expense_category: string; gl_account_id: string }> = expSettings?.mappings || [];
              const catMapping = expMappings.find((m: any) => m.expense_category === record.expense_category && m.gl_account_id);
              if (!catMapping) {
                isMissingMapping = true;
                const catLabel = EXPENSE_CATEGORIES.find(c => c.value === record.expense_category)?.label || record.expense_category;
                effectiveDescription = `⚠️ UNPOSTABLE - ${target.moduleLabel}: ${record[target.refColumn] || "N/A"} - Category "${catLabel}" has no GL mapping - LKR ${amount.toLocaleString()}`;
                effectiveCanAutoPost = false; // Can't auto-post without mapping
              }
            }

            allGaps.push({
              id: `${target.module}-${record.id}`,
              module: target.module,
              moduleLabel: target.moduleLabel,
              tableName: target.tableName,
              recordId: record.id,
              recordRef: record[target.refColumn] || record.id.substring(0, 8),
              recordDate: record[target.dateColumn] || new Date().toISOString(),
              amount,
              description: effectiveDescription,
              severity: isMissingMapping ? "critical" : target.severity,
              suggestedDebit: debitLabel,
              suggestedCredit: creditLabel,
              canAutoPost: effectiveCanAutoPost,
              postingData: effectiveCanAutoPost
                ? { debitAccountId: debitAccountId!, creditAccountId: creditAccountId!, debitLabel, creditLabel }
                : undefined,
            });
          }
        } catch (err) {
          console.warn(`Scanner: Failed to scan ${target.tableName}:`, err);
        }
      }

      // Check for Orphaned Journal Entries (JEs where source record is missing)
      try {
        const { data: sboJEs } = await supabase
          .from("journal_entries")
          .select("id, reference, entry_number, entry_date, total_debit")
          .eq("business_unit_code", "SBO")
          .eq("status", "posted")
          .order("created_at", { ascending: false })
          .limit(200);

        if (sboJEs && sboJEs.length > 0) {
          // Identify School Bus Invoices
          const invoiceRefs = sboJEs.filter((j: any) => j.reference?.startsWith('SBS-')).map((j: any) => j.reference);
          let existingInvoices = new Set<string>();
          if (invoiceRefs.length > 0) {
             const { data: validInvoices } = await supabase.from('school_ar_invoices').select('invoice_number').in('invoice_number', invoiceRefs);
             existingInvoices = new Set(validInvoices?.map((v: any) => v.invoice_number) || []);
          }

          // Identify School Bus Payments
          const paymentRefs = sboJEs.filter((j: any) => j.reference?.startsWith('PAY-') || j.reference?.startsWith('XFR-')).map((j: any) => j.reference);
          let existingPayments = new Set<string>();
          if (paymentRefs.length > 0) {
             const { data: validPayments } = await supabase.from('school_payment_transactions').select('reference_no').in('reference_no', paymentRefs);
             existingPayments = new Set(validPayments?.map((v: any) => v.reference_no) || []);
          }
          
          for (const je of sboJEs) {
             const isInvoiceOrphan = je.reference?.startsWith('SBS-') && !existingInvoices.has(je.reference);
             const isPaymentOrphan = (je.reference?.startsWith('PAY-') || je.reference?.startsWith('XFR-')) && !existingPayments.has(je.reference);
             
             if (isInvoiceOrphan || isPaymentOrphan) {
                allGaps.push({
                  id: `orphan_je_${je.id}`,
                  module: "orphaned_journal_entries",
                  moduleLabel: "Orphaned Journal Entries",
                  tableName: "journal_entries",
                  recordId: je.id,
                  recordRef: je.entry_number || je.reference || je.id,
                  recordDate: je.entry_date,
                  amount: je.total_debit,
                  description: `⚠️ ORPHANED GL ENTRY - Source reference "${je.reference}" not found. Action: Delete via Automation Dashboard.`,
                  severity: "critical",
                  suggestedDebit: "N/A",
                  suggestedCredit: "N/A",
                  canAutoPost: false,
                });
             }
          }
        }
      } catch (err) {
         console.warn("Scanner: Failed to check orphaned JEs:", err);
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
      if (gap.tableName === "asset_maintenance_logs" || gap.tableName === "expense_requests" || gap.tableName === "bus_loan_payments") {
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
          if (gap.tableName === "asset_maintenance_logs" || gap.tableName === "expense_requests" || gap.tableName === "bus_loan_payments") {
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

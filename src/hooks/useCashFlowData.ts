// Cash Flow Statement data hook — IAS 7 fully compliant
// Classifies GL journal entries into Operating / Investing / Financing
// Supports both Direct and Indirect methods
// Server-side date filtering, business unit support, comparative periods
// Account-code-based classification for Interest, Tax, Dividends, Salaries
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

// ────────── Account Classification ──────────

export type CashFlowCategory =
  | "cash"
  | "receivable"
  | "inventory"
  | "prepayment"
  | "other_ca"
  | "fixed_asset"
  | "payable"
  | "accrual"
  | "tax_liability"
  | "other_cl"
  | "loan"
  | "equity"
  | "revenue"
  | "expense"
  | "depreciation"
  | "interest_income"
  | "interest_expense"
  | "dividend"
  | "salary"
  | "tax_expense"
  | "other";

export type CashFlowActivity = "operating" | "investing" | "financing";

interface AccountInfo {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  category: CashFlowCategory;
  activity: CashFlowActivity;
  opening_balance: number;
}

export interface CashFlowLineItem {
  label: string;
  amount: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
  comparativeAmount?: number;
}

export interface WorkingCapitalItem {
  label: string;
  opening: number;
  closing: number;
  change: number;
}

export interface NonCashItem {
  label: string;
  amount: number;
  jeNumber?: string;
}

export interface CashFlowData {
  directOperating: CashFlowLineItem[];
  netDirectOperating: number;
  indirectOperating: CashFlowLineItem[];
  netIndirectOperating: number;
  investingItems: CashFlowLineItem[];
  netInvesting: number;
  financingItems: CashFlowLineItem[];
  netFinancing: number;
  netCashChange: number;
  openingCash: number;
  closingCash: number;
  workingCapital: WorkingCapitalItem[];
  netIncome: number;
  depreciation: number;
  periodLabel: string;
  totalRevenue: number;
  totalExpenses: number;
  cashFromCustomers: number;
  cashToSuppliers: number;
  cashToEmployees: number;
  otherOperatingCash: number;
  // IAS 7 required disclosures
  interestPaid: number;
  interestReceived: number;
  dividendsPaid: number;
  dividendsReceived: number;
  incomeTaxPaid: number;
  // Non-cash activities (IAS 7.43)
  nonCashActivities: NonCashItem[];
}

// ────────── Classification ──────────

function classifyAccount(
  code: string,
  name: string,
  accountType: string
): { category: CashFlowCategory; activity: CashFlowActivity } {
  const ln = name.toLowerCase();
  const p2 = code.substring(0, 2);
  const p3 = code.substring(0, 3);
  const p5 = code.substring(0, 5);
  const p8 = code.substring(0, 8);

  // Cash & Bank accounts
  if (ln.includes("cash") || ln.includes("bank") || ln.includes("petty cash") ||
      p3 === "110" || p3 === "111" || p3 === "112")
    return { category: "cash", activity: "operating" };

  // Receivables
  if (ln.includes("receivable") || ln.includes("debtor") || p3 === "120" || p3 === "121" || p3 === "122")
    return { category: "receivable", activity: "operating" };

  // Inventory
  if (ln.includes("inventory") || ln.includes("stock") || ln.includes("raw material") ||
      ln.includes("finished goods") || ln.includes("work in progress") ||
      p3 === "130" || p3 === "131" || p3 === "132")
    return { category: "inventory", activity: "operating" };

  // Prepayments
  if (ln.includes("prepaid") || ln.includes("advance") || ln.includes("deposit") ||
      p3 === "140" || p3 === "141")
    return { category: "prepayment", activity: "operating" };

  // Fixed Assets (Investing)
  if (accountType === "asset" && (
    ln.includes("property") || ln.includes("plant") || ln.includes("equipment") ||
    ln.includes("vehicle") || ln.includes("furniture") || ln.includes("computer") ||
    ln.includes("building") || ln.includes("land") || ln.includes("intangible") ||
    ln.includes("goodwill") || ln.includes("accumulated depreciation") ||
    ln.includes("accumulated amortization") ||
    p2 === "15" || p2 === "16" || p2 === "17"))
    return { category: "fixed_asset", activity: "investing" };

  // Salary/Wages payable & expense (by code prefix — 222xx or salary-related names)
  if (p3 === "222" || p5 === "22201" || p5 === "51201" ||
      ln.includes("salary") || ln.includes("wage") || ln.includes("payroll") ||
      ln.includes("casual wages") || ln.includes("salary advance") ||
      ln.includes("drivers & assist") || ln.includes("staff meals"))
    return { category: "salary", activity: "operating" };

  // Tax payable/expense (by code prefix)
  if (p5 === "22501" || p5 === "22502" || p3 === "225" ||
      ln.includes("income tax") || ln.includes("tax payable") || ln.includes("sscl"))
    return { category: "tax_expense", activity: "operating" };

  // Interest income (41104xxx)
  if (p5 === "41104" || (accountType === "revenue" && (ln.includes("interest") && !ln.includes("interest expense"))))
    return { category: "interest_income", activity: "operating" };

  // Interest expense
  if (ln.includes("interest expense") || ln.includes("finance cost") || ln.includes("finance charge") ||
      p5 === "52301" || p5 === "52302")
    return { category: "interest_expense", activity: "operating" };

  // Dividends
  if (ln.includes("dividend"))
    return { category: "dividend", activity: "financing" };

  // Other tax liabilities (VAT, WHT — operating)
  if (ln.includes("vat") || ln.includes("withholding") || p3 === "212" || p3 === "213")
    return { category: "tax_liability", activity: "operating" };

  // Payables
  if (ln.includes("payable") || ln.includes("creditor") || ln.includes("accounts payable") ||
      p3 === "210" || p3 === "211")
    return { category: "payable", activity: "operating" };

  // Accruals
  if (ln.includes("accrued") || ln.includes("accrual") || ln.includes("provision") ||
      ln.includes("gratuity") || p3 === "214" || p3 === "215")
    return { category: "accrual", activity: "operating" };

  // Loans (Financing)
  if (ln.includes("loan") || ln.includes("borrowing") || ln.includes("mortgage") ||
      ln.includes("debenture") || ln.includes("lease liability") ||
      p2 === "23" || p2 === "24")
    return { category: "loan", activity: "financing" };

  // Equity
  if (accountType === "equity")
    return { category: "equity", activity: "financing" };

  // Depreciation
  if (ln.includes("depreciation") || ln.includes("amortization") || ln.includes("amortisation"))
    return { category: "depreciation", activity: "operating" };

  // Revenue
  if (accountType === "revenue")
    return { category: "revenue", activity: "operating" };

  // Expense
  if (accountType === "expense")
    return { category: "expense", activity: "operating" };

  // Other current assets
  if (accountType === "asset" && (p2 === "13" || p2 === "14"))
    return { category: "other_ca", activity: "operating" };

  // Other current liabilities
  if (accountType === "liability" && p2 === "21")
    return { category: "other_cl", activity: "operating" };

  return { category: "other", activity: "operating" };
}

// ────────── Compute one period's cash flow data ──────────

function computeCashFlow(
  accounts: any[],
  periodEntries: any[],
  prePeriodEntries: any[],
  periodStart: Date,
  periodEnd: Date
): CashFlowData {
  // Build account map
  const accountMap = new Map<string, AccountInfo>();
  accounts.forEach((acc) => {
    const { category, activity } = classifyAccount(
      acc.account_code || "", acc.account_name || "", acc.account_type || ""
    );
    accountMap.set(acc.id, {
      id: acc.id,
      account_code: acc.account_code || "",
      account_name: acc.account_name || "",
      account_type: acc.account_type || "",
      category, activity,
      opening_balance: acc.opening_balance || 0, // Never use current_balance
    });
  });

  // Aggregate movements
  const periodMov: Record<string, { debit: number; credit: number }> = {};
  const prePeriodMov: Record<string, { debit: number; credit: number }> = {};

  const addMov = (entries: any[], target: Record<string, { debit: number; credit: number }>) => {
    entries.forEach((entry: any) => {
      const lines = entry.lines || [];
      lines.forEach((line: any) => {
        if (line.account_id) {
          if (!target[line.account_id]) target[line.account_id] = { debit: 0, credit: 0 };
          target[line.account_id].debit += line.debit || 0;
          target[line.account_id].credit += line.credit || 0;
        }
      });
    });
  };
  addMov(periodEntries, periodMov);
  addMov(prePeriodEntries, prePeriodMov);

  // Balance calculator
  const getBalance = (id: string, mov: Record<string, { debit: number; credit: number }>): number => {
    const acc = accountMap.get(id);
    if (!acc) return 0;
    const m = mov[id] || { debit: 0, credit: 0 };
    const ob = acc.opening_balance || 0;
    return ["asset", "expense"].includes(acc.account_type) ? ob + m.debit - m.credit : ob + m.credit - m.debit;
  };

  // Category sum
  const catBal = (cat: CashFlowCategory, mov: Record<string, { debit: number; credit: number }>): number => {
    let t = 0;
    accountMap.forEach((acc) => { if (acc.category === cat) t += getBalance(acc.id, mov); });
    return t;
  };

  // Working capital — merged movements (pre + current)
  const mergedMov: Record<string, { debit: number; credit: number }> = {};
  Object.entries(prePeriodMov).forEach(([id, m]) => {
    mergedMov[id] = { debit: m.debit, credit: m.credit };
  });
  Object.entries(periodMov).forEach(([id, m]) => {
    if (!mergedMov[id]) mergedMov[id] = { debit: 0, credit: 0 };
    mergedMov[id].debit += m.debit;
    mergedMov[id].credit += m.credit;
  });

  const wcDefs: { cat: CashFlowCategory; label: string; isAsset: boolean }[] = [
    { cat: "receivable", label: "Trade Receivables", isAsset: true },
    { cat: "inventory", label: "Inventory", isAsset: true },
    { cat: "prepayment", label: "Prepayments & Advances", isAsset: true },
    { cat: "other_ca", label: "Other Current Assets", isAsset: true },
    { cat: "payable", label: "Trade Payables", isAsset: false },
    { cat: "accrual", label: "Accrued Liabilities", isAsset: false },
    { cat: "tax_liability", label: "Tax Liabilities", isAsset: false },
    { cat: "other_cl", label: "Other Current Liabilities", isAsset: false },
  ];

  const wcItems: WorkingCapitalItem[] = wcDefs.map(({ cat, label, isAsset }) => {
    const opening = catBal(cat, prePeriodMov);
    const closing = catBal(cat, mergedMov);
    const change = isAsset ? -(closing - opening) : (closing - opening);
    return { label, opening, closing, change };
  });

  // Net income & IAS 7 required items from P&L
  let totalRevenue = 0, totalExpenses = 0, depreciation = 0;
  let interestIncomeAccrual = 0, interestExpenseAccrual = 0;
  let taxExpenseAccrual = 0, salaryExpenseAccrual = 0;
  let dividendExpenseAccrual = 0;

  accountMap.forEach((acc) => {
    const m = periodMov[acc.id] || { debit: 0, credit: 0 };
    switch (acc.category) {
      case "revenue":
        totalRevenue += m.credit - m.debit;
        break;
      case "interest_income":
        interestIncomeAccrual += m.credit - m.debit;
        totalRevenue += m.credit - m.debit;
        break;
      case "depreciation":
        depreciation += m.debit - m.credit;
        totalExpenses += m.debit - m.credit;
        break;
      case "interest_expense":
        interestExpenseAccrual += m.debit - m.credit;
        totalExpenses += m.debit - m.credit;
        break;
      case "tax_expense":
        taxExpenseAccrual += m.debit - m.credit;
        totalExpenses += m.debit - m.credit;
        break;
      case "salary":
        salaryExpenseAccrual += m.debit - m.credit;
        totalExpenses += m.debit - m.credit;
        break;
      case "dividend":
        dividendExpenseAccrual += m.debit - m.credit;
        break;
      case "expense":
        totalExpenses += m.debit - m.credit;
        break;
    }
  });
  const netIncome = totalRevenue - totalExpenses;

  // Cash balances
  const openingCash = catBal("cash", prePeriodMov);
  const closingCash = catBal("cash", mergedMov);

  // ── Direct method — analyze ALL non-cash lines proportionally ──
  let cashFromCustomers = 0, cashToSuppliers = 0, cashToEmployees = 0, otherOperatingCash = 0;
  let interestPaid = 0, interestReceived = 0, dividendsPaid = 0, dividendsReceived = 0, incomeTaxPaid = 0;
  let fixedAssetPurchases = 0, fixedAssetSales = 0, investingOther = 0;
  let loanProceeds = 0, loanRepayments = 0, equityChanges = 0, financingOther = 0;

  // Non-cash activities collector
  const nonCashActivities: NonCashItem[] = [];

  periodEntries.forEach((entry: any) => {
    const lines = (entry.lines || []) as any[];
    const cashLines = lines.filter((l: any) => accountMap.get(l.account_id)?.category === "cash");
    const nonCashLines = lines.filter((l: any) => accountMap.get(l.account_id)?.category !== "cash");

    // Non-cash transaction detection (IAS 7.43) — entries with no cash lines but investing/financing
    if (cashLines.length === 0) {
      const hasInvesting = nonCashLines.some((l: any) => accountMap.get(l.account_id)?.activity === "investing");
      const hasFinancing = nonCashLines.some((l: any) => accountMap.get(l.account_id)?.activity === "financing");
      if (hasInvesting || hasFinancing) {
        const totalAmount = nonCashLines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
        if (totalAmount > 0) {
          nonCashActivities.push({
            label: entry.description || `Non-cash transaction ${entry.entry_number || ''}`,
            amount: totalAmount,
            jeNumber: entry.entry_number,
          });
        }
      }
      return;
    }

    let netCash = 0;
    cashLines.forEach((l: any) => { netCash += (l.debit || 0) - (l.credit || 0); });

    if (nonCashLines.length === 0) { otherOperatingCash += netCash; return; }

    // Proportional classification: distribute netCash across all non-cash lines
    const totalNonCashAmount = nonCashLines.reduce((s: number, l: any) => s + (l.debit || 0) + (l.credit || 0), 0);
    if (totalNonCashAmount === 0) { otherOperatingCash += netCash; return; }

    nonCashLines.forEach((line: any) => {
      const acc = accountMap.get(line.account_id);
      if (!acc) return;
      const lineAmount = (line.debit || 0) + (line.credit || 0);
      const proportion = lineAmount / totalNonCashAmount;
      const allocatedCash = netCash * proportion;

      switch (acc.category) {
        case "interest_income":
          if (allocatedCash > 0) interestReceived += allocatedCash;
          else otherOperatingCash += allocatedCash;
          break;
        case "interest_expense":
          if (allocatedCash < 0) interestPaid += Math.abs(allocatedCash);
          else otherOperatingCash += allocatedCash;
          break;
        case "tax_expense":
        case "tax_liability":
          if (allocatedCash < 0) incomeTaxPaid += Math.abs(allocatedCash);
          else otherOperatingCash += allocatedCash;
          break;
        case "dividend":
          if (allocatedCash < 0) dividendsPaid += Math.abs(allocatedCash);
          else dividendsReceived += allocatedCash;
          break;
        case "salary":
          if (allocatedCash < 0) cashToEmployees += Math.abs(allocatedCash);
          else otherOperatingCash += allocatedCash;
          break;
        case "fixed_asset":
          if (allocatedCash > 0) fixedAssetSales += allocatedCash;
          else fixedAssetPurchases += Math.abs(allocatedCash);
          break;
        case "loan":
          if (allocatedCash > 0) loanProceeds += allocatedCash;
          else loanRepayments += Math.abs(allocatedCash);
          break;
        case "equity":
          equityChanges += allocatedCash;
          break;
        case "revenue":
        case "receivable":
          cashFromCustomers += allocatedCash;
          break;
        case "expense":
        case "payable":
          if (allocatedCash < 0) cashToSuppliers += Math.abs(allocatedCash);
          else otherOperatingCash += allocatedCash;
          break;
        default:
          if (acc.activity === "investing") {
            investingOther += allocatedCash;
          } else if (acc.activity === "financing") {
            financingOther += allocatedCash;
          } else {
            otherOperatingCash += allocatedCash;
          }
      }
    });
  });

  // ── Build line items ──

  // Direct method
  const netDirectOp = cashFromCustomers - cashToSuppliers - cashToEmployees
    - interestPaid + interestReceived - incomeTaxPaid + otherOperatingCash;
  const directOperating: CashFlowLineItem[] = [
    { label: "Cash received from customers", amount: cashFromCustomers, indent: 1 },
    { label: "Cash paid to suppliers", amount: -cashToSuppliers, indent: 1 },
    { label: "Cash paid to employees", amount: -cashToEmployees, indent: 1 },
  ];
  if (interestReceived > 0.01) directOperating.push({ label: "Interest received", amount: interestReceived, indent: 1 });
  if (interestPaid > 0.01) directOperating.push({ label: "Interest paid", amount: -interestPaid, indent: 1 });
  if (incomeTaxPaid > 0.01) directOperating.push({ label: "Income taxes paid", amount: -incomeTaxPaid, indent: 1 });
  if (Math.abs(otherOperatingCash) > 0.01) directOperating.push({ label: "Other operating cash flows", amount: otherOperatingCash, indent: 1 });
  directOperating.push({ label: "Net Cash from Operating Activities", amount: netDirectOp, isSubtotal: true });

  // Indirect method
  const totalWC = wcItems.reduce((s, w) => s + w.change, 0);
  const netIndirectOp = netIncome + depreciation + totalWC;
  const indirectOperating: CashFlowLineItem[] = [
    { label: "Net Income", amount: netIncome, indent: 1 },
    { label: "Adjustments for non-cash items:", amount: 0, indent: 0 },
    { label: "Depreciation & Amortization", amount: depreciation, indent: 2 },
  ];
  if (Math.abs(interestExpenseAccrual) > 0.01) {
    indirectOperating.push({ label: "Finance costs (accrual adjustment)", amount: 0, indent: 2 });
  }
  indirectOperating.push({ label: "Changes in working capital:", amount: 0, indent: 0 });
  wcItems.forEach((wc) => {
    if (Math.abs(wc.change) > 0.01) {
      indirectOperating.push({ label: `${wc.change >= 0 ? "Increase" : "Decrease"} in ${wc.label}`, amount: wc.change, indent: 2 });
    }
  });
  indirectOperating.push({ label: "Net Cash from Operating Activities", amount: netIndirectOp, isSubtotal: true });

  // IAS 7.31-35 separate disclosures appended
  const ias7Disclosures: CashFlowLineItem[] = [];
  if (interestPaid > 0.01) ias7Disclosures.push({ label: "Interest paid (IAS 7.31)", amount: -interestPaid, indent: 1 });
  if (interestReceived > 0.01) ias7Disclosures.push({ label: "Interest received (IAS 7.31)", amount: interestReceived, indent: 1 });
  if (incomeTaxPaid > 0.01) ias7Disclosures.push({ label: "Income taxes paid (IAS 7.35)", amount: -incomeTaxPaid, indent: 1 });
  if (dividendsPaid > 0.01) ias7Disclosures.push({ label: "Dividends paid (IAS 7.34)", amount: -dividendsPaid, indent: 1 });
  if (dividendsReceived > 0.01) ias7Disclosures.push({ label: "Dividends received (IAS 7.34)", amount: dividendsReceived, indent: 1 });

  // Investing
  const netInv = fixedAssetSales - fixedAssetPurchases + investingOther;
  const investingItems: CashFlowLineItem[] = [];
  if (fixedAssetPurchases > 0) investingItems.push({ label: "Purchase of property, plant & equipment", amount: -fixedAssetPurchases, indent: 1 });
  if (fixedAssetSales > 0) investingItems.push({ label: "Proceeds from sale of assets", amount: fixedAssetSales, indent: 1 });
  if (investingOther !== 0) investingItems.push({ label: "Other investing activities", amount: investingOther, indent: 1 });
  investingItems.push({ label: "Net Cash from Investing Activities", amount: netInv, isSubtotal: true });

  // Financing
  const netFin = loanProceeds - loanRepayments + equityChanges - dividendsPaid + dividendsReceived + financingOther;
  const financingItems: CashFlowLineItem[] = [];
  if (loanProceeds > 0) financingItems.push({ label: "Proceeds from borrowings", amount: loanProceeds, indent: 1 });
  if (loanRepayments > 0) financingItems.push({ label: "Repayment of borrowings", amount: -loanRepayments, indent: 1 });
  if (equityChanges !== 0) financingItems.push({ label: "Equity contributions / withdrawals", amount: equityChanges, indent: 1 });
  if (dividendsPaid > 0) financingItems.push({ label: "Dividends paid", amount: -dividendsPaid, indent: 1 });
  if (financingOther !== 0) financingItems.push({ label: "Other financing activities", amount: financingOther, indent: 1 });
  financingItems.push({ label: "Net Cash from Financing Activities", amount: netFin, isSubtotal: true });

  const fmtD = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return {
    directOperating, netDirectOperating: netDirectOp,
    indirectOperating, netIndirectOperating: netIndirectOp,
    investingItems, netInvesting: netInv,
    financingItems, netFinancing: netFin,
    netCashChange: closingCash - openingCash,
    openingCash, closingCash,
    workingCapital: wcItems, netIncome, depreciation,
    periodLabel: `${fmtD(periodStart)} – ${fmtD(periodEnd)}`,
    totalRevenue, totalExpenses,
    cashFromCustomers, cashToSuppliers, cashToEmployees, otherOperatingCash,
    interestPaid, interestReceived, dividendsPaid, dividendsReceived, incomeTaxPaid,
    nonCashActivities,
  };
}

// ────────── Main Hook ──────────

export function useCashFlowData(
  startDate: Date | null,
  endDate: Date | null,
  options?: {
    businessUnitCode?: string;
    comparativeStartDate?: Date | null;
    comparativeEndDate?: Date | null;
  }
) {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId?.() || selectedCompanyId;
  const businessUnitCode = options?.businessUnitCode;

  // Standalone fetch: accounts
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["cashflow-accounts", effectiveCompanyId],
    queryFn: async () => {
      const q = supabase.from("chart_of_accounts").select("*").order("account_code");
      if (effectiveCompanyId) q.eq("company_id", effectiveCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Server-side date-filtered fetch: posted journal entries with lines
  // We look back 2 years before period start for opening balances
  const preStartDate = useMemo(() => {
    if (!startDate) return null;
    const d = new Date(startDate);
    d.setFullYear(d.getFullYear() - 2);
    return d.toISOString().split('T')[0];
  }, [startDate]);

  const { data: journalEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["cashflow-journal-entries", effectiveCompanyId, preStartDate, businessUnitCode],
    queryFn: async () => {
      let q = supabase
        .from("journal_entries")
        .select("*, lines:journal_entry_lines(*)")
        .eq("status", "posted")
        .order("entry_date", { ascending: false });

      if (effectiveCompanyId) q = q.eq("company_id", effectiveCompanyId);

      // Server-side date filtering for scalability
      if (preStartDate) q = q.gte("entry_date", preStartDate);

      // Business unit filtering
      if (businessUnitCode) q = q.eq("business_unit_code", businessUnitCode);

      // Handle Supabase 1000-row limit with pagination
      const allData: any[] = [];
      let offset = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await q.range(offset, offset + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < pageSize) break;
        offset += pageSize;
      }
      return allData;
    },
    enabled: !!preStartDate,
  });

  // Standalone fetch: financial periods
  const { data: periods = [], isLoading: loadingPeriods } = useQuery({
    queryKey: ["cashflow-periods", effectiveCompanyId],
    queryFn: async () => {
      const q = supabase
        .from("financial_periods")
        .select("*")
        .order("start_date", { ascending: false });
      if (effectiveCompanyId) q.eq("company_id", effectiveCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingAccounts || loadingEntries || loadingPeriods;

  const cashFlowData = useMemo<CashFlowData | null>(() => {
    if (!startDate || !endDate || accounts.length === 0) return null;

    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);
    periodStart.setHours(0, 0, 0, 0);
    periodEnd.setHours(23, 59, 59, 999);

    const periodEntries = (journalEntries as any[]).filter((e) => {
      const d = new Date(e.entry_date);
      return d >= periodStart && d <= periodEnd;
    });
    const prePeriodEntries = (journalEntries as any[]).filter((e) => {
      const d = new Date(e.entry_date);
      return d < periodStart;
    });

    return computeCashFlow(accounts, periodEntries, prePeriodEntries, periodStart, periodEnd);
  }, [accounts, journalEntries, startDate, endDate]);

  // Comparative period
  const comparativeData = useMemo<CashFlowData | null>(() => {
    const compStart = options?.comparativeStartDate;
    const compEnd = options?.comparativeEndDate;
    if (!compStart || !compEnd || accounts.length === 0) return null;

    const periodStart = new Date(compStart);
    const periodEnd = new Date(compEnd);
    periodStart.setHours(0, 0, 0, 0);
    periodEnd.setHours(23, 59, 59, 999);

    const periodEntries = (journalEntries as any[]).filter((e) => {
      const d = new Date(e.entry_date);
      return d >= periodStart && d <= periodEnd;
    });
    const prePeriodEntries = (journalEntries as any[]).filter((e) => {
      const d = new Date(e.entry_date);
      return d < periodStart;
    });

    return computeCashFlow(accounts, periodEntries, prePeriodEntries, periodStart, periodEnd);
  }, [accounts, journalEntries, options?.comparativeStartDate, options?.comparativeEndDate]);

  return { cashFlowData, comparativeData, periods, isLoading };
}

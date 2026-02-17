// Cash Flow Statement data hook — IAS 7 compliant
// Classifies GL journal entries into Operating / Investing / Financing
// Supports both Direct and Indirect methods
// Works with or without company context (standalone fetch when no company selected)
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
}

export interface WorkingCapitalItem {
  label: string;
  opening: number;
  closing: number;
  change: number;
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

  if (ln.includes("cash") || ln.includes("bank") || ln.includes("petty cash") ||
      p3 === "110" || p3 === "111" || p3 === "112")
    return { category: "cash", activity: "operating" };

  if (ln.includes("receivable") || ln.includes("debtor") || p3 === "120" || p3 === "121" || p3 === "122")
    return { category: "receivable", activity: "operating" };

  if (ln.includes("inventory") || ln.includes("stock") || ln.includes("raw material") ||
      ln.includes("finished goods") || ln.includes("work in progress") ||
      p3 === "130" || p3 === "131" || p3 === "132")
    return { category: "inventory", activity: "operating" };

  if (ln.includes("prepaid") || ln.includes("advance") || ln.includes("deposit") ||
      p3 === "140" || p3 === "141")
    return { category: "prepayment", activity: "operating" };

  if (accountType === "asset" && (
    ln.includes("property") || ln.includes("plant") || ln.includes("equipment") ||
    ln.includes("vehicle") || ln.includes("furniture") || ln.includes("computer") ||
    ln.includes("building") || ln.includes("land") || ln.includes("intangible") ||
    ln.includes("goodwill") || ln.includes("accumulated depreciation") ||
    ln.includes("accumulated amortization") ||
    p2 === "15" || p2 === "16" || p2 === "17"))
    return { category: "fixed_asset", activity: "investing" };

  if (ln.includes("payable") || ln.includes("creditor") || ln.includes("accounts payable") ||
      p3 === "210" || p3 === "211")
    return { category: "payable", activity: "operating" };

  if (ln.includes("tax payable") || ln.includes("vat") || ln.includes("income tax") ||
      ln.includes("sscl") || ln.includes("withholding") || p3 === "212" || p3 === "213")
    return { category: "tax_liability", activity: "operating" };

  if (ln.includes("accrued") || ln.includes("accrual") || ln.includes("provision") ||
      ln.includes("gratuity") || p3 === "214" || p3 === "215")
    return { category: "accrual", activity: "operating" };

  if (ln.includes("loan") || ln.includes("borrowing") || ln.includes("mortgage") ||
      ln.includes("debenture") || ln.includes("lease liability") ||
      p2 === "22" || p2 === "23" || p2 === "24")
    return { category: "loan", activity: "financing" };

  if (accountType === "equity")
    return { category: "equity", activity: "financing" };

  if (ln.includes("depreciation") || ln.includes("amortization") || ln.includes("amortisation"))
    return { category: "depreciation", activity: "operating" };

  if (accountType === "revenue")
    return { category: "revenue", activity: "operating" };

  if (accountType === "expense")
    return { category: "expense", activity: "operating" };

  if (accountType === "asset" && (p2 === "13" || p2 === "14"))
    return { category: "other_ca", activity: "operating" };

  if (accountType === "liability" && p2 === "21")
    return { category: "other_cl", activity: "operating" };

  return { category: "other", activity: "operating" };
}

// ────────── Main Hook ──────────

export function useCashFlowData(
  startDate: Date | null,
  endDate: Date | null
) {
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId?.() || selectedCompanyId;

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

  // Standalone fetch: posted journal entries with lines
  const { data: journalEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["cashflow-journal-entries", effectiveCompanyId],
    queryFn: async () => {
      const q = supabase
        .from("journal_entries")
        .select("*, lines:journal_entry_lines(*)")
        .eq("status", "posted")
        .order("entry_date", { ascending: false });
      if (effectiveCompanyId) q.eq("company_id", effectiveCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
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

    // Build account map
    const accountMap = new Map<string, AccountInfo>();
    (accounts as any[]).forEach((acc) => {
      const { category, activity } = classifyAccount(
        acc.account_code || "", acc.account_name || "", acc.account_type || ""
      );
      accountMap.set(acc.id, {
        id: acc.id,
        account_code: acc.account_code || "",
        account_name: acc.account_name || "",
        account_type: acc.account_type || "",
        category, activity,
        opening_balance: acc.opening_balance || acc.current_balance || 0,
      });
    });

    // Filter entries
    const periodEntries = (journalEntries as any[]).filter((e) => {
      const d = new Date(e.entry_date);
      return d >= periodStart && d <= periodEnd;
    });
    const prePeriodEntries = (journalEntries as any[]).filter((e) => {
      const d = new Date(e.entry_date);
      return d < periodStart;
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

    // Working capital
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

    // Net income
    let totalRevenue = 0, totalExpenses = 0, depreciation = 0;
    accountMap.forEach((acc) => {
      const m = periodMov[acc.id] || { debit: 0, credit: 0 };
      if (acc.category === "revenue") totalRevenue += m.credit - m.debit;
      else if (acc.category === "depreciation") { depreciation += m.debit - m.credit; totalExpenses += m.debit - m.credit; }
      else if (acc.category === "expense") totalExpenses += m.debit - m.credit;
    });
    const netIncome = totalRevenue - totalExpenses;

    // Cash balances
    const openingCash = catBal("cash", prePeriodMov);
    const closingCash = catBal("cash", mergedMov);

    // Direct method — analyze cash-touching entries
    let cashFromCustomers = 0, cashToSuppliers = 0, cashToEmployees = 0, otherOperatingCash = 0;
    let fixedAssetPurchases = 0, fixedAssetSales = 0, investingOther = 0;
    let loanProceeds = 0, loanRepayments = 0, equityChanges = 0, financingOther = 0;

    periodEntries.forEach((entry: any) => {
      const lines = (entry.lines || []) as any[];
      const cashLines = lines.filter((l: any) => accountMap.get(l.account_id)?.category === "cash");
      const nonCashLines = lines.filter((l: any) => accountMap.get(l.account_id)?.category !== "cash");
      if (cashLines.length === 0) return;

      let netCash = 0;
      cashLines.forEach((l: any) => { netCash += (l.debit || 0) - (l.credit || 0); });

      const primary = nonCashLines[0];
      if (!primary) { otherOperatingCash += netCash; return; }
      const pAcc = accountMap.get(primary.account_id);
      if (!pAcc) { otherOperatingCash += netCash; return; }

      switch (pAcc.activity) {
        case "investing":
          if (netCash > 0) fixedAssetSales += netCash; else fixedAssetPurchases += Math.abs(netCash);
          break;
        case "financing":
          if (pAcc.category === "loan") {
            if (netCash > 0) loanProceeds += netCash; else loanRepayments += Math.abs(netCash);
          } else if (pAcc.category === "equity") equityChanges += netCash;
          else financingOther += netCash;
          break;
        default:
          if (pAcc.category === "revenue" || pAcc.category === "receivable") {
            cashFromCustomers += netCash;
          } else if (pAcc.category === "expense" || pAcc.category === "payable") {
            if (netCash < 0) {
              const desc = ((entry.description || "") + " " + pAcc.account_name).toLowerCase();
              if (desc.includes("salary") || desc.includes("wage") || desc.includes("payroll"))
                cashToEmployees += Math.abs(netCash);
              else cashToSuppliers += Math.abs(netCash);
            } else otherOperatingCash += netCash;
          } else otherOperatingCash += netCash;
      }
    });

    // Build line items
    const netDirectOp = cashFromCustomers - cashToSuppliers - cashToEmployees + otherOperatingCash;
    const directOperating: CashFlowLineItem[] = [
      { label: "Cash received from customers", amount: cashFromCustomers, indent: 1 },
      { label: "Cash paid to suppliers", amount: -cashToSuppliers, indent: 1 },
      { label: "Cash paid to employees", amount: -cashToEmployees, indent: 1 },
      { label: "Other operating cash flows", amount: otherOperatingCash, indent: 1 },
      { label: "Net Cash from Operating Activities", amount: netDirectOp, isSubtotal: true },
    ];

    const totalWC = wcItems.reduce((s, w) => s + w.change, 0);
    const netIndirectOp = netIncome + depreciation + totalWC;
    const indirectOperating: CashFlowLineItem[] = [
      { label: "Net Income", amount: netIncome, indent: 1 },
      { label: "Adjustments for non-cash items:", amount: 0, indent: 0 },
      { label: "Depreciation & Amortization", amount: depreciation, indent: 2 },
      { label: "Changes in working capital:", amount: 0, indent: 0 },
    ];
    wcItems.forEach((wc) => {
      if (Math.abs(wc.change) > 0.01) {
        indirectOperating.push({ label: `${wc.change >= 0 ? "Increase" : "Decrease"} in ${wc.label}`, amount: wc.change, indent: 2 });
      }
    });
    indirectOperating.push({ label: "Net Cash from Operating Activities", amount: netIndirectOp, isSubtotal: true });

    const netInv = fixedAssetSales - fixedAssetPurchases + investingOther;
    const investingItems: CashFlowLineItem[] = [];
    if (fixedAssetPurchases > 0) investingItems.push({ label: "Purchase of property, plant & equipment", amount: -fixedAssetPurchases, indent: 1 });
    if (fixedAssetSales > 0) investingItems.push({ label: "Proceeds from sale of assets", amount: fixedAssetSales, indent: 1 });
    if (investingOther !== 0) investingItems.push({ label: "Other investing activities", amount: investingOther, indent: 1 });
    investingItems.push({ label: "Net Cash from Investing Activities", amount: netInv, isSubtotal: true });

    const netFin = loanProceeds - loanRepayments + equityChanges + financingOther;
    const financingItems: CashFlowLineItem[] = [];
    if (loanProceeds > 0) financingItems.push({ label: "Proceeds from borrowings", amount: loanProceeds, indent: 1 });
    if (loanRepayments > 0) financingItems.push({ label: "Repayment of borrowings", amount: -loanRepayments, indent: 1 });
    if (equityChanges !== 0) financingItems.push({ label: "Equity contributions / withdrawals", amount: equityChanges, indent: 1 });
    if (financingOther !== 0) financingItems.push({ label: "Other financing activities", amount: financingOther, indent: 1 });
    financingItems.push({ label: "Net Cash from Financing Activities", amount: netFin, isSubtotal: true });

    const fmtD = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

    return {
      directOperating, netDirectOperating: netDirectOp,
      indirectOperating, netIndirectOperating: netIndirectOp,
      investingItems, netInvesting: netInv,
      financingItems, netFinancing: netFin,
      netCashChange: netDirectOp + netInv + netFin,
      openingCash, closingCash,
      workingCapital: wcItems, netIncome, depreciation,
      periodLabel: `${fmtD(periodStart)} – ${fmtD(periodEnd)}`,
      totalRevenue, totalExpenses,
      cashFromCustomers, cashToSuppliers, cashToEmployees, otherOperatingCash,
    };
  }, [accounts, journalEntries, startDate, endDate]);

  return { cashFlowData, periods, isLoading };
}

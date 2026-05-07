import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, TrendingUp, TrendingDown, DollarSign, BarChart3, Building2, Wallet, FileText } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { CashFlowView } from "./CashFlowView";
import { useCompany } from "@/contexts/CompanyContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ────────── Types ──────────

interface AccountLineItem {
  accountCode: string;
  accountName: string;
  amount: number;
  accountType: string;
  parentCategory?: string;
}

// ────────── Helpers ──────────

const formatCurrency = (num: number): string => {
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return num < 0 ? `(${formatted})` : formatted;
};

const categorizeAccount = (code: string, name: string, accountType: string): string => {
  const ln = name.toLowerCase();
  const p2 = code.substring(0, 2);

  if (accountType === "revenue") {
    if (ln.includes("operating") || ln.includes("sales") || ln.includes("service") || ln.includes("hire")) return "Operating Revenue";
    if (ln.includes("interest") || ln.includes("dividend") || ln.includes("gain")) return "Other Income";
    return "Revenue";
  }

  if (accountType === "expense") {
    if (ln.includes("cost of") || ln.includes("direct") || ln.includes("fuel") || ln.includes("maintenance")) return "Cost of Services";
    if (ln.includes("salary") || ln.includes("wage") || ln.includes("payroll") || ln.includes("staff") || ln.includes("epf") || ln.includes("etf")) return "Employee Costs";
    if (ln.includes("depreciation") || ln.includes("amortization") || ln.includes("amortisation")) return "Depreciation & Amortization";
    if (ln.includes("interest expense") || ln.includes("finance cost") || ln.includes("bank charge")) return "Finance Costs";
    if (ln.includes("tax") && !ln.includes("income tax")) return "Tax Expenses";
    return "Operating Expenses";
  }

  if (accountType === "asset") {
    if (p2 === "11" || ln.includes("cash") || ln.includes("bank") || ln.includes("petty")) return "Cash & Bank";
    if (p2 === "12" || ln.includes("receivable") || ln.includes("debtor")) return "Trade Receivables";
    if (p2 === "13" || ln.includes("inventory") || ln.includes("stock")) return "Inventory";
    if (p2 === "14" || ln.includes("prepaid") || ln.includes("advance") || ln.includes("deposit")) return "Prepaid & Other Current";
    if (p2 === "15" || p2 === "16" || p2 === "17" || ln.includes("property") || ln.includes("plant") || ln.includes("equipment") || ln.includes("vehicle") || ln.includes("furniture") || ln.includes("building")) return "Property, Plant & Equipment";
    if (ln.includes("intangible") || ln.includes("goodwill")) return "Intangible Assets";
    if (ln.includes("accumulated depreciation") || ln.includes("accumulated amortization")) return "Accumulated Depreciation";
    return "Other Assets";
  }

  if (accountType === "liability") {
    if (p2 === "21" || ln.includes("payable") || ln.includes("creditor")) return "Trade Payables";
    if (ln.includes("tax") || ln.includes("vat") || ln.includes("sscl") || ln.includes("withholding")) return "Tax Liabilities";
    if (ln.includes("accrued") || ln.includes("provision") || ln.includes("gratuity")) return "Accrued Liabilities";
    if (ln.includes("loan") || ln.includes("borrowing") || ln.includes("mortgage") || ln.includes("lease")) return "Borrowings";
    return "Other Liabilities";
  }

  if (accountType === "equity") {
    if (ln.includes("capital") || ln.includes("share")) return "Share Capital";
    if (ln.includes("retained") || ln.includes("earnings") || ln.includes("surplus")) return "Retained Earnings";
    if (ln.includes("reserve")) return "Reserves";
    return "Other Equity";
  }

  return "Other";
};

// ────────── Section Component ──────────

const ReportSection = ({
  title,
  items,
  total,
  totalLabel,
  icon,
  color,
  showAccountCode = true,
}: {
  title: string;
  items: AccountLineItem[];
  total: number;
  totalLabel: string;
  icon: React.ReactNode;
  color: string;
  showAccountCode?: boolean;
}) => {
  // Group by parentCategory
  const grouped = useMemo(() => {
    const groups: Record<string, AccountLineItem[]> = {};
    items.forEach(item => {
      const cat = item.parentCategory || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [items]);

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 border-b-2 ${color} pb-2`}>
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant="secondary" className="ml-auto">{items.length} accounts</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {showAccountCode && <TableHead className="w-[100px]">Code</TableHead>}
            <TableHead>Account</TableHead>
            <TableHead className="text-right w-[180px]">Amount (LKR)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(grouped).map(([category, catItems]) => {
            const catTotal = catItems.reduce((s, i) => s + i.amount, 0);
            return (
              <React.Fragment key={category}>
                <TableRow className="bg-muted/30 hover:bg-muted/40">
                  {showAccountCode && <TableCell />}
                  <TableCell className="font-semibold text-muted-foreground text-sm">{category}</TableCell>
                  <TableCell className="text-right font-semibold text-sm">
                    {formatCurrency(catTotal)}
                  </TableCell>
                </TableRow>
                {catItems.map(item => (
                  <TableRow key={item.accountCode} className="hover:bg-muted/20">
                    {showAccountCode && (
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.accountCode}</TableCell>
                    )}
                    <TableCell className="pl-8">{item.accountName}</TableCell>
                    <TableCell className={`text-right font-mono ${item.amount < 0 ? "text-destructive" : ""}`}>
                      {formatCurrency(item.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            );
          })}
          <TableRow className="border-t-2 font-bold text-lg">
            {showAccountCode && <TableCell />}
            <TableCell>{totalLabel}</TableCell>
            <TableCell className={`text-right font-mono ${total < 0 ? "text-destructive" : "text-primary"}`}>
              LKR {formatCurrency(total)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

// ────────── KPI Card ──────────

const KPICard = ({ title, value, icon, trend, color }: {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  color: string;
}) => (
  <Card className={`border-l-4 ${color}`}>
    <CardContent className="pt-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-xl font-bold mt-1 ${value < 0 ? "text-destructive" : ""}`}>
            LKR {formatCurrency(value)}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50">{icon}</div>
      </div>
    </CardContent>
  </Card>
);

// ────────── Main Component ──────────

import React from "react";
import { useAutoBusinessUnitFilter } from "@/hooks/useAccountingData";
import { BusinessUnitSelector } from "./shared/BusinessUnitSelector";

export const FinancialStatementsView = () => {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId?.() || selectedCompanyId;
  const autoBU = useAutoBusinessUnitFilter();
  const [businessUnit, setBusinessUnit] = useState<string>(autoBU || "all");

  // Sync with context if it changes (e.g. user switches company)
  useMemo(() => {
    if (autoBU) setBusinessUnit(autoBU);
  }, [autoBU]);

  // ────────── Data Fetching ──────────

  const { data: accounts = [] } = useQuery({
    queryKey: ["fs-accounts", effectiveCompanyId],
    queryFn: async () => {
      const q = supabase.from("chart_of_accounts").select("*").eq("is_active", true).order("account_code");
      if (effectiveCompanyId) q.eq("company_id", effectiveCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: journalEntries = [], isLoading } = useQuery({
    queryKey: ["fs-journal-entries", effectiveCompanyId, businessUnit],
    queryFn: async () => {
      let q = supabase
        .from("journal_entries")
        .select("*, lines:journal_entry_lines(*)")
        .eq("status", "posted")
        .order("entry_date", { ascending: false });
      
      if (effectiveCompanyId) q = q.eq("company_id", effectiveCompanyId);
      
      if (businessUnit && businessUnit !== "all") {
        if (businessUnit === "SBO") {
          q = q.or(`business_unit_code.eq.SBO,entry_number.ilike.SBS-%,entry_number.ilike.FUEL-BLK-%`);
        } else {
          q = q.or(`business_unit_code.eq.${businessUnit},entry_number.ilike.${businessUnit}-%`);
        }
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // ────────── Computation ──────────

  const { revenueItems, expenseItems, assetItems, liabilityItems, equityItems,
    totalRevenue, totalExpenses, netIncome,
    totalAssets, totalLiabilities, totalEquity, retainedEarnings,
  } = useMemo(() => {
    const start = dateRange.from ? new Date(dateRange.from) : null;
    const end = dateRange.to ? new Date(dateRange.to) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    // Build account map
    const accountMap = new Map<string, { code: string; name: string; type: string; openingBalance: number }>();
    (accounts as any[]).forEach(acc => {
      accountMap.set(acc.id, {
        code: acc.account_code || "",
        name: acc.account_name || "",
        type: acc.account_type || "",
        openingBalance: acc.opening_balance || 0,
      });
    });

    // Filter entries by date range
    const filteredEntries = (journalEntries as any[]).filter(e => {
      if (!start || !end) return true; // If no date range, include all
      const d = new Date(e.entry_date);
      return d >= start && d <= end;
    });

    // For balance sheet, we need ALL entries up to the end date
    const bsEntries = (journalEntries as any[]).filter(e => {
      if (!end) return true;
      const d = new Date(e.entry_date);
      return d <= end;
    });

    // Aggregate movements for P&L (period entries)
    const plMovements: Record<string, { debit: number; credit: number }> = {};
    filteredEntries.forEach((entry: any) => {
      (entry.lines || []).forEach((line: any) => {
        if (!line.account_id) return;
        if (!plMovements[line.account_id]) plMovements[line.account_id] = { debit: 0, credit: 0 };
        plMovements[line.account_id].debit += line.debit || 0;
        plMovements[line.account_id].credit += line.credit || 0;
      });
    });

    // Aggregate movements for Balance Sheet (all entries up to end date)
    const bsMovements: Record<string, { debit: number; credit: number }> = {};
    bsEntries.forEach((entry: any) => {
      (entry.lines || []).forEach((line: any) => {
        if (!line.account_id) return;
        if (!bsMovements[line.account_id]) bsMovements[line.account_id] = { debit: 0, credit: 0 };
        bsMovements[line.account_id].debit += line.debit || 0;
        bsMovements[line.account_id].credit += line.credit || 0;
      });
    });

    // Calculate account balances
    const getBalance = (
      accId: string,
      movements: Record<string, { debit: number; credit: number }>,
      includeOpening: boolean
    ): number => {
      const acc = accountMap.get(accId);
      if (!acc) return 0;
      const m = movements[accId] || { debit: 0, credit: 0 };
      const ob = includeOpening ? acc.openingBalance : 0;
      // Assets and Expenses have normal debit balances
      if (["asset", "expense"].includes(acc.type)) return ob + m.debit - m.credit;
      // Revenue, Liability, Equity have normal credit balances
      return ob + m.credit - m.debit;
    };

    // Build P&L line items
    const revItems: AccountLineItem[] = [];
    const expItems: AccountLineItem[] = [];
    let totRev = 0, totExp = 0;

    accountMap.forEach((acc, id) => {
      if (acc.type === "revenue") {
        const amount = getBalance(id, plMovements, false);
        if (Math.abs(amount) > 0.001) {
          revItems.push({
            accountCode: acc.code,
            accountName: acc.name,
            amount,
            accountType: acc.type,
            parentCategory: categorizeAccount(acc.code, acc.name, acc.type),
          });
          totRev += amount;
        }
      } else if (acc.type === "expense") {
        const amount = getBalance(id, plMovements, false);
        if (Math.abs(amount) > 0.001) {
          expItems.push({
            accountCode: acc.code,
            accountName: acc.name,
            amount,
            accountType: acc.type,
            parentCategory: categorizeAccount(acc.code, acc.name, acc.type),
          });
          totExp += amount;
        }
      }
    });

    // Sort by category then code
    const sortItems = (items: AccountLineItem[]) =>
      items.sort((a, b) => (a.parentCategory || "").localeCompare(b.parentCategory || "") || a.accountCode.localeCompare(b.accountCode));
    sortItems(revItems);
    sortItems(expItems);

    const ni = totRev - totExp;

    // Build Balance Sheet line items
    const aItems: AccountLineItem[] = [];
    const lItems: AccountLineItem[] = [];
    const eItems: AccountLineItem[] = [];
    let totA = 0, totL = 0, totE = 0;

    accountMap.forEach((acc, id) => {
      if (acc.type === "asset") {
        const amount = getBalance(id, bsMovements, true);
        if (Math.abs(amount) > 0.001) {
          aItems.push({
            accountCode: acc.code,
            accountName: acc.name,
            amount,
            accountType: acc.type,
            parentCategory: categorizeAccount(acc.code, acc.name, acc.type),
          });
          totA += amount;
        }
      } else if (acc.type === "liability") {
        const amount = getBalance(id, bsMovements, true);
        if (Math.abs(amount) > 0.001) {
          lItems.push({
            accountCode: acc.code,
            accountName: acc.name,
            amount,
            accountType: acc.type,
            parentCategory: categorizeAccount(acc.code, acc.name, acc.type),
          });
          totL += amount;
        }
      } else if (acc.type === "equity") {
        const amount = getBalance(id, bsMovements, true);
        if (Math.abs(amount) > 0.001) {
          eItems.push({
            accountCode: acc.code,
            accountName: acc.name,
            amount,
            accountType: acc.type,
            parentCategory: categorizeAccount(acc.code, acc.name, acc.type),
          });
          totE += amount;
        }
      }
    });

    sortItems(aItems);
    sortItems(lItems);
    sortItems(eItems);

    return {
      revenueItems: revItems,
      expenseItems: expItems,
      assetItems: aItems,
      liabilityItems: lItems,
      equityItems: eItems,
      totalRevenue: totRev,
      totalExpenses: totExp,
      netIncome: ni,
      totalAssets: totA,
      totalLiabilities: totL,
      totalEquity: totE,
      retainedEarnings: ni, // Current period's net income adds to retained earnings
    };
  }, [accounts, journalEntries, dateRange]);

  // ────────── CSV Export ──────────

  const handleExportCSV = (reportType: "pl" | "bs") => {
    const rows: string[][] = [];
    const addRow = (cols: string[]) => rows.push(cols);

    if (reportType === "pl") {
      addRow(["Profit & Loss Statement"]);
      if (dateRange.from && dateRange.to) {
        addRow([`Period: ${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`]);
      }
      addRow([]);
      addRow(["Account Code", "Account Name", "Category", "Amount (LKR)"]);
      addRow([]);
      addRow(["REVENUE"]);
      revenueItems.forEach(i => addRow([i.accountCode, i.accountName, i.parentCategory || "", i.amount.toFixed(2)]));
      addRow(["", "Total Revenue", "", totalRevenue.toFixed(2)]);
      addRow([]);
      addRow(["EXPENSES"]);
      expenseItems.forEach(i => addRow([i.accountCode, i.accountName, i.parentCategory || "", i.amount.toFixed(2)]));
      addRow(["", "Total Expenses", "", totalExpenses.toFixed(2)]);
      addRow([]);
      addRow(["", "NET INCOME", "", netIncome.toFixed(2)]);
    } else {
      addRow(["Balance Sheet"]);
      if (dateRange.to) addRow([`As at: ${dateRange.to.toLocaleDateString()}`]);
      addRow([]);
      addRow(["Account Code", "Account Name", "Category", "Amount (LKR)"]);
      addRow([]);
      addRow(["ASSETS"]);
      assetItems.forEach(i => addRow([i.accountCode, i.accountName, i.parentCategory || "", i.amount.toFixed(2)]));
      addRow(["", "Total Assets", "", totalAssets.toFixed(2)]);
      addRow([]);
      addRow(["LIABILITIES"]);
      liabilityItems.forEach(i => addRow([i.accountCode, i.accountName, i.parentCategory || "", i.amount.toFixed(2)]));
      addRow(["", "Total Liabilities", "", totalLiabilities.toFixed(2)]);
      addRow([]);
      addRow(["EQUITY"]);
      equityItems.forEach(i => addRow([i.accountCode, i.accountName, i.parentCategory || "", i.amount.toFixed(2)]));
      addRow(["", "Retained Earnings (Current Period)", "", retainedEarnings.toFixed(2)]);
      addRow(["", "Total Equity", "", (totalEquity + retainedEarnings).toFixed(2)]);
      addRow([]);
      addRow(["", "Total Liabilities & Equity", "", (totalLiabilities + totalEquity + retainedEarnings).toFixed(2)]);
    }

    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType === "pl" ? "profit_loss" : "balance_sheet"}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ────────── PDF Export ──────────

  const handleExportPDF = (reportType: "pl" | "bs") => {
    const title = reportType === "pl" ? "Profit & Loss Statement" : "Balance Sheet";
    const dateLabel = dateRange.from && dateRange.to
      ? `${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`
      : "All periods";

    const buildRows = (items: AccountLineItem[], label: string, total: number) => {
      let html = `<tr class="section-header"><td colspan="3"><strong>${label}</strong></td></tr>`;
      let currentCat = "";
      items.forEach(item => {
        if (item.parentCategory && item.parentCategory !== currentCat) {
          currentCat = item.parentCategory;
          html += `<tr class="category"><td colspan="2">${currentCat}</td><td></td></tr>`;
        }
        html += `<tr><td class="code">${item.accountCode}</td><td>${item.accountName}</td><td class="amount">${formatCurrency(item.amount)}</td></tr>`;
      });
      html += `<tr class="total"><td></td><td><strong>Total ${label}</strong></td><td class="amount"><strong>LKR ${formatCurrency(total)}</strong></td></tr>`;
      return html;
    };

    let tableBody = "";
    if (reportType === "pl") {
      tableBody += buildRows(revenueItems, "Revenue", totalRevenue);
      tableBody += buildRows(expenseItems, "Expenses", totalExpenses);
      tableBody += `<tr class="grand-total"><td></td><td><strong>Net Income</strong></td><td class="amount"><strong>LKR ${formatCurrency(netIncome)}</strong></td></tr>`;
    } else {
      tableBody += buildRows(assetItems, "Assets", totalAssets);
      tableBody += buildRows(liabilityItems, "Liabilities", totalLiabilities);
      tableBody += buildRows(equityItems, "Equity", totalEquity);
      if (Math.abs(retainedEarnings) > 0.001) {
        tableBody += `<tr><td></td><td><em>+ Current Period Retained Earnings</em></td><td class="amount"><em>${formatCurrency(retainedEarnings)}</em></td></tr>`;
      }
      tableBody += `<tr class="grand-total"><td></td><td><strong>Total Liabilities & Equity</strong></td><td class="amount"><strong>LKR ${formatCurrency(totalLiabilities + totalEquity + retainedEarnings)}</strong></td></tr>`;
    }

    const printHtml = `<!DOCTYPE html><html><head><title>${title}</title>
      <style>
        body{font-family:'Segoe UI',sans-serif;padding:40px;color:#1a1a1a;}
        h1{font-size:22px;margin-bottom:4px;}
        .subtitle{color:#666;font-size:13px;margin-bottom:24px;}
        table{width:100%;border-collapse:collapse;font-size:13px;}
        th{background:#f8f9fa;border-bottom:2px solid #dee2e6;text-align:left;padding:10px 8px;}
        td{padding:7px 8px;border-bottom:1px solid #eee;}
        .code{font-family:monospace;color:#888;width:80px;}
        .amount{text-align:right;font-family:monospace;}
        .section-header td{background:#f0f4ff;padding:12px 8px;border-top:2px solid #ccc;}
        .category td{background:#fafafa;font-weight:500;color:#555;font-size:12px;}
        .total td{border-top:2px solid #333;border-bottom:2px solid #333;}
        .grand-total td{border-top:3px double #333;font-size:15px;padding:12px 8px;}
        @media print{body{padding:20px;}}
      </style>
    </head><body>
      <h1>${title}</h1>
      <p class="subtitle">Period: ${dateLabel} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString()}</p>
      <table><thead><tr><th style="width:80px">Code</th><th>Account</th><th style="width:160px;text-align:right">Amount (LKR)</th></tr></thead>
      <tbody>${tableBody}</tbody></table>
    </body></html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 300);
    }
  };

  // ────────── Render ──────────

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">Financial Statements</h2>
            <p className="text-sm text-muted-foreground mt-1">
              GL journal entry-based P&L, Balance Sheet, and Cash Flow
            </p>
            {isLoading && (
              <Badge variant="secondary" className="mt-1">Loading journal entries...</Badge>
            )}
          </div>
          <div className="flex gap-3 items-center">
            <BusinessUnitSelector
              value={businessUnit}
              onChange={setBusinessUnit}
              showAllOption
            />
            <DateRangePicker
              onDateRangeChange={(range) => setDateRange(range || {})}
            />
          </div>
        </div>

        {!dateRange.from && !dateRange.to && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-600" />
              <p className="text-amber-800 dark:text-amber-200 font-medium">
                Select a date range to view period-specific financial statements.
              </p>
            </div>
            <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
              Without a date range, all posted journal entries are included.
            </p>
          </div>
        )}

        <Tabs defaultValue="pl" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
            <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
            <TabsTrigger value="cf">Cash Flow</TabsTrigger>
          </TabsList>

          {/* ────── Profit & Loss ────── */}
          <TabsContent value="pl">
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard
                  title="Total Revenue"
                  value={totalRevenue}
                  icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                  color="border-l-green-500"
                />
                <KPICard
                  title="Total Expenses"
                  value={totalExpenses}
                  icon={<TrendingDown className="h-5 w-5 text-red-600" />}
                  color="border-l-red-500"
                />
                <KPICard
                  title="Net Income"
                  value={netIncome}
                  icon={<DollarSign className="h-5 w-5 text-blue-600" />}
                  trend={netIncome >= 0 ? "up" : "down"}
                  color="border-l-blue-500"
                />
              </div>

              {/* Net Income Margin */}
              {totalRevenue > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  <span>Net Income Margin: <strong>{((netIncome / totalRevenue) * 100).toFixed(1)}%</strong></span>
                </div>
              )}

              {/* Revenue Section */}
              <ReportSection
                title="Revenue"
                items={revenueItems}
                total={totalRevenue}
                totalLabel="Total Revenue"
                icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                color="border-green-500"
              />

              {/* Expense Section */}
              <ReportSection
                title="Expenses"
                items={expenseItems}
                total={totalExpenses}
                totalLabel="Total Expenses"
                icon={<TrendingDown className="h-5 w-5 text-red-600" />}
                color="border-red-500"
              />

              {/* Net Income */}
              <div className="pt-4 border-t-4 border-primary">
                <div className="flex justify-between py-3 items-center">
                  <span className="font-bold text-xl">Net Income</span>
                  <span className={`font-mono font-bold text-2xl ${netIncome >= 0 ? "text-primary" : "text-destructive"}`}>
                    LKR {formatCurrency(netIncome)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleExportCSV("pl")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => handleExportPDF("pl")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ────── Balance Sheet ────── */}
          <TabsContent value="bs">
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard
                  title="Total Assets"
                  value={totalAssets}
                  icon={<Building2 className="h-5 w-5 text-blue-600" />}
                  color="border-l-blue-500"
                />
                <KPICard
                  title="Total Liabilities"
                  value={totalLiabilities}
                  icon={<TrendingDown className="h-5 w-5 text-orange-600" />}
                  color="border-l-orange-500"
                />
                <KPICard
                  title="Total Equity"
                  value={totalEquity + retainedEarnings}
                  icon={<Wallet className="h-5 w-5 text-purple-600" />}
                  color="border-l-purple-500"
                />
                <KPICard
                  title="Net Position"
                  value={totalAssets - totalLiabilities - totalEquity - retainedEarnings}
                  icon={<DollarSign className="h-5 w-5 text-green-600" />}
                  trend={totalAssets - totalLiabilities - totalEquity - retainedEarnings >= 0 ? "up" : "down"}
                  color="border-l-green-500"
                />
              </div>

              {/* Assets */}
              <ReportSection
                title="Assets"
                items={assetItems}
                total={totalAssets}
                totalLabel="Total Assets"
                icon={<Building2 className="h-5 w-5 text-blue-600" />}
                color="border-blue-500"
              />

              {/* Liabilities */}
              <ReportSection
                title="Liabilities"
                items={liabilityItems}
                total={totalLiabilities}
                totalLabel="Total Liabilities"
                icon={<TrendingDown className="h-5 w-5 text-orange-600" />}
                color="border-orange-500"
              />

              {/* Equity */}
              <div className="space-y-2">
                <ReportSection
                  title="Equity"
                  items={equityItems}
                  total={totalEquity}
                  totalLabel="Equity (excl. current period)"
                  icon={<Wallet className="h-5 w-5 text-purple-600" />}
                  color="border-purple-500"
                />
                {/* Retained Earnings from current period */}
                {Math.abs(retainedEarnings) > 0.001 && (
                  <div className="pl-8 flex justify-between py-2 text-sm italic text-muted-foreground border-b">
                    <span>+ Current Period Net Income (Retained Earnings)</span>
                    <span className="font-mono">{formatCurrency(retainedEarnings)}</span>
                  </div>
                )}
              </div>

              {/* Accounting Equation Check */}
              <div className="pt-4 border-t-4 border-primary">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between py-3">
                    <span className="font-bold text-lg">Total Assets</span>
                    <span className="font-mono font-bold text-xl text-primary">
                      LKR {formatCurrency(totalAssets)}
                    </span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="font-bold text-lg">Total Liabilities + Equity</span>
                    <span className="font-mono font-bold text-xl text-primary">
                      LKR {formatCurrency(totalLiabilities + totalEquity + retainedEarnings)}
                    </span>
                  </div>
                </div>
                {Math.abs(totalAssets - (totalLiabilities + totalEquity + retainedEarnings)) > 0.01 && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mt-2">
                    <p className="text-destructive font-medium text-sm">
                      ⚠️ Balance Sheet does not balance. Difference: LKR{" "}
                      {formatCurrency(totalAssets - (totalLiabilities + totalEquity + retainedEarnings))}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleExportCSV("bs")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => handleExportPDF("bs")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ────── Cash Flow ────── */}
          <TabsContent value="cf">
            <CashFlowView />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

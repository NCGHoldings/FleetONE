import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useBudgets } from "@/hooks/useBudgets";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Target,
  AlertTriangle, Calendar, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";

interface BudgetLineItem {
  id: string;
  line_item_name: string;
  category: string;
  subcategory?: string;
  budget_amount: number;
  actual_amount: number;
  variance_amount?: number;
  variance_percentage?: number;
  budget_id: string;
}

interface BudgetWithItems {
  id: string;
  budget_name: string;
  budget_code: string;
  fiscal_year: number;
  status: string;
  total_budget_amount: number;
  budget_period: string;
}

export const BudgetAnalytics = () => {
  const { fetchBudgets } = useBudgets();
  const currentYear = new Date().getFullYear();
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId?.() || selectedCompanyId;

  const { data: budgets = [], isLoading: loadingBudgets } = useQuery({
    queryKey: ["budgets-analytics", effectiveCompanyId],
    queryFn: async () => {
      const q = supabase.from("budgets").select("*").order("created_at", { ascending: false });
      if (effectiveCompanyId) q.eq("company_id", effectiveCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: lineItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ["budget-line-items-analytics", effectiveCompanyId],
    queryFn: async () => {
      const q = supabase
        .from("budget_line_items")
        .select("*")
        .eq("is_active", true);
      if (effectiveCompanyId) q.eq("company_id", effectiveCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as BudgetLineItem[];
    },
  });

  // Fetch YTD GL expense data
  const ytdStart = `${currentYear}-01-01`;
  const ytdEnd = new Date().toISOString().split("T")[0];

  const { data: glEntries = [], isLoading: loadingGL } = useQuery({
    queryKey: ["budget-analytics-gl", currentYear, effectiveCompanyId],
    queryFn: async () => {
      const q = supabase
        .from("journal_entries")
        .select("entry_date, lines:journal_entry_lines(debit, credit, account_id)")
        .eq("status", "posted")
        .gte("entry_date", ytdStart)
        .lte("entry_date", ytdEnd);
      if (effectiveCompanyId) q.eq("company_id", effectiveCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["all-accounts-analytics", effectiveCompanyId],
    queryFn: async () => {
      const q = supabase
        .from("chart_of_accounts")
        .select("id, account_type, account_name, account_code")
        .eq("is_active", true);
      if (effectiveCompanyId) q.eq("company_id", effectiveCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingBudgets || loadingItems || loadingGL;

  // Monthly GL spending breakdown
  const monthlySpending = useMemo(() => {
    const expenseIds = new Set(
      (accounts as { id: string; account_type: string }[])
        .filter(a => a.account_type === "expense")
        .map(a => a.id)
    );
    const revenueIds = new Set(
      (accounts as { id: string; account_type: string }[])
        .filter(a => a.account_type === "revenue")
        .map(a => a.id)
    );

    const months: { month: string; expenses: number; revenue: number; net: number }[] = [];
    for (let m = 0; m < 12; m++) {
      const monthLabel = new Date(currentYear, m).toLocaleDateString("en-US", { month: "short" });
      let expenses = 0;
      let revenue = 0;

      (glEntries as { entry_date: string; lines: { debit: number; credit: number; account_id: string }[] }[]).forEach(entry => {
        const entryMonth = new Date(entry.entry_date).getMonth();
        if (entryMonth !== m) return;
        (entry.lines || []).forEach(line => {
          if (expenseIds.has(line.account_id)) {
            expenses += (line.debit || 0) - (line.credit || 0);
          }
          if (revenueIds.has(line.account_id)) {
            revenue += (line.credit || 0) - (line.debit || 0);
          }
        });
      });

      months.push({ month: monthLabel, expenses, revenue, net: revenue - expenses });
    }
    return months;
  }, [glEntries, accounts, currentYear]);

  // Build GL account-level spending map for linking actuals
  const glAccountSpending = useMemo(() => {
    const spending: Record<string, number> = {};
    const expenseIds = new Set(
      (accounts as { id: string; account_type: string }[])
        .filter(a => a.account_type === "expense")
        .map(a => a.id)
    );
    (glEntries as { entry_date: string; lines: { debit: number; credit: number; account_id: string }[] }[]).forEach(entry => {
      (entry.lines || []).forEach(line => {
        if (expenseIds.has(line.account_id)) {
          if (!spending[line.account_id]) spending[line.account_id] = 0;
          spending[line.account_id] += (line.debit || 0) - (line.credit || 0);
        }
      });
    });
    return spending;
  }, [glEntries, accounts]);

  // Category spending analysis — uses GL-linked actuals when account_id is present
  const categoryAnalysis = useMemo(() => {
    const currentYearItems = lineItems.filter(item => {
      const budget = (budgets as BudgetWithItems[]).find(b => b.id === item.budget_id);
      return budget && budget.fiscal_year === currentYear;
    });

    const bySub: Record<string, { budget: number; actual: number; count: number }> = {};
    currentYearItems.forEach(item => {
      const cat = item.subcategory || item.category || "Other";
      if (!bySub[cat]) bySub[cat] = { budget: 0, actual: 0, count: 0 };
      bySub[cat].budget += item.budget_amount || 0;
      // Use GL-derived actual if account_id is linked, otherwise fallback to manual actual_amount
      const glActual = item.account_id ? (glAccountSpending[item.account_id] || 0) : 0;
      const effectiveActual = item.account_id && glActual > 0 ? glActual : (item.actual_amount || 0);
      bySub[cat].actual += effectiveActual;
      bySub[cat].count++;
    });

    return Object.entries(bySub)
      .map(([category, data]) => ({
        category,
        budget: data.budget,
        actual: data.actual,
        variance: data.actual - data.budget,
        variancePct: data.budget > 0 ? ((data.actual - data.budget) / data.budget) * 100 : 0,
        count: data.count,
        utilization: data.budget > 0 ? (data.actual / data.budget) * 100 : 0,
      }))
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  }, [lineItems, budgets, currentYear, glAccountSpending]);

  // Top variances (positive and negative)
  const topVariances = useMemo(() => {
    return [...lineItems]
      .filter(item => item.budget_amount > 0)
      .map(item => {
        // Use GL-derived actual if account_id is linked
        const glActual = item.account_id ? (glAccountSpending[item.account_id] || 0) : 0;
        const effectiveActual = item.account_id && glActual > 0 ? glActual : (item.actual_amount || 0);
        return {
          ...item,
          actual_amount: effectiveActual,
          variance: effectiveActual - item.budget_amount,
          variancePct: (effectiveActual - item.budget_amount) / item.budget_amount * 100,
        };
      })
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
      .slice(0, 10);
  }, [lineItems, glAccountSpending]);

  const formatCurrency = (amount: number) =>
    `LKR ${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Total calculations
  const totalBudgeted = categoryAnalysis.reduce((s, c) => s + c.budget, 0);
  const totalActual = categoryAnalysis.reduce((s, c) => s + c.actual, 0);
  const ytdRevenue = monthlySpending.reduce((s, m) => s + m.revenue, 0);
  const ytdExpenses = monthlySpending.reduce((s, m) => s + m.expenses, 0);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="pt-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">YTD Revenue</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(ytdRevenue)}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">YTD Expenses</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(ytdExpenses)}</p>
              </div>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Total Budgeted</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(totalBudgeted)}</p>
              </div>
              <Target className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Budget Variance</p>
                <p className={`text-xl font-bold mt-1 ${totalActual - totalBudgeted > 0 ? "text-destructive" : "text-green-600"}`}>
                  {totalActual - totalBudgeted > 0 ? "+" : ""}{formatCurrency(totalActual - totalBudgeted)}
                </p>
              </div>
              <BarChart3 className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue vs Expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Revenue & Expenses — FY {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="w-[200px]">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlySpending.map((m) => {
                const margin = m.revenue > 0 ? (m.net / m.revenue) * 100 : 0;
                const hasData = m.revenue > 0 || m.expenses > 0;
                return (
                  <TableRow key={m.month} className={!hasData ? "opacity-40" : ""}>
                    <TableCell className="font-medium">{m.month}</TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {hasData ? formatCurrency(m.revenue) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {hasData ? formatCurrency(m.expenses) : "—"}
                    </TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${m.net >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {hasData ? (m.net < 0 ? "-" : "") + formatCurrency(m.net) : "—"}
                    </TableCell>
                    <TableCell>
                      {hasData && m.revenue > 0 ? (
                        <div className="flex items-center gap-2">
                          <Progress value={Math.max(0, Math.min(margin, 100))} className="h-2 flex-1" />
                          <span className="text-xs font-mono w-12 text-right">{margin.toFixed(0)}%</span>
                        </div>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Totals row */}
              <TableRow className="border-t-2 font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right font-mono text-green-700">{formatCurrency(ytdRevenue)}</TableCell>
                <TableCell className="text-right font-mono text-red-700">{formatCurrency(ytdExpenses)}</TableCell>
                <TableCell className={`text-right font-mono ${ytdRevenue - ytdExpenses >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {formatCurrency(ytdRevenue - ytdExpenses)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Category Budget Analysis */}
      {categoryAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Budget Utilization by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="w-[200px]">Utilization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryAnalysis.map((cat) => (
                  <TableRow key={cat.category}>
                    <TableCell className="font-medium">
                      {cat.category}
                      <span className="text-xs text-muted-foreground ml-2">({cat.count} items)</span>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(cat.budget)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(cat.actual)}</TableCell>
                    <TableCell className={`text-right font-mono ${cat.variance > 0 ? "text-red-600" : "text-green-600"}`}>
                      <div className="flex items-center justify-end gap-1">
                        {cat.variance > 0 ? <ArrowUpRight className="h-3 w-3" /> : cat.variance < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                        {cat.variance > 0 ? "+" : ""}{formatCurrency(cat.variance)}
                        <span className="text-xs ml-1">({cat.variancePct.toFixed(1)}%)</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={Math.min(cat.utilization, 100)}
                          className={`h-2 flex-1 ${cat.utilization > 100 ? "[&>div]:bg-destructive" : ""}`}
                        />
                        <span className={`text-xs font-mono w-12 text-right ${cat.utilization > 100 ? "text-destructive font-bold" : ""}`}>
                          {cat.utilization.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Top Variances */}
      {topVariances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Top 10 Budget Variances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topVariances.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.line_item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.subcategory || item.category} • Budget: {formatCurrency(item.budget_amount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">{formatCurrency(item.actual_amount || 0)}</p>
                    <Badge variant={item.variance > 0 ? "destructive" : "default"} className="text-xs">
                      {item.variance > 0 ? "+" : ""}{item.variancePct.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

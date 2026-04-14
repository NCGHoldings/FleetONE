import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBudgets } from "@/hooks/useBudgets";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Calendar, BarChart3, Target, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/contexts/CompanyContext";

export const BudgetDashboard = () => {
  const { fetchBudgets } = useBudgets();
  const { selectedCompanyId, getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId?.() || selectedCompanyId;

  const { data: budgets, isLoading: loadingBudgets } = useQuery({
    queryKey: ["budgets", effectiveCompanyId],
    queryFn: async () => {
      const q = supabase.from("budgets").select("*").order("created_at", { ascending: false });
      if (effectiveCompanyId) q.eq("company_id", effectiveCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all budget line items for active budgets to get actual spending
  const { data: allLineItems = [], isLoading: loadingLineItems } = useQuery({
    queryKey: ["budget-line-items-all", effectiveCompanyId],
    queryFn: async () => {
      const q = supabase
        .from("budget_line_items")
        .select("*, budgets!inner(status, fiscal_year, budget_name)")
        .eq("is_active", true);
      if (effectiveCompanyId) q.eq("company_id", effectiveCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch YTD expense totals from GL journal entries
  const currentYear = new Date().getFullYear();
  const ytdStart = `${currentYear}-01-01`;
  const ytdEnd = new Date().toISOString().split("T")[0];

  const { data: glExpenses = [], isLoading: loadingGL } = useQuery({
    queryKey: ["budget-gl-expenses", currentYear, effectiveCompanyId],
    queryFn: async () => {
      const q = supabase
        .from("journal_entries")
        .select("*, lines:journal_entry_lines(debit, credit, account_id)")
        .eq("status", "posted")
        .gte("entry_date", ytdStart)
        .lte("entry_date", ytdEnd);
      if (effectiveCompanyId) q.eq("company_id", effectiveCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch expense accounts to identify GL expense totals
  const { data: expenseAccounts = [] } = useQuery({
    queryKey: ["expense-accounts-for-budget", effectiveCompanyId],
    queryFn: async () => {
      const q = supabase
        .from("chart_of_accounts")
        .select("id, account_type")
        .eq("account_type", "expense")
        .eq("is_active", true);
      if (effectiveCompanyId) q.eq("company_id", effectiveCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingBudgets || loadingLineItems || loadingGL;

  // Compute YTD GL spending from expense accounts
  const ytdGLSpending = useMemo(() => {
    const expenseAccountIds = new Set(expenseAccounts.map((a: any) => a.id));
    let total = 0;
    (glExpenses as any[]).forEach((entry: any) => {
      (entry.lines || []).forEach((line: any) => {
        if (expenseAccountIds.has(line.account_id)) {
          total += (line.debit || 0) - (line.credit || 0);
        }
      });
    });
    return total;
  }, [glExpenses, expenseAccounts]);

  const activeBudgets = budgets?.filter(b => b.status === "active") || [];
  const approvedBudgets = budgets?.filter(b => b.status === "approved") || [];
  const allActiveBudgets = [...activeBudgets, ...approvedBudgets];
  const totalBudget = allActiveBudgets.reduce((sum, b) => sum + Number(b.total_budget_amount), 0);
  const pendingApprovals = budgets?.filter(b => b.status === "pending_approval").length || 0;

  // Budget line items totals for current fiscal year
  const currentYearItems = (allLineItems as any[]).filter(
    (item: any) => item.budgets?.fiscal_year === currentYear
  );
  const totalBudgetedAmount = currentYearItems.reduce(
    (sum: number, item: any) => sum + (item.budget_amount || 0), 0
  );
  const totalActualAmount = currentYearItems.reduce(
    (sum: number, item: any) => sum + (item.actual_amount || 0), 0
  );

  // Use whichever is higher: line-item actuals or GL-computed actuals
  const ytdSpending = Math.max(totalActualAmount, ytdGLSpending);
  const utilizationPercent = totalBudget > 0 ? Math.min((ytdSpending / totalBudget) * 100, 100) : 0;
  const remainingBudget = totalBudget - ytdSpending;

  // Variance analysis for current year items
  const overBudgetItems = currentYearItems.filter(
    (item: any) => (item.actual_amount || 0) > (item.budget_amount || 0) && (item.budget_amount || 0) > 0
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    `LKR ${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Annual Budget
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalBudget)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {allActiveBudgets.length} active/approved budget{allActiveBudgets.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              YTD Spending
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(ytdSpending)}
            </div>
            <div className="mt-2">
              <Progress value={utilizationPercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {utilizationPercent.toFixed(1)}% of budget utilized
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approvals
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApprovals}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Remaining Budget
            </CardTitle>
            <Wallet className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${remainingBudget < 0 ? "text-destructive" : ""}`}>
              {remainingBudget < 0 ? "-" : ""}{formatCurrency(remainingBudget)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              FY {currentYear}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Over Budget Alerts */}
      {overBudgetItems.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5" />
              Over-Budget Items ({overBudgetItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overBudgetItems.slice(0, 5).map((item: any) => {
                const overage = (item.actual_amount || 0) - (item.budget_amount || 0);
                const overPct = ((overage / (item.budget_amount || 1)) * 100).toFixed(1);
                return (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-white/50 dark:bg-black/20">
                    <div>
                      <p className="font-medium text-sm">{item.line_item_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Budget: {formatCurrency(item.budget_amount || 0)} • Actual: {formatCurrency(item.actual_amount || 0)}
                      </p>
                    </div>
                    <Badge variant="destructive">+{overPct}%</Badge>
                  </div>
                );
              })}
              {overBudgetItems.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  ...and {overBudgetItems.length - 5} more
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Budgets */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Budgets</CardTitle>
        </CardHeader>
        <CardContent>
          {budgets && budgets.length > 0 ? (
            <div className="space-y-4">
              {budgets.slice(0, 5).map((budget) => {
                // Find line items for this budget to compute utilization
                const budgetItems = (allLineItems as any[]).filter(
                  (item: any) => item.budget_id === budget.id
                );
                const budgetActual = budgetItems.reduce(
                  (sum: number, item: any) => sum + (item.actual_amount || 0), 0
                );
                const budgetTotal = Number(budget.total_budget_amount) || 0;
                const util = budgetTotal > 0 ? (budgetActual / budgetTotal) * 100 : 0;

                return (
                  <div
                    key={budget.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{budget.budget_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {budget.budget_code} • FY {budget.fiscal_year}
                      </p>
                      {budgetTotal > 0 && (
                        <div className="mt-2 max-w-xs">
                          <Progress value={Math.min(util, 100)} className="h-1.5" />
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {util.toFixed(1)}% utilized
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(budgetTotal)}
                      </p>
                      <p className="text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          budget.status === 'active' ? 'bg-green-500/20 text-green-700' :
                          budget.status === 'approved' ? 'bg-blue-500/20 text-blue-700' :
                          budget.status === 'draft' ? 'bg-gray-500/20 text-gray-700' :
                          budget.status === 'pending_approval' ? 'bg-yellow-500/20 text-yellow-700' :
                          'bg-red-500/20 text-red-700'
                        }`}>
                          {budget.status}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No budgets created yet. Create your first budget to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


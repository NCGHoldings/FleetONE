import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBudgets } from "@/hooks/useBudgets";
import { DollarSign, TrendingUp, AlertTriangle, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const BudgetDashboard = () => {
  const { fetchBudgets } = useBudgets();

  const { data: budgets, isLoading } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => fetchBudgets(),
  });

  const activeBudgets = budgets?.filter(b => b.status === "active") || [];
  const totalBudget = activeBudgets.reduce((sum, b) => sum + Number(b.total_budget_amount), 0);
  const pendingApprovals = budgets?.filter(b => b.status === "pending_approval").length || 0;

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

  return (
    <div className="space-y-6">
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
              LKR {totalBudget.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeBudgets.length} active budget{activeBudgets.length !== 1 ? 's' : ''}
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
            <div className="text-2xl font-bold">LKR 0</div>
            <p className="text-xs text-muted-foreground mt-1">
              0% of budget
            </p>
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
              Current Fiscal Year
            </CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Date().getFullYear()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {budgets?.filter(b => b.fiscal_year === new Date().getFullYear()).length || 0} budgets
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Budgets</CardTitle>
        </CardHeader>
        <CardContent>
          {budgets && budgets.length > 0 ? (
            <div className="space-y-4">
              {budgets.slice(0, 5).map((budget) => (
                <div
                  key={budget.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-semibold">{budget.budget_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {budget.budget_code} • FY {budget.fiscal_year}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      LKR {Number(budget.total_budget_amount).toLocaleString()}
                    </p>
                    <p className="text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        budget.status === 'active' ? 'bg-green-500/20 text-green-700' :
                        budget.status === 'draft' ? 'bg-gray-500/20 text-gray-700' :
                        budget.status === 'pending_approval' ? 'bg-yellow-500/20 text-yellow-700' :
                        'bg-red-500/20 text-red-700'
                      }`}>
                        {budget.status}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
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

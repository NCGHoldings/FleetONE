import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, ArrowDownCircle, ArrowUpCircle, AlertTriangle, 
  TrendingDown, Building2, BarChart3 
} from "lucide-react";
import { CurrencyDisplay } from "../shared/CurrencyDisplay";
import { usePettyCashDashboard } from "@/hooks/usePettyCash";
import { EXPENSE_CATEGORIES } from "@/hooks/useExpenseRequests";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export const PettyCashDashboardTab = () => {
  const { data: dashboard, isLoading } = usePettyCashDashboard();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dashboard) return null;

  const getCategoryLabel = (value: string) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-2xl font-bold"><CurrencyDisplay amount={dashboard.totalBalance} /></p>
            </div>
            <Wallet className="h-8 w-8 text-primary opacity-60" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Disbursed (Month)</p>
              <p className="text-2xl font-bold text-destructive"><CurrencyDisplay amount={dashboard.disbursedThisMonth} /></p>
            </div>
            <ArrowDownCircle className="h-8 w-8 text-destructive opacity-60" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Replenished (Month)</p>
              <p className="text-2xl font-bold text-green-600"><CurrencyDisplay amount={dashboard.replenishedThisMonth} /></p>
            </div>
            <ArrowUpCircle className="h-8 w-8 text-green-600 opacity-60" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Funds</p>
              <p className="text-2xl font-bold">{dashboard.activeFunds}</p>
            </div>
            <Building2 className="h-8 w-8 text-primary opacity-60" />
          </div>
        </Card>
      </div>

      {/* Low Balance Alerts */}
      {dashboard.lowBalanceFunds.length > 0 && (
        <Card className="p-4 border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold text-destructive">Low Balance Alerts</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {dashboard.lowBalanceFunds.map((fund: any) => (
              <div key={fund.id} className="flex items-center justify-between p-2 rounded bg-background border">
                <span className="text-sm font-medium">{fund.fund_name}</span>
                <Badge variant="destructive">
                  <CurrencyDisplay amount={fund.current_balance} />
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Branch-wise Breakdown */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Branch-wise Balance</h3>
          </div>
          <div className="space-y-3">
            {dashboard.branchBreakdown.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded border">
                <div>
                  <p className="font-medium text-sm">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.funds} fund(s)</p>
                </div>
                <p className="font-semibold"><CurrencyDisplay amount={b.balance} /></p>
              </div>
            ))}
            {dashboard.branchBreakdown.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No branch data available</p>
            )}
          </div>
        </Card>

        {/* Category-wise Spending */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Category-wise Spending (This Month)</h3>
          </div>
          <div className="space-y-3">
            {dashboard.categoryBreakdown.map((c) => (
              <div key={c.category} className="flex items-center justify-between p-3 rounded border">
                <p className="font-medium text-sm">{getCategoryLabel(c.category)}</p>
                <p className="font-semibold text-destructive"><CurrencyDisplay amount={c.amount} /></p>
              </div>
            ))}
            {dashboard.categoryBreakdown.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No disbursements this month</p>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Recent Transactions</h3>
        <div className="space-y-2">
          {dashboard.recentTransactions.map((txn: any) => (
            <div key={txn.id} className="flex items-center justify-between p-2 rounded border text-sm">
              <div className="flex items-center gap-3">
                {txn.transaction_type === "replenishment" ? (
                  <ArrowUpCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <ArrowDownCircle className="h-4 w-4 text-destructive" />
                )}
                <div>
                  <p className="font-medium">{txn.voucher_number || txn.transaction_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {txn.payee_name && `${txn.payee_name} • `}
                    {txn.description || "No description"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${txn.transaction_type === "replenishment" ? "text-green-600" : "text-destructive"}`}>
                  {txn.transaction_type === "replenishment" ? "+" : "-"}
                  <CurrencyDisplay amount={txn.amount} />
                </p>
                <p className="text-xs text-muted-foreground">{format(new Date(txn.created_at), "MMM dd")}</p>
              </div>
            </div>
          ))}
          {dashboard.recentTransactions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No recent transactions</p>
          )}
        </div>
      </Card>
    </div>
  );
};

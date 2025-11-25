import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BudgetPnLViewProps {
  budgetId: string;
}

interface LineItemWithDept {
  id: string;
  line_item_name: string;
  category: string;
  subcategory?: string;
  budget_amount?: number;
  actual_amount?: number;
  variance_amount?: number;
  variance_percentage?: number;
  department_id?: string;
  department?: {
    id: string;
    department_name: string;
    department_code?: string;
  };
}

export const BudgetPnLView = ({ budgetId }: BudgetPnLViewProps) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    revenue: true,
    expense: true,
  });

  const { data: lineItems = [], isLoading } = useQuery({
    queryKey: ["budgetLineItems", budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_line_items")
        .select(`
          *,
          department:budget_departments(id, department_name, department_code)
        `)
        .eq("budget_id", budgetId)
        .eq("is_active", true)
        .order("category")
        .order("subcategory");

      if (error) throw error;
      return data as LineItemWithDept[];
    },
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const formatCurrency = (amount?: number) => {
    return `LKR ${(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getVarianceColor = (variance?: number) => {
    if (!variance) return "text-muted-foreground";
    return variance < 0 ? "text-destructive" : "text-green-600";
  };

  const getVarianceBgColor = (variance?: number) => {
    if (!variance) return "bg-muted/30";
    return variance < 0 ? "bg-destructive/10" : "bg-green-500/10";
  };

  // Group by category
  const revenueItems = lineItems.filter((item) => item.category === "revenue");
  const expenseItems = lineItems.filter((item) => item.category === "expense");

  // Calculate totals
  const totalRevenueBudget = revenueItems.reduce((sum, item) => sum + (item.budget_amount || 0), 0);
  const totalRevenueActual = revenueItems.reduce((sum, item) => sum + (item.actual_amount || 0), 0);
  const totalRevenueVariance = totalRevenueBudget - totalRevenueActual;
  const totalRevenueVariancePerc = totalRevenueBudget ? ((totalRevenueVariance / totalRevenueBudget) * 100) : 0;

  const totalExpenseBudget = expenseItems.reduce((sum, item) => sum + (item.budget_amount || 0), 0);
  const totalExpenseActual = expenseItems.reduce((sum, item) => sum + (item.actual_amount || 0), 0);
  const totalExpenseVariance = totalExpenseBudget - totalExpenseActual;
  const totalExpenseVariancePerc = totalExpenseBudget ? ((totalExpenseVariance / totalExpenseBudget) * 100) : 0;

  const netProfit = totalRevenueActual - totalExpenseActual;
  const budgetedProfit = totalRevenueBudget - totalExpenseBudget;
  const profitVariance = budgetedProfit - netProfit;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(totalRevenueActual)}</p>
            <p className="text-xs text-muted-foreground">Budget: {formatCurrency(totalRevenueBudget)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
            <p className="text-2xl font-bold">{formatCurrency(totalExpenseActual)}</p>
            <p className="text-xs text-muted-foreground">Budget: {formatCurrency(totalExpenseBudget)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Net Profit/Loss</p>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
              {formatCurrency(netProfit)}
            </p>
            <p className="text-xs text-muted-foreground">Budget: {formatCurrency(budgetedProfit)}</p>
          </div>
        </div>
      </Card>

      {/* Revenue Section */}
      <Card className="overflow-hidden">
        <div
          className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b cursor-pointer hover:bg-green-500/20 transition-colors"
          onClick={() => toggleSection("revenue")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {expandedSections.revenue ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              <h3 className="text-lg font-bold">Revenue</h3>
              <Badge variant="secondary">{revenueItems.length} items</Badge>
            </div>
            <div className="flex items-center gap-6 text-sm font-semibold">
              <span className="w-32 text-right">{formatCurrency(totalRevenueBudget)}</span>
              <span className="w-32 text-right">{formatCurrency(totalRevenueActual)}</span>
              <span className={`w-32 text-right ${getVarianceColor(totalRevenueVariance)}`}>
                {formatCurrency(totalRevenueVariance)}
              </span>
              <span className={`w-24 text-right ${getVarianceColor(totalRevenueVariance)}`}>
                {totalRevenueVariancePerc.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {expandedSections.revenue && (
          <div className="divide-y">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-4 p-4 bg-muted/30 text-xs font-semibold text-muted-foreground">
              <div className="col-span-4">Line Item</div>
              <div className="col-span-2 text-right">Budget</div>
              <div className="col-span-2 text-right">Actual</div>
              <div className="col-span-2 text-right">Variance</div>
              <div className="col-span-2 text-right">Variance %</div>
            </div>

            {revenueItems.map((item) => {
              const variance = (item.budget_amount || 0) - (item.actual_amount || 0);
              const variancePerc = item.budget_amount ? ((variance / item.budget_amount) * 100) : 0;
              
              return (
                <div key={item.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className="col-span-4">
                    <p className="font-medium">{item.line_item_name}</p>
                    {item.subcategory && (
                      <p className="text-xs text-muted-foreground">{item.subcategory}</p>
                    )}
                  </div>
                  <div className="col-span-2 text-right text-sm">{formatCurrency(item.budget_amount)}</div>
                  <div className="col-span-2 text-right text-sm font-semibold">{formatCurrency(item.actual_amount)}</div>
                  <div className={`col-span-2 text-right text-sm font-semibold ${getVarianceColor(variance)}`}>
                    {formatCurrency(Math.abs(variance))}
                  </div>
                  <div className="col-span-2 text-right">
                    <Badge variant="secondary" className={getVarianceBgColor(variance)}>
                      {variance < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1" />}
                      {Math.abs(variancePerc).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Expense Section */}
      <Card className="overflow-hidden">
        <div
          className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-b cursor-pointer hover:bg-orange-500/20 transition-colors"
          onClick={() => toggleSection("expense")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {expandedSections.expense ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              <h3 className="text-lg font-bold">Expenses</h3>
              <Badge variant="secondary">{expenseItems.length} items</Badge>
            </div>
            <div className="flex items-center gap-6 text-sm font-semibold">
              <span className="w-32 text-right">{formatCurrency(totalExpenseBudget)}</span>
              <span className="w-32 text-right">{formatCurrency(totalExpenseActual)}</span>
              <span className={`w-32 text-right ${getVarianceColor(totalExpenseVariance)}`}>
                {formatCurrency(totalExpenseVariance)}
              </span>
              <span className={`w-24 text-right ${getVarianceColor(totalExpenseVariance)}`}>
                {totalExpenseVariancePerc.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {expandedSections.expense && (
          <div className="divide-y">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-4 p-4 bg-muted/30 text-xs font-semibold text-muted-foreground">
              <div className="col-span-4">Line Item</div>
              <div className="col-span-2 text-right">Budget</div>
              <div className="col-span-2 text-right">Actual</div>
              <div className="col-span-2 text-right">Variance</div>
              <div className="col-span-2 text-right">Variance %</div>
            </div>

            {expenseItems.map((item) => {
              const variance = (item.budget_amount || 0) - (item.actual_amount || 0);
              const variancePerc = item.budget_amount ? ((variance / item.budget_amount) * 100) : 0;
              
              return (
                <div key={item.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className="col-span-4">
                    <p className="font-medium">{item.line_item_name}</p>
                    {item.subcategory && (
                      <p className="text-xs text-muted-foreground">{item.subcategory}</p>
                    )}
                  </div>
                  <div className="col-span-2 text-right text-sm">{formatCurrency(item.budget_amount)}</div>
                  <div className="col-span-2 text-right text-sm font-semibold">{formatCurrency(item.actual_amount)}</div>
                  <div className={`col-span-2 text-right text-sm font-semibold ${getVarianceColor(variance)}`}>
                    {formatCurrency(Math.abs(variance))}
                  </div>
                  <div className="col-span-2 text-right">
                    <Badge variant="secondary" className={getVarianceBgColor(variance)}>
                      {variance < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1" />}
                      {Math.abs(variancePerc).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Net Profit/Loss Row */}
      <Card className={`p-6 border-2 ${netProfit >= 0 ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Net Profit / (Loss)</h3>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Budgeted</p>
              <p className="text-lg font-semibold">{formatCurrency(budgetedProfit)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Actual</p>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                {formatCurrency(netProfit)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Variance</p>
              <p className={`text-lg font-semibold ${getVarianceColor(profitVariance)}`}>
                {formatCurrency(Math.abs(profitVariance))}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

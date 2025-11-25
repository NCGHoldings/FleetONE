import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthlyBudgetBreakdown } from "./MonthlyBudgetBreakdown";

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
  budget_departments?: {
    department_name: string;
  };
}

export function BudgetPnLView({ budgetId }: BudgetPnLViewProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    revenue: true,
    "Fixed Expenses": true,
    "Operating Expenses": true,
    Maintenance: true,
    Discretionary: true,
    "Capital Expenditure": true,
  });
  const [activeTab, setActiveTab] = useState<"summary" | "monthly">("summary");

  const { data: lineItems = [], isLoading } = useQuery({
    queryKey: ["budgetLineItems", budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_line_items")
        .select(`
          *,
          budget_departments(department_name)
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
    return variance < 0 ? "text-red-600" : "text-green-600";
  };

  const getVarianceBgColor = (variance?: number) => {
    if (!variance) return "bg-muted/30";
    return variance < 0 ? "bg-red-500/10" : "bg-green-500/10";
  };

  const revenueItems = lineItems.filter((item) => item.category === "Revenue");
  const expenseItems = lineItems.filter((item) => item.category === "Expense");

  // Group expenses by subcategory
  const expensesBySubcategory = expenseItems.reduce((acc, item) => {
    const subcategory = item.subcategory || "Other";
    if (!acc[subcategory]) {
      acc[subcategory] = [];
    }
    acc[subcategory].push(item);
    return acc;
  }, {} as Record<string, typeof expenseItems>);

  const totalRevenueBudget = revenueItems.reduce((sum, item) => sum + (item.budget_amount || 0), 0);
  const totalRevenueActual = revenueItems.reduce((sum, item) => sum + (item.actual_amount || 0), 0);
  const totalRevenueVariance = totalRevenueActual - totalRevenueBudget;

  const totalExpensesBudget = expenseItems.reduce((sum, item) => sum + (item.budget_amount || 0), 0);
  const totalExpensesActual = expenseItems.reduce((sum, item) => sum + (item.actual_amount || 0), 0);
  const totalExpensesVariance = totalExpensesActual - totalExpensesBudget;

  const netProfitBudget = totalRevenueBudget - totalExpensesBudget;
  const netProfitActual = totalRevenueActual - totalExpensesActual;
  const netProfitVariance = netProfitActual - netProfitBudget;

  const calculateSubcategoryTotals = (subcategory: string) => {
    const items = expensesBySubcategory[subcategory] || [];
    return {
      budget: items.reduce((sum, item) => sum + (item.budget_amount || 0), 0),
      actual: items.reduce((sum, item) => sum + (item.actual_amount || 0), 0),
      variance: items.reduce((sum, item) => sum + ((item.actual_amount || 0) - (item.budget_amount || 0)), 0),
    };
  };

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
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "summary" | "monthly")} className="space-y-4">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="summary">Summary View</TabsTrigger>
        <TabsTrigger value="monthly">
          <Calendar className="h-4 w-4 mr-2" />
          Monthly Breakdown
        </TabsTrigger>
      </TabsList>

      <TabsContent value="summary" className="space-y-4">
        {/* Summary Header */}
        <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/30">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total Revenue</p>
                <p className="text-3xl font-bold text-green-700">{formatCurrency(totalRevenueBudget)}</p>
                <p className="text-xs text-muted-foreground mt-1">Actual: {formatCurrency(totalRevenueActual)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total Expenses</p>
                <p className="text-3xl font-bold text-red-700">{formatCurrency(totalExpensesBudget)}</p>
                <p className="text-xs text-muted-foreground mt-1">Actual: {formatCurrency(totalExpensesActual)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Net Profit/Loss</p>
                <p className={`text-3xl font-bold ${netProfitBudget >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {formatCurrency(netProfitBudget)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Actual: {formatCurrency(netProfitActual)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Section */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection("revenue")}>
            <CardTitle className="flex items-center justify-between text-green-700">
              <span>Revenue</span>
              <div className="flex items-center gap-4">
                <span className="text-sm font-normal">
                  {formatCurrency(totalRevenueBudget)} • {revenueItems.length} items
                </span>
                {expandedSections.revenue ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardTitle>
          </CardHeader>
          {expandedSections.revenue && (
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Line Item</th>
                      <th className="text-left py-2 font-medium">Department</th>
                      <th className="text-right py-2 font-medium">Budget</th>
                      <th className="text-right py-2 font-medium">Actual</th>
                      <th className="text-right py-2 font-medium">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueItems.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2">{item.line_item_name}</td>
                        <td className="py-2 text-muted-foreground">{item.budget_departments?.department_name || "-"}</td>
                        <td className="py-2 text-right">{formatCurrency(item.budget_amount)}</td>
                        <td className="py-2 text-right">{formatCurrency(item.actual_amount)}</td>
                        <td className={`py-2 text-right ${getVarianceColor(item.variance_amount)}`}>
                          {formatCurrency(item.variance_amount)} ({((item.variance_percentage || 0) * 100).toFixed(1)}%)
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-green-50">
                      <td colSpan={2} className="py-2">
                        Total Revenue
                      </td>
                      <td className="py-2 text-right">{formatCurrency(totalRevenueBudget)}</td>
                      <td className="py-2 text-right">{formatCurrency(totalRevenueActual)}</td>
                      <td className={`py-2 text-right ${getVarianceColor(totalRevenueVariance)}`}>
                        {formatCurrency(totalRevenueVariance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Expenses by Subcategory */}
        {Object.entries(expensesBySubcategory).map(([subcategory, items]) => {
          const totals = calculateSubcategoryTotals(subcategory);
          return (
            <Card key={subcategory}>
              <CardHeader className="cursor-pointer" onClick={() => toggleSection(subcategory)}>
                <CardTitle className="flex items-center justify-between text-red-700">
                  <span>{subcategory}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-normal">
                      {formatCurrency(totals.budget)} • {items.length} items
                    </span>
                    {expandedSections[subcategory] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardTitle>
              </CardHeader>
              {expandedSections[subcategory] && (
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Line Item</th>
                          <th className="text-left py-2 font-medium">Department</th>
                          <th className="text-right py-2 font-medium">Budget</th>
                          <th className="text-right py-2 font-medium">Actual</th>
                          <th className="text-right py-2 font-medium">Variance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="py-2">{item.line_item_name}</td>
                            <td className="py-2 text-muted-foreground">
                              {item.budget_departments?.department_name || "-"}
                            </td>
                            <td className="py-2 text-right">{formatCurrency(item.budget_amount)}</td>
                            <td className="py-2 text-right">{formatCurrency(item.actual_amount)}</td>
                            <td className={`py-2 text-right ${getVarianceColor(item.variance_amount)}`}>
                              {formatCurrency(item.variance_amount)} ({((item.variance_percentage || 0) * 100).toFixed(1)}%)
                            </td>
                          </tr>
                        ))}
                        <tr className="font-bold bg-muted/30">
                          <td colSpan={2} className="py-2">
                            Subtotal - {subcategory}
                          </td>
                          <td className="py-2 text-right">{formatCurrency(totals.budget)}</td>
                          <td className="py-2 text-right">{formatCurrency(totals.actual)}</td>
                          <td className={`py-2 text-right ${getVarianceColor(totals.variance)}`}>
                            {formatCurrency(totals.variance)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        {/* Total Expenses Row */}
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-5 gap-4 font-bold text-red-900">
              <div className="col-span-2">TOTAL EXPENSES</div>
              <div className="text-right">{formatCurrency(totalExpensesBudget)}</div>
              <div className="text-right">{formatCurrency(totalExpensesActual)}</div>
              <div className={`text-right ${getVarianceColor(totalExpensesVariance)}`}>
                {formatCurrency(totalExpensesVariance)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit/Loss */}
        <Card className={netProfitActual >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
          <CardContent className="pt-6">
            <div className="grid grid-cols-5 gap-4 font-bold text-lg">
              <div className="col-span-2">NET PROFIT/LOSS</div>
              <div className="text-right">{formatCurrency(netProfitBudget)}</div>
              <div className={`text-right ${netProfitActual >= 0 ? "text-green-700" : "text-red-700"}`}>
                {formatCurrency(netProfitActual)}
              </div>
              <div className={`text-right ${getVarianceColor(netProfitVariance)}`}>{formatCurrency(netProfitVariance)}</div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="monthly">
        <MonthlyBudgetBreakdown lineItems={lineItems} />
      </TabsContent>
    </Tabs>
  );
}

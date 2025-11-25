import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "lucide-react";

interface BudgetLineItem {
  id: string;
  line_item_name: string;
  category: string;
  subcategory?: string;
  budget_amount?: number;
  actual_amount?: number;
  monthly_allocation?: any;
}

interface MonthlyBudgetBreakdownProps {
  lineItems: BudgetLineItem[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthlyBudgetBreakdown({ lineItems }: MonthlyBudgetBreakdownProps) {
  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return "LKR 0";
    return `LKR ${amount.toLocaleString()}`;
  };

  const getMonthlyAmount = (item: BudgetLineItem, month: number) => {
    if (item.monthly_allocation) {
      return item.monthly_allocation[month] || 0;
    }
    return (item.budget_amount || 0) / 12;
  };

  const revenueItems = lineItems.filter((item) => item.category === "Revenue");
  const expenseItems = lineItems.filter((item) => item.category === "Expense");

  const calculateMonthlyTotal = (items: BudgetLineItem[], month: number) => {
    return items.reduce((sum, item) => sum + getMonthlyAmount(item, month), 0);
  };

  const renderMonthlyTable = (items: BudgetLineItem[], title: string) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {title} - Monthly Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px] sticky left-0 bg-background">Line Item</TableHead>
                {MONTHS.map((month) => (
                  <TableHead key={month} className="text-right min-w-[100px]">
                    {month}
                  </TableHead>
                ))}
                <TableHead className="text-right min-w-[120px] font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium sticky left-0 bg-background">{item.line_item_name}</TableCell>
                  {MONTHS.map((month, index) => (
                    <TableCell key={month} className="text-right">
                      {formatCurrency(getMonthlyAmount(item, index + 1))}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">{formatCurrency(item.budget_amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell className="sticky left-0 bg-muted/50">Monthly Total</TableCell>
                {MONTHS.map((month, index) => (
                  <TableCell key={month} className="text-right">
                    {formatCurrency(calculateMonthlyTotal(items, index + 1))}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  {formatCurrency(items.reduce((sum, item) => sum + (item.budget_amount || 0), 0))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {renderMonthlyTable(revenueItems, "Revenue")}
      {renderMonthlyTable(expenseItems, "Expenses")}

      {/* Net Profit Monthly */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Net Profit/Loss - Monthly</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Net Profit/Loss</TableHead>
                {MONTHS.map((month) => (
                  <TableHead key={month} className="text-right min-w-[100px]">
                    {month}
                  </TableHead>
                ))}
                <TableHead className="text-right min-w-[120px] font-bold">Annual Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-primary/5 font-bold">
                <TableCell>Monthly Net</TableCell>
                {MONTHS.map((month, index) => {
                  const revenue = calculateMonthlyTotal(revenueItems, index + 1);
                  const expenses = calculateMonthlyTotal(expenseItems, index + 1);
                  const net = revenue - expenses;
                  return (
                    <TableCell
                      key={month}
                      className={`text-right ${net >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(net)}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right text-primary">
                  {formatCurrency(
                    revenueItems.reduce((sum, item) => sum + (item.budget_amount || 0), 0) -
                      expenseItems.reduce((sum, item) => sum + (item.budget_amount || 0), 0)
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, Fragment } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Calendar, Download, TrendingDown, BarChart3 } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useExpenseRequests, EXPENSE_CATEGORIES, BUSINESS_UNITS } from "@/hooks/useExpenseRequests";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";

export const CompanyExpensesView = () => {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [viewMode, setViewMode] = useState<"category" | "unit">("category");

  const { data: expenses, isLoading } = useExpenseRequests({
    status: "approved",
    dateFrom,
    dateTo,
  });

  // Include paid expenses too
  const { data: paidExpenses } = useExpenseRequests({
    status: "paid",
    dateFrom,
    dateTo,
  });

  const allExpenses = [...(expenses || []), ...(paidExpenses || [])];

  // Aggregate by category
  const categoryTotals = EXPENSE_CATEGORIES.reduce((acc, cat) => {
    const categoryExpenses = allExpenses.filter((e) => e.expense_category === cat.value);
    const total = categoryExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // By business unit
    const byUnit: Record<string, number> = {};
    BUSINESS_UNITS.forEach((unit) => {
      byUnit[unit.value] = categoryExpenses
        .filter((e) => e.business_unit_code === unit.value)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    });
    
    acc[cat.value] = { label: cat.label, group: cat.group, total, byUnit };
    return acc;
  }, {} as Record<string, { label: string; group: string; total: number; byUnit: Record<string, number> }>);

  // Aggregate by unit
  const unitTotals = BUSINESS_UNITS.reduce((acc, unit) => {
    const unitExpenses = allExpenses.filter((e) => e.business_unit_code === unit.value);
    const total = unitExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // By category
    const byCategory: Record<string, number> = {};
    EXPENSE_CATEGORIES.forEach((cat) => {
      byCategory[cat.value] = unitExpenses
        .filter((e) => e.expense_category === cat.value)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    });
    
    acc[unit.value] = { label: unit.label, total, byCategory };
    return acc;
  }, {} as Record<string, { label: string; total: number; byCategory: Record<string, number> }>);

  const grandTotal = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Group categories
  const groupedCategories = Object.entries(categoryTotals).reduce((acc, [key, value]) => {
    if (!acc[value.group]) acc[value.group] = [];
    acc[value.group].push({ key, ...value });
    return acc;
  }, {} as Record<string, Array<{ key: string; label: string; group: string; total: number; byUnit: Record<string, number> }>>);

  // Helper function to format amounts
  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `Rs ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `Rs ${(amount / 1000).toFixed(0)}K`;
    }
    return `Rs ${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Company-wise Expenses
          </h2>
          <p className="text-muted-foreground">
            Track and analyze expenses across all business units
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[150px]"
            />
            <span>to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[150px]"
            />
          </div>
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as "category" | "unit")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="View Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="category">By Category</SelectItem>
              <SelectItem value="unit">By Business Unit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-7">
        {BUSINESS_UNITS.map((unit) => (
          <Card key={unit.value} className="p-4">
            <p className="text-xs text-muted-foreground truncate">{unit.label}</p>
            <p className="text-lg font-bold">
              {formatAmount(unitTotals[unit.value]?.total || 0)}
            </p>
          </Card>
        ))}
        <Card className="p-4 bg-primary/10">
          <p className="text-xs text-muted-foreground">Grand Total</p>
          <p className="text-lg font-bold text-primary">
            {formatAmount(grandTotal)}
          </p>
        </Card>
      </div>

      {/* Category View */}
      {viewMode === "category" && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Category</TableHead>
                {BUSINESS_UNITS.map((unit) => (
                  <TableHead key={unit.value} className="text-right">
                    {unit.value}
                  </TableHead>
                ))}
                <TableHead className="text-right font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedCategories).map(([group, categories]) => (
                <Fragment key={group}>
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={BUSINESS_UNITS.length + 2} className="font-semibold">
                      {group}
                    </TableCell>
                  </TableRow>
                  {categories.map((cat) => (
                    <TableRow key={cat.key}>
                      <TableCell className="pl-6">{cat.label}</TableCell>
                      {BUSINESS_UNITS.map((unit) => (
                        <TableCell key={unit.value} className="text-right">
                          {cat.byUnit[unit.value] > 0 ? (
                            formatAmount(cat.byUnit[unit.value])
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">
                        {formatAmount(cat.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
              <TableRow className="bg-primary/5 font-bold">
                <TableCell>Grand Total</TableCell>
                {BUSINESS_UNITS.map((unit) => (
                  <TableCell key={unit.value} className="text-right">
                    {formatAmount(unitTotals[unit.value]?.total || 0)}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  {formatAmount(grandTotal)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Unit View */}
      {viewMode === "unit" && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {BUSINESS_UNITS.map((unit) => (
            <Card key={unit.value} className="p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <Building2 className="h-4 w-4" />
                {unit.label}
              </h3>
              <div className="space-y-2">
                {EXPENSE_CATEGORIES.filter((cat) => 
                  unitTotals[unit.value]?.byCategory[cat.value] > 0
                ).map((cat) => (
                  <div key={cat.value} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{cat.label}</span>
                    <span className="font-medium">
                      {formatAmount(unitTotals[unit.value]?.byCategory[cat.value] || 0)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t flex justify-between font-bold">
                  <span>Total</span>
                  <span>
                    <CurrencyDisplay amount={unitTotals[unit.value]?.total || 0} />
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

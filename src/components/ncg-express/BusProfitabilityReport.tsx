import { useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { useBusProfitability, BusProfitability } from "@/hooks/useNCGExpressProfitability";
import { Download, TrendingUp, TrendingDown, Bus, Fuel, Loader2, DollarSign, Percent, Route } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { cn } from "@/lib/utils";
import { formatLKR } from "@/lib/accounting-utils";

export function BusProfitabilityReport() {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const { data, isLoading } = useBusProfitability(
    dateRange.from || startOfMonth(new Date()),
    dateRange.to || endOfMonth(new Date())
  );

  const buses = data?.buses || [];
  const summary = data?.summary;

  const exportToCSV = () => {
    const headers = [
      "Bus No",
      "Category",
      "Revenue",
      "Expenses",
      "Fuel Cost",
      "Repair Cost",
      "Salary",
      "Other Costs",
      "Net Profit",
      "Margin %",
      "Trips",
      "Total KM",
      "Revenue/KM",
      "Cost/KM",
      "Profit/KM",
    ];

    const rows = buses.map((bus) => [
      bus.busNo,
      bus.category,
      bus.totalRevenue,
      bus.totalExpenses,
      bus.fuelCost,
      bus.repairCost,
      bus.salaryCost,
      bus.otherCosts,
      bus.netProfit,
      bus.profitMargin.toFixed(1),
      bus.tripCount,
      bus.totalKm,
      bus.revenuePerKm.toFixed(2),
      bus.costPerKm.toFixed(2),
      bus.profitPerKm.toFixed(2),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bus-profitability-${format(dateRange.from || new Date(), "yyyy-MM")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare chart data
  const chartData = buses.slice(0, 10).map((bus) => ({
    name: bus.busNo,
    profit: bus.netProfit,
    revenue: bus.totalRevenue,
    expenses: bus.totalExpenses,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Bus Profitability Report</h2>
          <p className="text-sm text-muted-foreground">
            Analyze profit and loss by individual bus
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker
            onDateRangeChange={(range) => setDateRange(range || {})}
          />
          <Button variant="outline" onClick={exportToCSV} disabled={buses.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      <CurrencyDisplay amount={summary?.totalRevenue || 0} />
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      <CurrencyDisplay amount={summary?.totalExpenses || 0} />
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Profit</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      (summary?.netProfit || 0) >= 0 
                        ? "text-green-600 dark:text-green-400" 
                        : "text-red-600 dark:text-red-400"
                    )}>
                      <CurrencyDisplay amount={summary?.netProfit || 0} />
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Margin</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      (summary?.avgMargin || 0) >= 0 
                        ? "text-green-600 dark:text-green-400" 
                        : "text-red-600 dark:text-red-400"
                    )}>
                      {(summary?.avgMargin || 0).toFixed(1)}%
                    </p>
                  </div>
                  <Percent className="h-8 w-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profit by Bus (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis 
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                        className="text-xs"
                      />
                      <Tooltip 
                        formatter={(value: number) => formatLKR(value)}
                        labelClassName="font-semibold"
                      />
                      <Bar dataKey="profit" name="Net Profit" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.profit >= 0 ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bus className="h-5 w-5" />
                Bus-wise Breakdown ({buses.length} buses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bus No</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Net Profit</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                      <TableHead className="text-right">Trips</TableHead>
                      <TableHead className="text-right">KM</TableHead>
                      <TableHead className="text-right">Profit/KM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buses.map((bus) => (
                      <TableRow key={bus.busId}>
                        <TableCell className="font-medium">{bus.busNo}</TableCell>
                        <TableCell className="text-muted-foreground">{bus.category}</TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400 font-mono">
                          <CurrencyDisplay amount={bus.totalRevenue} />
                        </TableCell>
                        <TableCell className="text-right text-red-600 dark:text-red-400 font-mono">
                          <CurrencyDisplay amount={bus.totalExpenses} />
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono font-semibold",
                          bus.netProfit >= 0 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-red-600 dark:text-red-400"
                        )}>
                          <CurrencyDisplay amount={bus.netProfit} />
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono",
                          bus.profitMargin >= 0 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-red-600 dark:text-red-400"
                        )}>
                          {bus.profitMargin.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">{bus.tripCount}</TableCell>
                        <TableCell className="text-right font-mono">
                          {bus.totalKm.toLocaleString()}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono",
                          bus.profitPerKm >= 0 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-red-600 dark:text-red-400"
                        )}>
                          {bus.profitPerKm.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {buses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          No data available for the selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

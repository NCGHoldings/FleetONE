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
import { useRouteProfitability, RouteProfitability } from "@/hooks/useNCGExpressProfitability";
import { Download, TrendingUp, TrendingDown, Route, MapPin, Loader2, DollarSign, Trophy, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { cn } from "@/lib/utils";
import { formatLKR } from "@/lib/accounting-utils";
import { Badge } from "@/components/ui/badge";

export function RouteProfitabilityReport() {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const { data, isLoading } = useRouteProfitability(
    dateRange.from || startOfMonth(new Date()),
    dateRange.to || endOfMonth(new Date())
  );

  const routes = data?.routes || [];
  const summary = data?.summary;

  const exportToCSV = () => {
    const headers = [
      "Route Name",
      "Revenue",
      "Allocated Expenses",
      "Est. Profit",
      "Margin %",
      "Trips",
      "Avg Revenue/Trip",
      "Total KM",
      "Revenue/KM",
    ];

    const rows = routes.map((route) => [
      route.routeName,
      route.totalRevenue,
      route.allocatedExpenses.toFixed(2),
      route.estimatedProfit.toFixed(2),
      route.profitMargin.toFixed(1),
      route.tripCount,
      route.averageRevenuePerTrip.toFixed(2),
      route.totalKm,
      route.revenuePerKm.toFixed(2),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `route-profitability-${format(dateRange.from || new Date(), "yyyy-MM")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare chart data - top 10 by revenue
  const chartData = routes.slice(0, 10).map((route) => ({
    name: route.routeName.length > 15 ? route.routeName.slice(0, 15) + '...' : route.routeName,
    revenue: route.totalRevenue,
    expenses: route.allocatedExpenses,
    profit: route.estimatedProfit,
  }));

  // Pie chart data for revenue distribution
  const pieData = routes.slice(0, 6).map((route, idx) => ({
    name: route.routeName.length > 12 ? route.routeName.slice(0, 12) + '...' : route.routeName,
    value: route.totalRevenue,
    color: `hsl(var(--chart-${(idx % 5) + 1}))`,
  }));

  const bestRoute = routes[0];
  const worstRoute = routes[routes.length - 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Route Profitability Report</h2>
          <p className="text-sm text-muted-foreground">
            Analyze profit and loss by route with expense allocation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker
            onDateRangeChange={(range) => setDateRange(range || {})}
          />
          <Button variant="outline" onClick={exportToCSV} disabled={routes.length === 0}>
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
            <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      Best Route
                    </p>
                    <p className="text-lg font-bold truncate" title={bestRoute?.routeName}>
                      {bestRoute?.routeName || 'N/A'}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      <CurrencyDisplay amount={bestRoute?.totalRevenue || 0} />
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Lowest Route
                    </p>
                    <p className="text-lg font-bold truncate" title={worstRoute?.routeName}>
                      {worstRoute?.routeName || 'N/A'}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      <CurrencyDisplay amount={worstRoute?.totalRevenue || 0} />
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Rev/Trip</p>
                    <p className="text-2xl font-bold text-primary">
                      <CurrencyDisplay 
                        amount={summary?.totalTrips ? summary.totalRevenue / summary.totalTrips : 0} 
                      />
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Routes</p>
                    <p className="text-2xl font-bold">{routes.length}</p>
                    <p className="text-xs text-muted-foreground">
                      {summary?.totalTrips?.toLocaleString()} trips
                    </p>
                  </div>
                  <Route className="h-8 w-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Revenue Bar Chart */}
            {chartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Revenue by Route (Top 10)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          type="number" 
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                          className="text-xs"
                        />
                        <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                        <Tooltip 
                          formatter={(value: number) => formatLKR(value)}
                          labelClassName="font-semibold"
                        />
                        <Bar dataKey="revenue" fill="hsl(var(--chart-1))" name="Revenue" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Revenue Pie Chart */}
            {pieData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Revenue Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }: { name: string; percent: number }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatLKR(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Route-wise Breakdown ({routes.length} routes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Alloc. Expenses</TableHead>
                      <TableHead className="text-right">Est. Profit</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                      <TableHead className="text-right">Trips</TableHead>
                      <TableHead className="text-right">Avg/Trip</TableHead>
                      <TableHead className="text-right">Total KM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routes.map((route, idx) => (
                      <TableRow key={route.routeId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {idx === 0 && <Badge variant="default" className="bg-green-600 text-xs">Top</Badge>}
                            {idx === routes.length - 1 && routes.length > 1 && (
                              <Badge variant="destructive" className="text-xs">Low</Badge>
                            )}
                            <span className="truncate max-w-[150px]" title={route.routeName}>
                              {route.routeName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400 font-mono">
                          <CurrencyDisplay amount={route.totalRevenue} />
                        </TableCell>
                        <TableCell className="text-right text-red-600 dark:text-red-400 font-mono">
                          <CurrencyDisplay amount={route.allocatedExpenses} />
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono font-semibold",
                          route.estimatedProfit >= 0 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-red-600 dark:text-red-400"
                        )}>
                          <CurrencyDisplay amount={route.estimatedProfit} />
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono",
                          route.profitMargin >= 0 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-red-600 dark:text-red-400"
                        )}>
                          {route.profitMargin.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">{route.tripCount}</TableCell>
                        <TableCell className="text-right font-mono">
                          <CurrencyDisplay amount={route.averageRevenuePerTrip} />
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {route.totalKm.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {routes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No data available for the selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Expense Allocation Note */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Route expenses are allocated proportionally based on trip count per bus. 
                A bus's total daily expenses are divided evenly among all trips that bus made, then aggregated by route.
                This provides an estimate for route profitability when direct route-level expense tracking is not available.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

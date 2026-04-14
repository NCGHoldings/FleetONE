import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BusMasterData } from "@/hooks/useBusMasterData";
import { TrendingUp, TrendingDown, DollarSign, Fuel, Percent } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface BusMasterFinancialsTabProps {
  data: BusMasterData;
}

export const BusMasterFinancialsTab = ({ data }: BusMasterFinancialsTabProps) => {
  const { trips, expenses, financials } = data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-LK').format(num);
  };

  // Prepare chart data
  const chartData = trips.monthlyTrend.map(item => ({
    ...item,
    monthLabel: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }));

  // Expense breakdown for pie chart
  const expenseBreakdown = [
    { name: 'Fuel', value: expenses.fuelCost, color: '#ef4444' },
    { name: 'Other', value: expenses.total - expenses.fuelCost, color: '#f97316' },
  ].filter(item => item.value > 0);

  const avgDailyRevenue = financials.runningDays > 0 
    ? trips.totalIncome / financials.runningDays 
    : 0;

  const avgDailyProfit = financials.runningDays > 0 
    ? financials.netProfit / financials.runningDays 
    : 0;

  return (
    <div className="space-y-4">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(trips.totalIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(expenses.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${financials.netProfit >= 0 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-red-100 dark:bg-red-900'}`}>
                <DollarSign className={`h-4 w-4 ${financials.netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Profit</p>
                <p className={`text-lg font-bold ${financials.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(financials.netProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Percent className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profit Margin</p>
                <p className={`text-lg font-bold ${financials.profitMargin >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  {financials.profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Averages */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg. Daily Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(avgDailyRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {financials.runningDays} running days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg. Income Per Trip</p>
            <p className="text-2xl font-bold">{formatCurrency(trips.avgIncomePerTrip)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              From {formatNumber(trips.total)} total trips
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg. Daily Profit</p>
            <p className={`text-2xl font-bold ${avgDailyProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(avgDailyProfit)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Net after all expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="monthLabel" 
                    tick={{ fontSize: 10 }} 
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary) / 0.2)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No trip data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseBreakdown.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      labelLine={false}
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))' 
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {expenseBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                      <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No expense data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fuel Cost Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Fuel className="h-4 w-4" />
            Fuel Cost Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Fuel Cost</p>
              <p className="text-lg font-bold">{formatCurrency(expenses.fuelCost)}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Fuel % of Expenses</p>
              <p className="text-lg font-bold">
                {expenses.total > 0 ? ((expenses.fuelCost / expenses.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Fuel Cost per Trip</p>
              <p className="text-lg font-bold">
                {formatCurrency(trips.total > 0 ? expenses.fuelCost / trips.total : 0)}
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Fuel Cost per km</p>
              <p className="text-lg font-bold">
                {formatCurrency(trips.totalDistance > 0 ? expenses.fuelCost / trips.totalDistance : 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

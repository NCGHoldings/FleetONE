import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Fuel, TrendingDown, PieChart as PieChartIcon, BarChart2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";

interface ExpenseBreakdown {
  fuel: number;
  toll: number;
  repair: number;
  salaries: number;
  permits: number;
  other: number;
  fuelPercentage: number;
  tollPercentage: number;
  repairPercentage: number;
  salariesPercentage: number;
  permitsPercentage: number;
  otherPercentage: number;
}

interface DailyTrend {
  date: string;
  trips: number;
  income: number;
  expenses: number;
  netIncome: number;
  distance: number;
  avgEfficiency: number;
}

interface Overview {
  totalTrips: number;
  totalDistance: number;
  totalIncome: number;
  totalFuelCost: number;
  totalOtherExpenses: number;
  totalExpenses: number;
  netProfit: number;
  avgEfficiency: number;
  avgIncomePerTrip: number;
  avgDistancePerTrip: number;
  profitMargin: number;
}

interface ExpenseAnalyticsSectionProps {
  expenseBreakdown: ExpenseBreakdown;
  overview: Overview;
  dailyTrends: DailyTrend[];
}

export default function ExpenseAnalyticsSection({ 
  expenseBreakdown, 
  overview, 
  dailyTrends 
}: ExpenseAnalyticsSectionProps) {
  const costPerTrip = overview.totalTrips > 0 ? overview.totalExpenses / overview.totalTrips : 0;
  const costPerKm = overview.totalDistance > 0 ? overview.totalExpenses / overview.totalDistance : 0;
  const fuelCostPerKm = overview.totalDistance > 0 ? expenseBreakdown.fuel / overview.totalDistance : 0;

  // Pie chart data
  const pieData = [
    { name: 'Fuel', value: expenseBreakdown.fuel, color: '#3B82F6' },
    { name: 'Highway/Toll', value: expenseBreakdown.toll, color: '#8B5CF6' },
    { name: 'Repairs/Tyres', value: expenseBreakdown.repair, color: '#EF4444' },
    { name: 'Salaries', value: expenseBreakdown.salaries, color: '#10B981' },
    { name: 'Permits/Legal', value: expenseBreakdown.permits, color: '#F59E0B' },
    { name: 'Other', value: expenseBreakdown.other, color: '#6366F1' },
  ].filter(item => item.value > 0);

  // Expense trend data
  const expenseTrendData = dailyTrends.map(day => ({
    date: day.date.split('-').slice(1).join('/'),
    expenses: day.expenses,
    income: day.income,
    profit: day.netIncome,
  }));

  // Category comparison for bar chart
  const categoryData = [
    { category: 'Fuel', amount: expenseBreakdown.fuel, percentage: expenseBreakdown.fuelPercentage },
    { category: 'Highway', amount: expenseBreakdown.toll, percentage: expenseBreakdown.tollPercentage },
    { category: 'Repairs', amount: expenseBreakdown.repair, percentage: expenseBreakdown.repairPercentage },
    { category: 'Salaries', amount: expenseBreakdown.salaries, percentage: expenseBreakdown.salariesPercentage },
    { category: 'Permits', amount: expenseBreakdown.permits, percentage: expenseBreakdown.permitsPercentage },
    { category: 'Other', amount: expenseBreakdown.other, percentage: expenseBreakdown.otherPercentage },
  ];

  const COLORS = ['#3B82F6', '#8B5CF6', '#EF4444', '#10B981', '#F59E0B', '#6366F1'];

  return (
    <div className="space-y-6">
      {/* Expense KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">₨{overview.totalExpenses.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {overview.profitMargin.toFixed(1)}% profit margin
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-red-500 to-orange-600">
                  <TrendingDown className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fuel Cost</p>
                  <p className="text-2xl font-bold text-blue-600">₨{expenseBreakdown.fuel.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {expenseBreakdown.fuelPercentage.toFixed(1)}% of expenses
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600">
                  <Fuel className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cost per Trip</p>
                  <p className="text-2xl font-bold text-purple-600">₨{costPerTrip.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Avg across {overview.totalTrips} trips
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-600">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cost per Km</p>
                  <p className="text-2xl font-bold text-amber-600">₨{costPerKm.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fuel: ₨{fuelCostPerKm.toFixed(2)}/km
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600">
                  <BarChart2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Distribution Pie */}
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary" />
              Expense Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={130}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`₨${value.toLocaleString()}`, '']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend 
                    formatter={(value, entry: any) => (
                      <span className="text-sm">{value}: ₨{entry.payload.value.toLocaleString()}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Trend Area Chart */}
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary" />
              Expense Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={expenseTrendData}>
                  <defs>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(v) => `₨${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => [`₨${value.toLocaleString()}`, '']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#10B981" fill="url(#incomeGradient)" />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#EF4444" fill="url(#expenseGradient)" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Expense Category Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bar Chart */}
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tickFormatter={(v) => `₨${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="category" width={80} />
                  <Tooltip 
                    formatter={(value: number) => [`₨${value.toLocaleString()}`, 'Amount']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Progress Bars */}
            <div className="space-y-4">
              {categoryData.map((item, idx) => (
                <motion.div
                  key={item.category}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="font-medium">{item.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">₨{item.amount.toLocaleString()}</span>
                      <span className="text-muted-foreground ml-2">({item.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <Progress 
                    value={item.percentage} 
                    className="h-2"
                    style={{ 
                      ['--progress-background' as any]: COLORS[idx % COLORS.length] 
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Analysis Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Badge variant="outline" className="mb-2">Per Trip</Badge>
              <p className="text-3xl font-bold">₨{costPerTrip.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground">Average expense per trip</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Badge variant="outline" className="mb-2">Per Kilometer</Badge>
              <p className="text-3xl font-bold">₨{costPerKm.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total cost per km traveled</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Badge variant="outline" className="mb-2">Fuel Cost/Km</Badge>
              <p className="text-3xl font-bold">₨{fuelCostPerKm.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Fuel only per km</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, Calendar, Sun, Sunset, Moon, AlertTriangle, BarChart2 } from "lucide-react";
import { useTimeBasedAnalytics } from "@/hooks/useTimeBasedAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadialBarChart, RadialBar, Legend, AreaChart, Area } from "recharts";

interface EnhancedTimeAnalysisProps {
  startDate?: Date;
  endDate?: Date;
  branchId?: string;
}

export default function EnhancedTimeAnalysis({
  startDate,
  endDate,
  branchId,
}: EnhancedTimeAnalysisProps) {
  const { data, isLoading } = useTimeBasedAnalytics(startDate, endDate, branchId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data || (data.hourlyData.every(h => h.totalTrips === 0) && data.dailyData.every(d => d.totalTrips === 0))) {
    return (
      <Card className="border-2 border-dashed border-muted">
        <CardContent className="p-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">No Time-Based Data Available</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Time analysis requires departure_time data in daily trips. 
              Ensure trips have start times recorded for time-based analytics.
            </p>
            <Badge variant="outline" className="mt-2">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Missing departure_time in trips
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { hourlyData, dailyData, peakHours, timeSlots, bestPerformingTimes } = data;

  // Time slot data for radial chart
  const timeSlotRadialData = [
    { name: 'Morning (6-12)', value: timeSlots.morning.trips, profit: timeSlots.morning.profit, fill: '#F59E0B' },
    { name: 'Afternoon (12-18)', value: timeSlots.afternoon.trips, profit: timeSlots.afternoon.profit, fill: '#3B82F6' },
    { name: 'Evening (18-24)', value: timeSlots.evening.trips, profit: timeSlots.evening.profit, fill: '#8B5CF6' },
  ];

  // Hourly performance data
  const hourlyChartData = hourlyData.filter(h => h.totalTrips > 0).map(h => ({
    hour: h.timeLabel,
    trips: h.totalTrips,
    profit: h.netProfit,
    income: h.totalIncome,
  }));

  // Daily performance data
  const dailyChartData = dailyData.map(d => ({
    day: d.dayName.substring(0, 3),
    trips: d.totalTrips,
    profit: d.netProfit,
    income: d.totalIncome,
  }));

  const COLORS = ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

  return (
    <div className="space-y-6">
      {/* Best Times KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Most Profitable Hour</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                    {bestPerformingTimes.mostProfitableHour.toString().padStart(2, '0')}:00
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Peak profit generation</p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-amber-500 to-orange-600">
                  <Clock className="w-6 h-6 text-white" />
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
          <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Busiest Hour</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
                    {bestPerformingTimes.busiestHour.toString().padStart(2, '0')}:00
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Maximum trip activity</p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                  <TrendingUp className="w-6 h-6 text-white" />
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
          <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Best Day</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {bestPerformingTimes.mostProfitableDay}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Most profitable day</p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600">
                  <Calendar className="w-6 h-6 text-white" />
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
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Busiest Day</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {bestPerformingTimes.busiestDay}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Most active day</p>
                </div>
                <div className="p-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-600">
                  <BarChart2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Time Slot Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Sun className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold">Morning (6 AM - 12 PM)</p>
                <p className="text-sm text-muted-foreground">{timeSlots.morning.trips} trips</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-lg font-bold">₨{timeSlots.morning.income.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profit</p>
                <p className="text-lg font-bold text-emerald-600">₨{timeSlots.morning.profit.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Sunset className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold">Afternoon (12 PM - 6 PM)</p>
                <p className="text-sm text-muted-foreground">{timeSlots.afternoon.trips} trips</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-lg font-bold">₨{timeSlots.afternoon.income.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profit</p>
                <p className="text-lg font-bold text-emerald-600">₨{timeSlots.afternoon.profit.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Moon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold">Evening (6 PM - 12 AM)</p>
                <p className="text-sm text-muted-foreground">{timeSlots.evening.trips} trips</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-lg font-bold">₨{timeSlots.evening.income.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profit</p>
                <p className="text-lg font-bold text-emerald-600">₨{timeSlots.evening.profit.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peak Hours */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Peak Performance Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {peakHours.map((peak, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Badge 
                  variant="outline" 
                  className={`text-base px-4 py-2 ${idx === 0 ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500' : ''}`}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {peak.hour.toString().padStart(2, '0')}:00 
                  <span className="ml-2 text-emerald-600 font-bold">₨{peak.profit.toLocaleString()}</span>
                  <span className="ml-2 text-muted-foreground">({peak.trips} trips)</span>
                </Badge>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Performance */}
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Hourly Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyChartData}>
                  <defs>
                    <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="hour" />
                  <YAxis tickFormatter={(v) => `₨${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'trips' ? value : `₨${value.toLocaleString()}`,
                      name === 'trips' ? 'Trips' : name === 'profit' ? 'Profit' : 'Income'
                    ]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="profit" name="Profit" fill="url(#hourlyGradient)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Day of Week Performance */}
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Day of Week Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyChartData}>
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="incomeGradient2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" />
                  <YAxis tickFormatter={(v) => `₨${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => [`₨${value.toLocaleString()}`, '']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#3B82F6" fill="url(#incomeGradient2)" />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#10B981" fill="url(#profitGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { ArrowUpRight, ArrowDownRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthlyData {
  currentMonth: {
    revenue: number;
    expenses: number;
    profit: number;
    trips: number;
  };
  lastMonth: {
    revenue: number;
    expenses: number;
    profit: number;
    trips: number;
  };
}

interface ExecutiveMonthlyComparisonProps {
  data: MonthlyData;
  isLoading?: boolean;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `Rs ${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `Rs ${(value / 1000).toFixed(0)}K`;
  }
  return `Rs ${value.toLocaleString()}`;
};

const calculateChange = (current: number, last: number) => {
  if (last === 0) return 0;
  return ((current - last) / last) * 100;
};

export function ExecutiveMonthlyComparison({ data, isLoading }: ExecutiveMonthlyComparisonProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="h-full flex items-center justify-center">
          <div className="animate-pulse bg-muted rounded-xl w-full h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    { 
      label: "Revenue", 
      current: data.currentMonth.revenue, 
      last: data.lastMonth.revenue,
      color: "#3b82f6",
      bgColor: "bg-blue-500/10"
    },
    { 
      label: "Expenses", 
      current: data.currentMonth.expenses, 
      last: data.lastMonth.expenses,
      color: "#f43f5e",
      bgColor: "bg-rose-500/10",
      invertChange: true
    },
    { 
      label: "Profit", 
      current: data.currentMonth.profit, 
      last: data.lastMonth.profit,
      color: "#10b981",
      bgColor: "bg-emerald-500/10"
    },
    { 
      label: "Trips", 
      current: data.currentMonth.trips, 
      last: data.lastMonth.trips,
      color: "#8b5cf6",
      bgColor: "bg-violet-500/10"
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
    >
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card via-card to-muted/20">
        <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 3xl:w-6 3xl:h-6 text-white" />
            </div>
            <CardTitle className="text-base sm:text-lg lg:text-xl 3xl:text-2xl font-bold">Month-to-Month Comparison</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-2 sm:pt-4 px-2 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            {metrics.map((metric, index) => {
              const change = calculateChange(metric.current, metric.last);
              const isPositive = metric.invertChange ? change < 0 : change > 0;
              const maxValue = Math.max(metric.current, metric.last);
              const currentPercent = (metric.current / maxValue) * 100;
              const lastPercent = (metric.last / maxValue) * 100;

              return (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className={cn("p-4 rounded-xl", metric.bgColor)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">{metric.label}</span>
                    <div className={cn(
                      "flex items-center gap-0.5 text-xs font-bold",
                      isPositive ? "text-emerald-500" : "text-red-500"
                    )}>
                      {isPositive ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      {Math.abs(change).toFixed(1)}%
                    </div>
                  </div>

                  {/* Current month value */}
                  <div className="mb-2">
                    <span className="text-xl font-bold text-foreground">
                      {metric.label === "Trips" ? metric.current : formatCurrency(metric.current)}
                    </span>
                  </div>

                  {/* Comparison bars */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-10">This</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: metric.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${currentPercent}%` }}
                          transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-10">Last</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full opacity-50"
                          style={{ backgroundColor: metric.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${lastPercent}%` }}
                          transition={{ delay: 1.1 + index * 0.1, duration: 0.5 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Last month value */}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Last: {metric.label === "Trips" ? metric.last : formatCurrency(metric.last)}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

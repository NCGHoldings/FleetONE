import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface RevenueTrendPoint {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface ExecutiveRevenueChartProps {
  data: RevenueTrendPoint[];
  isLoading?: boolean;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `Rs ${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `Rs ${(value / 1000).toFixed(0)}K`;
  }
  return `Rs ${value}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-xl">
        <p className="font-semibold text-foreground mb-2">
          {format(new Date(label), 'MMM dd, yyyy')}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function ExecutiveRevenueChart({ data, isLoading }: ExecutiveRevenueChartProps) {
  if (isLoading) {
    return (
      <Card className="h-[280px] sm:h-[350px] lg:h-[400px] 3xl:h-[500px]">
        <CardContent className="h-full flex items-center justify-center">
          <div className="animate-pulse bg-muted rounded-xl w-full h-[200px] sm:h-[280px] lg:h-[320px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card via-card to-muted/20 h-full">
        <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 3xl:w-6 3xl:h-6 text-white" />
            </div>
            <CardTitle className="text-base sm:text-lg lg:text-xl 3xl:text-2xl font-bold">Revenue & Expenses Trend</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-2 sm:pt-4 px-2 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          <ResponsiveContainer width="100%" height={240} className="sm:!h-[280px] lg:!h-[320px] 3xl:!h-[400px]">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: 20 }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#revenueGradient)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#f43f5e"
                strokeWidth={3}
                fill="url(#expensesGradient)"
              />
              <Area
                type="monotone"
                dataKey="profit"
                name="Profit"
                stroke="#10b981"
                strokeWidth={3}
                fill="url(#profitGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

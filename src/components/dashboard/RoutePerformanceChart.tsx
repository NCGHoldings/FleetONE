import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Route, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface RouteData {
  route: string;
  revenue: number;
  profit: number;
  trips: number;
  efficiency: number;
}

interface RoutePerformanceChartProps {
  data?: RouteData[];
  isLoading?: boolean;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `₨ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `₨ ${(value / 1000).toFixed(0)}K`;
  }
  return `₨ ${value}`;
};

const GRADIENT_COLORS = [
  "url(#routeGradient1)",
  "url(#routeGradient2)",
  "url(#routeGradient3)",
  "url(#routeGradient4)",
  "url(#routeGradient5)",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground mb-2">{data.route}</p>
        <div className="space-y-1 text-sm">
          <p className="text-primary">Revenue: {formatCurrency(data.revenue)}</p>
          <p className="text-success">Profit: {formatCurrency(data.profit)}</p>
          <p className="text-muted-foreground">Trips: {data.trips}</p>
          <p className="text-muted-foreground">Efficiency: {data.efficiency.toFixed(1)}%</p>
        </div>
      </div>
    );
  }
  return null;
};

export function RoutePerformanceChart({ data, isLoading }: RoutePerformanceChartProps) {
  if (isLoading) {
    return (
      <Card className="card-elevated">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
    >
      <Card className="card-elevated overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(250,80%,55%)] to-[hsl(280,70%,50%)]" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(250,80%,55%)] to-[hsl(280,70%,50%)] flex items-center justify-center text-white">
              <Route className="w-4 h-4" />
            </div>
            Top Routes by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Route className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No route data available</p>
                <p className="text-sm">Add trips with routes to see performance</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="routeGradient1" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(215, 88%, 52%)" />
                    <stop offset="100%" stopColor="hsl(250, 80%, 55%)" />
                  </linearGradient>
                  <linearGradient id="routeGradient2" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(250, 80%, 55%)" />
                    <stop offset="100%" stopColor="hsl(280, 70%, 50%)" />
                  </linearGradient>
                  <linearGradient id="routeGradient3" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(280, 70%, 50%)" />
                    <stop offset="100%" stopColor="hsl(300, 60%, 50%)" />
                  </linearGradient>
                  <linearGradient id="routeGradient4" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(145, 65%, 42%)" />
                    <stop offset="100%" stopColor="hsl(160, 75%, 45%)" />
                  </linearGradient>
                  <linearGradient id="routeGradient5" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(38, 92%, 50%)" />
                    <stop offset="100%" stopColor="hsl(25, 90%, 55%)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCurrency}
                />
                <YAxis
                  type="category"
                  dataKey="route"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                  tick={{ fill: "hsl(var(--foreground))" }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted)/0.3)" }} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} animationDuration={800}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={GRADIENT_COLORS[index % GRADIENT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

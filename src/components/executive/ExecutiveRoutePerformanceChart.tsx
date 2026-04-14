import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Route, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoutePerformance {
  routeId: string;
  routeName: string;
  revenue: number;
  profit: number;
  trips: number;
  profitMargin: number;
}

interface ExecutiveRoutePerformanceChartProps {
  data: RoutePerformance[];
  isLoading?: boolean;
}

export function ExecutiveRoutePerformanceChart({ data, isLoading }: ExecutiveRoutePerformanceChartProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `Rs ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `Rs ${(value / 1000).toFixed(0)}K`;
    return `Rs ${value.toFixed(0)}`;
  };

  const colors = [
    'hsl(var(--primary))',
    'hsl(262, 83%, 58%)', // purple
    'hsl(199, 89%, 48%)', // cyan
    'hsl(142, 71%, 45%)', // green
    'hsl(43, 96%, 56%)',  // yellow
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const route = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-xl">
          <p className="font-medium text-foreground mb-2">{route.routeName}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Revenue:</span>
              <span className="font-medium">{formatCurrency(route.revenue)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Profit:</span>
              <span className="font-medium text-emerald-500">{formatCurrency(route.profit)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Trips:</span>
              <span className="font-medium">{route.trips}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Margin:</span>
              <span className={cn(
                "font-medium",
                route.profitMargin >= 20 ? "text-emerald-500" : "text-amber-500"
              )}>
                {route.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="h-full animate-pulse">
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 bg-muted/30 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="h-full"
    >
      <Card className="bg-gradient-to-br from-card to-card/80 border-2 shadow-lg h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Route className="w-5 h-5 text-cyan-500" />
            </div>
            Top Routes by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-muted-foreground">
              No route data available for this period
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((route, index) => {
                const maxRevenue = Math.max(...data.map(r => r.revenue));
                const widthPercent = (route.revenue / maxRevenue) * 100;
                
                return (
                  <motion.div
                    key={route.routeId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[200px]" title={route.routeName}>
                        {index + 1}. {route.routeName}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{formatCurrency(route.revenue)}</span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          route.profitMargin >= 25 ? "bg-emerald-500/20 text-emerald-500" :
                          route.profitMargin >= 15 ? "bg-blue-500/20 text-blue-500" :
                          "bg-amber-500/20 text-amber-500"
                        )}>
                          {route.profitMargin.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: colors[index % colors.length] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPercent}%` }}
                        transition={{ delay: 0.7 + index * 0.1, duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{route.trips} trips</span>
                      <span>Profit: {formatCurrency(route.profit)}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

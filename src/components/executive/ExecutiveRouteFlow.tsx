import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Route, TrendingUp, TrendingDown, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoutePerformance {
  routeName: string;
  revenue: number;
  profit: number;
  profitMargin: number;
  tripCount: number;
  trend?: number;
}

interface ExecutiveRouteFlowProps {
  routes: RoutePerformance[];
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

export function ExecutiveRouteFlow({ routes, isLoading }: ExecutiveRouteFlowProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="pt-4 sm:pt-6 space-y-3 sm:space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 sm:h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const maxRevenue = Math.max(...routes.map(r => r.revenue));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="h-full"
    >
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card via-card to-muted/20 h-full">
        <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
              <Route className="w-4 h-4 sm:w-5 sm:h-5 3xl:w-6 3xl:h-6 text-white" />
            </div>
            <CardTitle className="text-base sm:text-lg lg:text-xl 3xl:text-2xl font-bold">Top Routes by Revenue</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-2 sm:pt-4 px-2 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6 space-y-2 sm:space-y-3">
          {routes.slice(0, 5).map((route, index) => {
            const percentage = (route.revenue / maxRevenue) * 100;
            const isHot = index === 0;
            const trend = route.trend ?? 0;

            return (
              <motion.div
                key={route.routeName}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="relative"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate max-w-[180px]">
                      {route.routeName}
                    </span>
                    {isHot && (
                      <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(route.revenue)}
                    </span>
                    <div className={cn(
                      "flex items-center gap-0.5 text-xs font-medium",
                      trend >= 0 ? "text-emerald-500" : "text-red-500"
                    )}>
                      {trend >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {Math.abs(trend)}%
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative h-8 bg-muted/50 rounded-lg overflow-hidden">
                  <motion.div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-lg",
                      index === 0 ? "bg-gradient-to-r from-orange-500 to-amber-400" :
                      index === 1 ? "bg-gradient-to-r from-blue-500 to-cyan-400" :
                      index === 2 ? "bg-gradient-to-r from-emerald-500 to-teal-400" :
                      index === 3 ? "bg-gradient-to-r from-purple-500 to-violet-400" :
                      "bg-gradient-to-r from-gray-500 to-slate-400"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ delay: 0.8 + index * 0.1, duration: 0.6, ease: "easeOut" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-3">
                    <span className="text-xs font-medium text-white z-10 drop-shadow">
                      {route.tripCount} trips
                    </span>
                    <span className={cn(
                      "text-xs font-semibold z-10 px-2 py-0.5 rounded-full",
                      route.profitMargin >= 30 ? "bg-emerald-500/20 text-emerald-400" :
                      route.profitMargin >= 20 ? "bg-amber-500/20 text-amber-400" :
                      "bg-red-500/20 text-red-400"
                    )}>
                      {route.profitMargin.toFixed(0)}% margin
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, Fuel, Clock, Users, Calendar, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutiveQuickStatsProps {
  stats: {
    todayTrips: number;
    completedTrips: number;
    avgFuelEfficiency: number;
    totalDistance: number;
    activeStaff: number;
  };
  isLoading?: boolean;
}

export function ExecutiveQuickStats({ stats, isLoading }: ExecutiveQuickStatsProps) {
  const items = [
    {
      label: "Today's Trips",
      value: stats.todayTrips,
      icon: Calendar,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Completed",
      value: stats.completedTrips,
      icon: Clock,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Avg km/L",
      value: stats.avgFuelEfficiency.toFixed(1),
      icon: Fuel,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Total Distance",
      value: stats.totalDistance >= 1000 
        ? `${(stats.totalDistance / 1000).toFixed(1)}K km` 
        : `${stats.totalDistance} km`,
      icon: Gauge,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-muted/30 rounded-lg" />
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
      transition={{ delay: 0.6 }}
    >
      <Card className="bg-gradient-to-br from-card to-card/80 border-2 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-orange-500" />
            </div>
            Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {items.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl",
                    "bg-gradient-to-br from-muted/50 to-muted/30",
                    "border border-border/50"
                  )}
                >
                  <div className={cn("p-2.5 rounded-lg", item.bg)}>
                    <Icon className={cn("w-5 h-5", item.color)} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
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

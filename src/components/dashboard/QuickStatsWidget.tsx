import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Wrench, 
  Fuel, 
  Clock, 
  Star,
  TrendingUp,
  Zap,
  Target
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface QuickStatsWidgetProps {
  fuelEfficiency?: number;
  maintenanceDue?: number;
  enginesRunning?: number;
  totalBuses?: number;
  isLoading?: boolean;
}

export function QuickStatsWidget({
  fuelEfficiency = 0,
  maintenanceDue = 0,
  enginesRunning = 0,
  totalBuses = 0,
  isLoading,
}: QuickStatsWidgetProps) {
  if (isLoading) {
    return (
      <Card className="card-elevated">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const enginePercentage = totalBuses > 0 ? (enginesRunning / totalBuses) * 100 : 0;

  const stats = [
    {
      icon: Fuel,
      label: "Avg Fuel Efficiency",
      value: `${fuelEfficiency.toFixed(1)} km/L`,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Wrench,
      label: "Maintenance Due",
      value: `${maintenanceDue} buses`,
      color: maintenanceDue > 3 ? "text-warning" : "text-success",
      bgColor: maintenanceDue > 3 ? "bg-warning/10" : "bg-success/10",
    },
    {
      icon: Zap,
      label: "Engines Running",
      value: `${enginesRunning} / ${totalBuses}`,
      color: "text-success",
      bgColor: "bg-success/10",
      progress: enginePercentage,
    },
    {
      icon: Target,
      label: "Fleet Utilization",
      value: `${enginePercentage.toFixed(0)}%`,
      color: enginePercentage > 70 ? "text-success" : "text-warning",
      bgColor: enginePercentage > 70 ? "bg-success/10" : "bg-warning/10",
      progress: enginePercentage,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
    >
      <Card className="card-elevated overflow-hidden h-full">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-[hsl(250,80%,55%)]" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(250,80%,55%)] flex items-center justify-center text-white">
              <TrendingUp className="w-4 h-4" />
            </div>
            Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
            >
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <div className="flex items-center justify-between">
                  <p className={`font-semibold ${stat.color}`}>{stat.value}</p>
                </div>
                {stat.progress !== undefined && (
                  <Progress value={stat.progress} className="h-1.5 mt-2" />
                )}
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

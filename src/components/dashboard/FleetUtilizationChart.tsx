import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface FleetUtilizationChartProps {
  moving?: number;
  idle?: number;
  offline?: number;
  isLoading?: boolean;
}

const COLORS = {
  moving: "hsl(145, 65%, 42%)",
  idle: "hsl(38, 92%, 50%)",
  offline: "hsl(var(--muted))",
};

export function FleetUtilizationChart({
  moving = 0,
  idle = 0,
  offline = 0,
  isLoading,
}: FleetUtilizationChartProps) {
  if (isLoading) {
    return (
      <Card className="card-elevated">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded-full mx-auto" />
        </CardContent>
      </Card>
    );
  }

  const total = moving + idle + offline;
  const data = [
    { name: "Moving", value: moving, color: COLORS.moving },
    { name: "Idle", value: idle, color: COLORS.idle },
    { name: "Offline", value: offline, color: COLORS.offline },
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium" style={{ color: item.color }}>
            {item.name}: {item.value} buses
          </p>
          <p className="text-sm text-muted-foreground">
            {total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}% of fleet
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="card-elevated overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(145,65%,42%)] via-[hsl(38,92%,50%)] to-[hsl(var(--muted))]" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(145,65%,42%)] to-[hsl(160,75%,45%)] flex items-center justify-center text-white">
              <Activity className="w-4 h-4" />
            </div>
            Fleet Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <motion.p
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="text-3xl font-bold text-foreground"
                >
                  {total}
                </motion.p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-4">
            {data.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-center gap-2"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {item.name}: <span className="font-medium text-foreground">{item.value}</span>
                </span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

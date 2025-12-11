import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Bus, Zap, Moon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FleetStatusData {
  moving: number;
  idle: number;
  offline: number;
  total: number;
}

interface ExecutiveFleetWidgetProps {
  data: FleetStatusData;
  isLoading?: boolean;
}

export function ExecutiveFleetWidget({ data, isLoading }: ExecutiveFleetWidgetProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="h-full flex items-center justify-center">
          <div className="animate-pulse bg-muted rounded-full w-40 h-40" />
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: "Moving", value: data.moving, color: "#10b981", icon: Zap },
    { name: "Idle", value: data.idle, color: "#f59e0b", icon: Moon },
    { name: "Offline", value: data.offline, color: "#6b7280", icon: AlertTriangle },
  ].filter(item => item.value > 0);

  const utilization = data.total > 0 ? ((data.moving / data.total) * 100).toFixed(0) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card via-card to-muted/20 h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <CardTitle className="text-xl font-bold">Fleet Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center gap-6">
            {/* Donut Chart */}
            <div className="relative w-36 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        className="drop-shadow-lg"
                        style={{
                          filter: `drop-shadow(0 0 8px ${entry.color}50)`
                        }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  className="text-3xl font-bold text-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  {data.total}
                </motion.span>
                <span className="text-xs text-muted-foreground">Buses</span>
              </div>
            </div>

            {/* Status Legend */}
            <div className="flex-1 space-y-3">
              {[
                { label: "Moving", value: data.moving, color: "#10b981", Icon: Zap, pulse: true },
                { label: "Idle", value: data.idle, color: "#f59e0b", Icon: Moon, pulse: false },
                { label: "Offline", value: data.offline, color: "#6b7280", Icon: AlertTriangle, pulse: false },
              ].map((status, index) => (
                <motion.div
                  key={status.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        status.pulse && "animate-pulse"
                      )}
                      style={{ 
                        backgroundColor: `${status.color}20`,
                        boxShadow: `0 0 15px ${status.color}30`
                      }}
                    >
                      <status.Icon className="w-4 h-4" style={{ color: status.color }} />
                    </div>
                    <span className="text-sm font-medium text-foreground">{status.label}</span>
                  </div>
                  <span className="text-xl font-bold" style={{ color: status.color }}>
                    {status.value}
                  </span>
                </motion.div>
              ))}

              {/* Utilization */}
              <div className="pt-2 mt-2 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Utilization</span>
                  <span className={cn(
                    "font-bold",
                    Number(utilization) >= 80 ? "text-emerald-500" :
                    Number(utilization) >= 60 ? "text-amber-500" : "text-red-500"
                  )}>
                    {utilization}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

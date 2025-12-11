import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";
import { Target, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPIAchievement {
  name: string;
  achievement: number;
  target: number;
  current: number;
  unit?: string;
}

interface ExecutiveAchievementRingsProps {
  kpis: KPIAchievement[];
  isLoading?: boolean;
}

const getStatusColor = (achievement: number) => {
  if (achievement >= 100) return { color: "#10b981", bg: "bg-emerald-500/10", text: "text-emerald-500" };
  if (achievement >= 80) return { color: "#f59e0b", bg: "bg-amber-500/10", text: "text-amber-500" };
  return { color: "#ef4444", bg: "bg-red-500/10", text: "text-red-500" };
};

function AchievementRing({ kpi, delay }: { kpi: KPIAchievement; delay: number }) {
  const status = getStatusColor(kpi.achievement);
  const data = [{ name: kpi.name, value: Math.min(kpi.achievement, 100), fill: status.color }];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
      className="flex flex-col items-center"
    >
      <div className="relative w-32 h-32 lg:w-40 lg:h-40">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            barSize={12}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: 'hsl(var(--muted))' }}
              dataKey="value"
              cornerRadius={10}
              className="drop-shadow-lg"
            />
          </RadialBarChart>
        </ResponsiveContainer>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-2xl lg:text-3xl font-bold text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.3 }}
          >
            {kpi.achievement.toFixed(0)}%
          </motion.span>
          {kpi.achievement >= 100 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-1" />
          ) : kpi.achievement >= 80 ? (
            <AlertCircle className="w-4 h-4 text-amber-500 mt-1" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 mt-1" />
          )}
        </div>
      </div>

      <div className="mt-3 text-center">
        <h4 className="font-semibold text-foreground text-sm lg:text-base">{kpi.name}</h4>
        <div className={cn("mt-1 px-3 py-1 rounded-full text-xs font-medium", status.bg, status.text)}>
          {kpi.achievement >= 100 ? "Achieved" : kpi.achievement >= 80 ? "On Track" : "Below Target"}
        </div>
      </div>
    </motion.div>
  );
}

export function ExecutiveAchievementRings({ kpis, isLoading }: ExecutiveAchievementRingsProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="h-full flex items-center justify-center">
          <div className="animate-pulse bg-muted rounded-xl w-full h-[280px]" />
        </CardContent>
      </Card>
    );
  }

  // Take top 3 KPIs for display
  const displayKpis = kpis.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card via-card to-muted/20 h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
              <Target className="w-5 h-5 text-white" />
            </div>
            <CardTitle className="text-xl font-bold">KPI Achievement</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center justify-around flex-wrap gap-4">
            {displayKpis.map((kpi, index) => (
              <AchievementRing key={kpi.name} kpi={kpi} delay={0.5 + index * 0.15} />
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

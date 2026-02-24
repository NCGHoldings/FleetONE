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
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 3xl:w-48 3xl:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            barSize={8}
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
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl 3xl:text-4xl font-bold text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.3 }}
          >
            {kpi.achievement.toFixed(0)}%
          </motion.span>
          {kpi.achievement >= 100 ? (
            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500 mt-0.5 sm:mt-1" />
          ) : kpi.achievement >= 80 ? (
            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500 mt-0.5 sm:mt-1" />
          ) : (
            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 mt-0.5 sm:mt-1" />
          )}
        </div>
      </div>

      <div className="mt-2 sm:mt-3 text-center">
        <h4 className="font-semibold text-foreground text-xs sm:text-sm lg:text-base 3xl:text-lg">{kpi.name}</h4>
        <div className={cn("mt-0.5 sm:mt-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs 3xl:text-sm font-medium", status.bg, status.text)}>
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
          <div className="animate-pulse bg-muted rounded-xl w-full h-[200px] sm:h-[250px] lg:h-[280px]" />
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
      className="h-full"
    >
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card via-card to-muted/20 h-full">
        <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 3xl:w-6 3xl:h-6 text-white" />
            </div>
            <CardTitle className="text-base sm:text-lg lg:text-xl 3xl:text-2xl font-bold">KPI Achievement</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-2 sm:pt-4 px-2 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          <div className="flex items-center justify-around flex-wrap gap-2 sm:gap-4">
            {displayKpis.map((kpi, index) => (
              <AchievementRing key={kpi.name} kpi={kpi} delay={0.5 + index * 0.15} />
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

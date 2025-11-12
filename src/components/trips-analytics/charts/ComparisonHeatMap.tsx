import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

interface ComparisonHeatMapProps {
  name1: string;
  name2: string;
  metrics: Array<{
    label: string;
    value1: number;
    value2: number;
    format: (v: number) => string;
  }>;
}

export default function ComparisonHeatMap({
  name1,
  name2,
  metrics,
}: ComparisonHeatMapProps) {
  const getIntensity = (value1: number, value2: number) => {
    if (value1 === 0 && value2 === 0) return 0;
    const max = Math.max(value1, value2);
    return value1 / max;
  };

  const getColorClass = (intensity: number, winner: boolean) => {
    if (!winner) return "bg-muted/50";
    if (intensity >= 0.8) return "bg-green-600 dark:bg-green-400";
    if (intensity >= 0.6) return "bg-green-500 dark:bg-green-500";
    if (intensity >= 0.4) return "bg-yellow-500 dark:bg-yellow-500";
    if (intensity >= 0.2) return "bg-orange-500 dark:bg-orange-500";
    return "bg-red-500 dark:bg-red-500";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Heat Map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {metrics.map((metric, idx) => {
            const intensity1 = getIntensity(metric.value1, metric.value2);
            const intensity2 = getIntensity(metric.value2, metric.value1);
            const winner1 = metric.value1 > metric.value2;
            const winner2 = metric.value2 > metric.value1;

            return (
              <div key={idx} className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">
                  {metric.label}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-3 rounded-lg ${getColorClass(intensity1, winner1)} transition-colors`}
                  >
                    <div className="text-xs font-medium text-white/90">{name1}</div>
                    <div className="text-sm font-bold text-white">
                      {metric.format(metric.value1)}
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 + 0.05 }}
                    className={`p-3 rounded-lg ${getColorClass(intensity2, winner2)} transition-colors`}
                  >
                    <div className="text-xs font-medium text-white/90">{name2}</div>
                    <div className="text-sm font-bold text-white">
                      {metric.format(metric.value2)}
                    </div>
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

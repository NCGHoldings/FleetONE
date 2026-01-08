import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { COMPARISON_COLORS } from "@/lib/comparison-colors";

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

  const getColorClass = (intensity: number, isEntity1: boolean) => {
    const baseColor = isEntity1 ? 'blue' : 'purple';
    
    if (intensity > 0.7) {
      return `bg-${baseColor}-600 dark:bg-${baseColor}-500 text-white`;
    }
    if (intensity > 0.4) {
      return `bg-${baseColor}-400 dark:bg-${baseColor}-600 text-white`;
    }
    return `bg-${baseColor}-300 dark:bg-${baseColor}-700 text-white`;
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
                    className={`p-4 rounded-lg text-center transition-all ${getColorClass(intensity1, true)} ${winner1 ? 'ring-2 ring-yellow-400 shadow-lg' : ''}`}
                  >
                    <div className="font-semibold text-lg">{metric.format(metric.value1)}</div>
                    {winner1 && <div className="text-xs mt-1 opacity-90">Winner</div>}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 + 0.025 }}
                    className={`p-4 rounded-lg text-center transition-all ${getColorClass(intensity2, false)} ${winner2 ? 'ring-2 ring-yellow-400 shadow-lg' : ''}`}
                  >
                    <div className="font-semibold text-lg">{metric.format(metric.value2)}</div>
                    {winner2 && <div className="text-xs mt-1 opacity-90">Winner</div>}
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

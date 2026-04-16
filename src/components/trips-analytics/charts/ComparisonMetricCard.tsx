import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { COMPARISON_COLORS } from "@/lib/comparison-colors";

interface ComparisonMetricCardProps {
  title: string;
  value1: number;
  value2: number;
  name1: string;
  name2: string;
  format: (value: number) => string;
  icon?: React.ReactNode;
  higherIsBetter?: boolean;
}

export default function ComparisonMetricCard({
  title,
  value1,
  value2,
  name1,
  name2,
  format,
  icon,
  higherIsBetter = true,
}: ComparisonMetricCardProps) {
  const diff = value1 - value2;
  const diffPercent = value2 !== 0 ? ((diff / value2) * 100) : 0;
  const absDiffPercent = Math.abs(diffPercent);
  
  const winner = diff > 0 ? (higherIsBetter ? 1 : 2) : (higherIsBetter ? 2 : 1);
  const isPositive = (diff > 0 && higherIsBetter) || (diff < 0 && !higherIsBetter);

  const max = Math.max(value1, value2);
  const percent1 = max > 0 ? (value1 / max) * 100 : 0;
  const percent2 = max > 0 ? (value2 / max) * 100 : 0;

  const getTrendIcon = () => {
    if (Math.abs(diff) < 0.01) return <Minus className="h-4 w-4" />;
    return diff > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            </div>
            {icon && <div className="text-muted-foreground">{icon}</div>}
          </div>

          {/* Comparison Bars */}
          <div className="space-y-3 mb-4">
            {/* Entity 1 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{name1}</span>
                  {winner === 1 && <Trophy className="h-3 w-3 text-yellow-500" />}
                </div>
                <span className="text-sm font-semibold">{format(value1)}</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent1}%` }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className={`h-full ${winner === 1 ? 'bg-blue-600' : 'bg-blue-400'}`}
                />
              </div>
            </div>

            {/* Entity 2 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{name2}</span>
                  {winner === 2 && <Trophy className="h-3 w-3 text-yellow-500" />}
                </div>
                <span className="text-sm font-semibold">{format(value2)}</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent2}%` }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className={`h-full ${winner === 2 ? 'bg-purple-600' : 'bg-purple-400'}`}
                />
              </div>
            </div>
          </div>

          {/* Difference Display */}
          <div className={`flex items-center justify-center gap-2 text-sm font-medium ${
            isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {getTrendIcon()}
            <span>{absDiffPercent.toFixed(1)}% difference</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

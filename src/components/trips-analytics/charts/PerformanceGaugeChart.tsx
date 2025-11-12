import { Card, CardContent } from "@/components/ui/card";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

interface PerformanceGaugeChartProps {
  name1: string;
  name2: string;
  score1: number;
  score2: number;
  title: string;
}

export default function PerformanceGaugeChart({
  name1,
  name2,
  score1,
  score2,
  title,
}: PerformanceGaugeChartProps) {
  const getColor = (score: number) => {
    if (score >= 75) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getGaugeColor = (score: number) => {
    if (score >= 75) return "stroke-green-600 dark:stroke-green-400";
    if (score >= 50) return "stroke-yellow-600 dark:stroke-yellow-400";
    return "stroke-red-600 dark:stroke-red-400";
  };

  const winner = score1 > score2 ? 1 : score2 > score1 ? 2 : 0;

  const GaugeCircle = ({ score, delay }: { score: number; delay: number }) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
      <svg className="w-32 h-32 transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          className="stroke-muted"
          strokeWidth="8"
          fill="none"
        />
        <motion.circle
          cx="64"
          cy="64"
          r={radius}
          className={getGaugeColor(score)}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, delay }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
    );
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-6 text-center">{title}</h3>
        
        <div className="grid grid-cols-2 gap-6">
          {/* Entity 1 */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <GaugeCircle score={score1} delay={0.1} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${getColor(score1)}`}>
                  {score1}
                </span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>
            <div className="mt-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-sm font-medium">{name1}</span>
                {winner === 1 && <Trophy className="h-4 w-4 text-yellow-500" />}
              </div>
              {winner === 1 && (
                <div className="flex items-center justify-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>Winner</span>
                </div>
              )}
            </div>
          </div>

          {/* Entity 2 */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <GaugeCircle score={score2} delay={0.2} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${getColor(score2)}`}>
                  {score2}
                </span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>
            <div className="mt-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-sm font-medium">{name2}</span>
                {winner === 2 && <Trophy className="h-4 w-4 text-yellow-500" />}
              </div>
              {winner === 2 && (
                <div className="flex items-center justify-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>Winner</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {winner === 0 && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Equal Performance
          </div>
        )}
      </CardContent>
    </Card>
  );
}

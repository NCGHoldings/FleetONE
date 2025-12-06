import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface EnhancedKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon: ReactNode;
  gradient?: "blue" | "purple" | "green" | "orange";
  isLoading?: boolean;
  sparklineData?: number[];
  delay?: number;
}

const gradients = {
  blue: "from-primary to-[hsl(215,88%,62%)]",
  purple: "from-[hsl(250,80%,55%)] to-[hsl(280,70%,60%)]",
  green: "from-[hsl(145,65%,42%)] to-[hsl(160,75%,45%)]",
  orange: "from-[hsl(38,92%,50%)] to-[hsl(25,90%,55%)]",
};

export function EnhancedKPICard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon,
  gradient = "blue",
  isLoading = false,
  sparklineData,
  delay = 0,
}: EnhancedKPICardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  if (isLoading) {
    return (
      <div className="bg-card border border-border/50 rounded-xl p-6 shadow-[var(--shadow-card)]">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: delay * 0.1, duration: 0.4 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="relative overflow-hidden bg-card border border-border/50 rounded-xl p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all duration-300 group"
    >
      {/* Gradient accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradients[gradient]}`} />

      {/* Background glow on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradients[gradient]} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <motion.div
            whileHover={{ rotate: 15 }}
            className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradients[gradient]} flex items-center justify-center text-white`}
          >
            {icon}
          </motion.div>
        </div>

        <div className="space-y-2">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay * 0.1 + 0.2 }}
            className="text-3xl font-bold text-foreground"
          >
            {value}
          </motion.p>

          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}

          {change !== undefined && (
            <div className="flex items-center gap-2">
              <span
                className={`flex items-center gap-1 text-sm font-medium ${
                  isPositive
                    ? "text-success"
                    : isNegative
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : isNegative ? (
                  <TrendingDown className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
                {Math.abs(change).toFixed(1)}%
              </span>
              {changeLabel && (
                <span className="text-xs text-muted-foreground">{changeLabel}</span>
              )}
            </div>
          )}
        </div>

        {/* Mini sparkline */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-4 h-8 flex items-end gap-0.5">
            {sparklineData.map((value, index) => {
              const max = Math.max(...sparklineData);
              const height = max > 0 ? (value / max) * 100 : 0;
              return (
                <motion.div
                  key={index}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: delay * 0.1 + index * 0.05 }}
                  className={`flex-1 rounded-t bg-gradient-to-t ${gradients[gradient]} opacity-60`}
                />
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

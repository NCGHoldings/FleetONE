import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Target, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ExecutiveKPICardProps {
  name: string;
  value: number;
  target: number;
  achievement: number;
  status: 'achieved' | 'on-track' | 'at-risk' | 'below';
  unit: string;
  delay?: number;
  className?: string;
}

export function ExecutiveKPICard({
  name,
  value,
  target,
  achievement,
  status,
  unit,
  delay = 0,
  className,
}: ExecutiveKPICardProps) {
  const formatValue = (val: number) => {
    if (unit === 'currency') {
      if (val >= 1000000) return `Rs ${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `Rs ${(val / 1000).toFixed(0)}K`;
      return `Rs ${val.toFixed(0)}`;
    }
    if (unit === 'percentage') return `${val.toFixed(1)}%`;
    if (unit === 'km') {
      if (val >= 1000) return `${(val / 1000).toFixed(1)}K km`;
      return `${val.toFixed(0)} km`;
    }
    return val.toFixed(1);
  };

  const formatTarget = (val: number) => {
    if (unit === 'currency') {
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
      return val.toFixed(0);
    }
    if (unit === 'percentage') return `${val}%`;
    if (unit === 'km') return `${(val / 1000).toFixed(0)}K`;
    return val.toString();
  };

  const statusConfig = {
    achieved: { 
      icon: CheckCircle2, 
      color: 'text-emerald-400', 
      bg: 'from-emerald-500/20 to-emerald-600/10',
      border: 'border-emerald-500/30',
      glow: 'shadow-emerald-500/20',
      label: 'Achieved',
    },
    'on-track': { 
      icon: TrendingUp, 
      color: 'text-blue-400', 
      bg: 'from-blue-500/20 to-blue-600/10',
      border: 'border-blue-500/30',
      glow: 'shadow-blue-500/20',
      label: 'On Track',
    },
    'at-risk': { 
      icon: AlertTriangle, 
      color: 'text-amber-400', 
      bg: 'from-amber-500/20 to-amber-600/10',
      border: 'border-amber-500/30',
      glow: 'shadow-amber-500/20',
      label: 'At Risk',
    },
    below: { 
      icon: XCircle, 
      color: 'text-red-400', 
      bg: 'from-red-500/20 to-red-600/10',
      border: 'border-red-500/30',
      glow: 'shadow-red-500/20',
      label: 'Below Target',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // Circular progress calculation
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(achievement, 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.5 }}
      className={className}
    >
      <Card className={cn(
        "relative overflow-hidden p-6 border-2 transition-all duration-300 hover:scale-[1.02]",
        "bg-gradient-to-br",
        config.bg,
        config.border,
        `shadow-lg ${config.glow}`
      )}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        </div>

        <div className="relative flex items-start justify-between">
          {/* Left side - Value and info */}
          <div className="flex-1 space-y-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {name}
            </p>
            
            <motion.p
              className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay * 0.1 + 0.2, type: "spring" }}
            >
              {formatValue(value)}
            </motion.p>

            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Target: {formatTarget(target)}
              </span>
            </div>

            {/* Status badge */}
            <div className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium",
              config.color,
              "bg-background/50 backdrop-blur-sm"
            )}>
              <StatusIcon className="w-4 h-4" />
              <span>{config.label}</span>
            </div>
          </div>

          {/* Right side - Circular progress */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted/20"
              />
              {/* Progress circle */}
              <motion.circle
                cx="50"
                cy="50"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className={config.color}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ delay: delay * 0.1 + 0.3, duration: 1, ease: "easeOut" }}
                style={{
                  strokeDasharray: circumference,
                }}
              />
            </svg>
            {/* Percentage in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.span
                className={cn("text-2xl font-bold", config.color)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay * 0.1 + 0.5 }}
              >
                {achievement.toFixed(0)}%
              </motion.span>
            </div>
          </div>
        </div>

        {/* Progress bar at bottom */}
        <div className="mt-4 h-2 bg-muted/30 rounded-full overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full",
              status === 'achieved' && "bg-gradient-to-r from-emerald-500 to-emerald-400",
              status === 'on-track' && "bg-gradient-to-r from-blue-500 to-blue-400",
              status === 'at-risk' && "bg-gradient-to-r from-amber-500 to-amber-400",
              status === 'below' && "bg-gradient-to-r from-red-500 to-red-400"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ delay: delay * 0.1 + 0.4, duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </Card>
    </motion.div>
  );
}

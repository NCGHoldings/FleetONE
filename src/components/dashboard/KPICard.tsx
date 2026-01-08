import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { ReactNode } from "react";

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: ReactNode;
  description?: string;
  className?: string;
}

export function KPICard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon, 
  description, 
  className 
}: KPICardProps) {
  const getTrendIcon = () => {
    if (changeType === 'positive') return <TrendingUp className="w-4 h-4" />;
    if (changeType === 'negative') return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  const getTrendColor = () => {
    if (changeType === 'positive') return 'text-success';
    if (changeType === 'negative') return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <div className={cn("kpi-card", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        </div>
        {change && (
          <div className={cn("flex items-center gap-1 text-sm", getTrendColor())}>
            {getTrendIcon()}
            <span>{change}</span>
          </div>
        )}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-3">{description}</p>
      )}
    </div>
  );
}
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedKPICardProps {
  title: string;
  value: number | string;
  format?: 'number' | 'currency' | 'percentage';
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  color?: 'default' | 'success' | 'warning' | 'error';
  sparklineData?: number[];
}

export default function AnimatedKPICard({
  title,
  value,
  format = 'number',
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  color = 'default',
  sparklineData = []
}: AnimatedKPICardProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    if (typeof value === 'number') {
      const controls = animate(count, value, { duration: 1, ease: "easeOut" });
      return controls.stop;
    }
  }, [value, count]);

  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    const safeVal = val ?? 0;
    
    switch (format) {
      case 'currency':
        return `Rs ${safeVal.toLocaleString()}`;
      case 'percentage':
        return `${safeVal.toFixed(1)}%`;
      default:
        return safeVal.toLocaleString();
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'success':
        return 'bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20';
      case 'warning':
        return 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20';
      case 'error':
        return 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20';
      default:
        return 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20';
    }
  };

  const getTrendColor = (trendValue?: number) => {
    if (!trendValue) return 'text-muted-foreground';
    return trendValue > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={{ 
        scale: 1.02,
        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
      }}
      className="h-full"
    >
      <Card className={cn(
        "overflow-hidden transition-all duration-300 border-2",
        getColorClasses()
      )}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {title}
              </p>
              <div className="relative">
                <motion.h3 
                  className="text-3xl font-bold text-foreground mb-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {typeof value === 'number' ? (
                    <motion.span>
                      {formatValue(rounded.get())}
                    </motion.span>
                  ) : (
                    formatValue(value)
                  )}
                </motion.h3>
                
                {sparklineData.length > 0 && (
                  <div className="absolute -bottom-2 left-0 right-0 h-8 opacity-20">
                    <svg width="100%" height="100%" className="overflow-visible">
                      <motion.path
                        d={generateSparklinePath(sparklineData)}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1, delay: 0.3 }}
                      />
                    </svg>
                  </div>
                )}
              </div>
              
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">
                  {subtitle}
                </p>
              )}
              
              {trend !== undefined && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={cn(
                    "flex items-center gap-1 mt-2 text-sm font-medium",
                    getTrendColor(trend)
                  )}
                >
                  {trend > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{Math.abs(trend ?? 0).toFixed(1)}%</span>
                  {trendLabel && (
                    <span className="text-xs text-muted-foreground ml-1">
                      {trendLabel}
                    </span>
                  )}
                </motion.div>
              )}
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0, rotate: -180 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 20,
                delay: 0.1
              }}
              className="flex-shrink-0"
            >
              <div className={cn(
                "p-3 rounded-full bg-background/50 backdrop-blur-sm",
                "shadow-lg"
              )}>
                <Icon className="w-6 h-6 text-primary" />
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function generateSparklinePath(data: number[]): string {
  if (data.length === 0) return '';
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 32;
  const step = width / (data.length - 1);
  
  return data
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

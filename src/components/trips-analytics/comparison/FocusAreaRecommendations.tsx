import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { 
  Target, 
  AlertTriangle, 
  ArrowRight, 
  TrendingUp,
  Lightbulb,
  CheckCircle2
} from 'lucide-react';
import { FocusArea } from '@/hooks/useComparisonAnalytics';

interface FocusAreaRecommendationsProps {
  focusAreas: FocusArea[];
}

export default function FocusAreaRecommendations({
  focusAreas
}: FocusAreaRecommendationsProps) {
  const getPriorityConfig = (priority: FocusArea['priority']) => {
    switch (priority) {
      case 'critical':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/20',
          border: 'border-rose-200 dark:border-rose-800',
          badge: 'bg-rose-500 text-white',
          icon: <AlertTriangle className="h-5 w-5 text-rose-500" />,
          progressColor: 'bg-rose-500'
        };
      case 'high':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/20',
          border: 'border-amber-200 dark:border-amber-800',
          badge: 'bg-amber-500 text-white',
          icon: <Target className="h-5 w-5 text-amber-500" />,
          progressColor: 'bg-amber-500'
        };
      case 'medium':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/20',
          border: 'border-blue-200 dark:border-blue-800',
          badge: 'bg-blue-500 text-white',
          icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
          progressColor: 'bg-blue-500'
        };
      case 'low':
        return {
          bg: 'bg-slate-50 dark:bg-slate-900/20',
          border: 'border-slate-200 dark:border-slate-700',
          badge: 'bg-slate-500 text-white',
          icon: <Lightbulb className="h-5 w-5 text-slate-500" />,
          progressColor: 'bg-slate-500'
        };
    }
  };

  const criticalCount = focusAreas.filter(f => f.priority === 'critical').length;
  const highCount = focusAreas.filter(f => f.priority === 'high').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              Focus Areas & Recommendations
            </CardTitle>
            <div className="flex gap-2">
              {criticalCount > 0 && (
                <Badge className="bg-rose-500 text-white">
                  {criticalCount} Critical
                </Badge>
              )}
              {highCount > 0 && (
                <Badge className="bg-amber-500 text-white">
                  {highCount} High Priority
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {focusAreas.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                All entities performing well!
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                No significant performance gaps detected
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {focusAreas.map((area, index) => {
                const config = getPriorityConfig(area.priority);
                const progressPercent = area.targetValue > 0 
                  ? Math.min(100, (area.currentValue / area.targetValue) * 100) 
                  : 0;
                
                return (
                  <motion.div
                    key={`${area.area}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border-2 ${config.bg} ${config.border}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{config.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="font-semibold">{area.area}</span>
                          <Badge className={config.badge}>
                            {area.priority.toUpperCase()}
                          </Badge>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Current: {formatValue(area.currentValue)}</span>
                            <span>Target: {formatValue(area.targetValue)}</span>
                          </div>
                          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                              transition={{ duration: 0.8, delay: index * 0.1 }}
                              className={`h-full ${config.progressColor} rounded-full`}
                            />
                          </div>
                        </div>
                        
                        {/* Gap & Impact */}
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <div className="text-xs text-muted-foreground">Gap to Close</div>
                            <div className="font-semibold text-rose-600 dark:text-rose-400">
                              {formatValue(area.gap)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Potential Impact</div>
                            <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {area.impact}
                            </div>
                          </div>
                        </div>
                        
                        {/* Recommendation */}
                        <div className="flex items-start gap-2 p-2 bg-white/50 dark:bg-slate-900/50 rounded-lg">
                          <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm">{area.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function formatValue(value: number): string {
  if (value >= 1000000) return `₹${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
  if (value < 100 && value > 0) return value.toFixed(1);
  return value.toLocaleString();
}

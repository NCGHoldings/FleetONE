import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Grid3X3, 
  Crown, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Award
} from 'lucide-react';
import { COMPARISON_COLORS } from '@/lib/comparison-colors';

interface ComparisonEntity {
  id: string;
  name: string;
  income: number;
  expenses: number;
  netProfit: number;
  trips: number;
  efficiency: number;
}

interface MultiComparisonMatrixProps {
  entities: ComparisonEntity[];
}

const ENTITY_COLORS = [
  COMPARISON_COLORS.entity1.primary,
  COMPARISON_COLORS.entity2.primary,
  '#10b981',
  '#f59e0b',
  '#ef4444',
];

const METRICS = [
  { key: 'income', label: 'Income', format: (v: number) => `Rs ${((v ?? 0)/1000).toFixed(0)}k`, higherIsBetter: true },
  { key: 'expenses', label: 'Expenses', format: (v: number) => `Rs ${((v ?? 0)/1000).toFixed(0)}k`, higherIsBetter: false },
  { key: 'netProfit', label: 'Net Profit', format: (v: number) => `Rs ${((v ?? 0)/1000).toFixed(0)}k`, higherIsBetter: true },
  { key: 'trips', label: 'Trips', format: (v: number) => (v ?? 0).toString(), higherIsBetter: true },
  { key: 'efficiency', label: 'Efficiency', format: (v: number) => `${(v ?? 0).toFixed(1)} km/L`, higherIsBetter: true },
];

export default function MultiComparisonMatrix({
  entities
}: MultiComparisonMatrixProps) {
  // Calculate winners for each metric
  const metricWinners = useMemo(() => {
    const winners: Record<string, string> = {};
    
    METRICS.forEach(metric => {
      const sorted = [...entities].sort((a, b) => {
        const aVal = a[metric.key as keyof ComparisonEntity] as number;
        const bVal = b[metric.key as keyof ComparisonEntity] as number;
        return metric.higherIsBetter ? bVal - aVal : aVal - bVal;
      });
      
      if (sorted.length > 0) {
        winners[metric.key] = sorted[0].id;
      }
    });
    
    return winners;
  }, [entities]);

  // Count wins per entity
  const winCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    entities.forEach(e => { counts[e.id] = 0; });
    
    Object.values(metricWinners).forEach(winnerId => {
      if (counts[winnerId] !== undefined) {
        counts[winnerId]++;
      }
    });
    
    return counts;
  }, [entities, metricWinners]);

  // Overall winner
  const overallWinner = useMemo(() => {
    let maxWins = 0;
    let winner = '';
    
    Object.entries(winCounts).forEach(([id, count]) => {
      if (count > maxWins) {
        maxWins = count;
        winner = id;
      }
    });
    
    return winner;
  }, [winCounts]);

  const getRelativePerformance = (entityId: string, metricKey: string) => {
    const metric = METRICS.find(m => m.key === metricKey);
    if (!metric || entities.length < 2) return 'neutral';
    
    const values = entities.map(e => e[metricKey as keyof ComparisonEntity] as number);
    const entityValue = entities.find(e => e.id === entityId)?.[metricKey as keyof ComparisonEntity] as number;
    
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min;
    
    if (range === 0) return 'neutral';
    
    const position = (entityValue - min) / range;
    
    if (metric.higherIsBetter) {
      if (position >= 0.7) return 'top';
      if (position <= 0.3) return 'bottom';
      return 'neutral';
    } else {
      if (position <= 0.3) return 'top';
      if (position >= 0.7) return 'bottom';
      return 'neutral';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-blue-500" />
              Comparison Matrix
            </CardTitle>
            {overallWinner && (
              <Badge className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-0">
                <Crown className="h-3 w-3 mr-1" />
                {entities.find(e => e.id === overallWinner)?.name} leads with {winCounts[overallWinner]} wins
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                    Metric
                  </th>
                  {entities.map((entity, index) => (
                    <th 
                      key={entity.id} 
                      className="py-3 px-4 text-center"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span 
                          className="font-semibold"
                          style={{ color: ENTITY_COLORS[index] }}
                        >
                          {entity.name}
                        </span>
                        {entity.id === overallWinner && (
                          <Crown className="h-4 w-4 text-amber-500" />
                        )}
                        <Badge variant="outline" className="text-xs">
                          {winCounts[entity.id]} wins
                        </Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((metric, metricIndex) => (
                  <motion.tr
                    key={metric.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: metricIndex * 0.05 }}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{metric.label}</span>
                        {metric.higherIsBetter ? (
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-rose-500" />
                        )}
                      </div>
                    </td>
                    {entities.map((entity, entityIndex) => {
                      const value = entity[metric.key as keyof ComparisonEntity] as number;
                      const isWinner = metricWinners[metric.key] === entity.id;
                      const performance = getRelativePerformance(entity.id, metric.key);
                      
                      return (
                        <td 
                          key={entity.id} 
                          className="py-4 px-4 text-center"
                        >
                          <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: metricIndex * 0.05 + entityIndex * 0.02 }}
                            className={`inline-flex flex-col items-center gap-1 p-2 rounded-lg ${
                              isWinner 
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/50' 
                                : performance === 'top'
                                  ? 'bg-blue-50 dark:bg-blue-950/20'
                                  : performance === 'bottom'
                                    ? 'bg-rose-50 dark:bg-rose-950/20'
                                    : ''
                            }`}
                          >
                            <span className={`font-semibold ${
                              isWinner 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : performance === 'bottom'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : ''
                            }`}>
                              {metric.format(value)}
                            </span>
                            {isWinner && (
                              <Award className="h-4 w-4 text-emerald-500" />
                            )}
                          </motion.div>
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/30 ring-2 ring-emerald-500/50" />
              <span className="text-muted-foreground">Best in metric</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-muted-foreground">Higher is better</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <TrendingDown className="h-4 w-4 text-rose-500" />
              <span className="text-muted-foreground">Lower is better</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { COMPARISON_COLORS } from '@/lib/comparison-colors';
import { HistoricalDataPoint } from '@/hooks/useComparisonAnalytics';

interface ComparisonSparklineCardProps {
  title: string;
  entities: Array<{ id: string; name: string }>;
  getValue: (entity: any) => number;
  historicalData: Record<string, HistoricalDataPoint[]>;
  getHistoricalValue: (point: HistoricalDataPoint) => number;
  format: (value: number) => string;
  higherIsBetter?: boolean;
  icon?: React.ReactNode;
}

const ENTITY_COLORS = [
  COMPARISON_COLORS.entity1.primary,
  COMPARISON_COLORS.entity2.primary,
  '#10b981',
  '#f59e0b',
  '#ef4444',
];

export default function ComparisonSparklineCard({
  title,
  entities,
  getValue,
  historicalData,
  getHistoricalValue,
  format,
  higherIsBetter = true,
  icon
}: ComparisonSparklineCardProps) {
  // Determine winner
  const sortedEntities = useMemo(() => {
    return [...entities].sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      return higherIsBetter ? bVal - aVal : aVal - bVal;
    });
  }, [entities, getValue, higherIsBetter]);

  const winner = sortedEntities[0];

  // Prepare sparkline data for each entity
  const sparklineData = useMemo(() => {
    const data: Record<string, Array<{ value: number }>> = {};
    
    entities.forEach(entity => {
      const history = historicalData[entity.id] || [];
      data[entity.id] = history.slice(-7).map(point => ({
        value: getHistoricalValue(point)
      }));
    });
    
    return data;
  }, [entities, historicalData, getHistoricalValue]);

  // Calculate trend for each entity
  const trends = useMemo(() => {
    const result: Record<string, { direction: 'up' | 'down' | 'stable'; percent: number }> = {};
    
    entities.forEach(entity => {
      const history = historicalData[entity.id] || [];
      if (history.length < 2) {
        result[entity.id] = { direction: 'stable', percent: 0 };
        return;
      }
      
      const recent = history.slice(-7);
      const older = history.slice(-14, -7);
      
      const recentAvg = recent.reduce((s, d) => s + getHistoricalValue(d), 0) / recent.length;
      const olderAvg = older.length > 0 
        ? older.reduce((s, d) => s + getHistoricalValue(d), 0) / older.length 
        : recentAvg;
      
      const percentChange = olderAvg !== 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
      
      result[entity.id] = {
        direction: percentChange > 2 ? 'up' : percentChange < -2 ? 'down' : 'stable',
        percent: Math.round(Math.abs(percentChange) * 10) / 10
      };
    });
    
    return result;
  }, [entities, historicalData, getHistoricalValue]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              {icon}
              <span className="text-sm font-medium">{title}</span>
            </div>
            {winner && (
              <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 text-xs">
                <Award className="h-3 w-3 mr-1" />
                {winner.name}
              </Badge>
            )}
          </div>

          {/* Entity Values */}
          <div className="space-y-3">
            {entities.map((entity, index) => {
              const value = getValue(entity);
              const trend = trends[entity.id];
              const isWinner = entity.id === winner?.id;
              const sparkData = sparklineData[entity.id] || [];
              
              return (
                <div
                  key={entity.id}
                  className={`p-3 rounded-lg ${
                    isWinner 
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30' 
                      : 'bg-slate-50 dark:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span 
                      className="text-sm font-medium"
                      style={{ color: ENTITY_COLORS[index] }}
                    >
                      {entity.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {trend && (
                        <>
                          {trend.direction === 'up' ? (
                            <TrendingUp className={`h-3 w-3 ${higherIsBetter ? 'text-emerald-500' : 'text-rose-500'}`} />
                          ) : trend.direction === 'down' ? (
                            <TrendingDown className={`h-3 w-3 ${higherIsBetter ? 'text-rose-500' : 'text-emerald-500'}`} />
                          ) : (
                            <Minus className="h-3 w-3 text-slate-400" />
                          )}
                          <span className={`text-xs ${
                            trend.direction === 'up' 
                              ? higherIsBetter ? 'text-emerald-600' : 'text-rose-600'
                              : trend.direction === 'down'
                                ? higherIsBetter ? 'text-rose-600' : 'text-emerald-600'
                                : 'text-slate-500'
                          }`}>
                            {trend.percent}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between gap-2">
                    <span className={`text-xl font-bold ${isWinner ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                      {format(value)}
                    </span>
                    
                    {/* Sparkline */}
                    {sparkData.length > 0 && (
                      <div className="w-20 h-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sparkData}>
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke={ENTITY_COLORS[index]}
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

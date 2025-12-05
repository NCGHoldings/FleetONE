import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { COMPARISON_COLORS } from '@/lib/comparison-colors';
import { HistoricalDataPoint, GrowthMetrics } from '@/hooks/useComparisonAnalytics';

interface HistoricalTrendPanelProps {
  entities: Array<{ id: string; name: string }>;
  historicalData: Record<string, HistoricalDataPoint[]>;
  growthMetrics: Record<string, GrowthMetrics>;
  selectedPeriod: 7 | 14 | 30;
  onPeriodChange: (period: 7 | 14 | 30) => void;
}

const ENTITY_COLORS = [
  COMPARISON_COLORS.entity1.primary,
  COMPARISON_COLORS.entity2.primary,
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // rose
];

export default function HistoricalTrendPanel({
  entities,
  historicalData,
  growthMetrics,
  selectedPeriod,
  onPeriodChange
}: HistoricalTrendPanelProps) {
  // Prepare chart data
  const chartData = useMemo(() => {
    if (entities.length === 0) return [];
    
    const dataMap = new Map<string, any>();
    
    entities.forEach((entity, entityIndex) => {
      const history = historicalData[entity.id] || [];
      const recentHistory = history.slice(-selectedPeriod);
      
      recentHistory.forEach(point => {
        if (!dataMap.has(point.date)) {
          dataMap.set(point.date, { date: point.date });
        }
        const entry = dataMap.get(point.date);
        entry[`income_${entityIndex}`] = point.income;
        entry[`profit_${entityIndex}`] = point.profit;
        entry[`trips_${entityIndex}`] = point.trips;
      });
    });
    
    return Array.from(dataMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [entities, historicalData, selectedPeriod]);

  const formatCurrency = (value: number) => `₹${(value / 1000).toFixed(0)}k`;
  const formatDate = (date: string) => format(new Date(date), 'MMM dd');

  const getMomentumIcon = (momentum: string) => {
    switch (momentum) {
      case 'accelerating':
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'decelerating':
        return <TrendingDown className="h-4 w-4 text-rose-500" />;
      default:
        return <Minus className="h-4 w-4 text-slate-500" />;
    }
  };

  const getMomentumBadge = (momentum: string) => {
    switch (momentum) {
      case 'accelerating':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
      case 'decelerating':
        return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Historical Performance
            </CardTitle>
            <div className="flex gap-2">
              {[7, 14, 30].map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPeriodChange(period as 7 | 14 | 30)}
                  className={selectedPeriod === period 
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0" 
                    : ""}
                >
                  {period}D
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Growth Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entities.map((entity, index) => {
              const growth = growthMetrics[entity.id];
              if (!growth) return null;
              
              return (
                <motion.div
                  key={entity.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-lg border-2"
                  style={{ 
                    borderColor: ENTITY_COLORS[index] + '40',
                    background: `linear-gradient(135deg, ${ENTITY_COLORS[index]}10, ${ENTITY_COLORS[index]}05)`
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold" style={{ color: ENTITY_COLORS[index] }}>
                      {entity.name}
                    </span>
                    <Badge className={getMomentumBadge(growth.momentum)}>
                      {getMomentumIcon(growth.momentum)}
                      <span className="ml-1 capitalize">{growth.momentum}</span>
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Income Growth</div>
                      <div className={`font-semibold ${
                        growth.incomeGrowthRate > 0 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : growth.incomeGrowthRate < 0 
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {growth.incomeGrowthRate > 0 ? '+' : ''}{growth.incomeGrowthRate}%
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Profit Growth</div>
                      <div className={`font-semibold ${
                        growth.profitGrowthRate > 0 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : growth.profitGrowthRate < 0 
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {growth.profitGrowthRate > 0 ? '+' : ''}{growth.profitGrowthRate}%
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Trip Growth</div>
                      <div className={`font-semibold ${
                        growth.tripsGrowthRate > 0 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : growth.tripsGrowthRate < 0 
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {growth.tripsGrowthRate > 0 ? '+' : ''}{growth.tripsGrowthRate}%
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Efficiency</div>
                      <div className={`font-semibold ${
                        growth.efficiencyTrend > 0 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : growth.efficiencyTrend < 0 
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {growth.efficiencyTrend > 0 ? '+' : ''}{growth.efficiencyTrend}%
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Income Trend Chart */}
          <div>
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">Income Trend</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    {entities.map((_, index) => (
                      <linearGradient key={index} id={`incomeGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={ENTITY_COLORS[index]} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={ENTITY_COLORS[index]} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    stroke="#94a3b8"
                    fontSize={12}
                  />
                  <YAxis 
                    tickFormatter={formatCurrency}
                    stroke="#94a3b8"
                    fontSize={12}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={formatDate}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0'
                    }}
                  />
                  <Legend />
                  {entities.map((entity, index) => (
                    <Area
                      key={entity.id}
                      type="monotone"
                      dataKey={`income_${index}`}
                      name={entity.name}
                      stroke={ENTITY_COLORS[index]}
                      strokeWidth={2}
                      fill={`url(#incomeGradient${index})`}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Profit Trend Chart */}
          <div>
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">Profit Trend</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    stroke="#94a3b8"
                    fontSize={12}
                  />
                  <YAxis 
                    tickFormatter={formatCurrency}
                    stroke="#94a3b8"
                    fontSize={12}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={formatDate}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0'
                    }}
                  />
                  <Legend />
                  {entities.map((entity, index) => (
                    <Line
                      key={entity.id}
                      type="monotone"
                      dataKey={`profit_${index}`}
                      name={entity.name}
                      stroke={ENTITY_COLORS[index]}
                      strokeWidth={3}
                      dot={{ fill: ENTITY_COLORS[index], strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

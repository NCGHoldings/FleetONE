import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  ComposedChart
} from 'recharts';
import { Sparkles, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { COMPARISON_COLORS } from '@/lib/comparison-colors';
import { PredictionResult } from '@/hooks/useComparisonAnalytics';

interface PredictiveForecastPanelProps {
  entities: Array<{ id: string; name: string; income: number; netProfit: number }>;
  predictions: Record<string, PredictionResult[]>;
}

const ENTITY_COLORS = [
  COMPARISON_COLORS.entity1.primary,
  COMPARISON_COLORS.entity2.primary,
  '#10b981',
  '#f59e0b',
  '#ef4444',
];

export default function PredictiveForecastPanel({
  entities,
  predictions
}: PredictiveForecastPanelProps) {
  // Prepare forecast chart data
  const forecastData = useMemo(() => {
    if (entities.length === 0) return [];
    
    const dataMap = new Map<string, any>();
    
    entities.forEach((entity, entityIndex) => {
      const forecast = predictions[entity.id] || [];
      
      forecast.forEach(point => {
        if (!dataMap.has(point.date)) {
          dataMap.set(point.date, { date: point.date });
        }
        const entry = dataMap.get(point.date);
        entry[`predicted_${entityIndex}`] = point.predictedIncome;
        entry[`upper_${entityIndex}`] = point.confidenceUpper;
        entry[`lower_${entityIndex}`] = point.confidenceLower;
        entry[`profit_${entityIndex}`] = point.predictedProfit;
      });
    });
    
    return Array.from(dataMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [entities, predictions]);

  // Calculate projected totals
  const projectedTotals = useMemo(() => {
    const totals: Record<string, { income: number; profit: number; trips: number }> = {};
    
    entities.forEach(entity => {
      const forecast = predictions[entity.id] || [];
      totals[entity.id] = {
        income: forecast.reduce((sum, p) => sum + p.predictedIncome, 0),
        profit: forecast.reduce((sum, p) => sum + p.predictedProfit, 0),
        trips: forecast.reduce((sum, p) => sum + p.predictedTrips, 0)
      };
    });
    
    return totals;
  }, [entities, predictions]);

  const formatCurrency = (value: number) => `₹${(value / 1000).toFixed(0)}k`;
  const formatDate = (date: string) => format(new Date(date), 'MMM dd');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            14-Day Forecast
            <Badge className="ml-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-300">
              AI Prediction
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Projected Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entities.map((entity, index) => {
              const projected = projectedTotals[entity.id];
              if (!projected) return null;
              
              const currentMonthlyIncome = entity.income;
              const projectedChange = currentMonthlyIncome > 0 
                ? ((projected.income - currentMonthlyIncome / 2) / (currentMonthlyIncome / 2)) * 100 
                : 0;
              
              return (
                <motion.div
                  key={entity.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative p-4 rounded-lg border-2 overflow-hidden"
                  style={{ 
                    borderColor: ENTITY_COLORS[index] + '40',
                  }}
                >
                  <div 
                    className="absolute inset-0 opacity-5"
                    style={{ background: `linear-gradient(135deg, ${ENTITY_COLORS[index]}, transparent)` }}
                  />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold" style={{ color: ENTITY_COLORS[index] }}>
                        {entity.name}
                      </span>
                      <Badge className={`${
                        projectedChange > 0 
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                          : projectedChange < 0 
                            ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                      }`}>
                        {projectedChange > 0 ? '+' : ''}{projectedChange.toFixed(1)}%
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Projected Income</span>
                        <span className="font-bold text-lg">₹{projected.income.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Projected Profit</span>
                        <span className={`font-semibold ${
                          projected.profit > 0 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          ₹{projected.profit.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Projected Trips</span>
                        <span className="font-semibold">{projected.trips}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Forecast Comparison Note */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-400">
              <strong>Forecast Note:</strong> Predictions are based on linear regression of the last 14 days. 
              Confidence intervals widen for longer forecasts. Actual results may vary.
            </div>
          </div>

          {/* Income Forecast Chart with Confidence Intervals */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Income Forecast with Confidence Bands
            </h4>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecastData}>
                  <defs>
                    {entities.map((_, index) => (
                      <linearGradient key={index} id={`forecastGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={ENTITY_COLORS[index]} stopOpacity={0.2}/>
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
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name.includes('predicted') ? 'Forecast' : 
                      name.includes('upper') ? 'Upper Bound' : 'Lower Bound'
                    ]}
                    labelFormatter={formatDate}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0'
                    }}
                  />
                  <Legend />
                  {entities.map((entity, index) => (
                    <React.Fragment key={entity.id}>
                      <Area
                        type="monotone"
                        dataKey={`upper_${index}`}
                        name={`${entity.name} (Upper)`}
                        stroke="none"
                        fill={`url(#forecastGradient${index})`}
                        strokeWidth={0}
                      />
                      <Line
                        type="monotone"
                        dataKey={`predicted_${index}`}
                        name={`${entity.name} Forecast`}
                        stroke={ENTITY_COLORS[index]}
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        dot={{ fill: ENTITY_COLORS[index], strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </React.Fragment>
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* What-If Scenarios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Optimistic</span>
              </div>
              <p className="text-sm text-emerald-600 dark:text-emerald-500">
                If trends continue upward, expect +15-20% higher results than forecast
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <span className="font-semibold text-blue-700 dark:text-blue-400">Baseline</span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-500">
                Forecast assumes current operational patterns continue unchanged
              </p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <span className="font-semibold text-amber-700 dark:text-amber-400">Conservative</span>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-500">
                Account for seasonality and unexpected disruptions with -10% buffer
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

import React from 'react';

import { useMemo } from 'react';
import { subDays, format, addDays, differenceInDays } from 'date-fns';

export interface ComparisonEntity {
  id: string;
  name: string;
  income: number;
  expenses: number;
  netProfit: number;
  trips: number;
  efficiency: number;
}

export interface HistoricalDataPoint {
  date: string;
  income: number;
  expenses: number;
  profit: number;
  trips: number;
  efficiency: number;
}

export interface PredictionResult {
  date: string;
  predictedIncome: number;
  predictedProfit: number;
  predictedTrips: number;
  confidenceUpper: number;
  confidenceLower: number;
}

export interface GrowthMetrics {
  incomeGrowthRate: number;
  profitGrowthRate: number;
  tripsGrowthRate: number;
  efficiencyTrend: number;
  momentum: 'accelerating' | 'stable' | 'decelerating';
}

export interface FocusArea {
  priority: 'critical' | 'high' | 'medium' | 'low';
  area: string;
  currentValue: number;
  targetValue: number;
  gap: number;
  impact: string;
  recommendation: string;
}

export interface ActionItem {
  action: string;
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
  priority: number;
  timeframe: string;
  metric: string;
  potentialGain: number;
}

export interface ComparisonInsight {
  type: 'strength' | 'weakness' | 'opportunity' | 'threat';
  entity: string;
  metric: string;
  message: string;
  value: number;
  comparison?: number;
  percentDiff?: number;
}

export function useComparisonAnalytics(
  entities: ComparisonEntity[],
  historicalData?: Record<string, HistoricalDataPoint[]>
) {
  // Generate simulated historical data based on current metrics
  const generateHistoricalData = useMemo(() => {
    const data: Record<string, HistoricalDataPoint[]> = {};
    
    entities.forEach(entity => {
      const history: HistoricalDataPoint[] = [];
      const avgDaily = {
        income: entity.income / 30,
        expenses: entity.expenses / 30,
        profit: entity.netProfit / 30,
        trips: Math.max(1, entity.trips / 30),
        efficiency: entity.efficiency
      };
      
      for (let i = 30; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        const variance = 0.85 + Math.random() * 0.3; // 85% to 115%
        const trend = 1 + ((30 - i) / 300); // Slight upward trend
        
        history.push({
          date,
          income: Math.round(avgDaily.income * variance * trend),
          expenses: Math.round(avgDaily.expenses * variance),
          profit: Math.round(avgDaily.profit * variance * trend),
          trips: Math.max(1, Math.round(avgDaily.trips * variance)),
          efficiency: Math.round((avgDaily.efficiency * (0.95 + Math.random() * 0.1)) * 10) / 10
        });
      }
      
      data[entity.id] = history;
    });
    
    return data;
  }, [entities]);

  const historical = historicalData || generateHistoricalData;

  // Calculate growth metrics for each entity
  const growthMetrics = useMemo(() => {
    const metrics: Record<string, GrowthMetrics> = {};
    
    entities.forEach(entity => {
      const history = historical[entity.id] || [];
      if (history.length < 7) {
        metrics[entity.id] = {
          incomeGrowthRate: 0,
          profitGrowthRate: 0,
          tripsGrowthRate: 0,
          efficiencyTrend: 0,
          momentum: 'stable'
        };
        return;
      }
      
      const recent = history.slice(-7);
      const previous = history.slice(-14, -7);
      
      const recentAvgIncome = recent.reduce((s, d) => s + d.income, 0) / recent.length;
      const prevAvgIncome = previous.reduce((s, d) => s + d.income, 0) / previous.length;
      const recentAvgProfit = recent.reduce((s, d) => s + d.profit, 0) / recent.length;
      const prevAvgProfit = previous.reduce((s, d) => s + d.profit, 0) / previous.length;
      const recentAvgTrips = recent.reduce((s, d) => s + d.trips, 0) / recent.length;
      const prevAvgTrips = previous.reduce((s, d) => s + d.trips, 0) / previous.length;
      const recentAvgEfficiency = recent.reduce((s, d) => s + d.efficiency, 0) / recent.length;
      const prevAvgEfficiency = previous.reduce((s, d) => s + d.efficiency, 0) / previous.length;
      
      const incomeGrowth = prevAvgIncome > 0 ? ((recentAvgIncome - prevAvgIncome) / prevAvgIncome) * 100 : 0;
      const profitGrowth = prevAvgProfit > 0 ? ((recentAvgProfit - prevAvgProfit) / prevAvgProfit) * 100 : 0;
      const tripsGrowth = prevAvgTrips > 0 ? ((recentAvgTrips - prevAvgTrips) / prevAvgTrips) * 100 : 0;
      const effTrend = prevAvgEfficiency > 0 ? ((recentAvgEfficiency - prevAvgEfficiency) / prevAvgEfficiency) * 100 : 0;
      
      let momentum: 'accelerating' | 'stable' | 'decelerating' = 'stable';
      if (incomeGrowth > 5 && profitGrowth > 5) momentum = 'accelerating';
      else if (incomeGrowth < -5 || profitGrowth < -5) momentum = 'decelerating';
      
      metrics[entity.id] = {
        incomeGrowthRate: Math.round(incomeGrowth * 10) / 10,
        profitGrowthRate: Math.round(profitGrowth * 10) / 10,
        tripsGrowthRate: Math.round(tripsGrowth * 10) / 10,
        efficiencyTrend: Math.round(effTrend * 10) / 10,
        momentum
      };
    });
    
    return metrics;
  }, [entities, historical]);

  // Generate predictions using simple linear regression
  const predictions = useMemo(() => {
    const result: Record<string, PredictionResult[]> = {};
    
    entities.forEach(entity => {
      const history = historical[entity.id] || [];
      if (history.length < 7) {
        result[entity.id] = [];
        return;
      }
      
      // Calculate trend slope using last 14 days
      const recent = history.slice(-14);
      const n = recent.length;
      
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      let sumYProfit = 0, sumXYProfit = 0;
      let sumYTrips = 0, sumXYTrips = 0;
      
      recent.forEach((d, i) => {
        sumX += i;
        sumY += d.income;
        sumYProfit += d.profit;
        sumYTrips += d.trips;
        sumXY += i * d.income;
        sumXYProfit += i * d.profit;
        sumXYTrips += i * d.trips;
        sumX2 += i * i;
      });
      
      const denominator = n * sumX2 - sumX * sumX;
      const slopeIncome = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
      const slopeProfit = denominator !== 0 ? (n * sumXYProfit - sumX * sumYProfit) / denominator : 0;
      const slopeTrips = denominator !== 0 ? (n * sumXYTrips - sumX * sumYTrips) / denominator : 0;
      
      const interceptIncome = (sumY - slopeIncome * sumX) / n;
      const interceptProfit = (sumYProfit - slopeProfit * sumX) / n;
      const interceptTrips = (sumYTrips - slopeTrips * sumX) / n;
      
      const predictions: PredictionResult[] = [];
      const variance = entity.income * 0.1; // 10% variance for confidence interval
      
      for (let i = 1; i <= 14; i++) {
        const futureX = n + i - 1;
        const predictedIncome = Math.max(0, interceptIncome + slopeIncome * futureX);
        const predictedProfit = interceptProfit + slopeProfit * futureX;
        const predictedTrips = Math.max(0, Math.round(interceptTrips + slopeTrips * futureX));
        
        predictions.push({
          date: format(addDays(new Date(), i), 'yyyy-MM-dd'),
          predictedIncome: Math.round(predictedIncome),
          predictedProfit: Math.round(predictedProfit),
          predictedTrips,
          confidenceUpper: Math.round(predictedIncome + variance * (1 + i * 0.05)),
          confidenceLower: Math.round(Math.max(0, predictedIncome - variance * (1 + i * 0.05)))
        });
      }
      
      result[entity.id] = predictions;
    });
    
    return result;
  }, [entities, historical]);

  // Generate instant insights when entities are compared
  const generateInsights = useMemo(() => {
    if (entities.length < 2) return [];
    
    const insights: ComparisonInsight[] = [];
    
    // Find best and worst performers for each metric
    const metrics = ['income', 'expenses', 'netProfit', 'trips', 'efficiency'] as const;
    
    metrics.forEach(metric => {
      const sorted = [...entities].sort((a, b) => {
        if (metric === 'expenses') return a[metric] - b[metric]; // Lower is better
        return b[metric] - a[metric]; // Higher is better
      });
      
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      
      if (best && worst && best.id !== worst.id) {
        const percentDiff = worst[metric] !== 0 
          ? ((best[metric] - worst[metric]) / worst[metric]) * 100 
          : 100;
        
        insights.push({
          type: 'strength',
          entity: best.name,
          metric,
          message: `Leading in ${metric} with ${formatMetricValue(metric, best[metric])}`,
          value: best[metric],
          comparison: worst[metric],
          percentDiff: Math.round(percentDiff * 10) / 10
        });
        
        if (entities.length > 1 && Math.abs(percentDiff) > 10) {
          insights.push({
            type: 'weakness',
            entity: worst.name,
            metric,
            message: `${Math.abs(percentDiff).toFixed(0)}% behind leader in ${metric}`,
            value: worst[metric],
            comparison: best[metric],
            percentDiff: -Math.round(percentDiff * 10) / 10
          });
        }
      }
    });
    
    // Growth opportunities
    entities.forEach(entity => {
      const growth = growthMetrics[entity.id];
      if (growth) {
        if (growth.momentum === 'accelerating') {
          insights.push({
            type: 'opportunity',
            entity: entity.name,
            metric: 'growth',
            message: `Strong momentum with ${growth.incomeGrowthRate}% income growth`,
            value: growth.incomeGrowthRate
          });
        } else if (growth.momentum === 'decelerating') {
          insights.push({
            type: 'threat',
            entity: entity.name,
            metric: 'growth',
            message: `Declining performance with ${growth.incomeGrowthRate}% income change`,
            value: growth.incomeGrowthRate
          });
        }
      }
    });
    
    return insights;
  }, [entities, growthMetrics]);

  // Generate focus areas and recommendations
  const focusAreas = useMemo(() => {
    if (entities.length < 2) return [];
    
    const areas: FocusArea[] = [];
    const leader = [...entities].sort((a, b) => b.netProfit - a.netProfit)[0];
    
    entities.forEach(entity => {
      if (entity.id === leader?.id) return;
      
      // Profit gap
      const profitGap = leader.netProfit - entity.netProfit;
      if (profitGap > 0) {
        areas.push({
          priority: profitGap > entity.netProfit * 0.5 ? 'critical' : profitGap > entity.netProfit * 0.2 ? 'high' : 'medium',
          area: `${entity.name} - Profitability`,
          currentValue: entity.netProfit,
          targetValue: leader.netProfit,
          gap: profitGap,
          impact: `₹${profitGap.toLocaleString()} potential gain`,
          recommendation: profitGap > entity.netProfit * 0.3 
            ? 'Focus on cost reduction and route optimization'
            : 'Fine-tune operations for incremental gains'
        });
      }
      
      // Efficiency gap
      const effGap = leader.efficiency - entity.efficiency;
      if (effGap > 0.5) {
        areas.push({
          priority: effGap > 2 ? 'high' : 'medium',
          area: `${entity.name} - Fuel Efficiency`,
          currentValue: entity.efficiency,
          targetValue: leader.efficiency,
          gap: effGap,
          impact: `${effGap.toFixed(1)} km/L improvement potential`,
          recommendation: 'Review driving patterns and vehicle maintenance'
        });
      }
      
      // Trip volume gap
      const tripGap = leader.trips - entity.trips;
      if (tripGap > entity.trips * 0.2) {
        areas.push({
          priority: tripGap > entity.trips * 0.5 ? 'high' : 'medium',
          area: `${entity.name} - Trip Volume`,
          currentValue: entity.trips,
          targetValue: leader.trips,
          gap: tripGap,
          impact: `${tripGap} additional trips possible`,
          recommendation: 'Analyze scheduling and availability'
        });
      }
    });
    
    return areas.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [entities]);

  // Generate action items
  const actionItems = useMemo(() => {
    const items: ActionItem[] = [];
    
    entities.forEach(entity => {
      const growth = growthMetrics[entity.id];
      
      // Cost optimization
      if (entity.expenses > entity.income * 0.7) {
        items.push({
          action: `Reduce ${entity.name} operating costs by 10%`,
          expectedImpact: `₹${Math.round(entity.expenses * 0.1).toLocaleString()} savings`,
          effort: 'medium',
          priority: 1,
          timeframe: '30 days',
          metric: 'expenses',
          potentialGain: entity.expenses * 0.1
        });
      }
      
      // Revenue growth
      if (growth && growth.incomeGrowthRate < 5) {
        items.push({
          action: `Increase ${entity.name} trip frequency`,
          expectedImpact: `${Math.round(entity.trips * 0.15)} additional trips/month`,
          effort: 'high',
          priority: 2,
          timeframe: '60 days',
          metric: 'trips',
          potentialGain: entity.income * 0.15
        });
      }
      
      // Efficiency improvement
      if (entity.efficiency < 8) {
        items.push({
          action: `Optimize ${entity.name} fuel efficiency`,
          expectedImpact: `${(10 - entity.efficiency).toFixed(1)} km/L improvement`,
          effort: 'low',
          priority: 3,
          timeframe: '14 days',
          metric: 'efficiency',
          potentialGain: (10 - entity.efficiency) * entity.trips * 5
        });
      }
    });
    
    return items.sort((a, b) => a.priority - b.priority);
  }, [entities, growthMetrics]);

  // Performance scores and grades
  const performanceScores = useMemo(() => {
    const scores: Record<string, { score: number; grade: string; breakdown: Record<string, number> }> = {};
    
    const maxIncome = Math.max(...entities.map(e => e.income), 1);
    const maxProfit = Math.max(...entities.map(e => e.netProfit), 1);
    const maxTrips = Math.max(...entities.map(e => e.trips), 1);
    const maxEfficiency = Math.max(...entities.map(e => e.efficiency), 1);
    const minExpenses = Math.min(...entities.map(e => e.expenses), 0);
    const maxExpenses = Math.max(...entities.map(e => e.expenses), 1);
    
    entities.forEach(entity => {
      const incomeScore = (entity.income / maxIncome) * 100;
      const profitScore = (entity.netProfit / maxProfit) * 100;
      const tripScore = (entity.trips / maxTrips) * 100;
      const efficiencyScore = (entity.efficiency / maxEfficiency) * 100;
      const costScore = maxExpenses > minExpenses 
        ? ((maxExpenses - entity.expenses) / (maxExpenses - minExpenses)) * 100 
        : 100;
      
      const totalScore = (incomeScore * 0.25 + profitScore * 0.30 + tripScore * 0.15 + 
                         efficiencyScore * 0.15 + costScore * 0.15);
      
      let grade = 'F';
      if (totalScore >= 90) grade = 'A+';
      else if (totalScore >= 85) grade = 'A';
      else if (totalScore >= 80) grade = 'A-';
      else if (totalScore >= 75) grade = 'B+';
      else if (totalScore >= 70) grade = 'B';
      else if (totalScore >= 65) grade = 'B-';
      else if (totalScore >= 60) grade = 'C+';
      else if (totalScore >= 55) grade = 'C';
      else if (totalScore >= 50) grade = 'C-';
      else if (totalScore >= 45) grade = 'D+';
      else if (totalScore >= 40) grade = 'D';
      else grade = 'F';
      
      scores[entity.id] = {
        score: Math.round(totalScore),
        grade,
        breakdown: {
          income: Math.round(incomeScore),
          profit: Math.round(profitScore),
          trips: Math.round(tripScore),
          efficiency: Math.round(efficiencyScore),
          costs: Math.round(costScore)
        }
      };
    });
    
    return scores;
  }, [entities]);

  return {
    historical,
    growthMetrics,
    predictions,
    insights: generateInsights,
    focusAreas,
    actionItems,
    performanceScores
  };
}

function formatMetricValue(metric: string, value: number): string {
  switch (metric) {
    case 'income':
    case 'expenses':
    case 'netProfit':
      return `₹${value.toLocaleString()}`;
    case 'efficiency':
      return `${value.toFixed(1)} km/L`;
    case 'trips':
      return `${value} trips`;
    default:
      return value.toString();
  }
}

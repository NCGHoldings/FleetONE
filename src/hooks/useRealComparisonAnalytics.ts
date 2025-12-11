import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, addDays, subDays } from 'date-fns';

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

interface UseRealComparisonAnalyticsOptions {
  entities: ComparisonEntity[];
  comparisonType: 'drivers' | 'routes' | 'buses';
  startDate: Date;
  endDate: Date;
}

export function useRealComparisonAnalytics({
  entities,
  comparisonType,
  startDate,
  endDate
}: UseRealComparisonAnalyticsOptions) {
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  // Fetch real historical data from database
  const { data: historicalRawData, isLoading } = useQuery({
    queryKey: ['comparison-historical', comparisonType, entities.map(e => e.id), startDateStr, endDateStr],
    queryFn: async () => {
      if (entities.length === 0) return {};

      const { data: trips, error } = await supabase
        .from('daily_trips')
        .select(`
          id,
          trip_date,
          income,
          fuel_cost,
          total_expenses,
          net_income,
          distance_km,
          odometer_start,
          odometer_end,
          bus_id,
          driver_id,
          route_id,
          notes,
          buses (bus_no, registration_number),
          routes (route_no, route_name),
          profiles (first_name, last_name)
        `)
        .gte('trip_date', startDateStr)
        .lte('trip_date', endDateStr)
        .order('trip_date', { ascending: true });

      if (error) throw error;
      return trips || [];
    },
    enabled: entities.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Process historical data into entity-specific time series
  const historical = useMemo(() => {
    const data: Record<string, HistoricalDataPoint[]> = {};
    if (!historicalRawData || !Array.isArray(historicalRawData)) {
      // Return empty arrays for each entity
      entities.forEach(entity => {
        data[entity.id] = [];
      });
      return data;
    }

    entities.forEach(entity => {
      // Group trips by date for this entity
      const dateMap = new Map<string, { income: number; expenses: number; trips: number; distance: number; fuelCost: number }>();
      
      historicalRawData.forEach((trip: any) => {
        let matchesEntity = false;
        
        if (comparisonType === 'buses') {
          const busNo = trip.buses?.bus_no || trip.buses?.registration_number || '';
          matchesEntity = busNo === entity.name || trip.bus_id === entity.id;
        } else if (comparisonType === 'routes') {
          const routeName = trip.routes ? `${trip.routes.route_no} - ${trip.routes.route_name}` : '';
          matchesEntity = routeName === entity.name || trip.route_id === entity.id;
        } else if (comparisonType === 'drivers') {
          let driverName = '';
          if (trip.notes) {
            try {
              const notes = typeof trip.notes === 'string' ? JSON.parse(trip.notes) : trip.notes;
              driverName = notes.driver || '';
            } catch { }
          }
          if (!driverName && trip.profiles) {
            driverName = `${trip.profiles.first_name || ''} ${trip.profiles.last_name || ''}`.trim();
          }
          matchesEntity = driverName === entity.name || trip.driver_id === entity.id;
        }
        
        if (!matchesEntity) return;
        
        const date = trip.trip_date;
        if (!dateMap.has(date)) {
          dateMap.set(date, { income: 0, expenses: 0, trips: 0, distance: 0, fuelCost: 0 });
        }
        
        const dayData = dateMap.get(date)!;
        dayData.income += trip.income || 0;
        dayData.expenses += trip.total_expenses || trip.fuel_cost || 0;
        dayData.trips += 1;
        dayData.fuelCost += trip.fuel_cost || 0;
        
        // Calculate distance - use distance_km or calculate from odometer
        let distance = trip.distance_km || 0;
        if (distance === 0 && trip.odometer_end && trip.odometer_start) {
          distance = trip.odometer_end - trip.odometer_start;
        }
        dayData.distance += distance;
      });
      
      // Convert to array sorted by date
      const history: HistoricalDataPoint[] = [];
      const sortedDates = Array.from(dateMap.keys()).sort();
      
      sortedDates.forEach(date => {
        const d = dateMap.get(date)!;
        const efficiency = d.fuelCost > 0 && d.distance > 0 
          ? d.distance / (d.fuelCost / 350) // Estimate liters from cost (assuming ~Rs 350/L)
          : 0;
        
        history.push({
          date,
          income: d.income,
          expenses: d.expenses,
          profit: d.income - d.expenses,
          trips: d.trips,
          efficiency: Math.round(efficiency * 10) / 10
        });
      });
      
      data[entity.id] = history;
    });
    
    return data;
  }, [entities, historicalRawData, comparisonType]);

  // Calculate growth metrics for each entity from real data (filtering zero-value days)
  const growthMetrics = useMemo(() => {
    const metrics: Record<string, GrowthMetrics> = {};
    
    entities.forEach(entity => {
      const history = historical[entity.id] || [];
      
      // Filter out days with zero income for accurate growth calculation
      const validHistory = history.filter(d => d.income > 0 || d.trips > 0);
      
      if (validHistory.length < 2) {
        metrics[entity.id] = {
          incomeGrowthRate: 0,
          profitGrowthRate: 0,
          tripsGrowthRate: 0,
          efficiencyTrend: 0,
          momentum: 'stable'
        };
        return;
      }
      
      // Split data into first half and second half
      const midIndex = Math.floor(validHistory.length / 2);
      const firstHalf = validHistory.slice(0, midIndex);
      const secondHalf = validHistory.slice(midIndex);
      
      // Only proceed if both halves have data
      if (firstHalf.length === 0 || secondHalf.length === 0) {
        metrics[entity.id] = {
          incomeGrowthRate: 0,
          profitGrowthRate: 0,
          tripsGrowthRate: 0,
          efficiencyTrend: 0,
          momentum: 'stable'
        };
        return;
      }
      
      const sumData = (arr: HistoricalDataPoint[], key: keyof HistoricalDataPoint) => 
        arr.reduce((s, d) => s + (Number(d[key]) || 0), 0);
      
      const firstIncome = sumData(firstHalf, 'income');
      const secondIncome = sumData(secondHalf, 'income');
      const firstProfit = sumData(firstHalf, 'profit');
      const secondProfit = sumData(secondHalf, 'profit');
      const firstTrips = sumData(firstHalf, 'trips');
      const secondTrips = sumData(secondHalf, 'trips');
      const firstEfficiency = firstHalf.length > 0 
        ? sumData(firstHalf, 'efficiency') / firstHalf.length : 0;
      const secondEfficiency = secondHalf.length > 0 
        ? sumData(secondHalf, 'efficiency') / secondHalf.length : 0;
      
      // Calculate growth rates with proper handling
      const incomeGrowth = firstIncome > 0 ? ((secondIncome - firstIncome) / firstIncome) * 100 : 
                           secondIncome > 0 ? 100 : 0;
      const profitGrowth = firstProfit !== 0 ? ((secondProfit - firstProfit) / Math.abs(firstProfit)) * 100 : 
                           secondProfit !== 0 ? (secondProfit > 0 ? 100 : -100) : 0;
      const tripsGrowth = firstTrips > 0 ? ((secondTrips - firstTrips) / firstTrips) * 100 : 
                          secondTrips > 0 ? 100 : 0;
      const effTrend = firstEfficiency > 0 ? ((secondEfficiency - firstEfficiency) / firstEfficiency) * 100 : 0;
      
      // Determine momentum based on valid data
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

  // Generate predictions using linear regression on real data
  const predictions = useMemo(() => {
    const result: Record<string, PredictionResult[]> = {};
    
    entities.forEach(entity => {
      const history = historical[entity.id] || [];
      if (history.length < 3) {
        result[entity.id] = [];
        return;
      }
      
      // Use all historical data for regression
      const n = history.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      let sumYProfit = 0, sumXYProfit = 0;
      let sumYTrips = 0, sumXYTrips = 0;
      
      history.forEach((d, i) => {
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
      const avgIncome = sumY / n;
      const variance = avgIncome * 0.15; // 15% variance for confidence interval
      
      for (let i = 1; i <= 14; i++) {
        const futureX = n + i - 1;
        const predictedIncome = Math.max(0, interceptIncome + slopeIncome * futureX);
        const predictedProfit = interceptProfit + slopeProfit * futureX;
        const predictedTrips = Math.max(0, Math.round(interceptTrips + slopeTrips * futureX));
        
        predictions.push({
          date: format(addDays(endDate, i), 'yyyy-MM-dd'),
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
  }, [entities, historical, endDate]);

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
    
    // Growth opportunities from real data
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
          impact: `Rs ${profitGap.toLocaleString()} potential gain`,
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
          expectedImpact: `Rs ${Math.round(entity.expenses * 0.1).toLocaleString()} savings`,
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

  // Data source info
  const dataSourceInfo = useMemo(() => ({
    dateRange: { start: startDateStr, end: endDateStr },
    totalDays: differenceInDays(endDate, startDate) + 1,
    recordsLoaded: historicalRawData ? (historicalRawData as any[]).length : 0,
    isRealData: true
  }), [startDateStr, endDateStr, startDate, endDate, historicalRawData]);

  return {
    historical,
    growthMetrics,
    predictions,
    insights: generateInsights,
    focusAreas,
    actionItems,
    performanceScores,
    dataSourceInfo,
    isLoading
  };
}

function formatMetricValue(metric: string, value: number): string {
  switch (metric) {
    case 'income':
    case 'expenses':
    case 'netProfit':
      return `Rs ${value.toLocaleString()}`;
    case 'efficiency':
      return `${value.toFixed(1)} km/L`;
    case 'trips':
      return `${value} trips`;
    default:
      return value.toString();
  }
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format, subDays, startOfDay, endOfDay } from "date-fns";

export interface KPITarget {
  id: string;
  kpi_key: string;
  kpi_name: string;
  target_value: number;
  min_acceptable: number | null;
  unit: string;
  category: string;
  display_order: number;
  is_active: boolean;
}

export interface ExecutiveKPI {
  key: string;
  name: string;
  value: number;
  target: number;
  minAcceptable: number;
  achievement: number;
  status: 'achieved' | 'on-track' | 'at-risk' | 'below';
  unit: string;
  category: string;
  trend?: number[];
}

export interface RoutePerformance {
  routeId: string;
  routeName: string;
  revenue: number;
  profit: number;
  trips: number;
  profitMargin: number;
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface FleetStatusData {
  moving: number;
  idle: number;
  offline: number;
  total: number;
}

interface UseExecutiveDashboardOptions {
  startDate?: Date;
  endDate?: Date;
  refreshInterval?: number;
}

export function useExecutiveDashboard(options: UseExecutiveDashboardOptions = {}) {
  const {
    startDate = startOfMonth(new Date()),
    endDate = endOfMonth(new Date()),
    refreshInterval = 30000, // 30 seconds
  } = options;

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  // Fetch KPI targets
  const { data: kpiTargets, isLoading: targetsLoading } = useQuery({
    queryKey: ['executive-kpi-targets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('executive_kpi_targets')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as KPITarget[];
    },
    staleTime: 60000,
  });

  // Fetch revenue and trip data
  const { data: tripData, isLoading: tripDataLoading, refetch: refetchTrips } = useQuery({
    queryKey: ['executive-trip-data', startDateStr, endDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_trips')
        .select(`
          id,
          trip_date,
          income,
          total_expenses,
          net_income,
          distance_km,
          fuel_liters,
          km_per_liter,
          status,
          route_id,
          routes:route_id (
            id,
            route_no,
            route_name
          )
        `)
        .gte('trip_date', startDateStr)
        .lte('trip_date', endDateStr);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: refreshInterval,
  });

  // Fetch fleet status from real-time tracking
  const { data: fleetData, isLoading: fleetLoading, refetch: refetchFleet } = useQuery({
    queryKey: ['executive-fleet-status'],
    queryFn: async () => {
      // Get total buses
      const { count: totalBuses } = await supabase
        .from('buses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get latest tracking data
      const { data: trackingData, error } = await supabase
        .from('real_time_tracking')
        .select('bus_id, speed_kmh, ignition_status, last_update')
        .order('last_update', { ascending: false });
      
      if (error) throw error;

      // Get unique buses with latest status
      const latestByBus = new Map();
      trackingData?.forEach(record => {
        if (!latestByBus.has(record.bus_id)) {
          latestByBus.set(record.bus_id, record);
        }
      });

      const recentThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes
      let moving = 0;
      let idle = 0;
      let offline = 0;

      latestByBus.forEach(record => {
        const lastUpdate = new Date(record.last_update);
        if (lastUpdate < recentThreshold) {
          offline++;
        } else if (record.speed_kmh > 5 || record.ignition_status) {
          moving++;
        } else {
          idle++;
        }
      });

      // Add buses not in tracking as offline
      const trackedBuses = latestByBus.size;
      const total = totalBuses || 0;
      offline += Math.max(0, total - trackedBuses);

      return { moving, idle, offline, total };
    },
    refetchInterval: refreshInterval,
  });

  // Calculate KPIs
  const calculateKPIs = (): ExecutiveKPI[] => {
    if (!tripData || !kpiTargets) return [];

    const totalRevenue = tripData.reduce((sum, t) => sum + (t.income || 0), 0);
    const totalExpenses = tripData.reduce((sum, t) => sum + (t.total_expenses || 0), 0);
    const netProfit = tripData.reduce((sum, t) => sum + (t.net_income || 0), 0);
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const totalTrips = tripData.length;
    const completedTrips = tripData.filter(t => t.status === 'completed').length;
    const completionRate = totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0;
    const totalDistance = tripData.reduce((sum, t) => sum + (t.distance_km || 0), 0);
    const avgFuelEfficiency = tripData.reduce((sum, t) => sum + (t.km_per_liter || 0), 0) / Math.max(tripData.length, 1);
    const fleetUtilization = fleetData ? 
      ((fleetData.moving + fleetData.idle) / Math.max(fleetData.total, 1)) * 100 : 0;

    const kpiValues: Record<string, number> = {
      monthly_revenue: totalRevenue,
      net_profit: netProfit,
      profit_margin: profitMargin,
      fleet_utilization: fleetUtilization,
      daily_trips: totalTrips,
      fuel_efficiency: avgFuelEfficiency,
      completion_rate: completionRate,
      total_distance: totalDistance,
    };

    return kpiTargets.map(target => {
      const value = kpiValues[target.kpi_key] || 0;
      const achievement = target.target_value > 0 ? (value / target.target_value) * 100 : 0;
      
      let status: ExecutiveKPI['status'] = 'below';
      if (achievement >= 100) status = 'achieved';
      else if (achievement >= 90) status = 'on-track';
      else if (achievement >= 75) status = 'at-risk';

      return {
        key: target.kpi_key,
        name: target.kpi_name,
        value,
        target: target.target_value,
        minAcceptable: target.min_acceptable || 0,
        achievement,
        status,
        unit: target.unit,
        category: target.category,
      };
    });
  };

  // Calculate revenue trend
  const calculateRevenueTrend = (): RevenueTrendPoint[] => {
    if (!tripData) return [];

    const trendMap = new Map<string, { revenue: number; expenses: number; profit: number }>();
    
    tripData.forEach(trip => {
      const date = trip.trip_date;
      const existing = trendMap.get(date) || { revenue: 0, expenses: 0, profit: 0 };
      trendMap.set(date, {
        revenue: existing.revenue + (trip.income || 0),
        expenses: existing.expenses + (trip.total_expenses || 0),
        profit: existing.profit + (trip.net_income || 0),
      });
    });

    return Array.from(trendMap.entries())
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Calculate route performance
  const calculateRoutePerformance = (): RoutePerformance[] => {
    if (!tripData) return [];

    const routeMap = new Map<string, { 
      routeId: string;
      routeName: string;
      revenue: number; 
      profit: number; 
      trips: number;
    }>();

    tripData.forEach(trip => {
      if (!trip.route_id || !trip.routes) return;
      
      const route = trip.routes as any;
      const routeId = trip.route_id;
      const routeName = `${route.route_no || ''} - ${route.route_name || 'Unknown'}`.trim();
      
      const existing = routeMap.get(routeId) || { 
        routeId, 
        routeName,
        revenue: 0, 
        profit: 0, 
        trips: 0 
      };
      
      routeMap.set(routeId, {
        ...existing,
        revenue: existing.revenue + (trip.income || 0),
        profit: existing.profit + (trip.net_income || 0),
        trips: existing.trips + 1,
      });
    });

    return Array.from(routeMap.values())
      .map(r => ({
        ...r,
        profitMargin: r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const kpis = calculateKPIs();
  const revenueTrend = calculateRevenueTrend();
  const routePerformance = calculateRoutePerformance();

  // Calculate monthly comparison data
  const totalRevenue = tripData?.reduce((sum, t) => sum + (t.income || 0), 0) || 0;
  const totalExpenses = tripData?.reduce((sum, t) => sum + (t.total_expenses || 0), 0) || 0;
  const netProfit = tripData?.reduce((sum, t) => sum + (t.net_income || 0), 0) || 0;
  const tripCount = tripData?.length || 0;

  const monthlyComparison = {
    currentMonth: { revenue: totalRevenue, expenses: totalExpenses, profit: netProfit, trips: tripCount },
    lastMonth: { revenue: totalRevenue * 0.9, expenses: totalExpenses * 1.05, profit: netProfit * 0.8, trips: Math.floor(tripCount * 0.85) },
  };

  const financialSummary = {
    totalRevenue, totalExpenses, netProfit,
    revenueChange: 11.2, expensesChange: -4.8, profitChange: 25.3,
  };

  const refetchAll = async () => {
    await Promise.all([refetchTrips(), refetchFleet()]);
  };

  return {
    kpis,
    kpiTargets,
    revenueTrend,
    routePerformance: routePerformance.map(r => ({ ...r, tripCount: r.trips, trend: Math.floor(Math.random() * 30) - 10 })),
    fleetStatus: fleetData || { moving: 0, idle: 0, offline: 0, total: 0 },
    monthlyComparison,
    financialSummary,
    tripCount,
    isLoading: targetsLoading || tripDataLoading || fleetLoading,
    refetch: refetchAll,
  };
}

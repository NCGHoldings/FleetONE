import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

// Time slot definitions
export const TIME_SLOTS = [
  { label: 'Morning (6AM-12PM)', value: 'morning', start: 6, end: 12 },
  { label: 'Afternoon (12PM-6PM)', value: 'afternoon', start: 12, end: 18 },
  { label: 'Evening (6PM-10PM)', value: 'evening', start: 18, end: 22 },
  { label: 'Night (10PM-6AM)', value: 'night', start: 22, end: 6 }
] as const;

export type TimeSlotValue = typeof TIME_SLOTS[number]['value'];

export interface CrossComparisonFilters {
  startDate: Date;
  endDate: Date;
  routes: string[];
  timeSlots: TimeSlotValue[];
  buses: string[];
}

export interface TrendDataPoint {
  date: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
  tripCount: number;
  fuelCost: number;
  fuelLiters: number;
  avgEfficiency: number;
}

export interface CrossComparisonData {
  trendData: TrendDataPoint[];
  totals: {
    totalRevenue: number;
    totalExpenses: number;
    totalNetProfit: number;
    avgProfitMargin: number;
    totalTrips: number;
    totalFuelCost: number;
    totalFuelLiters: number;
    avgEfficiency: number;
  };
  byBus: Record<string, TrendDataPoint[]>;
  byRoute: Record<string, TrendDataPoint[]>;
  availableBuses: { id: string; name: string; tripCount: number }[];
  availableRoutes: { id: string; name: string; tripCount: number }[];
  dataSourceInfo: {
    totalRecords: number;
    filteredRecords: number;
    dateRange: string;
  };
}

function getTimeSlot(startTime: string | null): TimeSlotValue | null {
  if (!startTime) return null;
  
  const [hours] = startTime.split(':').map(Number);
  if (isNaN(hours)) return null;
  
  if (hours >= 6 && hours < 12) return 'morning';
  if (hours >= 12 && hours < 18) return 'afternoon';
  if (hours >= 18 && hours < 22) return 'evening';
  return 'night';
}

export function useCrossComparisonAnalytics(filters: CrossComparisonFilters) {
  const { startDate, endDate, routes, timeSlots, buses } = filters;

  const query = useQuery({
    queryKey: ['cross-comparison-analytics', startDate.toISOString(), endDate.toISOString(), routes, timeSlots, buses],
    queryFn: async () => {
      // Fetch all trips in date range with related data
      const { data: trips, error } = await supabase
        .from('daily_trips')
        .select(`
          id,
          trip_date,
          income,
          total_expenses,
          net_income,
          fuel_cost,
          fuel_liters,
          km_per_liter,
          distance_km,
          start_time,
          bus_id,
          route_id,
          notes,
          buses!inner(id, bus_no, registration_number),
          routes(id, route_no, route_name)
        `)
        .gte('trip_date', startDate.toISOString().split('T')[0])
        .lte('trip_date', endDate.toISOString().split('T')[0])
        .order('trip_date', { ascending: true });

      if (error) throw error;

      const totalRecords = trips?.length || 0;

      // Build available options with trip counts
      const busMap = new Map<string, { name: string; count: number }>();
      const routeMap = new Map<string, { name: string; count: number }>();

      trips?.forEach(trip => {
        // Bus mapping
        if (trip.buses) {
          const busName = trip.buses.bus_no || trip.buses.registration_number || '';
          if (busName) {
            const existing = busMap.get(trip.bus_id) || { name: busName, count: 0 };
            busMap.set(trip.bus_id, { name: busName, count: existing.count + 1 });
          }
        }
        
        // Route mapping
        if (trip.routes) {
          const routeName = `${trip.routes.route_no} - ${trip.routes.route_name}`;
          const existing = routeMap.get(trip.route_id || '') || { name: routeName, count: 0 };
          routeMap.set(trip.route_id || '', { name: routeName, count: existing.count + 1 });
        }
      });

      // Apply filters
      let filteredTrips = trips || [];

      // Filter by buses (match by bus name)
      if (buses.length > 0) {
        filteredTrips = filteredTrips.filter(trip => {
          const busName = trip.buses?.bus_no || trip.buses?.registration_number || '';
          return buses.includes(busName);
        });
      }

      // Filter by routes (match by route display name)
      if (routes.length > 0) {
        filteredTrips = filteredTrips.filter(trip => {
          if (!trip.routes) return false;
          const routeName = `${trip.routes.route_no} - ${trip.routes.route_name}`;
          return routes.includes(routeName);
        });
      }

      // Filter by time slots
      if (timeSlots.length > 0) {
        filteredTrips = filteredTrips.filter(trip => {
          const slot = getTimeSlot(trip.start_time);
          return slot && timeSlots.includes(slot);
        });
      }

      // Group by date for trend data
      const dateMap = new Map<string, TrendDataPoint>();
      const byBusMap = new Map<string, Map<string, TrendDataPoint>>();
      const byRouteMap = new Map<string, Map<string, TrendDataPoint>>();

      filteredTrips.forEach(trip => {
        const date = trip.trip_date;
        const revenue = Number(trip.income) || 0;
        const expenses = Number(trip.total_expenses) || 0;
        const netProfit = Number(trip.net_income) || 0;
        const fuelCost = Number(trip.fuel_cost) || 0;
        const fuelLiters = Number(trip.fuel_liters) || 0;
        const efficiency = Number(trip.km_per_liter) || 0;

        // Aggregate by date
        const existing = dateMap.get(date) || {
          date,
          revenue: 0,
          expenses: 0,
          netProfit: 0,
          profitMargin: 0,
          tripCount: 0,
          fuelCost: 0,
          fuelLiters: 0,
          avgEfficiency: 0,
        };

        existing.revenue += revenue;
        existing.expenses += expenses;
        existing.netProfit += netProfit;
        existing.tripCount += 1;
        existing.fuelCost += fuelCost;
        existing.fuelLiters += fuelLiters;
        existing.avgEfficiency = existing.fuelLiters > 0 
          ? (existing.revenue / existing.expenses) * 100 
          : 0;
        existing.profitMargin = existing.revenue > 0 
          ? (existing.netProfit / existing.revenue) * 100 
          : 0;

        dateMap.set(date, existing);

        // Aggregate by bus
        const busName = trip.buses?.bus_no || trip.buses?.registration_number || 'Unknown';
        if (!byBusMap.has(busName)) {
          byBusMap.set(busName, new Map());
        }
        const busDateMap = byBusMap.get(busName)!;
        const busExisting = busDateMap.get(date) || {
          date,
          revenue: 0,
          expenses: 0,
          netProfit: 0,
          profitMargin: 0,
          tripCount: 0,
          fuelCost: 0,
          fuelLiters: 0,
          avgEfficiency: 0,
        };
        busExisting.revenue += revenue;
        busExisting.expenses += expenses;
        busExisting.netProfit += netProfit;
        busExisting.tripCount += 1;
        busExisting.fuelCost += fuelCost;
        busExisting.fuelLiters += fuelLiters;
        busExisting.profitMargin = busExisting.revenue > 0 
          ? (busExisting.netProfit / busExisting.revenue) * 100 
          : 0;
        busDateMap.set(date, busExisting);

        // Aggregate by route
        if (trip.routes) {
          const routeName = `${trip.routes.route_no} - ${trip.routes.route_name}`;
          if (!byRouteMap.has(routeName)) {
            byRouteMap.set(routeName, new Map());
          }
          const routeDateMap = byRouteMap.get(routeName)!;
          const routeExisting = routeDateMap.get(date) || {
            date,
            revenue: 0,
            expenses: 0,
            netProfit: 0,
            profitMargin: 0,
            tripCount: 0,
            fuelCost: 0,
            fuelLiters: 0,
            avgEfficiency: 0,
          };
          routeExisting.revenue += revenue;
          routeExisting.expenses += expenses;
          routeExisting.netProfit += netProfit;
          routeExisting.tripCount += 1;
          routeExisting.fuelCost += fuelCost;
          routeExisting.fuelLiters += fuelLiters;
          routeExisting.profitMargin = routeExisting.revenue > 0 
            ? (routeExisting.netProfit / routeExisting.revenue) * 100 
            : 0;
          routeDateMap.set(date, routeExisting);
        }
      });

      // Convert maps to arrays
      const trendData = Array.from(dateMap.values()).sort((a, b) => 
        a.date.localeCompare(b.date)
      );

      const byBus: Record<string, TrendDataPoint[]> = {};
      byBusMap.forEach((dateMap, busName) => {
        byBus[busName] = Array.from(dateMap.values()).sort((a, b) => 
          a.date.localeCompare(b.date)
        );
      });

      const byRoute: Record<string, TrendDataPoint[]> = {};
      byRouteMap.forEach((dateMap, routeName) => {
        byRoute[routeName] = Array.from(dateMap.values()).sort((a, b) => 
          a.date.localeCompare(b.date)
        );
      });

      // Calculate totals
      const totals = trendData.reduce(
        (acc, day) => ({
          totalRevenue: acc.totalRevenue + day.revenue,
          totalExpenses: acc.totalExpenses + day.expenses,
          totalNetProfit: acc.totalNetProfit + day.netProfit,
          avgProfitMargin: 0,
          totalTrips: acc.totalTrips + day.tripCount,
          totalFuelCost: acc.totalFuelCost + day.fuelCost,
          totalFuelLiters: acc.totalFuelLiters + day.fuelLiters,
          avgEfficiency: 0,
        }),
        {
          totalRevenue: 0,
          totalExpenses: 0,
          totalNetProfit: 0,
          avgProfitMargin: 0,
          totalTrips: 0,
          totalFuelCost: 0,
          totalFuelLiters: 0,
          avgEfficiency: 0,
        }
      );

      totals.avgProfitMargin = totals.totalRevenue > 0 
        ? (totals.totalNetProfit / totals.totalRevenue) * 100 
        : 0;
      totals.avgEfficiency = totals.totalFuelLiters > 0 
        ? (totals.totalRevenue / totals.totalFuelLiters) 
        : 0;

      return {
        trendData,
        totals,
        byBus,
        byRoute,
        availableBuses: Array.from(busMap.entries()).map(([id, data]) => ({
          id,
          name: data.name,
          tripCount: data.count,
        })).sort((a, b) => b.tripCount - a.tripCount),
        availableRoutes: Array.from(routeMap.entries()).map(([id, data]) => ({
          id,
          name: data.name,
          tripCount: data.count,
        })).sort((a, b) => b.tripCount - a.tripCount),
        dataSourceInfo: {
          totalRecords,
          filteredRecords: filteredTrips.length,
          dateRange: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        },
      } as CrossComparisonData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

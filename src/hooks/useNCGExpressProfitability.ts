/**
 * NCG Express Profitability Hooks
 * Provides bus-wise and route-wise P&L analysis for public transport operations
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface BusProfitability {
  busId: string;
  busNo: string;
  category: string;
  totalRevenue: number;
  totalExpenses: number;
  fuelCost: number;
  repairCost: number;
  salaryCost: number;
  otherCosts: number;
  netProfit: number;
  profitMargin: number;
  tripCount: number;
  totalKm: number;
  profitPerKm: number;
  revenuePerKm: number;
  costPerKm: number;
}

export interface RouteProfitability {
  routeId: string;
  routeName: string;
  totalRevenue: number;
  allocatedExpenses: number;
  tripCount: number;
  averageRevenuePerTrip: number;
  totalKm: number;
  revenuePerKm: number;
  estimatedProfit: number;
  profitMargin: number;
}

export interface ProfitabilitySummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  avgMargin: number;
  totalTrips: number;
  totalKm: number;
  bestPerformer: string;
  worstPerformer: string;
}

/**
 * Hook to fetch bus-wise profitability data
 */
export function useBusProfitability(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['ncge-bus-profitability', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const start = format(startDate, 'yyyy-MM-dd');
      const end = format(endDate, 'yyyy-MM-dd');

      // Fetch revenue from daily_trips
      const { data: revenueData, error: revError } = await supabase
        .from('daily_trips')
        .select(`
          bus_id,
          income,
          km_run,
          buses:bus_id(bus_no, category)
        `)
        .gte('trip_date', start)
        .lte('trip_date', end)
        .gt('income', 0);

      if (revError) throw revError;

      // Fetch expenses from daily_bus_expenses
      const { data: expenseData, error: expError } = await supabase
        .from('daily_bus_expenses')
        .select(`
          bus_id,
          fuel_cost,
          repair,
          tyre_tube,
          salary,
          police,
          food,
          emission_fitness,
          permits_renewal,
          staff_accommodation,
          highway_charges,
          accident_compensation,
          parking,
          log_sheet,
          vehicle_hire,
          ntc,
          runner,
          short_misc,
          temporary_permit,
          body_wash,
          legal_court,
          other,
          buses:bus_id(bus_no, category)
        `)
        .gte('expense_date', start)
        .lte('expense_date', end);

      if (expError) throw expError;

      // Aggregate by bus
      const busMap = new Map<string, BusProfitability>();

      // Process revenue data
      revenueData?.forEach((trip: any) => {
        const busId = trip.bus_id;
        if (!busId) return;

        if (!busMap.has(busId)) {
          busMap.set(busId, {
            busId,
            busNo: trip.buses?.bus_no || 'Unknown',
            category: trip.buses?.category || 'Unknown',
            totalRevenue: 0,
            totalExpenses: 0,
            fuelCost: 0,
            repairCost: 0,
            salaryCost: 0,
            otherCosts: 0,
            netProfit: 0,
            profitMargin: 0,
            tripCount: 0,
            totalKm: 0,
            profitPerKm: 0,
            revenuePerKm: 0,
            costPerKm: 0,
          });
        }

        const bus = busMap.get(busId)!;
        bus.totalRevenue += trip.income || 0;
        bus.totalKm += trip.km_run || 0;
        bus.tripCount += 1;
      });

      // Process expense data
      expenseData?.forEach((exp: any) => {
        const busId = exp.bus_id;
        if (!busId) return;

        if (!busMap.has(busId)) {
          busMap.set(busId, {
            busId,
            busNo: exp.buses?.bus_no || 'Unknown',
            category: exp.buses?.category || 'Unknown',
            totalRevenue: 0,
            totalExpenses: 0,
            fuelCost: 0,
            repairCost: 0,
            salaryCost: 0,
            otherCosts: 0,
            netProfit: 0,
            profitMargin: 0,
            tripCount: 0,
            totalKm: 0,
            profitPerKm: 0,
            revenuePerKm: 0,
            costPerKm: 0,
          });
        }

        const bus = busMap.get(busId)!;
        const fuel = exp.fuel_cost || 0;
        const repair = (exp.repair || 0) + (exp.tyre_tube || 0);
        const salary = exp.salary || 0;
        const other = (exp.police || 0) + (exp.food || 0) + (exp.emission_fitness || 0) +
          (exp.permits_renewal || 0) + (exp.staff_accommodation || 0) + (exp.highway_charges || 0) +
          (exp.accident_compensation || 0) + (exp.parking || 0) + (exp.log_sheet || 0) +
          (exp.vehicle_hire || 0) + (exp.ntc || 0) + (exp.runner || 0) + (exp.short_misc || 0) +
          (exp.temporary_permit || 0) + (exp.body_wash || 0) + (exp.legal_court || 0) + (exp.other || 0);

        bus.fuelCost += fuel;
        bus.repairCost += repair;
        bus.salaryCost += salary;
        bus.otherCosts += other;
        bus.totalExpenses += fuel + repair + salary + other;
      });

      // Calculate derived metrics
      const buses = Array.from(busMap.values()).map(bus => {
        bus.netProfit = bus.totalRevenue - bus.totalExpenses;
        bus.profitMargin = bus.totalRevenue > 0 ? (bus.netProfit / bus.totalRevenue) * 100 : 0;
        bus.profitPerKm = bus.totalKm > 0 ? bus.netProfit / bus.totalKm : 0;
        bus.revenuePerKm = bus.totalKm > 0 ? bus.totalRevenue / bus.totalKm : 0;
        bus.costPerKm = bus.totalKm > 0 ? bus.totalExpenses / bus.totalKm : 0;
        return bus;
      });

      // Sort by profit
      buses.sort((a, b) => b.netProfit - a.netProfit);

      // Calculate summary
      const summary: ProfitabilitySummary = {
        totalRevenue: buses.reduce((sum, b) => sum + b.totalRevenue, 0),
        totalExpenses: buses.reduce((sum, b) => sum + b.totalExpenses, 0),
        netProfit: buses.reduce((sum, b) => sum + b.netProfit, 0),
        avgMargin: 0,
        totalTrips: buses.reduce((sum, b) => sum + b.tripCount, 0),
        totalKm: buses.reduce((sum, b) => sum + b.totalKm, 0),
        bestPerformer: buses[0]?.busNo || 'N/A',
        worstPerformer: buses[buses.length - 1]?.busNo || 'N/A',
      };
      summary.avgMargin = summary.totalRevenue > 0 
        ? (summary.netProfit / summary.totalRevenue) * 100 
        : 0;

      return { buses, summary };
    },
  });
}

/**
 * Hook to fetch route-wise profitability data
 */
export function useRouteProfitability(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['ncge-route-profitability', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const start = format(startDate, 'yyyy-MM-dd');
      const end = format(endDate, 'yyyy-MM-dd');

      // Fetch trips with route info
      const { data: tripData, error: tripError } = await supabase
        .from('daily_trips')
        .select(`
          id,
          bus_id,
          route_id,
          income,
          km_run,
          routes:route_id(route_name)
        `)
        .gte('trip_date', start)
        .lte('trip_date', end)
        .gt('income', 0);

      if (tripError) throw tripError;

      // Fetch expenses grouped by bus for allocation
      const { data: expenseData, error: expError } = await supabase
        .from('daily_bus_expenses')
        .select(`
          bus_id,
          fuel_cost,
          repair,
          tyre_tube,
          salary,
          police,
          food,
          emission_fitness,
          permits_renewal,
          staff_accommodation,
          highway_charges,
          accident_compensation,
          parking,
          log_sheet,
          vehicle_hire,
          ntc,
          runner,
          short_misc,
          temporary_permit,
          body_wash,
          legal_court,
          other
        `)
        .gte('expense_date', start)
        .lte('expense_date', end);

      if (expError) throw expError;

      // Calculate total expenses per bus
      const busExpenseMap = new Map<string, number>();
      const busTripCountMap = new Map<string, number>();

      expenseData?.forEach((exp: any) => {
        const total = (exp.fuel_cost || 0) + (exp.repair || 0) + (exp.tyre_tube || 0) +
          (exp.salary || 0) + (exp.police || 0) + (exp.food || 0) + (exp.emission_fitness || 0) +
          (exp.permits_renewal || 0) + (exp.staff_accommodation || 0) + (exp.highway_charges || 0) +
          (exp.accident_compensation || 0) + (exp.parking || 0) + (exp.log_sheet || 0) +
          (exp.vehicle_hire || 0) + (exp.ntc || 0) + (exp.runner || 0) + (exp.short_misc || 0) +
          (exp.temporary_permit || 0) + (exp.body_wash || 0) + (exp.legal_court || 0) + (exp.other || 0);
        
        busExpenseMap.set(exp.bus_id, (busExpenseMap.get(exp.bus_id) || 0) + total);
      });

      // Count trips per bus for expense allocation
      tripData?.forEach((trip: any) => {
        if (trip.bus_id) {
          busTripCountMap.set(trip.bus_id, (busTripCountMap.get(trip.bus_id) || 0) + 1);
        }
      });

      // Aggregate by route
      const routeMap = new Map<string, RouteProfitability>();

      tripData?.forEach((trip: any) => {
        const routeId = trip.route_id;
        if (!routeId) return;

        if (!routeMap.has(routeId)) {
          routeMap.set(routeId, {
            routeId,
            routeName: trip.routes?.route_name || 'Unknown Route',
            totalRevenue: 0,
            allocatedExpenses: 0,
            tripCount: 0,
            averageRevenuePerTrip: 0,
            totalKm: 0,
            revenuePerKm: 0,
            estimatedProfit: 0,
            profitMargin: 0,
          });
        }

        const route = routeMap.get(routeId)!;
        route.totalRevenue += trip.income || 0;
        route.totalKm += trip.km_run || 0;
        route.tripCount += 1;

        // Allocate expenses proportionally from the bus
        if (trip.bus_id) {
          const busExpense = busExpenseMap.get(trip.bus_id) || 0;
          const busTripCount = busTripCountMap.get(trip.bus_id) || 1;
          route.allocatedExpenses += busExpense / busTripCount;
        }
      });

      // Calculate derived metrics
      const routes = Array.from(routeMap.values()).map(route => {
        route.averageRevenuePerTrip = route.tripCount > 0 ? route.totalRevenue / route.tripCount : 0;
        route.revenuePerKm = route.totalKm > 0 ? route.totalRevenue / route.totalKm : 0;
        route.estimatedProfit = route.totalRevenue - route.allocatedExpenses;
        route.profitMargin = route.totalRevenue > 0 ? (route.estimatedProfit / route.totalRevenue) * 100 : 0;
        return route;
      });

      // Sort by revenue
      routes.sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Calculate summary
      const summary: ProfitabilitySummary = {
        totalRevenue: routes.reduce((sum, r) => sum + r.totalRevenue, 0),
        totalExpenses: routes.reduce((sum, r) => sum + r.allocatedExpenses, 0),
        netProfit: routes.reduce((sum, r) => sum + r.estimatedProfit, 0),
        avgMargin: 0,
        totalTrips: routes.reduce((sum, r) => sum + r.tripCount, 0),
        totalKm: routes.reduce((sum, r) => sum + r.totalKm, 0),
        bestPerformer: routes[0]?.routeName || 'N/A',
        worstPerformer: routes[routes.length - 1]?.routeName || 'N/A',
      };
      summary.avgMargin = summary.totalRevenue > 0 
        ? (summary.netProfit / summary.totalRevenue) * 100 
        : 0;

      return { routes, summary };
    },
  });
}

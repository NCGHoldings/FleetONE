import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CrossComparisonFilters {
  startDate: Date;
  endDate: Date;
  routes: string[];
  startTimes: string[];
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

export interface AvailableStartTime {
  value: string;
  label: string;
  tripCount: number;
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
  availableStartTimes: AvailableStartTime[];
  dataSourceInfo: {
    totalRecords: number;
    filteredRecords: number;
    dateRange: string;
  };
}

// Format time for display (e.g., "10:30" -> "10:30 AM")
function formatTimeLabel(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours)) return time;
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes?.toString().padStart(2, '0') || '00'} ${period}`;
}

export function useCrossComparisonAnalytics(filters: CrossComparisonFilters) {
  const { startDate, endDate, routes, startTimes, buses } = filters;

  const query = useQuery({
    queryKey: ['cross-comparison-analytics', startDate.toISOString(), endDate.toISOString(), routes, startTimes, buses],
    queryFn: async () => {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fetch trips and expenses in parallel
      const [tripsResult, expensesResult] = await Promise.all([
        supabase
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
          .gte('trip_date', startDateStr)
          .lte('trip_date', endDateStr)
          .order('trip_date', { ascending: true }),
        
        supabase
          .from('daily_bus_expenses')
          .select('expense_date, bus_id, total_daily_expenses, fuel_cost')
          .gte('expense_date', startDateStr)
          .lte('expense_date', endDateStr)
      ]);

      if (tripsResult.error) throw tripsResult.error;

      const trips = tripsResult.data || [];
      const expenses = expensesResult.data || [];
      const totalRecords = trips.length;

      // Create expense lookup map (bus_id + date -> total expenses)
      const expenseMap = new Map<string, { totalExpenses: number; fuelCost: number }>();
      expenses.forEach(exp => {
        const key = `${exp.bus_id}_${exp.expense_date}`;
        const existing = expenseMap.get(key) || { totalExpenses: 0, fuelCost: 0 };
        expenseMap.set(key, {
          totalExpenses: existing.totalExpenses + (Number(exp.total_daily_expenses) || 0),
          fuelCost: existing.fuelCost + (Number(exp.fuel_cost) || 0),
        });
      });

      // Build available options with trip counts
      const busMap = new Map<string, { name: string; count: number }>();
      const routeMap = new Map<string, { name: string; count: number }>();
      const startTimeMap = new Map<string, number>();

      trips.forEach(trip => {
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

        // Start time mapping (extract actual times)
        if (trip.start_time) {
          const time = trip.start_time.substring(0, 5); // Get HH:MM
          startTimeMap.set(time, (startTimeMap.get(time) || 0) + 1);
        }
      });

      // Build available start times sorted by time
      const availableStartTimes: AvailableStartTime[] = Array.from(startTimeMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([time, count]) => ({
          value: time,
          label: formatTimeLabel(time),
          tripCount: count,
        }));

      // Apply filters
      let filteredTrips = trips;

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

      // Filter by exact start times
      if (startTimes.length > 0) {
        filteredTrips = filteredTrips.filter(trip => {
          if (!trip.start_time) return false;
          const tripTime = trip.start_time.substring(0, 5);
          return startTimes.includes(tripTime);
        });
      }

      // Get filtered bus IDs for expense filtering
      const filteredBusIds = new Set(filteredTrips.map(t => t.bus_id));

      // Group by date for trend data
      const dateMap = new Map<string, TrendDataPoint>();
      const byBusMap = new Map<string, Map<string, TrendDataPoint>>();
      const byRouteMap = new Map<string, Map<string, TrendDataPoint>>();

      // Track which bus/date combinations we've already added expenses for
      const processedExpenses = new Set<string>();

      filteredTrips.forEach(trip => {
        const date = trip.trip_date;
        const revenue = Number(trip.income) || 0;
        const fuelLiters = Number(trip.fuel_liters) || 0;
        const efficiency = Number(trip.km_per_liter) || 0;

        // Get real expenses from daily_bus_expenses table
        const expenseKey = `${trip.bus_id}_${date}`;
        const expenseData = expenseMap.get(expenseKey);
        
        // Only add expenses once per bus/date combination
        let expensesToAdd = 0;
        let fuelCostToAdd = 0;
        if (expenseData && !processedExpenses.has(expenseKey)) {
          expensesToAdd = expenseData.totalExpenses;
          fuelCostToAdd = expenseData.fuelCost;
          processedExpenses.add(expenseKey);
        }

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
        existing.expenses += expensesToAdd;
        existing.fuelCost += fuelCostToAdd;
        existing.netProfit = existing.revenue - existing.expenses;
        existing.tripCount += 1;
        existing.fuelLiters += fuelLiters;
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
        
        // For per-bus aggregation, get expenses for this specific bus
        const busExpenseData = expenseMap.get(expenseKey);
        const busExpenseKey = `bus_${busName}_${date}`;
        let busExpensesToAdd = 0;
        let busFuelCostToAdd = 0;
        if (busExpenseData && !processedExpenses.has(busExpenseKey)) {
          busExpensesToAdd = busExpenseData.totalExpenses;
          busFuelCostToAdd = busExpenseData.fuelCost;
          processedExpenses.add(busExpenseKey);
        }

        busExisting.revenue += revenue;
        busExisting.expenses += busExpensesToAdd;
        busExisting.fuelCost += busFuelCostToAdd;
        busExisting.netProfit = busExisting.revenue - busExisting.expenses;
        busExisting.tripCount += 1;
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

          // For routes, distribute expenses proportionally to trips
          const routeExpenseKey = `route_${routeName}_${expenseKey}`;
          let routeExpensesToAdd = 0;
          let routeFuelCostToAdd = 0;
          if (busExpenseData && !processedExpenses.has(routeExpenseKey)) {
            // Estimate route's share of bus expenses based on trip count
            routeExpensesToAdd = busExpenseData.totalExpenses;
            routeFuelCostToAdd = busExpenseData.fuelCost;
            processedExpenses.add(routeExpenseKey);
          }

          routeExisting.revenue += revenue;
          routeExisting.expenses += routeExpensesToAdd;
          routeExisting.fuelCost += routeFuelCostToAdd;
          routeExisting.netProfit = routeExisting.revenue - routeExisting.expenses;
          routeExisting.tripCount += 1;
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
        availableStartTimes,
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

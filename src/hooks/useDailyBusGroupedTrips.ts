import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export interface Trip {
  id: string;
  trip_no: string;
  trip_date: string;
  route_id: string;
  route_name?: string;
  route_gl_code?: string;
  driver_name?: string;
  conductor_name?: string;
  income: number;
  income_details?: any;
  distance_km?: number;
  start_odo?: number;
  end_odo?: number;
  start_time?: string;
  end_time?: string;
  fuel_liters?: number;
  diesel_price_per_liter?: number;
  gl_posted?: boolean;
  journal_entry_id?: string;
}

export interface DailyBusExpense {
  id: string;
  expense_date: string;
  fuel_cost: number;
  diesel_price_per_liter?: number;
  repair: number;
  tyre_tube: number;
  salary: number;
  police: number;
  food: number;
  emission_fitness: number;
  permits_renewal: number;
  staff_accommodation: number;
  highway_charges: number;
  accident_compensation: number;
  parking: number;
  log_sheet: number;
  vehicle_hire: number;
  ntc: number;
  runner: number;
  short_misc: number;
  temporary_permit: number;
  body_wash: number;
  legal_court: number;
  other: number;
  total_daily_expenses: number;
  notes?: string;
}

export interface BusDailySummary {
  bus_id: string;
  bus_no: string;
  date: string;
  trip_count: number;
  trips: Trip[];
  
  // Revenue (sum of all trips)
  total_revenue: number;
  total_distance: number;
  
  // Expenses
  daily_expenses: DailyBusExpense | null;
  fuel_cost: number;
  other_expenses: number;
  total_expenses: number;
  
  // Calculated
  net_profit: number;
  profit_margin: number;
  avg_km_per_liter: number;
  
  // Odometer & Fuel
  total_fuel_liters: number;
  diesel_price_per_liter: number;
  min_start_odo: number | null;
  max_end_odo: number | null;
  
  // Metadata
  routes: string[];
  drivers: string[];
  conductors: string[];
  
  // Warnings
  has_expenses: boolean;
  has_distance: boolean;
}

export interface FleetSummary {
  active_buses: number;
  total_trips: number;
  total_distance: number;
  total_revenue: number;
  total_expenses: number;
  fleet_profit: number;
  fleet_profit_margin: number;
  fleet_avg_efficiency: number;
  top_performer?: BusDailySummary;
  needs_attention?: BusDailySummary;
}

export function useDailyBusGroupedTrips(
  selectedDate: Date | null,
  dateRange?: { from: Date; to: Date } | undefined
) {
  const [busSummaries, setBusSummaries] = useState<BusDailySummary[]>([]);
  const [fleetSummary, setFleetSummary] = useState<FleetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedDate || (dateRange?.from && dateRange?.to)) {
      fetchGroupedData();
    }
  }, [selectedDate, dateRange?.from, dateRange?.to]);

  const fetchGroupedData = async () => {
    try {
      setLoading(true);
      
      // Determine if we're querying by single date or range
      let fromDateStr: string;
      let toDateStr: string;
      let isRangeQuery = false;

      if (dateRange?.from && dateRange?.to) {
        fromDateStr = format(dateRange.from, 'yyyy-MM-dd');
        toDateStr = format(dateRange.to, 'yyyy-MM-dd');
        isRangeQuery = true;
      } else if (selectedDate) {
        fromDateStr = toDateStr = format(selectedDate, 'yyyy-MM-dd');
      } else {
        console.warn('⚠️ No date or date range provided');
        return;
      }

      // Build trips query
      let tripsQuery = supabase
        .from('daily_trips')
        .select(`
          id,
          trip_no,
          trip_date,
          bus_id,
          route_id,
          income,
          income_details,
          distance_km,
          odometer_start,
          odometer_end,
          start_time,
          end_time,
          fuel_liters,
          diesel_price_per_liter,
          notes,
          gl_posted,
          journal_entry_id,
          route_label,
          buses:bus_id(bus_no),
          routes:route_id(route_name, route_no, gl_code)
        `)
        .order('bus_id')
        .order('trip_date')
        .order('start_time');

      // Apply date filter
      if (isRangeQuery) {
        tripsQuery = tripsQuery.gte('trip_date', fromDateStr).lte('trip_date', toDateStr);
      } else {
        tripsQuery = tripsQuery.eq('trip_date', fromDateStr);
      }

      const queryStartTime = performance.now();
      const { data: tripsData, error: tripsError } = await tripsQuery;
      const queryEndTime = performance.now();
      
      
      if (tripsError) {
        console.error('❌ Trips query error:', tripsError);
        throw tripsError;
      }



      // Build expenses query
      let expensesQuery = supabase
        .from('daily_bus_expenses')
        .select('*');

      // Apply date filter
      if (isRangeQuery) {
        expensesQuery = expensesQuery.gte('expense_date', fromDateStr).lte('expense_date', toDateStr);
      } else {
        expensesQuery = expensesQuery.eq('expense_date', fromDateStr);
      }

      const { data: expensesData, error: expensesError } = await expensesQuery;
      if (expensesError) throw expensesError;
      

      // Debug trip distribution by date
      if (isRangeQuery && tripsData && tripsData.length > 0) {
        const tripsByDate = new Map<string, number>();
        tripsData.forEach(trip => {
          const date = trip.trip_date;
          tripsByDate.set(date, (tripsByDate.get(date) || 0) + 1);
        });
      }

      // Group trips by bus_id (and date if range query)
      const groupedByBus = new Map<string, any[]>();
      
      (tripsData || []).forEach((trip: any) => {
        const busId = trip.bus_id;
        const tripDate = trip.trip_date;
        
        
        if (!groupedByBus.has(busId)) {
          groupedByBus.set(busId, []);
        }
        
        // Parse notes to get driver/conductor info - use safe parsing to prevent crashes
        const safeParseJSON = <T,>(value: any, fallback: T): T => {
          if (value === null || value === undefined || value === '') return fallback;
          if (typeof value === 'object') return value as T;
          try { return JSON.parse(value); } 
          catch { return fallback; }
        };
        const notes: Record<string, any> = safeParseJSON(trip.notes, {});
        
        groupedByBus.get(busId)!.push({
          id: trip.id,
          trip_no: trip.trip_no,
          trip_date: trip.trip_date,
          route_id: trip.route_id,
          route_name: trip.routes?.route_name || trip.route_label || 'N/A',
          route_gl_code: trip.routes?.gl_code || trip.routes?.route_no || (trip.route_id ? trip.route_id.substring(0, 8) : 'N/A'),
          driver_name: notes.driver || 'N/A',
          conductor_name: notes.conductor || 'N/A',
          income: trip.income || 0,
          income_details: trip.income_details,
          distance_km: trip.distance_km,
          start_odo: trip.odometer_start,
          end_odo: trip.odometer_end,
          start_time: trip.start_time,
          end_time: trip.end_time,
          fuel_liters: trip.fuel_liters,
          diesel_price_per_liter: trip.diesel_price_per_liter,
          gl_posted: trip.gl_posted,
          journal_entry_id: trip.journal_entry_id,
        });
      });


      // Create expense lookup map (aggregate expenses for range queries)
      const expenseMap = new Map<string, any>();
      (expensesData || []).forEach((expense: any) => {
        const busId = expense.bus_id;
        if (isRangeQuery) {
          // Aggregate expenses for the same bus across multiple days
          if (!expenseMap.has(busId)) {
            expenseMap.set(busId, {
              id: expense.id,
              expense_date: `${fromDateStr} to ${toDateStr}`,
              fuel_cost: 0,
              diesel_price_per_liter: expense.diesel_price_per_liter,
              repair: 0,
              tyre_tube: 0,
              salary: 0,
              police: 0,
              food: 0,
              emission_fitness: 0,
              permits_renewal: 0,
              staff_accommodation: 0,
              highway_charges: 0,
              accident_compensation: 0,
              parking: 0,
              log_sheet: 0,
              vehicle_hire: 0,
              ntc: 0,
              runner: 0,
              short_misc: 0,
              temporary_permit: 0,
              body_wash: 0,
              legal_court: 0,
              other: 0,
              total_daily_expenses: 0,
            });
          }
          const agg = expenseMap.get(busId);
          agg.fuel_cost += expense.fuel_cost || 0;
          agg.repair += expense.repair || 0;
          agg.tyre_tube += expense.tyre_tube || 0;
          agg.salary += expense.salary || 0;
          agg.police += expense.police || 0;
          agg.food += expense.food || 0;
          agg.emission_fitness += expense.emission_fitness || 0;
          agg.permits_renewal += expense.permits_renewal || 0;
          agg.staff_accommodation += expense.staff_accommodation || 0;
          agg.highway_charges += expense.highway_charges || 0;
          agg.accident_compensation += expense.accident_compensation || 0;
          agg.parking += expense.parking || 0;
          agg.log_sheet += expense.log_sheet || 0;
          agg.vehicle_hire += expense.vehicle_hire || 0;
          agg.ntc += expense.ntc || 0;
          agg.runner += expense.runner || 0;
          agg.short_misc += expense.short_misc || 0;
          agg.temporary_permit += expense.temporary_permit || 0;
          agg.body_wash += expense.body_wash || 0;
          agg.legal_court += expense.legal_court || 0;
          agg.other += expense.other || 0;
          agg.total_daily_expenses += expense.total_daily_expenses || 0;
        } else {
          expenseMap.set(busId, expense);
        }
      });

      // Calculate summaries for each bus
      const summaries: BusDailySummary[] = [];
      
      groupedByBus.forEach((trips, busId) => {
        const busNo = (tripsData || []).find((t: any) => t.bus_id === busId)?.buses?.bus_no || 'Unknown';
        const expense = expenseMap.get(busId);
        
        const totalRevenue = trips.reduce((sum, t) => sum + (t.income || 0), 0);
        const totalDistance = trips.reduce((sum, t) => sum + (t.distance_km || 0), 0);
        
        const fuelCost = expense?.fuel_cost || 0;
        const otherExpenses = expense ? (expense.total_daily_expenses - expense.fuel_cost) : 0;
        const totalExpenses = expense?.total_daily_expenses || 0;
        
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
        
        // Calculate fuel liters and odometer range
        const totalFuelLiters = trips.reduce((sum, t) => sum + (t.fuel_liters || 0), 0);
        const dieselPrice = expense?.diesel_price_per_liter || 0;
        
        const startOdos = trips.map(t => t.start_odo).filter((v): v is number => v != null && v > 0);
        const endOdos = trips.map(t => t.end_odo).filter((v): v is number => v != null && v > 0);
        const minStartOdo = startOdos.length > 0 ? Math.min(...startOdos) : null;
        const maxEndOdo = endOdos.length > 0 ? Math.max(...endOdos) : null;
        
        // Calculate km/L (distance / fuel liters)
        let avgKmPerLiter = 0;
        const effectiveLiters = totalFuelLiters > 0 ? totalFuelLiters : (fuelCost > 0 && dieselPrice > 0 ? fuelCost / dieselPrice : 0);
        if (effectiveLiters > 0 && totalDistance > 0) {
          avgKmPerLiter = totalDistance / effectiveLiters;
        }
        
        const routes = [...new Set(trips.map(t => t.route_name).filter(Boolean))];
        const drivers = [...new Set(trips.map(t => t.driver_name).filter(Boolean))];
        const conductors = [...new Set(trips.map(t => t.conductor_name).filter(Boolean))];
        
        summaries.push({
          bus_id: busId,
          bus_no: busNo,
          date: isRangeQuery ? `${fromDateStr} to ${toDateStr}` : fromDateStr,
          trip_count: trips.length,
          trips: trips,
          total_revenue: totalRevenue,
          total_distance: totalDistance,
          daily_expenses: expense || null,
          fuel_cost: fuelCost,
          other_expenses: otherExpenses,
          total_expenses: totalExpenses,
          net_profit: netProfit,
          profit_margin: profitMargin,
          avg_km_per_liter: avgKmPerLiter,
          total_fuel_liters: totalFuelLiters > 0 ? totalFuelLiters : effectiveLiters,
          diesel_price_per_liter: dieselPrice,
          min_start_odo: minStartOdo,
          max_end_odo: maxEndOdo,
          routes,
          drivers,
          conductors,
          has_expenses: !!expense,
          has_distance: totalDistance > 0,
        });
      });

      // Sort by profit margin descending
      summaries.sort((a, b) => b.profit_margin - a.profit_margin);

      // Calculate fleet summary
      const fleet: FleetSummary = {
        active_buses: summaries.length,
        total_trips: summaries.reduce((sum, s) => sum + s.trip_count, 0),
        total_distance: summaries.reduce((sum, s) => sum + s.total_distance, 0),
        total_revenue: summaries.reduce((sum, s) => sum + s.total_revenue, 0),
        total_expenses: summaries.reduce((sum, s) => sum + s.total_expenses, 0),
        fleet_profit: 0,
        fleet_profit_margin: 0,
        fleet_avg_efficiency: 0,
        top_performer: summaries[0],
        needs_attention: summaries.find(s => s.avg_km_per_liter > 0 && s.avg_km_per_liter < 8),
      };

      fleet.fleet_profit = fleet.total_revenue - fleet.total_expenses;
      fleet.fleet_profit_margin = fleet.total_revenue > 0 ? (fleet.fleet_profit / fleet.total_revenue) * 100 : 0;
      
      const efficiencies = summaries.filter(s => s.avg_km_per_liter > 0).map(s => s.avg_km_per_liter);
      fleet.fleet_avg_efficiency = efficiencies.length > 0 
        ? efficiencies.reduce((sum, e) => sum + e, 0) / efficiencies.length 
        : 0;


      setBusSummaries(summaries);
      setFleetSummary(fleet);
    } catch (error: any) {
      console.error('Error fetching grouped data:', error);
      toast({
        title: "Error",
        description: "Failed to load daily trips data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    busSummaries,
    fleetSummary,
    loading,
    refetch: fetchGroupedData,
  };
}

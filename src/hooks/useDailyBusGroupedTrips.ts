import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Trip {
  id: string;
  trip_no: string;
  trip_date: string;
  route_id: string;
  route_name?: string;
  driver_name?: string;
  conductor_name?: string;
  income: number;
  income_details?: any;
  distance_km?: number;
  start_odo?: number;
  end_odo?: number;
  start_time?: string;
  end_time?: string;
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

export function useDailyBusGroupedTrips(selectedDate: Date) {
  const [busSummaries, setBusSummaries] = useState<BusDailySummary[]>([]);
  const [fleetSummary, setFleetSummary] = useState<FleetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroupedData();
  }, [selectedDate]);

  const fetchGroupedData = async () => {
    try {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];

      // Fetch trips for the date
      const { data: tripsData, error: tripsError } = await supabase
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
          notes,
          buses:bus_id(bus_no),
          routes:route_id(route_name)
        `)
        .eq('trip_date', dateStr)
        .order('bus_id')
        .order('start_time');

      if (tripsError) throw tripsError;

      // Fetch daily bus expenses for the date
      const { data: expensesData, error: expensesError } = await supabase
        .from('daily_bus_expenses')
        .select('*')
        .eq('expense_date', dateStr);

      if (expensesError) throw expensesError;

      // Group trips by bus_id
      const groupedByBus = new Map<string, any[]>();
      
      (tripsData || []).forEach((trip: any) => {
        const busId = trip.bus_id;
        if (!groupedByBus.has(busId)) {
          groupedByBus.set(busId, []);
        }
        
        // Parse notes to get driver/conductor info
        const notes = typeof trip.notes === 'string' ? JSON.parse(trip.notes || '{}') : (trip.notes || {});
        
        groupedByBus.get(busId)!.push({
          id: trip.id,
          trip_no: trip.trip_no,
          trip_date: trip.trip_date,
          route_id: trip.route_id,
          route_name: trip.routes?.route_name || 'N/A',
          driver_name: notes.driver || 'N/A',
          conductor_name: notes.conductor || 'N/A',
          income: trip.income || 0,
          income_details: trip.income_details,
          distance_km: trip.distance_km,
          start_odo: trip.odometer_start,
          end_odo: trip.odometer_end,
          start_time: trip.start_time,
          end_time: trip.end_time,
        });
      });

      // Create expense lookup map
      const expenseMap = new Map<string, DailyBusExpense>();
      (expensesData || []).forEach((expense: any) => {
        expenseMap.set(expense.bus_id, expense);
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
        
        // Calculate km/L (distance / fuel liters)
        let avgKmPerLiter = 0;
        if (fuelCost > 0 && expense?.diesel_price_per_liter && totalDistance > 0) {
          const liters = fuelCost / expense.diesel_price_per_liter;
          avgKmPerLiter = totalDistance / liters;
        }
        
        const routes = [...new Set(trips.map(t => t.route_name).filter(Boolean))];
        const drivers = [...new Set(trips.map(t => t.driver_name).filter(Boolean))];
        const conductors = [...new Set(trips.map(t => t.conductor_name).filter(Boolean))];
        
        summaries.push({
          bus_id: busId,
          bus_no: busNo,
          date: dateStr,
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

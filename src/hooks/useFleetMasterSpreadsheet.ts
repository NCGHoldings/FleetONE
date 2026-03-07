import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export interface FleetRosterRow {
  id: string;
  bus_id: string | null;
  bus_no: string;
  route_id: string | null;
  route_label: string | null;
  bus_type: string | null;
  permit_type: string | null;
  route_start_date: string | null;
  trips_per_day: number;
  default_driver: string | null;
  default_conductor: string | null;
  day_target: number;
  remark: string | null;
  section: string | null;
  sort_order: number;
  is_active: boolean;
  turn_01_time: string | null;
  turn_02_time: string | null;
}

export interface ExpandedFleetRow extends FleetRosterRow {
  trip_sequence: number;
  trip_id: string | null;
  trip_no: string | null;
  passenger_income: number;
  luggage_income: number;
  total_expenses: number;
  net_income: number;
  driver_name: string | null;
  conductor_name: string | null;
  _isExpanded: boolean;
}

export function useFleetMasterSpreadsheet(selectedDate: Date) {
  const [roster, setRoster] = useState<FleetRosterRow[]>([]);
  const [expandedRows, setExpandedRows] = useState<ExpandedFleetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const fetchRoster = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch roster with bus info
      const { data: rosterData, error: rosterError } = await supabase
        .from("fleet_master_roster")
        .select(`*, buses!inner(bus_no)`)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (rosterError) throw rosterError;

      const rosterRows: FleetRosterRow[] = (rosterData || []).map((r: any) => ({
        id: r.id,
        bus_id: r.bus_id,
        bus_no: r.buses?.bus_no || '',
        route_id: r.route_id,
        route_label: r.route_label,
        bus_type: r.bus_type,
        permit_type: r.permit_type,
        route_start_date: r.route_start_date,
        trips_per_day: r.trips_per_day || 1,
        default_driver: r.default_driver,
        default_conductor: r.default_conductor,
        day_target: r.day_target || 0,
        remark: r.remark,
        section: r.section,
        sort_order: r.sort_order || 0,
        is_active: r.is_active,
        turn_01_time: r.turn_01_time,
        turn_02_time: r.turn_02_time,
      }));

      setRoster(rosterRows);

      // Fetch daily trips for the selected date to overlay financial data
      const busIds = rosterRows.map(r => r.bus_id).filter(Boolean) as string[];
      let tripsMap: Record<string, any[]> = {};
      
      if (busIds.length > 0) {
        const { data: tripsData } = await supabase
          .from("daily_trips")
          .select("*")
          .eq("trip_date", dateStr)
          .in("bus_id", busIds)
          .order("trip_no", { ascending: true });

        (tripsData || []).forEach((t: any) => {
          const key = t.bus_id;
          if (!tripsMap[key]) tripsMap[key] = [];
          tripsMap[key].push(t);
        });
      }

      // Fetch daily_bus_expenses for the selected date
      let expensesMap: Record<string, number> = {};
      if (busIds.length > 0) {
        const { data: expData } = await supabase
          .from("daily_bus_expenses")
          .select("bus_id, fuel_cost, repair, tyre_tube, salary, police, food, emission_fitness, permits_renewal, staff_accommodation, highway_charges, accident_compensation, parking, log_sheet, vehicle_hire, ntc, runner, short_misc, temporary_permit, body_wash, legal_court, other")
          .eq("expense_date", dateStr)
          .in("bus_id", busIds);

        (expData || []).forEach((e: any) => {
          const total = (e.fuel_cost || 0) + (e.repair || 0) + (e.tyre_tube || 0) + (e.salary || 0) +
            (e.police || 0) + (e.food || 0) + (e.emission_fitness || 0) + (e.permits_renewal || 0) +
            (e.staff_accommodation || 0) + (e.highway_charges || 0) + (e.accident_compensation || 0) +
            (e.parking || 0) + (e.log_sheet || 0) + (e.vehicle_hire || 0) + (e.ntc || 0) +
            (e.runner || 0) + (e.short_misc || 0) + (e.temporary_permit || 0) + (e.body_wash || 0) +
            (e.legal_court || 0) + (e.other || 0);
          expensesMap[e.bus_id] = (expensesMap[e.bus_id] || 0) + total;
        });
      }

      // Expand rows based on trips_per_day
      const expanded: ExpandedFleetRow[] = [];
      rosterRows.forEach((row) => {
        const busTrips = tripsMap[row.bus_id || ''] || [];
        const totalExpenses = expensesMap[row.bus_id || ''] || 0;

        for (let seq = 1; seq <= row.trips_per_day; seq++) {
          const matchedTrip = busTrips[seq - 1] || null;
          const incomeDetails = matchedTrip?.income_details as any;
          const passengerIncome = incomeDetails
            ? (Number(incomeDetails.bus_collection) || 0) + (Number(incomeDetails.call_booking) || 0) + (Number(incomeDetails.agent_booking) || 0)
            : 0;
          const luggageIncome = incomeDetails ? (Number(incomeDetails.luggage_income) || 0) : 0;
          // Split expenses evenly across trips for display
          const tripExpenses = row.trips_per_day > 1 ? totalExpenses / row.trips_per_day : totalExpenses;

          // Extract driver/conductor from trip notes JSON if available
          let tripDriver = row.default_driver;
          let tripConductor = row.default_conductor;
          if (matchedTrip?.notes) {
            try {
              const parsed = typeof matchedTrip.notes === 'string' ? JSON.parse(matchedTrip.notes) : matchedTrip.notes;
              if (parsed.driver) tripDriver = parsed.driver;
              if (parsed.conductor) tripConductor = parsed.conductor;
            } catch {
              // Legacy string format — ignore
            }
          }

          expanded.push({
            ...row,
            trip_sequence: seq,
            trip_id: matchedTrip?.id || null,
            trip_no: matchedTrip?.trip_no || `${String(seq).padStart(4, '0')}`,
            passenger_income: passengerIncome,
            luggage_income: luggageIncome,
            total_expenses: tripExpenses,
            net_income: passengerIncome + luggageIncome - tripExpenses,
            driver_name: tripDriver,
            conductor_name: tripConductor,
            _isExpanded: row.trips_per_day > 1,
          });
        }
      });

      setExpandedRows(expanded);
    } catch (error: any) {
      console.error("Error fetching fleet roster:", error);
      toast({ title: "Error", description: "Failed to load fleet roster", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const updateField = async (rosterId: string, field: string, value: any) => {
    try {
      const numericFields = ['trips_per_day', 'day_target', 'sort_order'];
      const finalValue = numericFields.includes(field) ? Number(value) || 0 : value;

      const { error } = await supabase
        .from("fleet_master_roster")
        .update({ [field]: finalValue })
        .eq("id", rosterId);

      if (error) throw error;

      // Update local state
      setExpandedRows(prev => prev.map(r =>
        r.id === rosterId ? { ...r, [field]: finalValue } : r
      ));

      // If trips_per_day changed, refetch to re-expand
      if (field === 'trips_per_day') {
        await fetchRoster();
      }
    } catch (error: any) {
      console.error("Error updating roster field:", error);
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    }
  };

  const confirmAndCreateTrips = async () => {
    try {
      const activeRoster = roster.filter(r => r.is_active && r.bus_id && r.remark === 'Running');
      if (activeRoster.length === 0) {
        toast({ title: "No active buses", description: "No running buses found to create trips", variant: "destructive" });
        return;
      }

      // Check existing trips for this date
      const busIds = activeRoster.map(r => r.bus_id!);
      const { data: existingTrips } = await supabase
        .from("daily_trips")
        .select("bus_id, trip_no")
        .eq("trip_date", dateStr)
        .in("bus_id", busIds);

      const existingSet = new Set((existingTrips || []).map(t => `${t.bus_id}_${t.trip_no}`));

      // Build trip inserts
      const tripsToInsert: any[] = [];
      let tripCounter = 1;

      for (const row of activeRoster) {
        for (let seq = 1; seq <= row.trips_per_day; seq++) {
          const tripNo = String(tripCounter).padStart(4, '0');
          const key = `${row.bus_id}_${tripNo}`;

          if (!existingSet.has(key)) {
            tripsToInsert.push({
              bus_id: row.bus_id,
              route_id: row.route_id,
              trip_date: dateStr,
              trip_no: tripNo,
              notes: `Driver: ${row.default_driver || 'N/A'}, Conductor: ${row.default_conductor || 'N/A'}`,
              data_source: 'manual' as const,
            });
          }
          tripCounter++;
        }
      }

      if (tripsToInsert.length === 0) {
        toast({ title: "Already created", description: `All trips for ${dateStr} already exist` });
        return;
      }

      const { error } = await supabase.from("daily_trips").insert(tripsToInsert);
      if (error) throw error;

      toast({ title: "Success", description: `Created ${tripsToInsert.length} trips for ${dateStr}` });
      await fetchRoster();
    } catch (error: any) {
      console.error("Error creating trips:", error);
      toast({ title: "Error", description: error.message || "Failed to create trips", variant: "destructive" });
    }
  };

  const addRosterEntry = async (busId: string) => {
    try {
      const { data: bus } = await supabase.from("buses").select("bus_no, route").eq("id", busId).single();
      
      const { error } = await supabase.from("fleet_master_roster").insert({
        bus_id: busId,
        route_label: bus?.route || '',
        sort_order: roster.length + 1,
      });

      if (error) throw error;
      toast({ title: "Success", description: `Added ${bus?.bus_no || 'bus'} to roster` });
      await fetchRoster();
    } catch (error: any) {
      console.error("Error adding roster entry:", error);
      toast({ title: "Error", description: error.message || "Failed to add", variant: "destructive" });
    }
  };

  const deleteRosterEntry = async (rosterId: string) => {
    try {
      const { error } = await supabase.from("fleet_master_roster").delete().eq("id", rosterId);
      if (error) throw error;
      toast({ title: "Success", description: "Removed from roster" });
      await fetchRoster();
    } catch (error: any) {
      console.error("Error deleting roster entry:", error);
      toast({ title: "Error", description: error.message || "Failed to delete", variant: "destructive" });
    }
  };

  const bulkAddAllBuses = async () => {
    try {
      const { data: allBuses } = await supabase.from("buses").select("id, bus_no, route").order("bus_no");
      if (!allBuses || allBuses.length === 0) {
        toast({ title: "No buses", description: "No buses found in the system", variant: "destructive" });
        return;
      }
      const existingBusIds = new Set(roster.map(r => r.bus_id));
      const newBuses = allBuses.filter(b => !existingBusIds.has(b.id));
      if (newBuses.length === 0) {
        toast({ title: "All added", description: "All buses are already in the roster" });
        return;
      }
      const entries = newBuses.map((bus, i) => ({
        bus_id: bus.id,
        route_label: bus.route || '',
        trips_per_day: 1,
        remark: 'Running',
        is_active: true,
        sort_order: roster.length + i + 1,
      }));
      const { error } = await supabase.from("fleet_master_roster").insert(entries);
      if (error) throw error;
      toast({ title: "Success", description: `Added ${newBuses.length} buses to roster` });
      await fetchRoster();
    } catch (error: any) {
      console.error("Error bulk adding buses:", error);
      toast({ title: "Error", description: error.message || "Failed to bulk add", variant: "destructive" });
    }
  };

  // Compute KPIs
  const kpis = {
    totalBuses: roster.filter(r => r.remark === 'Running').length,
    totalRevenue: expandedRows.reduce((s, r) => s + r.passenger_income + r.luggage_income, 0),
    totalExpenses: expandedRows.reduce((s, r) => s + r.total_expenses, 0),
    netIncome: expandedRows.reduce((s, r) => s + r.net_income, 0),
  };

  return {
    roster,
    expandedRows,
    loading,
    kpis,
    updateField,
    confirmAndCreateTrips,
    addRosterEntry,
    deleteRosterEntry,
    bulkAddAllBuses,
    refetch: fetchRoster,
  };
}

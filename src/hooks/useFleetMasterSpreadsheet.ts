// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export interface FleetRosterRow {
  id: string;
  bus_id: string | null;
  bus_no: string;
  bus_model: string;
  expected_km_per_liter: number;
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
  // Meter & Fuel fields
  start_meter: number;
  end_meter: number;
  total_mileage: number;
  fuel_liters: number;
  fuel_consumption: number;
  standard_rate: number;
  performance: number;
}

export type EditMode = 'master' | 'daily';

export function useFleetMasterSpreadsheet(selectedDate: Date, editMode: EditMode = 'master') {
  const [roster, setRoster] = useState<FleetRosterRow[]>([]);
  const [expandedRows, setExpandedRows] = useState<ExpandedFleetRow[]>([]);
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const fetchRoster = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      // Fetch roster with bus info including model and expected_km_per_liter
      const { data: rosterData, error: rosterError } = await supabase
        .from("fleet_master_roster")
        .select(`*, buses!inner(bus_no, model, expected_km_per_liter)`)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (rosterError) throw rosterError;

      const { data: routesData } = await supabase
        .from("routes")
        .select("id, route_no, route_name")
        .eq("is_active", true);
      setAvailableRoutes(routesData || []);

      const rosterRows: FleetRosterRow[] = (rosterData || []).map((r: any) => ({
        id: r.id,
        bus_id: r.bus_id,
        bus_no: r.buses?.bus_no || '',
        bus_model: r.buses?.model || '',
        expected_km_per_liter: r.buses?.expected_km_per_liter || 0,
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

      // Fetch daily trips for the selected date
      const busIds = rosterRows.map(r => r.bus_id).filter(Boolean) as string[];
      let tripsMap: Record<string, any[]> = {};
      let fuelExpenseMap: Record<string, number> = {};
      
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

      // Expand rows based on max(trips_per_day, actual daily trips count)
      const expanded: ExpandedFleetRow[] = [];
      rosterRows.forEach((row) => {
        const busTrips = tripsMap[row.bus_id || ''] || [];
        const totalExpenses = expensesMap[row.bus_id || ''] || 0;
        const effectiveTripsPerDay = Math.max(row.trips_per_day, busTrips.length);

        for (let seq = 1; seq <= effectiveTripsPerDay; seq++) {
          const matchedTrip = busTrips[seq - 1] || null;
          const incomeDetails = matchedTrip?.income_details as any;
          const passengerIncome = incomeDetails
            ? (Number(incomeDetails.bus_collection) || 0) + (Number(incomeDetails.call_booking) || 0) + (Number(incomeDetails.agent_booking) || 0)
            : 0;
          const luggageIncome = incomeDetails ? (Number(incomeDetails.luggage_income) || 0) : 0;
          const tripExpenses = effectiveTripsPerDay > 1 ? totalExpenses / effectiveTripsPerDay : totalExpenses;

          // Extract driver/conductor from trip notes JSON if available
          let tripDriver = row.default_driver;
          let tripConductor = row.default_conductor;
          let tripTurn01 = row.turn_01_time;
          let tripTurn02 = row.turn_02_time;
          if (matchedTrip?.notes) {
            try {
              const parsed = typeof matchedTrip.notes === 'string' ? JSON.parse(matchedTrip.notes) : matchedTrip.notes;
              if (parsed.driver) tripDriver = parsed.driver;
              if (parsed.conductor) tripConductor = parsed.conductor;
              if (parsed.turn_01_time) tripTurn01 = parsed.turn_01_time;
              if (parsed.turn_02_time) tripTurn02 = parsed.turn_02_time;
            } catch {
              // Legacy string format — ignore
            }
          }

          // Meter & Fuel data from matched trip
          const startMeter = matchedTrip?.odometer_start || 0;
          const endMeter = matchedTrip?.odometer_end || 0;
          const totalMileage = matchedTrip?.distance_km || (endMeter > startMeter ? endMeter - startMeter : 0);
          const fuelLiters = matchedTrip?.fuel_liters || 0;
          const fuelConsumption = fuelLiters > 0 && totalMileage > 0 ? totalMileage / fuelLiters : 0;
          const standardRate = row.expected_km_per_liter;
          const performance = fuelConsumption > 0 ? standardRate - fuelConsumption : 0;

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
            daily_turn_01_time: tripTurn01,
            daily_turn_02_time: tripTurn02,
            _isExpanded: effectiveTripsPerDay > 1,
            start_meter: startMeter,
            end_meter: endMeter,
            total_mileage: totalMileage,
            fuel_liters: fuelLiters,
            fuel_consumption: Math.round(fuelConsumption * 100) / 100,
            standard_rate: standardRate,
            performance: Math.round(performance * 100) / 100,
          });
        }
      });

      setExpandedRows(expanded);
    } catch (error: any) {
      console.error("Error fetching fleet roster:", error);
      toast({ title: "Error", description: "Failed to load fleet roster", variant: "destructive" });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // Trip-level fields that should update daily_trips instead of fleet_master_roster
  const TRIP_FIELDS = ['odometer_start', 'odometer_end', 'fuel_liters'];
  const BUS_DIRECT_FIELDS = ['standard_rate'];

  const updateField = async (rosterId: string, field: string, value: any) => {
    try {
      // Standard rate updates the buses table directly
      if (BUS_DIRECT_FIELDS.includes(field)) {
        const row = expandedRows.find(r => r.id === rosterId);
        if (!row?.bus_id) return;
        const numVal = Number(value) || 0;
        const dbField = field === 'standard_rate' ? 'expected_km_per_liter' : field;
        const { error } = await supabase
          .from("buses")
          .update({ [dbField]: numVal })
          .eq("id", row.bus_id);
        if (error) throw error;
        await fetchRoster(true);
        return;
      }

      if (TRIP_FIELDS.includes(field)) {
        // Find the matching expanded row to get trip_id
        const row = expandedRows.find(r => r.id === rosterId);
        if (!row?.trip_id) {
          toast({ title: "No trip", description: "Create trips first before editing meter/fuel data", variant: "destructive" });
          return;
        }

        const numVal = Number(value) || 0;
        const updatePayload: Record<string, any> = { [field]: numVal };

        // Auto-recalculate distance_km and km_per_liter when meter changes
        if (field === 'odometer_start' || field === 'odometer_end') {
          const currentStart = field === 'odometer_start' ? numVal : row.start_meter;
          const currentEnd = field === 'odometer_end' ? numVal : row.end_meter;
          if (currentEnd > currentStart) {
            const dist = currentEnd - currentStart;
            updatePayload.distance_km = dist;
            if (row.fuel_liters > 0) {
              updatePayload.km_per_liter = Math.round((dist / row.fuel_liters) * 100) / 100;
            }
          }
        }

        if (field === 'fuel_liters' && numVal > 0 && row.total_mileage > 0) {
          updatePayload.km_per_liter = Math.round((row.total_mileage / numVal) * 100) / 100;
        }

        const { error } = await supabase
          .from("daily_trips")
          .update(updatePayload)
          .eq("id", row.trip_id);

        if (error) throw error;
        // Silent refresh — no loading spinner, preserves scroll
        await fetchRoster(true);
        return;
      }

      // Handle trips_per_day based on edit mode
      if (field === 'trips_per_day') {
        const newCount = Number(value) || 1;
        
        if (editMode === 'daily') {
          // Daily mode: add/remove daily_trips records for this date only
          const row = expandedRows.find(r => r.id === rosterId);
          if (!row?.bus_id) return;

          // Get current daily trips for this bus on this date
          const { data: currentTrips } = await supabase
            .from("daily_trips")
            .select("id, trip_no, income_details, odometer_start, odometer_end")
            .eq("bus_id", row.bus_id)
            .eq("trip_date", dateStr)
            .order("trip_no", { ascending: true });

          const currentCount = currentTrips?.length || 0;

          if (newCount > currentCount) {
            // Add more trips
            const datePrefix = dateStr.replace(/-/g, '');
            const { data: maxTripData } = await supabase
              .from("daily_trips")
              .select("trip_no")
              .ilike("trip_no", `${datePrefix}-%`)
              .order("trip_no", { ascending: false })
              .limit(1);

            let tripCounter = 1;
            if (maxTripData && maxTripData.length > 0) {
              const match = maxTripData[0].trip_no.match(/-(\d+)$/);
              if (match) tripCounter = parseInt(match[1], 10) + 1;
            }

            const tripsToInsert = [];
            for (let i = 0; i < newCount - currentCount; i++) {
              tripsToInsert.push({
                bus_id: row.bus_id,
                route_id: row.route_id,
                route_label: row.route_label,
                trip_date: dateStr,
                trip_no: `${datePrefix}-${String(tripCounter + i).padStart(4, '0')}`,
                notes: JSON.stringify({
                  driver: row.default_driver || null,
                  conductor: row.default_conductor || null,
                }),
                data_source: 'manual' as const,
              });
            }

            const { error } = await supabase.from("daily_trips").insert(tripsToInsert);
            if (error) throw error;
            toast({ title: "Trips added", description: `Added ${tripsToInsert.length} trip(s) for today` });
          } else if (newCount < currentCount) {
            // Remove excess trips (from last), only if they have no income/odometer data
            const tripsToCheck = (currentTrips || []).slice(newCount);
            const safeToDelete: string[] = [];
            const hasData: number = tripsToCheck.filter(t => {
              const income = t.income_details as any;
              const hasIncome = income && (
                Number(income.bus_collection || 0) > 0 ||
                Number(income.call_booking || 0) > 0 ||
                Number(income.agent_booking || 0) > 0 ||
                Number(income.luggage_income || 0) > 0
              );
              const hasOdometer = (t.odometer_start && t.odometer_start > 0) || (t.odometer_end && t.odometer_end > 0);
              if (!hasIncome && !hasOdometer) {
                safeToDelete.push(t.id);
                return false;
              }
              return true;
            }).length;

            if (safeToDelete.length > 0) {
              const { error } = await supabase
                .from("daily_trips")
                .delete()
                .in("id", safeToDelete);
              if (error) throw error;
            }

            if (hasData > 0) {
              toast({ 
                title: "Some trips kept", 
                description: `${hasData} trip(s) have income/odometer data and cannot be removed`, 
                variant: "destructive" 
              });
            } else {
              toast({ title: "Trips reduced", description: `Removed ${safeToDelete.length} trip(s) for today` });
            }
          }

          await fetchRoster(true);
          return;
        }

        // Master mode: update fleet_master_roster
        const { error } = await supabase
          .from("fleet_master_roster")
          .update({ trips_per_day: newCount })
          .eq("id", rosterId);

        if (error) throw error;
        setExpandedRows(prev => prev.map(r =>
          r.id === rosterId ? { ...r, trips_per_day: newCount } : r
        ));
        await fetchRoster(true);
        return;
      }

      // Other master-only fields should always update fleet_master_roster
      const masterOnlyFields = ['bus_type', 'permit_type', 'sort_order', 'day_target'];
      if (masterOnlyFields.includes(field)) {
        const masterNumericFields = ['day_target', 'sort_order'];
        const masterValue = masterNumericFields.includes(field) ? Number(value) || 0 : value;

        const { error } = await supabase
          .from("fleet_master_roster")
          .update({ [field]: masterValue })
          .eq("id", rosterId);

        if (error) throw error;

        setExpandedRows(prev => prev.map(r =>
          r.id === rosterId ? { ...r, [field]: masterValue } : r
        ));
        return;
      }

      if (editMode === 'daily') {
        // For per-trip route updates, find the exact expanded row (matching trip_sequence)
        const row = expandedRows.find(r => r.id === rosterId && (r.trip_id || r.trip_sequence === 1));
        const rosterLevelFields = ['route_label', 'route_id', 'remark'];
        if (!row?.trip_id) {
          if (!rosterLevelFields.includes(field)) {
            toast({ title: "No trip generated", description: "You must click 'Create Trips' for today before you can override daily values.", variant: "destructive" });
            return;
          }
          // For roster-level fields, fall through to master roster update below
        } else {
          const dailyUpdatePayload: Record<string, any> = {};
          
          // Map master roster fields to daily_trips fields — route updates go to the specific trip
          if (field === 'route_label') dailyUpdatePayload.route_label = value;
          if (field === 'route_id') dailyUpdatePayload.route_id = value;
          if (field === 'remark') {
            // Remark is roster-level, handled below
          }

          // For driver/conductor/turn times, update the 'notes' JSON
          if (field === 'default_driver' || field === 'default_conductor' || field === 'turn_01_time' || field === 'turn_02_time') {
            if (!row.trip_id) {
              toast({ title: "No trip", description: "Create trips first before overriding crew or times", variant: "destructive" });
              return;
            }
            
            try {
              const { data: tripData } = await supabase
                .from("daily_trips")
                .select("notes")
                .eq("id", row.trip_id)
                .single();
                
              let currentNotes: Record<string, any> = {};
              if (tripData?.notes) {
                currentNotes = typeof tripData.notes === 'string' ? JSON.parse(tripData.notes) : tripData.notes;
              }
              
              if (field === 'default_driver') currentNotes['driver'] = value;
              if (field === 'default_conductor') currentNotes['conductor'] = value;
              if (field === 'turn_01_time') currentNotes['turn_01_time'] = value;
              if (field === 'turn_02_time') currentNotes['turn_02_time'] = value;
              
              dailyUpdatePayload.notes = JSON.stringify(currentNotes);
            } catch (e) {
              console.error("Error formatting notes JSON:", e);
              dailyUpdatePayload.notes = JSON.stringify({
                driver: field === 'default_driver' ? value : row.driver_name,
                conductor: field === 'default_conductor' ? value : row.conductor_name,
                turn_01_time: field === 'turn_01_time' ? value : row.daily_turn_01_time,
                turn_02_time: field === 'turn_02_time' ? value : row.daily_turn_02_time
              });
            }
          }

          if (Object.keys(dailyUpdatePayload).length > 0) {
            const { error } = await supabase
              .from("daily_trips")
              .update(dailyUpdatePayload)
              .eq("id", row.trip_id);

            if (error) throw error;
            
            await fetchRoster(true);
            return;
          }
        }
      }

      // If EditMode is Master, or we're editing a field that only belongs on the Master (like bus_type)
      const numericFields = ['trips_per_day', 'day_target', 'sort_order'];
      const finalValue = numericFields.includes(field) ? Number(value) || 0 : value;

      const { error } = await supabase
        .from("fleet_master_roster")
        .update({ [field]: finalValue })
        .eq("id", rosterId);

      if (error) throw error;

      // Optimistic local update
      setExpandedRows(prev => prev.map(r =>
        r.id === rosterId ? { ...r, [field]: finalValue } : r
      ));

      if (field === 'trips_per_day') {
        await fetchRoster(true);
      }
    } catch (error: any) {
      console.error("Error updating field:", error);
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

      const busIds = activeRoster.map(r => r.bus_id!);
      
      // Get ALL existing trips for this date to avoid duplicates
      const { data: existingTrips } = await supabase
        .from("daily_trips")
        .select("bus_id, trip_no")
        .eq("trip_date", dateStr)
        .in("bus_id", busIds);

      // Track how many trips each bus already has (not just existence)
      const existingTripCounts: Record<string, number> = {};
      (existingTrips || []).forEach(t => {
        existingTripCounts[t.bus_id] = (existingTripCounts[t.bus_id] || 0) + 1;
      });

      // Find the max trip counter for this date prefix to avoid collisions
      const datePrefix = dateStr.replace(/-/g, ''); // e.g. "20260322"
      const { data: maxTripData } = await supabase
        .from("daily_trips")
        .select("trip_no")
        .ilike("trip_no", `${datePrefix}-%`)
        .order("trip_no", { ascending: false })
        .limit(1);

      let tripCounter = 1;
      if (maxTripData && maxTripData.length > 0) {
        const match = maxTripData[0].trip_no.match(/-(\d+)$/);
        if (match) {
          tripCounter = parseInt(match[1], 10) + 1;
        }
      }

      const tripsToInsert: any[] = [];

      for (const row of activeRoster) {
        const existingCount = existingTripCounts[row.bus_id!] || 0;
        // Only create trips for sequences beyond what already exists
        if (existingCount >= row.trips_per_day) continue;

        for (let seq = existingCount + 1; seq <= row.trips_per_day; seq++) {
          const tripNo = `${datePrefix}-${String(tripCounter).padStart(4, '0')}`;

          tripsToInsert.push({
            bus_id: row.bus_id,
            route_id: row.route_id,
            route_label: row.route_label,
            trip_date: dateStr,
            trip_no: tripNo,
            notes: JSON.stringify({ 
              driver: row.default_driver || null, 
              conductor: row.default_conductor || null,
              turn_01_time: row.turn_01_time || null,
              turn_02_time: row.turn_02_time || null
            }),
            data_source: 'manual' as const,
          });
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

  const addRosterEntry = async (busId: string, routeId?: string, routeLabel?: string) => {
    try {
      const { data: bus } = await supabase.from("buses").select("bus_no, route").eq("id", busId).single();
      
      const { error } = await supabase.from("fleet_master_roster").insert({
        bus_id: busId,
        route_id: routeId || null,
        route_label: routeLabel || bus?.route || '',
        sort_order: roster.length + 1,
        is_active: true,
        trips_per_day: 1,
        remark: 'Running'
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
      const { data: allBuses } = await supabase.from("buses").select("id, bus_no, route, category_id").eq("category_id", "8ba0dd7b-c503-4c3e-86e0-ac68480f3f8c").order("bus_no");
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
  // Only count first trip_sequence for bus-level KPIs
  const uniqueRows = expandedRows.filter(r => r.trip_sequence === 1);
  const kpis = {
    totalBuses: roster.filter(r => r.remark === 'Running' || !r.remark).length,
    totalRevenue: expandedRows.reduce((s, r) => s + r.passenger_income + r.luggage_income, 0),
    totalExpenses: expandedRows.reduce((s, r) => s + r.total_expenses, 0),
    netIncome: expandedRows.reduce((s, r) => s + r.net_income, 0),
    totalMileage: expandedRows.reduce((s, r) => s + r.total_mileage, 0),
    totalFuelLiters: expandedRows.reduce((s, r) => s + r.fuel_liters, 0),
  };

  return {
    roster,
    expandedRows,
    availableRoutes,
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

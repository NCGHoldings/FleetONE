import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export interface CrewTrip {
  id: string;
  trip_no: string;
  trip_date: string;
  route_id: string;
  route_name?: string;
  income: number;
  income_details?: any;
  distance_km?: number;
  start_odo?: number;
  end_odo?: number;
  start_time?: string;
  end_time?: string;
}

export interface CrewGroup {
  crew_signature: string;
  bus_id: string;
  bus_no: string;
  driver_name: string;
  conductor_name: string;
  trip_date: string;
  trips: CrewTrip[];
  trip_count: number;
  total_income: number;
  total_distance: number;
  first_start: string | null;
  last_end: string | null;
  route_names: string[];
}

export interface CrewGroupedSummary {
  crewGroups: CrewGroup[];
  totalGroups: number;
  totalTrips: number;
  totalIncome: number;
  totalDistance: number;
}

/**
 * Hook to group daily trips by crew combination (bus + driver + conductor)
 * This allows viewing all trips for the same crew on one page
 */
export function useCrewGroupedTrips(
  selectedDate: Date | null,
  dateRange?: { from: Date; to: Date } | undefined,
  enabled: boolean = true
) {
  const [crewGroups, setCrewGroups] = useState<CrewGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (selectedDate || (dateRange?.from && dateRange?.to)) {
      fetchCrewGroupedData();
    }
  }, [selectedDate, dateRange?.from, dateRange?.to, enabled]);

  const fetchCrewGroupedData = async () => {
    try {
      setLoading(true);

      // Determine date range
      let fromDateStr: string;
      let toDateStr: string;

      if (dateRange?.from && dateRange?.to) {
        fromDateStr = format(dateRange.from, 'yyyy-MM-dd');
        toDateStr = format(dateRange.to, 'yyyy-MM-dd');
      } else if (selectedDate) {
        fromDateStr = toDateStr = format(selectedDate, 'yyyy-MM-dd');
      } else {
        console.warn('No date provided');
        return;
      }

      // Fetch trips with bus and route info
      const tripsQuery = supabase
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
          routes:route_id(route_name, route_no)
        `)
        .gte('trip_date', fromDateStr)
        .lte('trip_date', toDateStr)
        .order('trip_date')
        .order('start_time');

      const { data: tripsData, error: tripsError } = await tripsQuery;

      if (tripsError) {
        console.error('Error fetching trips:', tripsError);
        throw tripsError;
      }

      console.log(`📊 Crew grouping: Found ${tripsData?.length || 0} trips`);

      // Group by crew signature: bus_id|driver|conductor|trip_date
      const crewMap = new Map<string, {
        bus_id: string;
        bus_no: string;
        driver_name: string;
        conductor_name: string;
        trip_date: string;
        trips: CrewTrip[];
      }>();

      // Safe JSON parse helper to prevent crashes on empty strings
      const safeParseJSON = <T,>(value: any, fallback: T): T => {
        if (value === null || value === undefined || value === '') return fallback;
        if (typeof value === 'object') return value as T;
        try { return JSON.parse(value); } 
        catch { return fallback; }
      };

      (tripsData || []).forEach((trip: any) => {
        // Parse notes to get driver/conductor - using safe parser
        const notes: Record<string, any> = safeParseJSON(trip.notes, {});
        
        const driverName = notes.driver || 'Unknown';
        const conductorName = notes.conductor || 'Unknown';
        const busNo = trip.buses?.bus_no || 'Unknown';
        
        // Create crew signature for grouping
        const crewSignature = `${trip.bus_id}|${driverName}|${conductorName}|${trip.trip_date}`;

        if (!crewMap.has(crewSignature)) {
          crewMap.set(crewSignature, {
            bus_id: trip.bus_id,
            bus_no: busNo,
            driver_name: driverName,
            conductor_name: conductorName,
            trip_date: trip.trip_date,
            trips: [],
          });
        }

        crewMap.get(crewSignature)!.trips.push({
          id: trip.id,
          trip_no: trip.trip_no,
          trip_date: trip.trip_date,
          route_id: trip.route_id,
          route_name: trip.routes?.route_name || 'N/A',
          income: trip.income || 0,
          income_details: trip.income_details,
          distance_km: trip.distance_km,
          start_odo: trip.odometer_start,
          end_odo: trip.odometer_end,
          start_time: trip.start_time,
          end_time: trip.end_time,
        });
      });

      // Convert to CrewGroup array with aggregations
      const groups: CrewGroup[] = Array.from(crewMap.entries()).map(([signature, data]) => {
        const trips = data.trips;
        const totalIncome = trips.reduce((sum, t) => sum + (t.income || 0), 0);
        const totalDistance = trips.reduce((sum, t) => sum + (t.distance_km || 0), 0);
        const routeNames = [...new Set(trips.map(t => t.route_name).filter(Boolean))];
        
        // Get first and last times
        const times = trips.map(t => t.start_time).filter(Boolean).sort();
        const endTimes = trips.map(t => t.end_time).filter(Boolean).sort();
        
        return {
          crew_signature: signature,
          bus_id: data.bus_id,
          bus_no: data.bus_no,
          driver_name: data.driver_name,
          conductor_name: data.conductor_name,
          trip_date: data.trip_date,
          trips: trips.sort((a, b) => {
            if (!a.start_time || !b.start_time) return 0;
            return a.start_time.localeCompare(b.start_time);
          }),
          trip_count: trips.length,
          total_income: totalIncome,
          total_distance: totalDistance,
          first_start: times[0] || null,
          last_end: endTimes[endTimes.length - 1] || null,
          route_names: routeNames,
        };
      });

      // Sort by bus number, then date, then first trip time
      groups.sort((a, b) => {
        const busCompare = a.bus_no.localeCompare(b.bus_no);
        if (busCompare !== 0) return busCompare;
        const dateCompare = a.trip_date.localeCompare(b.trip_date);
        if (dateCompare !== 0) return dateCompare;
        return (a.first_start || '').localeCompare(b.first_start || '');
      });

      console.log(`✅ Created ${groups.length} crew groups`);
      setCrewGroups(groups);

    } catch (error: any) {
      console.error('Error fetching crew grouped data:', error);
      toast({
        title: "Error",
        description: "Failed to load crew grouped trips",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary stats
  const summary = useMemo<CrewGroupedSummary>(() => {
    return {
      crewGroups,
      totalGroups: crewGroups.length,
      totalTrips: crewGroups.reduce((sum, g) => sum + g.trip_count, 0),
      totalIncome: crewGroups.reduce((sum, g) => sum + g.total_income, 0),
      totalDistance: crewGroups.reduce((sum, g) => sum + g.total_distance, 0),
    };
  }, [crewGroups]);

  return {
    crewGroups,
    summary,
    loading,
    refetch: fetchCrewGroupedData,
  };
}

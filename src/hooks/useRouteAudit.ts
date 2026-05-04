import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface OfficialRoute {
  id: string;
  route_name: string;
  route_no: string;
  is_active: boolean;
}

export interface OrphanRoute {
  /** The unmatched route string found in the system */
  label: string;
  /** Where it was found */
  sources: {
    daily_trips: number;   // count of trips using this label
    roster: number;        // count of roster rows using this label
    buses: number;         // count of buses using this label
  };
  /** IDs for bulk-fix operations */
  tripIds: string[];
  rosterIds: string[];
  busIds: string[];
}

export interface AuditSummary {
  totalOfficialRoutes: number;
  totalOrphans: number;
  tripsAffected: number;
  rosterAffected: number;
  busesAffected: number;
  syncPercentage: number;
}

export function useRouteAudit(onSyncComplete?: () => void) {
  const [officialRoutes, setOfficialRoutes] = useState<OfficialRoute[]>([]);
  const [orphans, setOrphans] = useState<OrphanRoute[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(false);

  const runAudit = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch the official route dictionary
      const { data: routesData, error: routesErr } = await supabase
        .from("routes")
        .select("id, route_name, route_no, is_active")
        .order("route_name");

      if (routesErr) throw routesErr;
      const official = routesData || [];
      setOfficialRoutes(official);

      // Build a lookup set (lowercased for fuzzy matching)
      const officialNames = new Set(official.map(r => r.route_name.toLowerCase().trim()));
      const officialNameMap = new Map(official.map(r => [r.route_name.toLowerCase().trim(), r]));

      // 2. Scan daily_trips for orphan route_labels (trips with NO route_id or mismatched label)
      const { data: tripsData, error: tripsErr } = await supabase
        .from("daily_trips")
        .select("id, route_id, route_label");

      if (tripsErr) throw tripsErr;

      // 3. Scan fleet_master_roster for orphan route_labels
      const { data: rosterData, error: rosterErr } = await supabase
        .from("fleet_master_roster")
        .select("id, route_id, route_label");

      if (rosterErr) throw rosterErr;

      // 4. Scan buses for orphan route text
      const { data: busesData, error: busesErr } = await supabase
        .from("buses")
        .select("id, route");

      if (busesErr) throw busesErr;

      // Build orphan map
      const orphanMap = new Map<string, OrphanRoute>();

      const getOrCreate = (label: string): OrphanRoute => {
        const key = label.toLowerCase().trim();
        if (!orphanMap.has(key)) {
          orphanMap.set(key, {
            label,
            sources: { daily_trips: 0, roster: 0, buses: 0 },
            tripIds: [],
            rosterIds: [],
            busIds: [],
          });
        }
        return orphanMap.get(key)!;
      };

      // Scan trips
      (tripsData || []).forEach((trip: any) => {
        const label = (trip.route_label || "").trim();
        if (!label) return;
        // Orphan = no route_id OR label doesn't match any official route
        if (!trip.route_id || !officialNames.has(label.toLowerCase())) {
          const orphan = getOrCreate(label);
          orphan.sources.daily_trips++;
          orphan.tripIds.push(trip.id);
        }
      });

      // Scan roster
      (rosterData || []).forEach((row: any) => {
        const label = (row.route_label || "").trim();
        if (!label) return;
        if (!row.route_id || !officialNames.has(label.toLowerCase())) {
          const orphan = getOrCreate(label);
          orphan.sources.roster++;
          orphan.rosterIds.push(row.id);
        }
      });

      // Scan buses
      (busesData || []).forEach((bus: any) => {
        const label = (bus.route || "").trim();
        if (!label) return;
        if (!officialNames.has(label.toLowerCase())) {
          const orphan = getOrCreate(label);
          orphan.sources.buses++;
          orphan.busIds.push(bus.id);
        }
      });

      const orphanList = Array.from(orphanMap.values()).sort(
        (a, b) => {
          const totalA = a.sources.daily_trips + a.sources.roster + a.sources.buses;
          const totalB = b.sources.daily_trips + b.sources.roster + b.sources.buses;
          return totalB - totalA;
        }
      );

      setOrphans(orphanList);

      // Compute summary
      const totalTrips = (tripsData || []).length;
      const tripsAffected = orphanList.reduce((sum, o) => sum + o.sources.daily_trips, 0);
      const rosterAffected = orphanList.reduce((sum, o) => sum + o.sources.roster, 0);
      const busesAffected = orphanList.reduce((sum, o) => sum + o.sources.buses, 0);
      const totalRecords = totalTrips + (rosterData || []).length + (busesData || []).length;
      const affectedRecords = tripsAffected + rosterAffected + busesAffected;
      const syncPercentage = totalRecords > 0
        ? Math.round(((totalRecords - affectedRecords) / totalRecords) * 100)
        : 100;

      setSummary({
        totalOfficialRoutes: official.length,
        totalOrphans: orphanList.length,
        tripsAffected,
        rosterAffected,
        busesAffected,
        syncPercentage,
      });

    } catch (err: any) {
      console.error("Route audit error:", err);
      toast({
        title: "Audit Error",
        description: err.message || "Failed to run route audit",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runAudit();
  }, [runAudit]);

  /**
   * Fix a single orphan by remapping it to an official route across all tables.
   */
  const fixOrphan = async (orphan: OrphanRoute, targetRouteId: string, targetRouteName: string) => {
    try {
      setFixing(true);

      // 1. Fix daily_trips
      if (orphan.tripIds.length > 0) {
        const { error } = await supabase
          .from("daily_trips")
          .update({ route_id: targetRouteId, route_label: targetRouteName })
          .in("id", orphan.tripIds);
        if (error) throw error;
      }

      // 2. Fix fleet_master_roster
      if (orphan.rosterIds.length > 0) {
        const { error } = await supabase
          .from("fleet_master_roster")
          .update({ route_id: targetRouteId, route_label: targetRouteName })
          .in("id", orphan.rosterIds);
        if (error) throw error;
      }

      // 3. Fix buses
      if (orphan.busIds.length > 0) {
        const { error } = await supabase
          .from("buses")
          .update({ route: targetRouteName })
          .in("id", orphan.busIds);
        if (error) throw error;
      }

      const totalFixed =
        orphan.tripIds.length + orphan.rosterIds.length + orphan.busIds.length;

      toast({
        title: "Route Synced!",
        description: `"${orphan.label}" → "${targetRouteName}" — ${totalFixed} record(s) fixed across all modules.`,
      });

      // Re-run audit to refresh
      await runAudit();
      
      // Notify parent to refresh its own data
      onSyncComplete?.();
    } catch (err: any) {
      console.error("Fix orphan error:", err);
      toast({
        title: "Sync Failed",
        description: err.message || "Failed to fix orphan route",
        variant: "destructive",
      });
    } finally {
      setFixing(false);
    }
  };

  /**
   * Promotes an orphan to an official route and syncs all records.
   */
  const addAsOfficialRoute = async (orphan: OrphanRoute) => {
    try {
      setFixing(true);

      // 1. Generate a temporary route number
      const tempRouteNo = `TEMP-${Math.floor(Math.random() * 1000)}`;

      // 1.5 Extract start and end locations if possible
      let startLoc = "TBD";
      let endLoc = "TBD";
      
      if (orphan.label.includes("-")) {
        const parts = orphan.label.split("-");
        startLoc = parts[0].trim() || "TBD";
        endLoc = parts[parts.length - 1].trim() || "TBD";
      } else if (orphan.label.toLowerCase().includes(" to ")) {
        const parts = orphan.label.toLowerCase().split(" to ");
        startLoc = parts[0].trim() || "TBD";
        endLoc = parts[parts.length - 1].trim() || "TBD";
      } else {
        startLoc = orphan.label;
        endLoc = "TBD";
      }

      // 2. Insert into routes
      const { data: newRoute, error: insertError } = await supabase
        .from("routes")
        .insert([{
          route_name: orphan.label,
          route_no: tempRouteNo,
          start_location: startLoc,
          end_location: endLoc,
          is_active: true,
          category: "Public Bus"
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Sync all records to this new ID
      setFixing(false); // Let fixOrphan handle the loading state
      await fixOrphan(orphan, newRoute.id, newRoute.route_name);

    } catch (err: any) {
      console.error("Add as official error:", err);
      toast({
        title: "Failed to Add Route",
        description: err.message || "Could not add route to dictionary",
        variant: "destructive",
      });
      setFixing(false);
    }
  };

  return {
    officialRoutes,
    orphans,
    summary,
    loading,
    fixing,
    runAudit,
    fixOrphan,
    addAsOfficialRoute,
  };
}

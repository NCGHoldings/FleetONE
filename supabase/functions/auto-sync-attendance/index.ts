import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StaffRegistry {
  id: string;
  profile_id: string | null;
  staff_name: string;
  staff_type: 'driver' | 'conductor';
  salary_type: 'monthly' | 'daily';
  daily_rate: number;
}

// Normalize name for comparison
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Check if two names match (fuzzy)
function namesMatch(name1: string, name2: string): boolean {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  // Check partial match
  const parts1 = n1.split(' ');
  const parts2 = n2.split(' ');
  
  for (const p1 of parts1) {
    for (const p2 of parts2) {
      if (p1.length > 2 && p2.length > 2 && (p1 === p2)) {
        return true;
      }
    }
  }
  
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Support both single date and date range
    const { date, startDate, endDate, forceSync } = await req.json().catch(() => ({}));
    
    // Determine date range
    let queryStartDate: string;
    let queryEndDate: string;
    
    if (startDate && endDate) {
      queryStartDate = startDate;
      queryEndDate = endDate;
    } else if (date) {
      queryStartDate = date;
      queryEndDate = date;
    } else {
      // Default to current month
      const now = new Date();
      queryStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      queryEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    }

    console.log(`[auto-sync-attendance] Starting sync for date range: ${queryStartDate} to ${queryEndDate}`);

    // Fetch all trips for the date range
    const { data: trips, error: tripsError } = await supabase
      .from('daily_trips')
      .select('id, bus_id, trip_date, driver_id, conductor_id, route_id, income, status, notes, start_time, end_time')
      .gte('trip_date', queryStartDate)
      .lte('trip_date', queryEndDate);

    if (tripsError) {
      console.error('[auto-sync-attendance] Error fetching trips:', tripsError);
      throw tripsError;
    }

    console.log(`[auto-sync-attendance] Found ${trips?.length || 0} trips for date range ${queryStartDate} to ${queryEndDate}`);

    // Fetch staff registry
    const { data: staffRegistry, error: staffError } = await supabase
      .from('staff_registry')
      .select('id, profile_id, staff_name, staff_type, salary_type, daily_rate')
      .eq('is_active', true);

    if (staffError) {
      console.error('[auto-sync-attendance] Error fetching staff:', staffError);
      throw staffError;
    }

    console.log(`[auto-sync-attendance] Found ${staffRegistry?.length || 0} staff in registry`);

    if (!staffRegistry || staffRegistry.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No staff in registry. Please sync staff registry first.',
          tripsProcessed: trips?.length || 0,
          staffInRegistry: 0,
          attendanceSynced: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch existing attendance records for the date range
    const { data: existingAttendance, error: existingError } = await supabase
      .from('staff_attendance')
      .select('id, staff_registry_id, trip_id, auto_generated')
      .gte('attendance_date', queryStartDate)
      .lte('attendance_date', queryEndDate);

    if (existingError) {
      console.error('[auto-sync-attendance] Error fetching existing attendance:', existingError);
    }

    // Get buses for display
    const { data: buses } = await supabase
      .from('buses')
      .select('id, bus_no, route');

    const busMap = new Map((buses || []).map(b => [b.id, { bus_no: b.bus_no, route: b.route }]));
    
    // Get routes for display
    const { data: routes } = await supabase
      .from('routes')
      .select('id, name');

    const routeMap = new Map((routes || []).map(r => [r.id, r.name]));
    
    const existingKeys = new Set(
      (existingAttendance || []).map(a => `${a.staff_registry_id}-${a.trip_id}`)
    );
    
    const attendanceRecords: any[] = [];
    let matchedDrivers = 0;
    let matchedConductors = 0;
    let unmatchedDrivers: string[] = [];
    let unmatchedConductors: string[] = [];

    for (const trip of trips || []) {
      const busInfo = busMap.get(trip.bus_id) || { bus_no: 'Unknown', route: null };
      const routeName = trip.route_id ? routeMap.get(trip.route_id) : busInfo.route || '';
      
      // Parse notes JSON to get driver/conductor names
      let driverName = '';
      let conductorName = '';
      
      if (trip.notes) {
        try {
          const notesJson = JSON.parse(trip.notes);
          driverName = notesJson.driver || notesJson.driver_name || '';
          conductorName = notesJson.conductor || notesJson.conductor_name || '';
          console.log(`[auto-sync-attendance] Trip ${trip.id} (${trip.trip_date}): Driver=${driverName}, Conductor=${conductorName}`);
        } catch {
          // Not JSON - try regex fallback
          const driverMatch = trip.notes.match(/driver[:\s]+([A-Za-z\s]+)/i);
          const conductorMatch = trip.notes.match(/conductor[:\s]+([A-Za-z\s]+)/i);
          driverName = driverMatch?.[1]?.trim() || '';
          conductorName = conductorMatch?.[1]?.trim() || '';
        }
      }

      // Calculate hours worked from start_time and end_time
      let hoursWorked = 12; // Default
      if (trip.start_time && trip.end_time) {
        try {
          const start = new Date(`1970-01-01T${trip.start_time}`);
          const end = new Date(`1970-01-01T${trip.end_time}`);
          hoursWorked = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
          if (hoursWorked > 24) hoursWorked = 12; // Sanity check
        } catch {
          hoursWorked = 12;
        }
      }

      // Match driver
      if (driverName && driverName !== 'N/A') {
        const matchedDriver = (staffRegistry || []).find(
          s => s.staff_type === 'driver' && namesMatch(s.staff_name, driverName)
        );
        
        if (matchedDriver) {
          const key = `${matchedDriver.id}-${trip.id}`;
          if (!forceSync && existingKeys.has(key)) {
            // Already exists, skip
          } else if (!attendanceRecords.some(r => r.staff_registry_id === matchedDriver.id && r.trip_id === trip.id)) {
            attendanceRecords.push({
              staff_registry_id: matchedDriver.id,
              staff_name: matchedDriver.staff_name,
              attendance_date: trip.trip_date,
              status: 'present',
              salary_type: matchedDriver.salary_type,
              daily_rate: matchedDriver.salary_type === 'daily' ? matchedDriver.daily_rate : 0,
              trip_id: trip.id,
              bus_no: busInfo.bus_no,
              route: routeName || '',
              hours_worked: Math.round(hoursWorked * 10) / 10,
              overtime_hours: hoursWorked > 8 ? Math.round((hoursWorked - 8) * 10) / 10 : 0,
              start_time: trip.start_time || '06:00:00',
              end_time: trip.end_time || '18:00:00',
              auto_generated: true,
              auto_synced: true,
            });
            matchedDrivers++;
            console.log(`[auto-sync-attendance] Matched driver: ${driverName} -> ${matchedDriver.staff_name}`);
          }
        } else {
          if (!unmatchedDrivers.includes(driverName)) {
            unmatchedDrivers.push(driverName);
          }
          console.log(`[auto-sync-attendance] No match found for driver: ${driverName}`);
        }
      }

      // Match conductor
      if (conductorName && conductorName !== 'N/A') {
        const matchedConductor = (staffRegistry || []).find(
          s => s.staff_type === 'conductor' && namesMatch(s.staff_name, conductorName)
        );
        
        if (matchedConductor) {
          const key = `${matchedConductor.id}-${trip.id}`;
          if (!forceSync && existingKeys.has(key)) {
            // Already exists, skip
          } else if (!attendanceRecords.some(r => r.staff_registry_id === matchedConductor.id && r.trip_id === trip.id)) {
            attendanceRecords.push({
              staff_registry_id: matchedConductor.id,
              staff_name: matchedConductor.staff_name,
              attendance_date: trip.trip_date,
              status: 'present',
              salary_type: matchedConductor.salary_type,
              daily_rate: matchedConductor.salary_type === 'daily' ? matchedConductor.daily_rate : 0,
              trip_id: trip.id,
              bus_no: busInfo.bus_no,
              route: routeName || '',
              hours_worked: Math.round(hoursWorked * 10) / 10,
              overtime_hours: hoursWorked > 8 ? Math.round((hoursWorked - 8) * 10) / 10 : 0,
              start_time: trip.start_time || '06:00:00',
              end_time: trip.end_time || '18:00:00',
              auto_generated: true,
              auto_synced: true,
            });
            matchedConductors++;
            console.log(`[auto-sync-attendance] Matched conductor: ${conductorName} -> ${matchedConductor.staff_name}`);
          }
        } else {
          if (!unmatchedConductors.includes(conductorName)) {
            unmatchedConductors.push(conductorName);
          }
          console.log(`[auto-sync-attendance] No match found for conductor: ${conductorName}`);
        }
      }

      // Also try matching by profile_id if driver_id/conductor_id are set
      if (trip.driver_id) {
        const driverStaff = (staffRegistry || []).find(
          s => s.profile_id === trip.driver_id && s.staff_type === 'driver'
        );

        if (driverStaff) {
          const key = `${driverStaff.id}-${trip.id}`;
          if (!existingKeys.has(key) && !attendanceRecords.some(r => r.staff_registry_id === driverStaff.id && r.trip_id === trip.id)) {
            attendanceRecords.push({
              staff_registry_id: driverStaff.id,
              staff_name: driverStaff.staff_name,
              attendance_date: trip.trip_date,
              status: 'present',
              salary_type: driverStaff.salary_type,
              daily_rate: driverStaff.salary_type === 'daily' ? driverStaff.daily_rate : 0,
              trip_id: trip.id,
              bus_no: busInfo.bus_no,
              route: routeName || '',
              hours_worked: Math.round(hoursWorked * 10) / 10,
              overtime_hours: hoursWorked > 8 ? Math.round((hoursWorked - 8) * 10) / 10 : 0,
              start_time: trip.start_time || '06:00:00',
              end_time: trip.end_time || '18:00:00',
              auto_generated: true,
              auto_synced: true,
            });
            matchedDrivers++;
          }
        }
      }

      if (trip.conductor_id) {
        const conductorStaff = (staffRegistry || []).find(
          s => s.profile_id === trip.conductor_id && s.staff_type === 'conductor'
        );

        if (conductorStaff) {
          const key = `${conductorStaff.id}-${trip.id}`;
          if (!existingKeys.has(key) && !attendanceRecords.some(r => r.staff_registry_id === conductorStaff.id && r.trip_id === trip.id)) {
            attendanceRecords.push({
              staff_registry_id: conductorStaff.id,
              staff_name: conductorStaff.staff_name,
              attendance_date: trip.trip_date,
              status: 'present',
              salary_type: conductorStaff.salary_type,
              daily_rate: conductorStaff.salary_type === 'daily' ? conductorStaff.daily_rate : 0,
              trip_id: trip.id,
              bus_no: busInfo.bus_no,
              route: routeName || '',
              hours_worked: Math.round(hoursWorked * 10) / 10,
              overtime_hours: hoursWorked > 8 ? Math.round((hoursWorked - 8) * 10) / 10 : 0,
              start_time: trip.start_time || '06:00:00',
              end_time: trip.end_time || '18:00:00',
              auto_generated: true,
              auto_synced: true,
            });
            matchedConductors++;
          }
        }
      }
    }

    console.log(`[auto-sync-attendance] Prepared ${attendanceRecords.length} attendance records`);

    // Insert attendance records one by one to avoid conflicts
    let insertedCount = 0;
    let errorCount = 0;
    for (const record of attendanceRecords) {
      const { error: insertError } = await supabase
        .from('staff_attendance')
        .upsert(record, {
          onConflict: 'staff_registry_id,attendance_date,trip_id',
          ignoreDuplicates: true,
        });
      
      if (insertError) {
        console.log(`[auto-sync-attendance] Insert error:`, insertError.message);
        errorCount++;
      } else {
        insertedCount++;
      }
    }

    console.log(`[auto-sync-attendance] Sync complete. Inserted: ${insertedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        dateRange: { start: queryStartDate, end: queryEndDate },
        tripsProcessed: trips?.length || 0,
        staffInRegistry: staffRegistry?.length || 0,
        attendanceSynced: insertedCount,
        matchedDrivers,
        matchedConductors,
        unmatchedDrivers: unmatchedDrivers.slice(0, 10),
        unmatchedConductors: unmatchedConductors.slice(0, 10),
        errors: errorCount,
        message: insertedCount > 0 
          ? `Successfully synced ${insertedCount} attendance records from ${trips?.length || 0} trips`
          : `No new attendance records to sync (${trips?.length || 0} trips processed)`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[auto-sync-attendance] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

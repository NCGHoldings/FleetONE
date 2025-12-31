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

    const { date, forceSync } = await req.json().catch(() => ({}));
    const targetDate = date || new Date().toISOString().split('T')[0];

    console.log(`[auto-sync-attendance] Starting sync for date: ${targetDate}`);

    // Fetch all trips for the date (not just completed - any trip with data)
    const { data: trips, error: tripsError } = await supabase
      .from('daily_trips')
      .select('id, bus_id, trip_date, driver_id, conductor_id, route_id, income, status, notes')
      .eq('trip_date', targetDate);

    if (tripsError) {
      console.error('[auto-sync-attendance] Error fetching trips:', tripsError);
      throw tripsError;
    }

    console.log(`[auto-sync-attendance] Found ${trips?.length || 0} trips for date ${targetDate}`);

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

    // Fetch existing attendance records for the date
    const { data: existingAttendance, error: existingError } = await supabase
      .from('staff_attendance')
      .select('id, staff_registry_id, trip_id, auto_synced')
      .eq('attendance_date', targetDate);

    if (existingError) {
      console.error('[auto-sync-attendance] Error fetching existing attendance:', existingError);
    }

    // Get buses for display
    const { data: buses } = await supabase
      .from('buses')
      .select('id, bus_no');

    const busMap = new Map((buses || []).map(b => [b.id, b.bus_no]));
    
    const existingKeys = new Set(
      (existingAttendance || []).map(a => `${a.staff_registry_id}-${a.trip_id}`)
    );
    
    const attendanceRecords: any[] = [];
    let synced = 0;
    let skipped = 0;

    for (const trip of trips || []) {
      const busNo = busMap.get(trip.bus_id) || trip.bus_id;
      
      // Parse notes JSON to get driver/conductor names
      let driverName = '';
      let conductorName = '';
      
      if (trip.notes) {
        try {
          const notesJson = JSON.parse(trip.notes);
          driverName = notesJson.driver || notesJson.driver_name || '';
          conductorName = notesJson.conductor || notesJson.conductor_name || '';
          console.log(`[auto-sync-attendance] Trip ${trip.id}: Driver=${driverName}, Conductor=${conductorName}`);
        } catch {
          // Not JSON
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
            skipped++;
          } else {
            attendanceRecords.push({
              staff_registry_id: matchedDriver.id,
              attendance_date: targetDate,
              status: 'present',
              salary_type: matchedDriver.salary_type,
              daily_rate: matchedDriver.salary_type === 'daily' ? matchedDriver.daily_rate : 0,
              trip_id: trip.id,
              auto_synced: true,
              notes: `Auto-synced: ${driverName} on ${busNo}`,
              check_in_time: '06:00:00',
              check_out_time: '18:00:00',
            });
            synced++;
            console.log(`[auto-sync-attendance] Matched driver: ${driverName} -> ${matchedDriver.staff_name}`);
          }
        } else {
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
            skipped++;
          } else {
            attendanceRecords.push({
              staff_registry_id: matchedConductor.id,
              attendance_date: targetDate,
              status: 'present',
              salary_type: matchedConductor.salary_type,
              daily_rate: matchedConductor.salary_type === 'daily' ? matchedConductor.daily_rate : 0,
              trip_id: trip.id,
              auto_synced: true,
              notes: `Auto-synced: ${conductorName} on ${busNo}`,
              check_in_time: '06:00:00',
              check_out_time: '18:00:00',
            });
            synced++;
            console.log(`[auto-sync-attendance] Matched conductor: ${conductorName} -> ${matchedConductor.staff_name}`);
          }
        } else {
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
              attendance_date: targetDate,
              status: 'present',
              salary_type: driverStaff.salary_type,
              daily_rate: driverStaff.salary_type === 'daily' ? driverStaff.daily_rate : 0,
              trip_id: trip.id,
              auto_synced: true,
              notes: `Auto-synced from driver_id on ${busNo}`,
              check_in_time: '06:00:00',
              check_out_time: '18:00:00',
            });
            synced++;
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
              attendance_date: targetDate,
              status: 'present',
              salary_type: conductorStaff.salary_type,
              daily_rate: conductorStaff.salary_type === 'daily' ? conductorStaff.daily_rate : 0,
              trip_id: trip.id,
              auto_synced: true,
              notes: `Auto-synced from conductor_id on ${busNo}`,
              check_in_time: '06:00:00',
              check_out_time: '18:00:00',
            });
            synced++;
          }
        }
      }
    }

    console.log(`[auto-sync-attendance] Prepared ${attendanceRecords.length} attendance records`);

    // Insert attendance records one by one to avoid conflicts
    let insertedCount = 0;
    for (const record of attendanceRecords) {
      const { error: insertError } = await supabase
        .from('staff_attendance')
        .upsert(record, {
          onConflict: 'staff_registry_id,attendance_date,trip_id',
          ignoreDuplicates: true,
        });
      
      if (insertError) {
        console.log(`[auto-sync-attendance] Insert error (may be duplicate):`, insertError.message);
      } else {
        insertedCount++;
      }
    }

    console.log(`[auto-sync-attendance] Sync complete. Inserted: ${insertedCount}, Skipped: ${skipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        date: targetDate,
        tripsProcessed: trips?.length || 0,
        staffInRegistry: staffRegistry?.length || 0,
        attendanceSynced: insertedCount,
        skipped: skipped,
        message: `Successfully synced ${insertedCount} attendance records from ${trips?.length || 0} trips`,
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

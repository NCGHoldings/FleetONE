import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DailyTrip {
  id: string;
  bus_id: string;
  trip_date: string;
  driver_id: string | null;
  conductor_id: string | null;
  route_id: string | null;
  income: number | null;
  status: string;
  notes: string | null;
}

interface StaffRegistry {
  id: string;
  profile_id: string | null;
  staff_name: string;
  staff_type: 'driver' | 'conductor';
  salary_type: 'monthly' | 'daily';
  daily_rate: number;
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

    // Fetch completed trips for the date
    const { data: trips, error: tripsError } = await supabase
      .from('daily_trips')
      .select('id, bus_id, trip_date, driver_id, conductor_id, route_id, income, status, notes')
      .eq('trip_date', targetDate)
      .eq('status', 'completed');

    if (tripsError) {
      console.error('[auto-sync-attendance] Error fetching trips:', tripsError);
      throw tripsError;
    }

    console.log(`[auto-sync-attendance] Found ${trips?.length || 0} completed trips`);

    // Fetch staff registry
    const { data: staffRegistry, error: staffError } = await supabase
      .from('staff_registry')
      .select('id, profile_id, staff_name, staff_type, salary_type, daily_rate')
      .eq('is_active', true);

    if (staffError) {
      console.error('[auto-sync-attendance] Error fetching staff:', staffError);
      throw staffError;
    }

    // Fetch existing attendance records for the date
    const { data: existingAttendance, error: existingError } = await supabase
      .from('staff_attendance')
      .select('id, staff_registry_id, trip_id, auto_synced')
      .eq('attendance_date', targetDate)
      .eq('auto_synced', true);

    if (existingError) {
      console.error('[auto-sync-attendance] Error fetching existing attendance:', existingError);
    }

    const existingTripIds = new Set(existingAttendance?.map(a => a.trip_id) || []);
    const attendanceRecords: any[] = [];
    let synced = 0;
    let skipped = 0;

    for (const trip of trips || []) {
      // Skip if already synced and not forcing
      if (!forceSync && existingTripIds.has(trip.id)) {
        skipped++;
        continue;
      }

      // Process driver
      if (trip.driver_id) {
        const driverStaff = staffRegistry?.find(
          s => s.profile_id === trip.driver_id && s.staff_type === 'driver'
        );

        if (driverStaff) {
          attendanceRecords.push({
            staff_registry_id: driverStaff.id,
            attendance_date: targetDate,
            status: 'present',
            salary_type: driverStaff.salary_type,
            daily_rate: driverStaff.salary_type === 'daily' ? driverStaff.daily_rate : 0,
            trip_id: trip.id,
            auto_synced: true,
            notes: `Auto-synced from trip on bus ${trip.bus_id}`,
            check_in_time: '06:00:00',
            check_out_time: '18:00:00',
          });
          synced++;
        }
      }

      // Process conductor
      if (trip.conductor_id) {
        const conductorStaff = staffRegistry?.find(
          s => s.profile_id === trip.conductor_id && s.staff_type === 'conductor'
        );

        if (conductorStaff) {
          attendanceRecords.push({
            staff_registry_id: conductorStaff.id,
            attendance_date: targetDate,
            status: 'present',
            salary_type: conductorStaff.salary_type,
            daily_rate: conductorStaff.salary_type === 'daily' ? conductorStaff.daily_rate : 0,
            trip_id: trip.id,
            auto_synced: true,
            notes: `Auto-synced from trip on bus ${trip.bus_id}`,
            check_in_time: '06:00:00',
            check_out_time: '18:00:00',
          });
          synced++;
        }
      }

      // Try to match from notes if driver_id/conductor_id not set
      if (!trip.driver_id || !trip.conductor_id) {
        try {
          const notesData = trip.notes ? JSON.parse(trip.notes) : null;
          if (notesData) {
            // Match driver by name
            if (!trip.driver_id && notesData.driver_name) {
              const matchedDriver = staffRegistry?.find(
                s => s.staff_type === 'driver' && 
                     s.staff_name.toLowerCase().includes(notesData.driver_name.toLowerCase())
              );
              if (matchedDriver) {
                attendanceRecords.push({
                  staff_registry_id: matchedDriver.id,
                  attendance_date: targetDate,
                  status: 'present',
                  salary_type: matchedDriver.salary_type,
                  daily_rate: matchedDriver.salary_type === 'daily' ? matchedDriver.daily_rate : 0,
                  trip_id: trip.id,
                  auto_synced: true,
                  notes: `Auto-synced from trip notes (driver: ${notesData.driver_name})`,
                  check_in_time: '06:00:00',
                  check_out_time: '18:00:00',
                });
                synced++;
              }
            }
            // Match conductor by name
            if (!trip.conductor_id && notesData.conductor_name) {
              const matchedConductor = staffRegistry?.find(
                s => s.staff_type === 'conductor' && 
                     s.staff_name.toLowerCase().includes(notesData.conductor_name.toLowerCase())
              );
              if (matchedConductor) {
                attendanceRecords.push({
                  staff_registry_id: matchedConductor.id,
                  attendance_date: targetDate,
                  status: 'present',
                  salary_type: matchedConductor.salary_type,
                  daily_rate: matchedConductor.salary_type === 'daily' ? matchedConductor.daily_rate : 0,
                  trip_id: trip.id,
                  auto_synced: true,
                  notes: `Auto-synced from trip notes (conductor: ${notesData.conductor_name})`,
                  check_in_time: '06:00:00',
                  check_out_time: '18:00:00',
                });
                synced++;
              }
            }
          }
        } catch (e) {
          // Notes not JSON or parsing failed
        }
      }
    }

    // Upsert attendance records
    if (attendanceRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from('staff_attendance')
        .upsert(attendanceRecords, {
          onConflict: 'staff_registry_id,attendance_date,trip_id',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error('[auto-sync-attendance] Error upserting attendance:', upsertError);
        // Try inserting one by one to find the problematic record
        for (const record of attendanceRecords) {
          const { error: singleError } = await supabase
            .from('staff_attendance')
            .insert(record);
          if (singleError) {
            console.log('[auto-sync-attendance] Skipping duplicate or error:', singleError.message);
          }
        }
      }
    }

    console.log(`[auto-sync-attendance] Sync complete. Synced: ${synced}, Skipped: ${skipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        date: targetDate,
        tripsProcessed: trips?.length || 0,
        attendanceSynced: synced,
        skipped: skipped,
        message: `Successfully synced ${synced} attendance records from ${trips?.length || 0} trips`,
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

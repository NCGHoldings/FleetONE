import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RouteTarget {
  id: string;
  route_id: string;
  revenue_target: number;
  driver_commission_percent: number;
  conductor_commission_percent: number;
}

interface DailyTrip {
  id: string;
  bus_id: string;
  trip_date: string;
  driver_id: string | null;
  conductor_id: string | null;
  route_id: string | null;
  income: number;
  status: string;
}

interface StaffRegistry {
  id: string;
  profile_id: string | null;
  staff_name: string;
  staff_type: 'driver' | 'conductor';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { date, tripId } = await req.json().catch(() => ({}));
    const targetDate = date || new Date().toISOString().split('T')[0];

    console.log(`[calculate-commissions] Starting calculation for date: ${targetDate}`);

    // Build query for trips
    let tripsQuery = supabase
      .from('daily_trips')
      .select('id, bus_id, trip_date, driver_id, conductor_id, route_id, income, status')
      .eq('status', 'completed')
      .not('route_id', 'is', null)
      .gt('income', 0);

    if (tripId) {
      tripsQuery = tripsQuery.eq('id', tripId);
    } else {
      tripsQuery = tripsQuery.eq('trip_date', targetDate);
    }

    const { data: trips, error: tripsError } = await tripsQuery;

    if (tripsError) {
      console.error('[calculate-commissions] Error fetching trips:', tripsError);
      throw tripsError;
    }

    console.log(`[calculate-commissions] Found ${trips?.length || 0} completed trips with income`);

    if (!trips || trips.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No trips found for commission calculation',
          commissionsCreated: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch active route targets
    const routeIds = [...new Set(trips.map(t => t.route_id).filter(Boolean))];
    const { data: routeTargets, error: targetsError } = await supabase
      .from('route_targets')
      .select('id, route_id, revenue_target, driver_commission_percent, conductor_commission_percent')
      .in('route_id', routeIds)
      .eq('is_active', true)
      .lte('effective_from', targetDate)
      .or(`effective_to.is.null,effective_to.gte.${targetDate}`);

    if (targetsError) {
      console.error('[calculate-commissions] Error fetching route targets:', targetsError);
      throw targetsError;
    }

    console.log(`[calculate-commissions] Found ${routeTargets?.length || 0} active route targets`);

    // Create a map of route targets
    const targetsByRoute = new Map<string, RouteTarget>();
    routeTargets?.forEach(t => targetsByRoute.set(t.route_id, t));

    // Fetch staff registry
    const { data: staffRegistry, error: staffError } = await supabase
      .from('staff_registry')
      .select('id, profile_id, staff_name, staff_type')
      .eq('is_active', true);

    if (staffError) {
      console.error('[calculate-commissions] Error fetching staff:', staffError);
      throw staffError;
    }

    // Fetch existing commissions to avoid duplicates
    const tripIds = trips.map(t => t.id);
    const { data: existingCommissions } = await supabase
      .from('staff_commissions')
      .select('trip_id, staff_id')
      .in('trip_id', tripIds);

    const existingKeys = new Set(
      existingCommissions?.map(c => `${c.trip_id}-${c.staff_id}`) || []
    );

    const commissionsToInsert: any[] = [];
    let totalCommissionAmount = 0;

    for (const trip of trips) {
      if (!trip.route_id || !trip.income) continue;

      const target = targetsByRoute.get(trip.route_id);
      if (!target) {
        console.log(`[calculate-commissions] No target found for route: ${trip.route_id}`);
        continue;
      }

      const revenue = trip.income;
      const targetAmount = target.revenue_target;

      // Only calculate commission if revenue exceeds target
      if (revenue <= targetAmount) {
        console.log(`[calculate-commissions] Revenue ${revenue} did not exceed target ${targetAmount}`);
        continue;
      }

      const excessRevenue = revenue - targetAmount;
      console.log(`[calculate-commissions] Trip ${trip.id}: Revenue ${revenue}, Target ${targetAmount}, Excess ${excessRevenue}`);

      // Calculate driver commission
      if (trip.driver_id) {
        const driverStaff = staffRegistry?.find(
          s => s.profile_id === trip.driver_id && s.staff_type === 'driver'
        );

        if (driverStaff && !existingKeys.has(`${trip.id}-${driverStaff.id}`)) {
          const commissionAmount = (excessRevenue * target.driver_commission_percent) / 100;
          commissionsToInsert.push({
            staff_id: driverStaff.id,
            trip_id: trip.id,
            route_id: trip.route_id,
            trip_date: trip.trip_date,
            route_revenue: revenue,
            target_amount: targetAmount,
            excess_revenue: excessRevenue,
            commission_percent: target.driver_commission_percent,
            commission_amount: commissionAmount,
            status: 'pending',
            notes: `Driver commission for exceeding target by LKR ${excessRevenue.toFixed(2)}`,
          });
          totalCommissionAmount += commissionAmount;
          console.log(`[calculate-commissions] Driver commission: ${commissionAmount}`);
        }
      }

      // Calculate conductor commission
      if (trip.conductor_id) {
        const conductorStaff = staffRegistry?.find(
          s => s.profile_id === trip.conductor_id && s.staff_type === 'conductor'
        );

        if (conductorStaff && !existingKeys.has(`${trip.id}-${conductorStaff.id}`)) {
          const commissionAmount = (excessRevenue * target.conductor_commission_percent) / 100;
          commissionsToInsert.push({
            staff_id: conductorStaff.id,
            trip_id: trip.id,
            route_id: trip.route_id,
            trip_date: trip.trip_date,
            route_revenue: revenue,
            target_amount: targetAmount,
            excess_revenue: excessRevenue,
            commission_percent: target.conductor_commission_percent,
            commission_amount: commissionAmount,
            status: 'pending',
            notes: `Conductor commission for exceeding target by LKR ${excessRevenue.toFixed(2)}`,
          });
          totalCommissionAmount += commissionAmount;
          console.log(`[calculate-commissions] Conductor commission: ${commissionAmount}`);
        }
      }
    }

    // Insert commissions
    if (commissionsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('staff_commissions')
        .insert(commissionsToInsert);

      if (insertError) {
        console.error('[calculate-commissions] Error inserting commissions:', insertError);
        throw insertError;
      }

      // Update attendance records with commission earned
      for (const commission of commissionsToInsert) {
        await supabase
          .from('staff_attendance')
          .update({ commission_earned: commission.commission_amount })
          .eq('staff_registry_id', commission.staff_id)
          .eq('trip_id', commission.trip_id);
      }
    }

    console.log(`[calculate-commissions] Created ${commissionsToInsert.length} commission records totaling LKR ${totalCommissionAmount.toFixed(2)}`);

    return new Response(
      JSON.stringify({
        success: true,
        date: targetDate,
        tripsProcessed: trips.length,
        commissionsCreated: commissionsToInsert.length,
        totalCommissionAmount: totalCommissionAmount,
        message: `Created ${commissionsToInsert.length} commission records totaling LKR ${totalCommissionAmount.toFixed(2)}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[calculate-commissions] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

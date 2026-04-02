import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[SAMPLE DATA] Starting sample data population...');

    // Get active buses
    const { data: buses, error: busError } = await supabase
      .from('buses')
      .select('id, bus_no')
      .eq('status', 'active')
      .limit(5);

    if (busError) throw busError;
    if (!buses || buses.length === 0) {
      throw new Error('No active buses found');
    }

    const now = new Date();
    const results = { fuelAlerts: 0, driverEvents: 0, scorecards: 0, analytics: 0, errors: [] as string[] };

    // Create sample fuel alerts
    console.log('[SAMPLE DATA] Creating fuel alerts...');
    const fuelAlertData = buses.slice(0, 2).map(bus => ({
      bus_id: bus.id,
      alert_type: 'low_fuel',
      fuel_level_percent: 10 + Math.random() * 5,
      fuel_drop_amount: 0,
      notes: 'Sample alert - Low fuel level detected',
      status: 'active'
    }));

    const { error: fuelError } = await supabase.from('fuel_alerts').insert(fuelAlertData);
    if (fuelError) {
      console.error('[SAMPLE DATA] Fuel alert error:', fuelError);
      results.errors.push(`Fuel alerts: ${fuelError.message}`);
    } else {
      results.fuelAlerts = fuelAlertData.length;
    }

    // Get profiles for driver events
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('status', 'active')
      .limit(3);

    // Create sample driver behavior events
    console.log('[SAMPLE DATA] Creating driver behavior events...');
    const eventTypes = ['harsh_braking', 'harsh_acceleration', 'speeding', 'sharp_turn', 'excessive_idle'];
    const severities = ['low', 'medium', 'high'];
    
    const driverEvents = Array.from({ length: 20 }, () => {
      const bus = buses[Math.floor(Math.random() * buses.length)];
      const driver = profiles?.[Math.floor(Math.random() * (profiles?.length || 1))];
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const eventTime = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);

      return {
        bus_id: bus.id,
        driver_id: driver?.id || null,
        event_type: eventType,
        event_timestamp: eventTime.toISOString(),
        severity: severities[Math.floor(Math.random() * severities.length)],
        speed_kmh: 40 + Math.random() * 80,
        actual_value: eventType === 'speeding' ? 80 + Math.random() * 40 : 5 + Math.random() * 15,
        threshold_value: eventType === 'speeding' ? 80 : 10,
        latitude: 6.9271 + (Math.random() - 0.5) * 0.1,
        longitude: 79.8612 + (Math.random() - 0.5) * 0.1
      };
    });

    const { error: eventsError } = await supabase.from('driver_behavior_events').insert(driverEvents);
    if (eventsError) {
      console.error('[SAMPLE DATA] Driver events error:', eventsError);
      results.errors.push(`Driver events: ${eventsError.message}`);
    } else {
      results.driverEvents = driverEvents.length;
    }

    // Create driver scorecards
    console.log('[SAMPLE DATA] Creating driver scorecards...');
    if (profiles && profiles.length > 0) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const scorecardData = profiles.map(driver => ({
        driver_id: driver.id,
        score_period_start: startOfMonth.toISOString().split('T')[0],
        score_period_end: endOfMonth.toISOString().split('T')[0],
        total_trips: 15 + Math.floor(Math.random() * 20),
        total_distance_km: 800 + Math.random() * 500,
        harsh_braking_count: Math.floor(Math.random() * 10),
        harsh_acceleration_count: Math.floor(Math.random() * 8),
        speeding_count: Math.floor(Math.random() * 5),
        sharp_turn_count: Math.floor(Math.random() * 12),
        excessive_idle_count: Math.floor(Math.random() * 6),
        total_score: 75 + Math.random() * 20,
        safety_rating: Math.random() > 0.5 ? 'excellent' : Math.random() > 0.3 ? 'good' : 'fair'
      }));

      const { error: scoreError } = await supabase.from('driver_scorecards').insert(scorecardData);
      if (scoreError) {
        console.error('[SAMPLE DATA] Scorecard error:', scoreError);
        results.errors.push(`Scorecards: ${scoreError.message}`);
      } else {
        results.scorecards = scorecardData.length;
      }
    }

    // Create daily fleet analytics (batch insert for efficiency)
    console.log('[SAMPLE DATA] Creating fleet analytics...');
    const analyticsData = [];
    for (let day = 0; day < 30; day++) {
      const analyticsDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
      
      for (const bus of buses) {
        analyticsData.push({
          bus_id: bus.id,
          analytics_date: analyticsDate.toISOString().split('T')[0],
          total_distance_km: 150 + Math.random() * 100,
          fuel_efficiency_kmpl: 3 + Math.random() * 2,
          avg_speed_kmh: 35 + Math.random() * 25,
          max_speed_kmh: 70 + Math.random() * 30,
          idle_time_minutes: 30 + Math.random() * 60,
          fuel_consumed_liters: 40 + Math.random() * 30,
          trips_completed: 2 + Math.floor(Math.random() * 3)
        });
      }
    }

    const { error: analyticsError } = await supabase.from('fleet_analytics_daily').insert(analyticsData);
    if (analyticsError) {
      console.error('[SAMPLE DATA] Analytics error:', analyticsError);
      results.errors.push(`Analytics: ${analyticsError.message}`);
    } else {
      results.analytics = analyticsData.length;
    }

    console.log('[SAMPLE DATA] Completed:', results);

    return new Response(
      JSON.stringify({ 
        success: results.errors.length === 0,
        message: results.errors.length === 0 ? 'Sample data populated successfully' : 'Completed with some errors',
        data: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SAMPLE DATA] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

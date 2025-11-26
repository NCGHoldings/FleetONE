import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Haversine formula to calculate distance between two GPS coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Aggregate] Starting fleet analytics aggregation...');

    // Get request body for date range (optional) - handle empty body properly
    let startDate, endDate;
    try {
      const body = await req.json();
      startDate = body.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      endDate = body.endDate || new Date().toISOString();
      console.log('[Aggregate] Parsed body:', body);
    } catch (e) {
      // No body or invalid JSON, use defaults
      console.log('[Aggregate] No body or invalid JSON, using defaults');
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      endDate = new Date().toISOString();
    }

    console.log(`[Aggregate] Date range: startDate=${startDate}, endDate=${endDate}`);

    // Get all buses
    const { data: buses, error: busError } = await supabase
      .from('buses')
      .select('id, bus_no');
    
    if (busError) throw busError;

    const aggregatedData = [];
    let processedCount = 0;

    for (const bus of buses || []) {
      console.log(`[Aggregate] Processing bus ${bus.bus_no}...`);

      // Get GPS history for this bus grouped by date
      const { data: gpsData, error: gpsError } = await supabase
        .from('gps_location_history')
        .select('*')
        .eq('bus_id', bus.id)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: true });

      if (gpsError) {
        console.error(`[Aggregate] Error fetching GPS data for ${bus.bus_no}:`, gpsError);
        continue;
      }

      if (!gpsData || gpsData.length === 0) {
        console.log(`[Aggregate] No GPS data for ${bus.bus_no}`);
        continue;
      }

      // Group GPS data by date
      const dataByDate: { [date: string]: any[] } = {};
      
      for (const point of gpsData) {
        const date = point.timestamp.split('T')[0]; // Extract YYYY-MM-DD
        if (!dataByDate[date]) {
          dataByDate[date] = [];
        }
        dataByDate[date].push(point);
      }

      // Calculate metrics for each date
      for (const [date, points] of Object.entries(dataByDate)) {
        if (points.length < 2) continue; // Need at least 2 points for calculations

        let totalDistance = 0;
        let totalIdleTime = 0;
        let speedSum = 0;
        let maxSpeed = 0;
        let tripCount = 0;
        let lastPoint = points[0];
        let behaviorEventsCount = 0;

        // Trip detection: gaps > 30 minutes indicate new trip
        const TRIP_GAP_MS = 30 * 60 * 1000;
        let isNewTrip = true;

        for (let i = 1; i < points.length; i++) {
          const point = points[i];
          const timeDiff = new Date(point.timestamp).getTime() - new Date(lastPoint.timestamp).getTime();
          
          // Check if this is a new trip
          if (timeDiff > TRIP_GAP_MS) {
            tripCount++;
            isNewTrip = true;
          }

          // Calculate distance between consecutive points
          if (lastPoint.latitude && lastPoint.longitude && point.latitude && point.longitude) {
            const distance = calculateDistance(
              lastPoint.latitude,
              lastPoint.longitude,
              point.latitude,
              point.longitude
            );
            
            // Only add distance if it's reasonable (< 5km between consecutive points)
            if (distance < 5) {
              totalDistance += distance;
            }
          }

          // Track speeds
          if (point.speed_kmh !== null && point.speed_kmh !== undefined) {
            speedSum += point.speed_kmh;
            if (point.speed_kmh > maxSpeed) maxSpeed = point.speed_kmh;
            
            // Idle time detection (speed = 0 for more than 5 minutes)
            if (point.speed_kmh === 0 && timeDiff > 5 * 60 * 1000) {
              totalIdleTime += timeDiff / (1000 * 60); // Convert to minutes
            }
          }

          lastPoint = point;
        }

        // Count behavior events from driver_behavior_events table
        const { data: behaviorEvents } = await supabase
          .from('driver_behavior_events')
          .select('id')
          .eq('bus_id', bus.id)
          .gte('event_timestamp', `${date}T00:00:00`)
          .lte('event_timestamp', `${date}T23:59:59`);
        
        behaviorEventsCount = behaviorEvents?.length || 0;

        // Calculate averages
        const avgSpeed = points.length > 0 ? speedSum / points.length : 0;
        
        // Mock fuel efficiency (will be real once fuel sensors are working)
        const fuelEfficiency = totalDistance > 0 ? (totalDistance / (totalDistance * 0.15)).toFixed(2) : 0; // Mock: ~6-7 km/L

        const analytics = {
          bus_id: bus.id,
          analytics_date: date,
          total_distance_km: parseFloat(totalDistance.toFixed(2)),
          total_trips: tripCount || 1,
          avg_speed_kmh: parseFloat(avgSpeed.toFixed(1)),
          max_speed_kmh: parseFloat(maxSpeed.toFixed(1)),
          total_idle_time_minutes: parseFloat(totalIdleTime.toFixed(0)),
          behavior_events_count: behaviorEventsCount,
          fuel_efficiency_kmpl: parseFloat(fuelEfficiency),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        aggregatedData.push(analytics);
        console.log(`[Aggregate] ${bus.bus_no} ${date}: ${totalDistance.toFixed(1)}km, ${tripCount} trips, ${avgSpeed.toFixed(1)}km/h avg`);
      }

      processedCount++;
    }

    // Upsert aggregated data into fleet_analytics_daily
    if (aggregatedData.length > 0) {
      const { error: insertError } = await supabase
        .from('fleet_analytics_daily')
        .upsert(aggregatedData, {
          onConflict: 'bus_id,analytics_date',
          ignoreDuplicates: false
        });

      if (insertError) {
        console.error('[Aggregate] Insert error:', insertError);
        throw insertError;
      }

      console.log(`[Aggregate] ✅ Successfully aggregated ${aggregatedData.length} records for ${processedCount} buses`);
    } else {
      console.log('[Aggregate] No data to aggregate');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Aggregated ${aggregatedData.length} analytics records from GPS data`,
        buses_processed: processedCount,
        records_created: aggregatedData.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Aggregate] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

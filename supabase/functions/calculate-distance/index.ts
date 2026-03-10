import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin, destination, waypoints } = await req.json();

    if (!origin || !destination) {
      return new Response(
        JSON.stringify({ error: 'Origin and destination are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Use the same Google Places API key (works for Directions API too)
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ error: 'Google API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Build waypoints parameter
    let waypointsParam = '';
    if (waypoints && Array.isArray(waypoints) && waypoints.length > 0) {
      const validWaypoints = waypoints.filter((wp: string) => wp && wp.trim());
      if (validWaypoints.length > 0) {
        waypointsParam = `&waypoints=${validWaypoints.map((wp: string) => encodeURIComponent(wp.trim())).join('|')}`;
      }
    }

    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin.trim())}&destination=${encodeURIComponent(destination.trim())}${waypointsParam}&mode=driving&key=${googleApiKey}`;

    console.log(`Fetching directions: ${origin} -> ${destination}`);
    const response = await fetch(directionsUrl);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Directions API error:', data.status, data.error_message);
      return new Response(
        JSON.stringify({ error: `Could not find route: ${data.status}`, details: data.error_message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const route = data.routes[0];
    if (!route) {
      return new Response(
        JSON.stringify({ error: 'No route found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Extract leg details
    let totalDistance = 0;
    let totalDuration = 0;
    const legs = route.legs.map((leg: any, index: number) => {
      totalDistance += leg.distance.value;
      totalDuration += leg.duration.value;
      return {
        legNumber: index + 1,
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        distance: leg.distance.text,
        distanceValue: leg.distance.value,
        duration: leg.duration.text,
        durationValue: leg.duration.value,
      };
    });

    // Format totals
    const totalKm = (totalDistance / 1000).toFixed(1);
    const totalHours = Math.floor(totalDuration / 3600);
    const totalMinutes = Math.floor((totalDuration % 3600) / 60);
    let totalDurationText = '';
    if (totalHours > 0) totalDurationText += `${totalHours} hr `;
    totalDurationText += `${totalMinutes} min`;

    const result = {
      legs,
      totalDistance,
      totalDistanceText: `${totalKm} km`,
      totalDuration,
      totalDurationText: totalDurationText.trim(),
      summary: route.summary || '',
      warnings: route.warnings || [],
    };

    console.log(`Route found: ${totalKm} km, ${totalDurationText}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in calculate-distance:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to calculate distance' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

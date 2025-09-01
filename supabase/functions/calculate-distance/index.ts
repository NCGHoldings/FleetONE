import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      pickupLocation,
      dropLocation,
      intermediateStops = [],
      parkingLat,
      parkingLng,
      pickupCoords: pickupCoordsInput,
      dropCoords: dropCoordsInput,
    } = await req.json()

    console.log('Distance calculation request:', {
      pickupLocation,
      dropLocation,
      intermediateStops,
      parkingLat,
      parkingLng,
      pickupCoordsInput,
      dropCoordsInput,
    });

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!GOOGLE_API_KEY) {
      console.error('Google API key not configured');
      throw new Error('Google API key not configured');
    }

    const roundKm = (m: number) => Math.round((m / 1000) * 10) / 10;

    // Helper: Geocode a free-text address in Sri Lanka using Google Geocoding API
    const geocodeLK = async (query: string) => {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:LK&key=${GOOGLE_API_KEY}`;
      console.log('Geocoding with Google:', query);
      const resp = await fetch(url);
      if (!resp.ok) {
        console.error('Geocoding HTTP failed:', await resp.text());
        throw new Error(`Geocoding failed (${resp.status})`);
      }
      const data = await resp.json();
      if (data.status !== 'OK' || !data.results?.length) {
        console.error('Geocoding API error:', data.status, data.error_message);
        throw new Error(`Location not found: ${query}`);
      }
      const result = data.results[0];
      const loc = result.geometry.location;
      return {
        lat: loc.lat as number,
        lng: loc.lng as number,
        formatted_address: result.formatted_address as string,
      };
    };

    // Resolve pickup and drop points: prefer provided coords, else geocode text
    const pickupPoint = pickupCoordsInput && pickupCoordsInput.length === 2
      ? { lat: pickupCoordsInput[1], lng: pickupCoordsInput[0], formatted_address: pickupLocation }
      : await geocodeLK(pickupLocation);

    const dropPoint = dropCoordsInput && dropCoordsInput.length === 2
      ? { lat: dropCoordsInput[1], lng: dropCoordsInput[0], formatted_address: dropLocation }
      : await geocodeLK(dropLocation);

    // Resolve intermediate stops to coordinates (if provided coords, use them; else geocode)
    const intermediatePoints: Array<{ lat: number; lng: number; formatted?: string }> = [];
    for (const stop of intermediateStops) {
      if (stop && stop.location && String(stop.location).trim()) {
        try {
          if (typeof stop.lat === 'number' && typeof stop.lng === 'number') {
            intermediatePoints.push({ lat: stop.lat, lng: stop.lng, formatted: stop.location });
          } else {
            const geo = await geocodeLK(stop.location);
            intermediatePoints.push({ lat: geo.lat, lng: geo.lng, formatted: geo.formatted_address });
          }
        } catch (e) {
          console.warn('Skipping intermediate stop (geocode failed):', stop?.location, e);
        }
      }
    }

    console.log('Coordinates resolved (Google):', {
      pickup: pickupPoint,
      drop: dropPoint,
      intermediate: intermediatePoints,
      parking: { lat: parkingLat, lng: parkingLng },
    });

    // Build the full route: Parking -> Pickup -> ...intermediate... -> Drop -> Parking
    const allPoints = [
      { lat: parkingLat, lng: parkingLng },
      pickupPoint,
      ...intermediatePoints,
      dropPoint,
      { lat: parkingLat, lng: parkingLng },
    ];

    const origin = `${allPoints[0].lat},${allPoints[0].lng}`;
    const destination = `${allPoints[allPoints.length - 1].lat},${allPoints[allPoints.length - 1].lng}`;
    const waypointList = allPoints.slice(1, -1).map(p => `${p.lat},${p.lng}`);
    const waypointsParam = waypointList.length ? `&waypoints=${encodeURIComponent(waypointList.join('|'))}` : '';

    console.log('Requesting Google Directions...');
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving${waypointsParam}&key=${GOOGLE_API_KEY}`;
    const dirResp = await fetch(directionsUrl);
    if (!dirResp.ok) {
      console.error('Directions HTTP failed:', await dirResp.text());
      throw new Error(`Directions request failed (${dirResp.status})`);
    }
    const dirData = await dirResp.json();
    console.log('Directions API status:', dirData.status);
    if (dirData.status !== 'OK' || !dirData.routes?.length) {
      console.error('Directions API error:', dirData.status, dirData.error_message);
      throw new Error('No route found for the specified waypoints');
    }

    const route = dirData.routes[0];
    const legs = route.legs || [];

    const totalMeters = legs.reduce((sum: number, leg: any) => sum + (leg.distance?.value || 0), 0);
    const totalDistance = roundKm(totalMeters);

    // Segment breakdown
    let kmParkingToPickup = 0;
    let kmTrip = 0;
    let kmDropToParking = 0;

    if (legs.length >= 2) {
      kmParkingToPickup = roundKm(legs[0].distance?.value || 0);
      const lastIdx = legs.length - 1;
      kmDropToParking = roundKm(legs[lastIdx].distance?.value || 0);
      let tripMeters = 0;
      for (let i = 1; i < lastIdx; i++) {
        tripMeters += legs[i].distance?.value || 0;
      }
      kmTrip = roundKm(tripMeters);
    }

    // Prepare outputs consistent with previous API
    const pickupCoords: [number, number] = [pickupPoint.lng, pickupPoint.lat];
    const dropCoords: [number, number] = [dropPoint.lng, dropPoint.lat];
    const intermediateCoords: [number, number][] = intermediatePoints.map(p => [p.lng, p.lat]);

    let routeDescription = `${pickupLocation}`;
    for (const stop of intermediateStops) {
      if (stop && stop.location && String(stop.location).trim()) {
        routeDescription += ` → ${stop.location}`;
      }
    }
    routeDescription += ` → ${dropLocation}`;

    const result = {
      kmParkingToPickup,
      kmTrip,
      kmDropToParking,
      totalDistance,
      pickupCoords,
      dropCoords,
      intermediateCoords,
      pickupAddress: pickupPoint.formatted_address || pickupLocation,
      dropAddress: dropPoint.formatted_address || dropLocation,
      routeDescription,
      intermediateStops: intermediateStops.filter((s: any) => s?.location && String(s.location).trim()),
    };

    console.log('Final distance calculation result (Google):', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Distance calculation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
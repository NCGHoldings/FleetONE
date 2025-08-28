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
    const { pickupLocation, dropLocation, intermediateStops = [], parkingLat, parkingLng } = await req.json()
    
    console.log('Distance calculation request:', { pickupLocation, dropLocation, intermediateStops, parkingLat, parkingLng });
    
    const MAPBOX_ACCESS_TOKEN = Deno.env.get('MAPBOX_ACCESS_TOKEN')
    if (!MAPBOX_ACCESS_TOKEN) {
      console.error('Mapbox access token not configured');
      throw new Error('Mapbox access token not configured')
    }

    console.log('Using Mapbox token (first 10 chars):', MAPBOX_ACCESS_TOKEN.substring(0, 10));

    // Geocode pickup location
    console.log('Geocoding pickup location:', pickupLocation);
    const pickupResponse = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(pickupLocation)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=LK&limit=1`
    )
    
    if (!pickupResponse.ok) {
      console.error('Pickup geocoding failed:', await pickupResponse.text());
      throw new Error(`Pickup geocoding failed: ${pickupResponse.status}`);
    }
    
    const pickupData = await pickupResponse.json()
    console.log('Pickup geocoding result:', pickupData);
    
    if (!pickupData.features || pickupData.features.length === 0) {
      throw new Error('Pickup location not found')
    }

    // Geocode drop location
    console.log('Geocoding drop location:', dropLocation);
    const dropResponse = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(dropLocation)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=LK&limit=1`
    )
    
    if (!dropResponse.ok) {
      console.error('Drop geocoding failed:', await dropResponse.text());
      throw new Error(`Drop geocoding failed: ${dropResponse.status}`);
    }
    
    const dropData = await dropResponse.json()
    console.log('Drop geocoding result:', dropData);
    
    if (!dropData.features || dropData.features.length === 0) {
      throw new Error('Drop location not found')
    }

    const pickupCoords = pickupData.features[0].geometry.coordinates
    const dropCoords = dropData.features[0].geometry.coordinates

    // Geocode intermediate stops if any
    const intermediateCoords = [];
    for (const stop of intermediateStops) {
      if (stop.location && stop.location.trim()) {
        console.log('Geocoding intermediate stop:', stop.location);
        const stopResponse = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(stop.location)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=LK&limit=1`
        );
        
        if (stopResponse.ok) {
          const stopData = await stopResponse.json();
          if (stopData.features && stopData.features.length > 0) {
            intermediateCoords.push(stopData.features[0].geometry.coordinates);
            console.log('Intermediate stop geocoded:', stop.location, stopData.features[0].geometry.coordinates);
          }
        }
      }
    }

    console.log('Coordinates found:', { pickupCoords, dropCoords, intermediateCoords, parkingCoords: [parkingLng, parkingLat] });

    // Build the complete route: Parking -> Pickup -> Intermediate Stops -> Drop -> Parking
    const allWaypoints = [
      [parkingLng, parkingLat],
      pickupCoords,
      ...intermediateCoords,
      dropCoords,
      [parkingLng, parkingLat]
    ];

    const waypointsString = allWaypoints.map(coord => `${coord[0]},${coord[1]}`).join(';');

    // Calculate the complete optimized route
    console.log('Calculating complete route with waypoints...');
    const completeRouteResponse = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${waypointsString}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson&overview=full`
    )
    
    if (!completeRouteResponse.ok) {
      console.error('Complete route calculation failed:', await completeRouteResponse.text());
      throw new Error(`Complete route calculation failed: ${completeRouteResponse.status}`);
    }
    
    const completeRouteData = await completeRouteResponse.json();
    console.log('Complete route calculation result:', completeRouteData);

    if (!completeRouteData.routes || completeRouteData.routes.length === 0) {
      throw new Error('No route found for the specified waypoints');
    }

    const route = completeRouteData.routes[0];
    const totalDistance = route.distance ? Math.round((route.distance / 1000) * 10) / 10 : 0;

    // Calculate individual segment distances for breakdown
    let kmParkingToPickup = 0;
    let kmTrip = 0; // This will be the trip through all intermediate stops
    let kmDropToParking = 0;

    if (route.legs && route.legs.length >= 2) {
      // First leg: Parking to Pickup
      kmParkingToPickup = route.legs[0].distance ? 
        Math.round((route.legs[0].distance / 1000) * 10) / 10 : 0;
      
      // Last leg: Drop to Parking
      const lastLegIndex = route.legs.length - 1;
      kmDropToParking = route.legs[lastLegIndex].distance ? 
        Math.round((route.legs[lastLegIndex].distance / 1000) * 10) / 10 : 0;
      
      // Middle legs: Pickup through intermediate stops to drop
      kmTrip = 0;
      for (let i = 1; i < lastLegIndex; i++) {
        kmTrip += route.legs[i].distance ? route.legs[i].distance : 0;
      }
      kmTrip = Math.round((kmTrip / 1000) * 10) / 10;
    }

    // Build route description with intermediate stops
    let routeDescription = `${pickupData.features[0].place_name}`;
    for (let i = 0; i < intermediateStops.length; i++) {
      if (intermediateStops[i].location && intermediateStops[i].location.trim() && i < intermediateCoords.length) {
        routeDescription += ` → ${intermediateStops[i].location}`;
      }
    }
    routeDescription += ` → ${dropData.features[0].place_name}`;

    const result = {
      kmParkingToPickup,
      kmTrip,
      kmDropToParking,
      totalDistance,
      pickupCoords,
      dropCoords,
      intermediateCoords,
      pickupAddress: pickupData.features[0].place_name,
      dropAddress: dropData.features[0].place_name,
      routeDescription,
      intermediateStops: intermediateStops.filter(stop => stop.location && stop.location.trim())
    };

    console.log('Final distance calculation result:', result);

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
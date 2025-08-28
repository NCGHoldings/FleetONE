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
    const { pickupLocation, dropLocation, parkingLat, parkingLng } = await req.json()
    
    console.log('Distance calculation request:', { pickupLocation, dropLocation, parkingLat, parkingLng });
    
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

    console.log('Coordinates found:', { pickupCoords, dropCoords, parkingCoords: [parkingLng, parkingLat] });

    // Calculate distance from parking to pickup
    console.log('Calculating parking to pickup distance...');
    const parkingToPickupResponse = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${parkingLng},${parkingLat};${pickupCoords[0]},${pickupCoords[1]}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson`
    )
    
    if (!parkingToPickupResponse.ok) {
      console.error('Parking to pickup routing failed:', await parkingToPickupResponse.text());
      throw new Error(`Parking to pickup routing failed: ${parkingToPickupResponse.status}`);
    }
    
    const parkingToPickupData = await parkingToPickupResponse.json()
    console.log('Parking to pickup routing result:', parkingToPickupData);

    // Calculate distance for the main trip (pickup to drop)
    console.log('Calculating main trip distance...');
    const tripResponse = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupCoords[0]},${pickupCoords[1]};${dropCoords[0]},${dropCoords[1]}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson`
    )
    
    if (!tripResponse.ok) {
      console.error('Main trip routing failed:', await tripResponse.text());
      throw new Error(`Main trip routing failed: ${tripResponse.status}`);
    }
    
    const tripData = await tripResponse.json()
    console.log('Main trip routing result:', tripData);

    // Calculate distance from drop back to parking
    console.log('Calculating drop to parking distance...');
    const dropToParkingResponse = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${dropCoords[0]},${dropCoords[1]};${parkingLng},${parkingLat}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson`
    )
    
    if (!dropToParkingResponse.ok) {
      console.error('Drop to parking routing failed:', await dropToParkingResponse.text());
      throw new Error(`Drop to parking routing failed: ${dropToParkingResponse.status}`);
    }
    
    const dropToParkingData = await dropToParkingResponse.json()
    console.log('Drop to parking routing result:', dropToParkingData);

    const kmParkingToPickup = parkingToPickupData.routes?.[0]?.distance ? 
      Math.round((parkingToPickupData.routes[0].distance / 1000) * 10) / 10 : 0
    
    const kmTrip = tripData.routes?.[0]?.distance ? 
      Math.round((tripData.routes[0].distance / 1000) * 10) / 10 : 0
    
    const kmDropToParking = dropToParkingData.routes?.[0]?.distance ? 
      Math.round((dropToParkingData.routes[0].distance / 1000) * 10) / 10 : 0

    const result = {
      kmParkingToPickup,
      kmTrip,
      kmDropToParking,
      pickupCoords,
      dropCoords,
      pickupAddress: pickupData.features[0].place_name,
      dropAddress: dropData.features[0].place_name
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
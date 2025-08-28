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
    
    const MAPBOX_ACCESS_TOKEN = Deno.env.get('MAPBOX_ACCESS_TOKEN')
    if (!MAPBOX_ACCESS_TOKEN) {
      throw new Error('Mapbox access token not configured')
    }

    // Geocode pickup location
    const pickupResponse = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(pickupLocation)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=LK&limit=1`
    )
    const pickupData = await pickupResponse.json()
    
    if (!pickupData.features || pickupData.features.length === 0) {
      throw new Error('Pickup location not found')
    }

    // Geocode drop location
    const dropResponse = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(dropLocation)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=LK&limit=1`
    )
    const dropData = await dropResponse.json()
    
    if (!dropData.features || dropData.features.length === 0) {
      throw new Error('Drop location not found')
    }

    const pickupCoords = pickupData.features[0].geometry.coordinates
    const dropCoords = dropData.features[0].geometry.coordinates

    // Calculate distance from parking to pickup
    const parkingToPickupResponse = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${parkingLng},${parkingLat};${pickupCoords[0]},${pickupCoords[1]}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson`
    )
    const parkingToPickupData = await parkingToPickupResponse.json()

    // Calculate distance for the main trip (pickup to drop)
    const tripResponse = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupCoords[0]},${pickupCoords[1]};${dropCoords[0]},${dropCoords[1]}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson`
    )
    const tripData = await tripResponse.json()

    // Calculate distance from drop back to parking
    const dropToParkingResponse = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${dropCoords[0]},${dropCoords[1]};${parkingLng},${parkingLat}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson`
    )
    const dropToParkingData = await dropToParkingResponse.json()

    const kmParkingToPickup = parkingToPickupData.routes?.[0]?.distance ? 
      Math.round((parkingToPickupData.routes[0].distance / 1000) * 10) / 10 : 0
    
    const kmTrip = tripData.routes?.[0]?.distance ? 
      Math.round((tripData.routes[0].distance / 1000) * 10) / 10 : 0
    
    const kmDropToParking = dropToParkingData.routes?.[0]?.distance ? 
      Math.round((dropToParkingData.routes[0].distance / 1000) * 10) / 10 : 0

    return new Response(
      JSON.stringify({
        kmParkingToPickup,
        kmTrip,
        kmDropToParking,
        pickupCoords,
        dropCoords,
        pickupAddress: pickupData.features[0].place_name,
        dropAddress: dropData.features[0].place_name
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// API costs for tracking (per 1000 calls)
const API_COSTS = {
  geocoding: 0.005,    // $5 per 1000
  directions: 0.005,   // $5 per 1000
};

// Helper function to log API usage
const logApiUsage = async (supabase: any, apiName: string, queryText: string, cacheHit: boolean, status: string, metadata: any = {}) => {
  try {
    const estimatedCost = cacheHit ? 0 : (API_COSTS[apiName as keyof typeof API_COSTS] || 0);
    await supabase.from('api_usage_logs').insert({
      api_name: apiName,
      endpoint: 'calculate-distance',
      query_text: queryText?.substring(0, 200),
      cache_hit: cacheHit,
      response_status: status,
      estimated_cost: estimatedCost,
      metadata
    });
  } catch (e) {
    console.warn('Failed to log API usage:', e);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Initialize Supabase client for logging
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const {
      pickupLocation,
      dropLocation,
      intermediateStops = [],
      parkingLat,
      parkingLng,
      pickupCoords: pickupCoordsInput,
      dropCoords: dropCoordsInput,
      busDetails = null, // New: array of bus parking locations for multi-parking
      numberOfBuses = 1,
      // New parameters for distance accuracy
      calculateSegments = false, // Calculate each segment individually
      avoidHighways = false, // Avoid highways for more accurate city routing
      avoidTolls = false, // Avoid toll roads
      debugMode = false, // Enable detailed logging and comparison
      routePreference = 'distance', // 'distance' or 'duration'
      optimizeTrip = true, // NEW: Use Google's optimized route for trip distance (matches Google Maps)
    } = await req.json()

    console.log('Distance calculation request:', {
      pickupLocation,
      dropLocation,
      intermediateStops,
      parkingLat,
      parkingLng,
      pickupCoordsInput,
      dropCoordsInput,
      busDetails,
      numberOfBuses,
      calculateSegments,
      avoidHighways,
      avoidTolls,
      debugMode,
      routePreference,
    });

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!GOOGLE_API_KEY) {
      console.error('Google API key not configured');
      throw new Error('Google API key not configured');
    }

    const roundKm = (m: number) => Math.round((m / 1000) * 10) / 10;

    // Build route parameters for Google Directions API - optimized for bus routing
    const buildRouteParams = () => {
      // Use driving mode but with truck restrictions to simulate bus routing
      let params = 'mode=driving';
      
      // Add vehicle restrictions for large vehicles (buses)
      params += '&vehicle_type=bus'; // If supported by the API
      
      // Add avoidance parameters
      const avoidanceParams = [];
      if (avoidHighways) avoidanceParams.push('highways');
      if (avoidTolls) avoidanceParams.push('tolls');
      // Always avoid ferries for bus routes and add restricted roads
      avoidanceParams.push('ferries');
      
      if (avoidanceParams.length > 0) {
        params += `&avoid=${avoidanceParams.join('|')}`;
      }
      
      return params;
    };

    // Enhanced segment calculation function
    const calculateSegmentDistance = async (origin: {lat: number, lng: number}, destination: {lat: number, lng: number}, segmentName?: string) => {
      const routeParams = buildRouteParams();
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&${routeParams}&key=${GOOGLE_API_KEY}`;
      
      if (debugMode) {
        console.log(`Calculating segment: ${segmentName || 'Unknown segment'}`);
        console.log(`URL: ${url}`);
      }
      
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`Failed to calculate segment distance for ${segmentName}`);
      }
      
      const data = await resp.json();
      if (data.status !== 'OK' || !data.routes?.length) {
        throw new Error(`No route found for segment: ${segmentName}`);
      }
      
      const distance = roundKm(data.routes[0].legs[0].distance.value);
      const duration = data.routes[0].legs[0].duration.text;
      
      if (debugMode) {
        console.log(`Segment ${segmentName}: ${distance} km (${duration})`);
      }
      
      return {
        distance,
        duration,
        route: data.routes[0]
      };
    };

    // Helper: Geocode a free-text address in Sri Lanka using Google Geocoding API
    const geocodeLK = async (query: string) => {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:LK&key=${GOOGLE_API_KEY}`;
      console.log('Geocoding with Google:', query);
      const resp = await fetch(url);
      if (!resp.ok) {
        console.error('Geocoding HTTP failed:', await resp.text());
        await logApiUsage(supabase, 'geocoding', query, false, 'HTTP_ERROR');
        throw new Error(`Geocoding failed (${resp.status})`);
      }
      const data = await resp.json();
      await logApiUsage(supabase, 'geocoding', query, false, data.status);
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
    // OPTIMIZATION: If coordinates are provided, skip geocoding to save API calls
    const pickupPoint = pickupCoordsInput && pickupCoordsInput.length === 2
      ? { lat: pickupCoordsInput[1], lng: pickupCoordsInput[0], formatted_address: pickupLocation }
      : await geocodeLK(pickupLocation);

    const dropPoint = dropCoordsInput && dropCoordsInput.length === 2
      ? { lat: dropCoordsInput[1], lng: dropCoordsInput[0], formatted_address: dropLocation }
      : await geocodeLK(dropLocation);
    
    // Log if coordinates were reused (cache hit equivalent)
    if (pickupCoordsInput && pickupCoordsInput.length === 2) {
      await logApiUsage(supabase, 'geocoding', pickupLocation, true, 'COORDS_PROVIDED');
    }
    if (dropCoordsInput && dropCoordsInput.length === 2) {
      await logApiUsage(supabase, 'geocoding', dropLocation, true, 'COORDS_PROVIDED');
    }

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
      busDetails,
    });

    // Multi-parking calculation logic
    if (busDetails && busDetails.length > 0) {
      console.log('Using multi-parking calculation for', busDetails.length, 'buses');
      
      const busCalculations = [];
      const segmentDetails = [];
      
      for (let i = 0; i < busDetails.length; i++) {
        const bus = busDetails[i];
        const busParking = { lat: bus.parkingLat, lng: bus.parkingLng };
        
        // Calculate parking -> pickup distance with new enhanced method
        const parkingToPickup = await calculateSegmentDistance(
          busParking, 
          pickupPoint, 
          `Bus ${i + 1} Parking to Pickup`
        );
        
        // Calculate drop -> parking distance with new enhanced method
        const dropToParking = await calculateSegmentDistance(
          dropPoint, 
          busParking, 
          `Drop to Bus ${i + 1} Parking`
        );
        
        busCalculations.push({
          busNumber: i + 1,
          parkingLocationName: bus.parkingLocationName || `Bus ${i + 1} Parking`,
          kmParkingToPickup: parkingToPickup.distance,
          kmDropToParking: dropToParking.distance,
        });
      }
      
      // Calculate trip distance with enhanced segment-by-segment calculation
      const tripPoints = [pickupPoint, ...intermediatePoints, dropPoint];
      let kmTrip = 0;
      const tripSegments = [];
      
      if (calculateSegments && tripPoints.length > 1) {
        // Segment-by-segment calculation for maximum accuracy
        for (let i = 0; i < tripPoints.length - 1; i++) {
          const origin = tripPoints[i];
          const destination = tripPoints[i + 1];
          
          const segmentName = i === 0 ? 'Pickup to Stop 1' : 
                            i === tripPoints.length - 2 ? `Stop ${i} to Drop` : 
                            `Stop ${i} to Stop ${i + 1}`;
          
          const segment = await calculateSegmentDistance(origin, destination, segmentName);
          kmTrip += segment.distance;
          tripSegments.push({
            from: i === 0 ? pickupLocation : intermediateStops[i - 1]?.location || `Stop ${i}`,
            to: i === tripPoints.length - 2 ? dropLocation : intermediateStops[i]?.location || `Stop ${i + 1}`,
            distance: segment.distance,
            duration: segment.duration
          });
        }
        
        if (debugMode) {
          console.log('Trip segments breakdown:', tripSegments);
        }
      } else {
        // Original bulk calculation
        if (tripPoints.length > 1) {
          for (let i = 0; i < tripPoints.length - 1; i++) {
            const origin = tripPoints[i];
            const destination = tripPoints[i + 1];
            
            const routeParams = buildRouteParams();
            const tripSegmentUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&${routeParams}&key=${GOOGLE_API_KEY}`;
            const tripSegmentResp = await fetch(tripSegmentUrl);
            
            if (tripSegmentResp.ok) {
              const tripSegmentData = await tripSegmentResp.json();
              if (tripSegmentData.status === 'OK' && tripSegmentData.routes?.length) {
                kmTrip += roundKm(tripSegmentData.routes[0].legs[0].distance.value);
              }
            }
          }
        }
      }
      
      // Calculate totals
      const totalKmParkingToPickup = busCalculations.reduce((sum, bus) => sum + bus.kmParkingToPickup, 0);
      const totalKmDropToParking = busCalculations.reduce((sum, bus) => sum + bus.kmDropToParking, 0);
      const totalDistance = totalKmParkingToPickup + kmTrip + totalKmDropToParking;
      
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
        kmParkingToPickup: totalKmParkingToPickup,
        kmTrip,
        kmDropToParking: totalKmDropToParking,
        totalDistance,
        pickupCoords,
        dropCoords,
        intermediateCoords,
        pickupAddress: pickupPoint.formatted_address || pickupLocation,
        dropAddress: dropPoint.formatted_address || dropLocation,
        routeDescription,
        intermediateStops: intermediateStops.filter((s: any) => s?.location && String(s.location).trim()),
        busCalculations, // Individual bus calculations for multi-parking
        isMultiParking: true,
        // Enhanced debugging information
        calculationMethod: calculateSegments ? 'segment-by-segment' : 'optimized-route',
        routePreferences: {
          avoidHighways,
          avoidTolls,
          routePreference
        },
        tripSegments: calculateSegments ? tripSegments : undefined,
      };
      
      console.log('Final multi-parking calculation result:', result);
      
      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // Enhanced single-parking calculation
    console.log('Using single-parking calculation');
    console.log('Calculation method:', calculateSegments ? 'segment-by-segment' : 'optimized-route');

    let kmParkingToPickup = 0;
    let kmTrip = 0;
    let kmDropToParking = 0;
    let totalDistance = 0;
    let optimizedTotalDistance = 0;
    let comparisonData = null;
    const allSegments = [];

    if (calculateSegments) {
      // Segment-by-segment calculation for maximum accuracy
      console.log('Calculating segments individually for accurate distance');
      
      // 1. Parking to Pickup
      const parkingToPickup = await calculateSegmentDistance(
        { lat: parkingLat, lng: parkingLng },
        pickupPoint,
        'Parking to Pickup'
      );
      kmParkingToPickup = parkingToPickup.distance;
      allSegments.push({
        segment: 'Parking to Pickup',
        distance: kmParkingToPickup,
        duration: parkingToPickup.duration
      });

      // 2. Trip segments (Pickup -> Intermediate stops -> Drop)
      const tripPoints = [pickupPoint, ...intermediatePoints, dropPoint];
      const tripSegments = [];
      
      for (let i = 0; i < tripPoints.length - 1; i++) {
        const origin = tripPoints[i];
        const destination = tripPoints[i + 1];
        
        const segmentName = i === 0 ? 'Pickup to First Stop' : 
                          i === tripPoints.length - 2 ? 'Last Stop to Drop' : 
                          `Stop ${i} to Stop ${i + 1}`;
        
        const segment = await calculateSegmentDistance(origin, destination, segmentName);
        kmTrip += segment.distance;
        
        const segmentInfo = {
          segment: segmentName,
          from: i === 0 ? pickupLocation : intermediateStops[i - 1]?.location || `Stop ${i}`,
          to: i === tripPoints.length - 2 ? dropLocation : intermediateStops[i]?.location || `Stop ${i + 1}`,
          distance: segment.distance,
          duration: segment.duration
        };
        
        tripSegments.push(segmentInfo);
        allSegments.push(segmentInfo);
      }

      // 3. Drop to Parking
      const dropToParking = await calculateSegmentDistance(
        dropPoint,
        { lat: parkingLat, lng: parkingLng },
        'Drop to Parking'
      );
      kmDropToParking = dropToParking.distance;
      allSegments.push({
        segment: 'Drop to Parking',
        distance: kmDropToParking,
        duration: dropToParking.duration
      });

      totalDistance = kmParkingToPickup + kmTrip + kmDropToParking;

      if (debugMode) {
        console.log('Segment-by-segment calculation complete:');
        console.log('Parking to Pickup:', kmParkingToPickup, 'km');
        console.log('Trip distance:', kmTrip, 'km');
        console.log('Drop to Parking:', kmDropToParking, 'km');
        console.log('Total distance:', totalDistance, 'km');
        console.log('All segments:', allSegments);
      }

      // Optional: Also calculate with optimized route for comparison
      if (debugMode) {
        try {
          console.log('Calculating optimized route for comparison...');
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
          // Sequential waypoints for comparison (no optimization)
          const waypointsParam = waypointList.length ? `&waypoints=${encodeURIComponent(waypointList.join('|'))}` : '';
          const routeParams = buildRouteParams();

          const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&${routeParams}${waypointsParam}&key=${GOOGLE_API_KEY}`;
          const dirResp = await fetch(directionsUrl);
          
          if (dirResp.ok) {
            const dirData = await dirResp.json();
            if (dirData.status === 'OK' && dirData.routes?.length) {
              const route = dirData.routes[0];
              const legs = route.legs || [];
              const totalMeters = legs.reduce((sum: number, leg: any) => sum + (leg.distance?.value || 0), 0);
              optimizedTotalDistance = roundKm(totalMeters);
              
              comparisonData = {
                segmentTotal: totalDistance,
                optimizedTotal: optimizedTotalDistance,
                difference: Math.abs(totalDistance - optimizedTotalDistance),
                percentageDiff: Math.abs((totalDistance - optimizedTotalDistance) / totalDistance * 100).toFixed(2)
              };
              
              console.log('Route comparison:', comparisonData);
            }
          }
        } catch (error) {
          console.warn('Failed to calculate optimized route for comparison:', error);
        }
      }

    } else {
      // Route calculation with optional trip optimization
      console.log('Using route calculation, optimizeTrip:', optimizeTrip);
      
      // Calculate parking to pickup separately (never optimized)
      const parkingToPickupUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${parkingLat},${parkingLng}&destination=${pickupPoint.lat},${pickupPoint.lng}&${buildRouteParams()}&key=${GOOGLE_API_KEY}`;
      const parkingToPickupResp = await fetch(parkingToPickupUrl);
      if (parkingToPickupResp.ok) {
        const parkingToPickupData = await parkingToPickupResp.json();
        if (parkingToPickupData.status === 'OK' && parkingToPickupData.routes?.length) {
          kmParkingToPickup = roundKm(parkingToPickupData.routes[0].legs[0].distance.value);
        }
      }
      await logApiUsage(supabase, 'directions', 'parking_to_pickup', false, 'OK');

      // Calculate trip portion (pickup -> intermediate -> drop)
      // Use optimize:true if optimizeTrip is enabled to match Google Maps distance
      const tripPoints = [pickupPoint, ...intermediatePoints, dropPoint];
      if (tripPoints.length >= 2) {
        const tripOrigin = `${tripPoints[0].lat},${tripPoints[0].lng}`;
        const tripDest = `${tripPoints[tripPoints.length - 1].lat},${tripPoints[tripPoints.length - 1].lng}`;
        
        // Build waypoints for trip - only intermediate stops (not origin/destination)
        const tripWaypointList = tripPoints.slice(1, -1).map(p => `${p.lat},${p.lng}`);
        
        // KEY FIX: Use optimize:true for trip waypoints when optimizeTrip is enabled
        // This makes the distance match Google Maps by allowing optimal stop order
        let waypointsParam = '';
        if (tripWaypointList.length > 0) {
          if (optimizeTrip) {
            // Optimized route - matches Google Maps distance
            waypointsParam = `&waypoints=optimize:true|${tripWaypointList.join('|')}`;
            console.log('Using OPTIMIZED trip routing (matches Google Maps)');
          } else {
            // Sequential route - preserves exact stop order
            waypointsParam = `&waypoints=${encodeURIComponent(tripWaypointList.join('|'))}`;
            console.log('Using SEQUENTIAL trip routing (exact stop order)');
          }
        }
        
        const tripUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${tripOrigin}&destination=${tripDest}&${buildRouteParams()}${waypointsParam}&key=${GOOGLE_API_KEY}`;
        console.log('Trip route URL:', tripUrl.replace(GOOGLE_API_KEY!, '***'));
        
        const tripResp = await fetch(tripUrl);
        if (tripResp.ok) {
          const tripData = await tripResp.json();
          if (tripData.status === 'OK' && tripData.routes?.length) {
            const tripRoute = tripData.routes[0];
            const tripLegs = tripRoute.legs || [];
            const tripMeters = tripLegs.reduce((sum: number, leg: any) => sum + (leg.distance?.value || 0), 0);
            kmTrip = roundKm(tripMeters);
            
            // Log if route was reordered
            if (optimizeTrip && tripRoute.waypoint_order && tripRoute.waypoint_order.length > 0) {
              const expectedOrder = tripWaypointList.map((_, i) => i);
              const actualOrder = tripRoute.waypoint_order;
              if (JSON.stringify(expectedOrder) !== JSON.stringify(actualOrder)) {
                console.log('Route was optimized. Original order:', expectedOrder, 'Optimized order:', actualOrder);
              }
            }
          }
        }
        await logApiUsage(supabase, 'directions', 'trip_segment', false, 'OK');
      }

      // Calculate drop to parking separately (never optimized)
      const dropToParkingUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${dropPoint.lat},${dropPoint.lng}&destination=${parkingLat},${parkingLng}&${buildRouteParams()}&key=${GOOGLE_API_KEY}`;
      const dropToParkingResp = await fetch(dropToParkingUrl);
      if (dropToParkingResp.ok) {
        const dropToParkingData = await dropToParkingResp.json();
        if (dropToParkingData.status === 'OK' && dropToParkingData.routes?.length) {
          kmDropToParking = roundKm(dropToParkingData.routes[0].legs[0].distance.value);
        }
      }
      await logApiUsage(supabase, 'directions', 'drop_to_parking', false, 'OK');

      totalDistance = kmParkingToPickup + kmTrip + kmDropToParking;
      console.log('Distance breakdown:', { kmParkingToPickup, kmTrip, kmDropToParking, totalDistance });
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
      // Enhanced debugging and verification data
      calculationMethod: calculateSegments ? 'segment-by-segment' : 'optimized-route',
      routePreferences: {
        avoidHighways,
        avoidTolls,
        routePreference
      },
      segmentDetails: calculateSegments ? allSegments : undefined,
      routeComparison: comparisonData,
      optimizedDistance: optimizedTotalDistance || totalDistance,
      isSegmentCalculation: calculateSegments,
    };

    console.log('Final distance calculation result (Google):', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: unknown) {
    console.error('Distance calculation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

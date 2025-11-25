import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FIOSPosition {
  t: number; // Unix timestamp
  f: number;
  lc: number;
  y: number; // latitude
  x: number; // longitude
  c: number; // course
  z: number; // altitude
  s: number; // speed in km/h
  sc: number; // satellite count
}

interface FIOSUnit {
  nm: string; // Unit name (vehicle plate)
  cls: number;
  id: number; // FIOS device ID
  mu: number;
  pos: FIOSPosition;
  uacl: number;
}

interface FIOSResponse {
  items: FIOSUnit[];
}

let cachedSessionId: string | null = null;
let sessionExpiry: number = 0;

async function authenticateWithFIOS(token: string): Promise<string> {
  console.log('[FIOS] Authenticating with token...');
  
  const loginUrl = `https://fios-api.kloudip.com/api?svc=token/login&params=${encodeURIComponent(JSON.stringify({ token, fl: 1 }))}`;
  
  const response = await fetch(loginUrl);
  
  if (!response.ok) {
    throw new Error(`FIOS API returned status ${response.status}`);
  }
  
  const data = await response.json();
  console.log('[FIOS] Login response:', JSON.stringify(data));
  
  // FIOS returns session ID in 'eid' field on success
  // If there's an error, eid will contain error code
  if (!data.eid) {
    throw new Error(`FIOS authentication failed: No session ID returned`);
  }
  
  const sessionId = data.eid;
  console.log('[FIOS] Authentication successful, session ID:', sessionId.substring(0, 8) + '...');
  
  // Cache session ID for 4 minutes (240 seconds)
  cachedSessionId = sessionId;
  sessionExpiry = Date.now() + (4 * 60 * 1000);
  
  return sessionId;
}

async function keepSessionAlive(sessionId: string): Promise<void> {
  console.log('[FIOS] Sending keep-alive request...');
  const keepAliveUrl = `https://fios-api.kloudip.com/avl_evts?sid=${sessionId}`;
  await fetch(keepAliveUrl);
  console.log('[FIOS] Keep-alive request sent');
}

async function fetchAllVehiclePositions(sessionId: string): Promise<FIOSUnit[]> {
  console.log('[FIOS] Fetching all vehicle positions...');
  
  const params = {
    spec: {
      itemsType: "avl_unit",
      propName: "",
      propValueMask: "*",
      sortType: ""
    },
    force: 1,
    flags: 4194305,
    from: 0,
    to: 0
  };
  
  const url = `https://fios-api.kloudip.com/api?svc=core/search_items&params=${encodeURIComponent(JSON.stringify(params))}&sid=${sessionId}`;
  
  const response = await fetch(url);
  const data: FIOSResponse = await response.json();
  
  console.log(`[FIOS] Received ${data.items?.length || 0} vehicles`);
  
  return data.items || [];
}

function parseBusNumber(fiosName: string): string {
  // FIOS Name: \"NE-2266-NUGEGODA\" → \"NE 2266\"
  // Remove location suffix and format
  const parts = fiosName.split('-');
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  return fiosName;
}

function getEngineHealth(speed: number, lastUpdate: string): string {
  const updateAge = Date.now() - new Date(lastUpdate).getTime();
  const minutesOld = updateAge / (1000 * 60);
  
  if (minutesOld > 30) return 'critical';
  if (speed > 80) return 'warning';
  return 'good';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fiosToken = Deno.env.get('FIOS_API_TOKEN');

    if (!fiosToken) {
      throw new Error('FIOS_API_TOKEN not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get or refresh session
    let sessionId = cachedSessionId;
    if (!sessionId || Date.now() >= sessionExpiry) {
      sessionId = await authenticateWithFIOS(fiosToken);
    } else {
      // Keep session alive
      await keepSessionAlive(sessionId);
    }

    // Fetch all vehicle positions
    const vehicles = await fetchAllVehiclePositions(sessionId);

    // Get all buses from database
    const { data: buses, error: busError } = await supabase
      .from('buses')
      .select('id, bus_no, route');

    if (busError) throw busError;

    const trackingData = [];
    const unmatchedVehicles = [];

    for (const vehicle of vehicles) {
      const parsedBusNo = parseBusNumber(vehicle.nm);
      
      // Try to match with database bus
      const bus = buses?.find(b => 
        b.bus_no === parsedBusNo || 
        b.bus_no.replace(/\s+/g, '-') === parsedBusNo ||
        b.bus_no.replace(/\s+/g, '') === parsedBusNo.replace(/-/g, '')
      );

      if (!bus) {
        unmatchedVehicles.push(vehicle.nm);
        continue;
      }

      const lastUpdate = new Date(vehicle.pos.t * 1000).toISOString();
      const status = vehicle.pos.s > 0 ? 'active' : 'inactive';
      const engineHealth = getEngineHealth(vehicle.pos.s, lastUpdate);

      trackingData.push({
        bus_id: bus.id,
        bus_no: bus.bus_no,
        current_location: `Lat: ${vehicle.pos.y.toFixed(6)}, Lng: ${vehicle.pos.x.toFixed(6)}`,
        gps_coordinates: {
          lat: vehicle.pos.y,
          lng: vehicle.pos.x
        },
        route_name: bus.route || 'Unknown Route',
        speed_kmh: vehicle.pos.s,
        status: status,
        last_update: lastUpdate,
        fuel_level: null,
        tire_pressure: null,
        engine_health: engineHealth,
        engine_temperature: null,
        battery_voltage: null,
        odometer_reading: null,
        driver_name: null,
        alerts: []
      });
    }

    // Delete existing tracking data
    await supabase.from('real_time_tracking').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert new tracking data
    if (trackingData.length > 0) {
      const { error: insertError } = await supabase
        .from('real_time_tracking')
        .insert(trackingData);

      if (insertError) throw insertError;
    }

    console.log(`[FIOS] Successfully updated ${trackingData.length} vehicles`);
    if (unmatchedVehicles.length > 0) {
      console.log(`[FIOS] Unmatched vehicles: ${unmatchedVehicles.join(', ')}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${trackingData.length} vehicles from FIOS API`,
        matched: trackingData.length,
        unmatched: unmatchedVehicles.length,
        unmatchedVehicles: unmatchedVehicles
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[FIOS] Error:', error);
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

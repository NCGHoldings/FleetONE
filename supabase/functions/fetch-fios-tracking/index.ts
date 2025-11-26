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

async function fetchMileageData(sessionId: string, deviceId: number): Promise<{odometer: number | null, dailyMileage: number | null}> {
  console.log(`[FIOS] Fetching mileage for device ${deviceId}...`);
  
  try {
    // Fetch last 24 hours of messages
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - (24 * 60 * 60);
    
    const params = {
      itemId: deviceId,
      timeFrom: oneDayAgo,
      timeTo: now,
      flags: 0,
      flagsMask: 0,
      loadCount: 100
    };
    
    const url = `https://fios-api.kloudip.com/api?svc=messages/load_interval&params=${encodeURIComponent(JSON.stringify(params))}&sid=${sessionId}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.messages || data.messages.length === 0) {
      console.log(`[FIOS] No messages found for device ${deviceId}`);
      return { odometer: null, dailyMileage: null };
    }
    
    // Parse messages to find mileage/odometer data
    let latestOdometer: number | null = null;
    let firstOdometer: number | null = null;
    
    for (const msg of data.messages) {
      // Check multiple possible odometer parameter names
      const odometerFields = ['mileage', 'odometer', 'can_odometer', 'total_distance', 'distance', 'odo', 'km', 'can_mileage'];
      
      for (const field of odometerFields) {
        if (msg.p && msg.p[field]) {
          const value = parseFloat(msg.p[field]);
          if (!isNaN(value) && value > 0) {
            if (!firstOdometer) firstOdometer = value;
            latestOdometer = value;
            break; // Found valid odometer, move to next message
          }
        }
      }
    }
    
    const dailyMileage = latestOdometer && firstOdometer ? latestOdometer - firstOdometer : null;
    
    console.log(`[FIOS] Device ${deviceId} - Odometer: ${latestOdometer}, Daily: ${dailyMileage}`);
    return { odometer: latestOdometer, dailyMileage };
    
  } catch (error) {
    console.error(`[FIOS] Error fetching mileage for device ${deviceId}:`, error);
    return { odometer: null, dailyMileage: null };
  }
}

async function fetchFuelData(sessionId: string, deviceId: number): Promise<number | null> {
  console.log(`[FIOS] Fetching fuel data for device ${deviceId}...`);
  
  try {
    // Fetch last 1 hour of messages for latest fuel reading
    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - (60 * 60);
    
    const params = {
      itemId: deviceId,
      timeFrom: oneHourAgo,
      timeTo: now,
      flags: 0,
      flagsMask: 0,
      loadCount: 50
    };
    
    const url = `https://fios-api.kloudip.com/api?svc=messages/load_interval&params=${encodeURIComponent(JSON.stringify(params))}&sid=${sessionId}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.messages || data.messages.length === 0) {
      console.log(`[FIOS] No messages found for fuel data on device ${deviceId}`);
      return null;
    }
    
    // DEBUG: Log all available parameters from first message
    if (data.messages[0]?.p) {
      console.log(`[FIOS DEBUG] Device ${deviceId} available parameters:`, JSON.stringify(Object.keys(data.messages[0].p)));
      console.log(`[FIOS DEBUG] Device ${deviceId} parameter values:`, JSON.stringify(data.messages[0].p));
    }
    
    // Parse messages to find fuel sensor data (in LITERS)
    let latestFuel: number | null = null;
    
    for (const msg of data.messages) {
      if (msg.p) {
        // Expanded list of possible FIOS/Wialon fuel parameter names
        const fuelFields = [
          // Standard fuel fields
          'fuel', 'fuel_level', 'fuel_percent', 'fuel_level_percent',
          'can_fuel', 'fuel_sensor', 'fuel1', 'fuel2',
          // Wialon/FIOS specific analog inputs
          'adc1', 'adc2', 'adc3', 'adc4',
          // Fuel level sensors
          'fls', 'fls1', 'fls2', 'fuel_lvl', 'fuel_lev',
          // Liters-based fields
          'fuel_liters', 'fuel_l', 'tank_level', 'fuel_volume',
          // CAN bus parameters
          'can_fuel_level', 'can_fuel_percent',
          // Generic IO parameters
          'io1', 'io2', 'io_fuel', 'io_fuel_level',
          'param23', 'param24', 'param25', 'param200', 'param201'
        ];
        
        for (const field of fuelFields) {
          if (msg.p[field] !== undefined && msg.p[field] !== null) {
            const value = parseFloat(msg.p[field]);
            // Accept any positive value as liters (removed 0-100 filter)
            if (!isNaN(value) && value >= 0) {
              latestFuel = value;
              console.log(`[FIOS] Found fuel data in field '${field}': ${value} liters`);
              break;
            }
          }
        }
        
        if (latestFuel !== null) break; // Found valid fuel data, stop searching
      }
    }
    
    if (latestFuel === null) {
      console.log(`[FIOS] No fuel sensor detected for device ${deviceId}`);
    } else {
      console.log(`[FIOS] Device ${deviceId} - Fuel: ${latestFuel} liters`);
    }
    
    return latestFuel;
    
  } catch (error) {
    console.error(`[FIOS] Error fetching fuel for device ${deviceId}:`, error);
    return null;
  }
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

// Get current date in Sri Lanka timezone (UTC+5:30)
function getSriLankaDate(): string {
  const now = new Date();
  const sriLankaTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return sriLankaTime.toISOString().split('T')[0];
}

// Haversine formula to calculate distance between two GPS points
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate GPS-based mileage for buses without FIOS odometer
async function calculateGPSMileage(supabase: any, busId: string, sriLankaDate: string): Promise<number> {
  try {
    // Get start and end of day in Sri Lanka timezone
    const startOfDay = new Date(`${sriLankaDate}T00:00:00+05:30`);
    const endOfDay = new Date(`${sriLankaDate}T23:59:59+05:30`);
    
    console.log(`[GPS] Fetching waypoints for bus ${busId} from ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
    
    const { data: waypoints, error } = await supabase
      .from('gps_location_history')
      .select('latitude, longitude, timestamp')
      .eq('bus_id', busId)
      .gte('timestamp', startOfDay.toISOString())
      .lte('timestamp', endOfDay.toISOString())
      .order('timestamp', { ascending: true });
    
    if (error) {
      console.error(`[GPS] Error fetching waypoints:`, error);
      return 0;
    }
    
    if (!waypoints || waypoints.length < 2) {
      console.log(`[GPS] Insufficient waypoints for ${busId} on ${sriLankaDate} (found: ${waypoints?.length || 0})`);
      return 0;
    }
    
    // Calculate total distance using Haversine formula
    let totalDistance = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const dist = haversineDistance(
        waypoints[i-1].latitude, waypoints[i-1].longitude,
        waypoints[i].latitude, waypoints[i].longitude
      );
      // Only add if distance is reasonable (< 5km between points to filter outliers)
      if (dist < 5) {
        totalDistance += dist;
      }
    }
    
    console.log(`[GPS] Calculated ${totalDistance.toFixed(2)} km from ${waypoints.length} waypoints`);
    return Math.round(totalDistance * 10) / 10; // Round to 1 decimal
  } catch (error) {
    console.error('[GPS] Error calculating mileage:', error);
    return 0;
  }
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

    // Get all buses from database with odometer tracking fields
    const { data: buses, error: busError } = await supabase
      .from('buses')
      .select('id, bus_no, route, base_odometer_km, base_odometer_date, odometer_source, current_mileage');

    if (busError) throw busError;

    const trackingData = [];
    const unmatchedVehicles = [];
    const sriLankaDate = getSriLankaDate();

    for (const vehicle of vehicles) {
      const parsedBusNo = parseBusNumber(vehicle.nm);
      
      // Try to match with database bus
      let bus = buses?.find(b => 
        b.bus_no === parsedBusNo || 
        b.bus_no.replace(/\s+/g, '-') === parsedBusNo ||
        b.bus_no.replace(/\s+/g, '') === parsedBusNo.replace(/-/g, '')
      );

      // Auto-create bus if it doesn't exist
      if (!bus) {
        console.log(`[FIOS] Auto-creating missing bus: ${parsedBusNo}`);
        const busType = parsedBusNo.startsWith('NG') ? 'Imported Bus' : 'Regular';
        
        const { data: newBus, error: createError } = await supabase
          .from('buses')
          .insert({
            bus_no: parsedBusNo,
            type: busType,
            model: 'Unknown',
            capacity: 50,
            year: 2020,
            status: 'active'
          })
          .select()
          .single();
        
        if (createError) {
          console.error(`[FIOS] Failed to create bus ${parsedBusNo}:`, createError);
          unmatchedVehicles.push(vehicle.nm);
          continue;
        }
        
        bus = newBus;
        buses?.push(newBus); // Add to local array for subsequent matches
        console.log(`[FIOS] ✅ Created new bus: ${parsedBusNo}`);
      }

      const lastUpdate = new Date(vehicle.pos.t * 1000).toISOString();
      const status = vehicle.pos.s > 0 ? 'active' : 'inactive';
      const engineHealth = getEngineHealth(vehicle.pos.s, lastUpdate);

      // Fetch odometer & mileage data from FIOS messages API
      const mileageData = await fetchMileageData(sessionId, vehicle.id);
      
      // Fetch REAL fuel level from FIOS messages API (not the flag)
      const fuelLevel = await fetchFuelData(sessionId, vehicle.id);
      
      // Calculate odometer based on source
      let finalOdometer: number | null = null;
      let dailyMileage: number | null = null;
      let odometerSource = 'fios';
      
      if (mileageData.odometer && mileageData.odometer > 0) {
        // Bus has FIOS odometer data - use it directly
        finalOdometer = mileageData.odometer;
        dailyMileage = mileageData.dailyMileage;
        odometerSource = 'fios';
      } else if (bus.base_odometer_km && bus.base_odometer_km > 0) {
        // Bus doesn't have FIOS odometer but has manual base - calculate from GPS
        console.log(`[Odometer] ${bus.bus_no}: Starting GPS calculation with base ${bus.base_odometer_km} km from ${bus.base_odometer_date}`);
        
        // Get today's GPS-calculated mileage
        const todayGPSMileage = await calculateGPSMileage(supabase, bus.id, sriLankaDate);
        console.log(`[Odometer] ${bus.bus_no}: Today's GPS mileage = ${todayGPSMileage} km`);
        
        // Get cumulative GPS mileage since base date
        const { data: historicMileage, error: histError } = await supabase
          .from('bus_daily_mileage')
          .select('daily_km')
          .eq('bus_id', bus.id)
          .gte('date', bus.base_odometer_date)
          .lt('date', sriLankaDate);
        
        if (histError) {
          console.error(`[Odometer] ${bus.bus_no}: Error fetching historic mileage:`, histError);
        }
        
        const cumulativeGPSMileage = (historicMileage || []).reduce((sum, day) => sum + (day.daily_km || 0), 0);
        console.log(`[Odometer] ${bus.bus_no}: Cumulative historic GPS = ${cumulativeGPSMileage} km`);
        
        finalOdometer = bus.base_odometer_km + cumulativeGPSMileage + todayGPSMileage;
        dailyMileage = todayGPSMileage;
        odometerSource = 'gps_calculated';
        
        console.log(`[Odometer] ${bus.bus_no}: Final = ${bus.base_odometer_km} (base) + ${cumulativeGPSMileage} (historic) + ${todayGPSMileage} (today) = ${finalOdometer} km`);
      } else {
        // No FIOS odometer and no manual base - use existing current_mileage or null
        finalOdometer = bus.current_mileage || null;
        dailyMileage = null;
        odometerSource = 'manual';
      }
      
      // Store GPS location history for track playback
      if (bus.id) {
        const { error: gpsError } = await supabase.from('gps_location_history').insert({
          bus_id: bus.id,
          latitude: vehicle.pos.y,
          longitude: vehicle.pos.x,
          speed_kmh: vehicle.pos.s,
          heading: vehicle.pos.c || null,
          altitude_meters: vehicle.pos.z || null,
          odometer_reading: mileageData.odometer,
          fuel_level_percent: fuelLevel,
          timestamp: lastUpdate,
          data_source: 'fios'
        });
        if (gpsError) console.error(`[FIOS] GPS history error for ${bus.bus_no}:`, gpsError);
      }
      
      // Store fuel reading if available (in liters)
      if (bus.id && fuelLevel !== null) {
        const { error: fuelError } = await supabase.from('bus_fuel_readings').insert({
          bus_id: bus.id,
          fuel_level_liters: fuelLevel, // Store liters directly
          odometer_reading: mileageData.odometer,
          reading_timestamp: lastUpdate,
          data_source: 'fios'
        });
        if (fuelError) console.error(`[FIOS] Fuel reading error for ${bus.bus_no}:`, fuelError);
      }
      
      // Save or update daily mileage record (always save, even if 0 - bus might be parked)
      if (dailyMileage !== null) {
        console.log(`[Daily Mileage] ${bus.bus_no}: Saving ${dailyMileage} km for ${sriLankaDate}`);
        const { error: mileageError } = await supabase
          .from('bus_daily_mileage')
          .upsert({
            bus_id: bus.id,
            date: sriLankaDate,
            end_odometer_km: finalOdometer,
            daily_km: dailyMileage,
            data_source: odometerSource,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'bus_id,date'
          });
        
        if (mileageError) {
          console.error(`[FIOS] Daily mileage error for ${bus.bus_no}:`, mileageError);
        }
      }
      
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
        fuel_level: fuelLevel,
        tire_pressure: null,
        engine_health: engineHealth,
        engine_temperature: null,
        battery_voltage: null,
        odometer_reading: null,
        driver_name: null,
        alerts: [],
        // Enhanced GPS data
        heading_degrees: vehicle.pos.c || null,
        altitude_meters: vehicle.pos.z || null,
        satellite_count: vehicle.pos.sc || null,
        fios_device_id: vehicle.id || null,
        // Odometer & mileage data with source
        odometer_km: finalOdometer,
        daily_mileage_km: dailyMileage,
        odometer_source: odometerSource,
        engine_hours: null
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

    // Update bus odometers and trigger service alerts for buses with odometer data
    const odometerUpdates = [];
    for (const data of trackingData) {
      if (data.odometer_km && data.odometer_km > 0) {
        console.log(`[FIOS] Updating odometer for ${data.bus_no}: ${data.odometer_km} km`);
        
        try {
          // Update current_mileage in buses table
          const { error: busUpdateError } = await supabase
            .from('buses')
            .update({
              current_mileage: Math.round(data.odometer_km),
              updated_at: new Date().toISOString()
            })
            .eq('bus_no', data.bus_no);
          
          if (busUpdateError) {
            console.error(`[FIOS] Bus update error for ${data.bus_no}:`, busUpdateError);
            odometerUpdates.push({ bus_no: data.bus_no, success: false, error: busUpdateError.message });
            continue;
          }
          
          // Trigger service alert check
          const { data: updateResult, error: updateError } = await supabase.functions.invoke(
            'update-bus-odometer',
            {
              body: {
                bus_no: data.bus_no,
                current_km: data.odometer_km,
                updated_at: new Date().toISOString()
              }
            }
          );

          if (updateError) {
            console.error(`[FIOS] Odometer update error for ${data.bus_no}:`, updateError);
          } else {
            console.log(`[FIOS] ✅ Odometer updated for ${data.bus_no}:`, updateResult);
            odometerUpdates.push({ bus_no: data.bus_no, success: true, result: updateResult });
          }
        } catch (error) {
          console.error(`[FIOS] Exception updating odometer for ${data.bus_no}:`, error);
          odometerUpdates.push({ bus_no: data.bus_no, success: false, error: error.message });
        }
      }
    }

    // Trigger fuel alerts check
    try {
      await supabase.functions.invoke('check-fuel-alerts');
      console.log('[FIOS] Fuel alerts check triggered');
    } catch (error) {
      console.error('[FIOS] Fuel alerts check error:', error);
    }

    console.log(`[FIOS] Successfully updated ${trackingData.length} vehicles`);
    if (unmatchedVehicles.length > 0) {
      console.log(`[FIOS] Unmatched vehicles: ${unmatchedVehicles.join(', ')}`);
    }
    if (odometerUpdates.length > 0) {
      console.log(`[FIOS] Processed ${odometerUpdates.length} odometer updates`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${trackingData.length} vehicles from FIOS API`,
        matched: trackingData.length,
        unmatched: unmatchedVehicles.length,
        unmatchedVehicles: unmatchedVehicles,
        odometer_updates: odometerUpdates.length,
        odometer_results: odometerUpdates
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

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
  gsm?: number;
  hdop?: number;
}

interface FIOSUnit {
  nm: string; // Unit name (vehicle plate)
  cls: number;
  id: number; // FIOS device ID
  mu: number;
  pos: FIOSPosition;
  uacl: number;
  // Counters (from flag 0x400 = 1024)
  cnm?: number; // Mileage counter (km) — same value KloudPP dashboard shows
  cneh?: number; // Engine hours counter
  cnkb?: number; // GPRS traffic counter (KB)
  // Last message sensor data (from flag 0x1000 = 4096)
  lmsg?: { p?: Record<string, any>; t?: number };
}

interface FIOSResponse {
  items: FIOSUnit[];
}

interface BusTelemData {
  odometer: number | null;
  dailyMileage: number | null;
  fuelLiters: number | null;
  batteryVoltage: number | null;
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
  
  if (!data.eid) {
    throw new Error(`FIOS authentication failed: No session ID returned`);
  }
  
  const sessionId = data.eid;
  console.log('[FIOS] Authentication successful, session ID:', sessionId.substring(0, 8) + '...');
  
  cachedSessionId = sessionId;
  sessionExpiry = Date.now() + (4 * 60 * 1000);
  
  return sessionId;
}

async function keepSessionAlive(sessionId: string): Promise<void> {
  const keepAliveUrl = `https://fios-api.kloudip.com/avl_evts?sid=${sessionId}`;
  await fetch(keepAliveUrl);
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
    // Flags: 1 (base) + 256 (counters: cnm/cneh) + 4096 (last message) + 4194304 (last position) + 2 (custom props) + 8 (custom fields)
    flags: 1 + 2 + 8 + 256 + 4096 + 4194304,
    from: 0,
    to: 0
  };
  
  const url = `https://fios-api.kloudip.com/api?svc=core/search_items&params=${encodeURIComponent(JSON.stringify(params))}&sid=${sessionId}`;
  
  const response = await fetch(url);
  const data: FIOSResponse = await response.json();
  
  console.log(`[FIOS] Received ${data.items?.length || 0} vehicles`);
  
  // Log sensor types detected
  if (data.items && data.items.length > 0) {
    console.log(`[FIOS] Vehicle names: ${data.items.map((v: any) => v.nm).join(', ')}`);
  }
  
  
  return data.items || [];
}

// Combined telemetry fetch: handles BOTH device types
// Type 1 (NG buses): Standard params - odometer, fuel_volume
// Type 2 (NE buses): Teltonika IO params - io_16 (total odometer in meters), pwr_ext (voltage)
async function fetchAllTelemData(sessionId: string, deviceId: number): Promise<BusTelemData> {
  try {
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
      console.log(`[TELEM] Device ${deviceId}: No messages found`);
      return { odometer: null, dailyMileage: null, fuelLiters: null, batteryVoltage: null };
    }
    
    const firstMsg = data.messages[0];
    const lastMsg = data.messages[data.messages.length - 1];
    
    // Detect device type based on available parameters
    const hasStandardOdometer = firstMsg?.p?.odometer !== undefined;
    const hasTeltonika = firstMsg?.p?.io_16 !== undefined;
    
    let latestOdometer: number | null = null;
    let firstOdometer: number | null = null;
    let latestFuel: number | null = null;
    let batteryVoltage: number | null = null;
    
    if (hasStandardOdometer) {
      // TYPE 1: Standard device (NG buses) - direct odometer and fuel_volume
      latestOdometer = parseFloat(lastMsg?.p?.odometer) || parseFloat(firstMsg?.p?.odometer) || null;
      firstOdometer = parseFloat(firstMsg?.p?.odometer) || null;
      
      // fuel_volume is the fuel field for these devices
      const fuelValue = parseFloat(lastMsg?.p?.fuel_volume) || parseFloat(firstMsg?.p?.fuel_volume) || null;
      if (fuelValue !== null && fuelValue > 0) {
        latestFuel = fuelValue;
      }
      
      // Battery from pwr_ext if available
      if (lastMsg?.p?.pwr_ext) {
        batteryVoltage = parseFloat(lastMsg.p.pwr_ext) || null;
      }
      
      console.log(`[TELEM] Device ${deviceId} (Standard): odometer=${latestOdometer} km, fuel=${latestFuel} L`);
      
    } else if (hasTeltonika) {
      // TYPE 2: Teltonika device (NE buses) - io_16 = total odometer in METERS
      const lastIo16 = parseFloat(lastMsg?.p?.io_16);
      const firstIo16 = parseFloat(firstMsg?.p?.io_16);
      
      if (!isNaN(lastIo16) && lastIo16 > 0) {
        latestOdometer = Math.round(lastIo16 / 100) / 10; // meters → km with 1 decimal
      }
      if (!isNaN(firstIo16) && firstIo16 > 0) {
        firstOdometer = Math.round(firstIo16 / 100) / 10;
      }
      
      // Battery voltage from pwr_ext (already in V for Teltonika)
      if (lastMsg?.p?.pwr_ext) {
        batteryVoltage = parseFloat(lastMsg.p.pwr_ext) || null;
      }
      
      // No direct fuel reading from Teltonika devices
      latestFuel = null;
      
      console.log(`[TELEM] Device ${deviceId} (Teltonika): io_16=${lastIo16} m → odometer=${latestOdometer} km, voltage=${batteryVoltage}V`);
      
    } else {
      // TYPE 3: Unknown device - try all known field names
      for (const msg of [lastMsg, firstMsg]) {
        if (!msg?.p) continue;
        for (const field of ['mileage', 'odometer', 'can_odometer', 'total_distance', 'odo', 'km']) {
          if (msg.p[field]) {
            const val = parseFloat(msg.p[field]);
            if (!isNaN(val) && val > 0) {
              if (!latestOdometer) latestOdometer = val;
              if (!firstOdometer) firstOdometer = val;
              break;
            }
          }
        }
        for (const field of ['fuel', 'fuel_level', 'fuel_volume', 'can_fuel', 'fls', 'fls1']) {
          if (msg.p[field] !== undefined) {
            const val = parseFloat(msg.p[field]);
            if (!isNaN(val) && val >= 0) { latestFuel = val; break; }
          }
        }
        if (msg.p.pwr_ext) batteryVoltage = parseFloat(msg.p.pwr_ext) || null;
      }
      console.log(`[TELEM] Device ${deviceId} (Unknown): odometer=${latestOdometer}, fuel=${latestFuel}`);
    }
    
    const dailyMileage = latestOdometer && firstOdometer ? Math.round((latestOdometer - firstOdometer) * 10) / 10 : null;
    
    return { odometer: latestOdometer, dailyMileage, fuelLiters: latestFuel, batteryVoltage };
    
  } catch (error) {
    console.error(`[FIOS] Error fetching telemetry for device ${deviceId}:`, error);
    return { odometer: null, dailyMileage: null, fuelLiters: null, batteryVoltage: null };
  }
}

// Improved bus number parsing - handles many FIOS naming patterns
function parseBusNumber(fiosName: string): string {
  // Remove leading/trailing whitespace
  const name = fiosName.trim();
  
  // Common patterns from KloudPP/FIOS:
  // "NE-2266-NUGEGODA" → "NE 2266"
  // "NG-8220-COLOMBO" → "NG 8220"  
  // "NG-8220" → "NG 8220"
  // "NC-1234-ROUTE-A" → "NC 1234"
  // "NE2266" → "NE 2266"
  // "NG 8220" → "NG 8220" (already correct)
  // "NC 1234 - Kandy" → "NC 1234"
  
  // Strategy 1: Split by dash and take first two parts
  const dashParts = name.split('-');
  if (dashParts.length >= 2) {
    const prefix = dashParts[0].trim();
    const number = dashParts[1].trim();
    // Check if second part looks like a bus number (digits)
    if (/^\d+$/.test(number)) {
      return `${prefix.toUpperCase()} ${number}`;
    }
  }
  
  // Strategy 2: Extract prefix letters + number from concatenated format (e.g., "NE2266")
  const concatMatch = name.match(/^([A-Za-z]{2,3})\s*[-]?\s*(\d{3,5})/);
  if (concatMatch) {
    return `${concatMatch[1].toUpperCase()} ${concatMatch[2]}`;
  }
  
  // Strategy 3: Already in "XX 1234" format — clean it up
  const spaceMatch = name.match(/^([A-Za-z]{2,3})\s+(\d{3,5})/);
  if (spaceMatch) {
    return `${spaceMatch[1].toUpperCase()} ${spaceMatch[2]}`;
  }
  
  // Fallback: return as-is, cleaned up
  return name.toUpperCase().trim();
}

// Normalize bus number for flexible matching
function normalizeBusNo(busNo: string): string {
  return busNo.toUpperCase().replace(/[\s\-_]+/g, '');
}

function getEngineHealth(speed: number, lastUpdate: string): string {
  const updateAge = Date.now() - new Date(lastUpdate).getTime();
  const minutesOld = updateAge / (1000 * 60);
  
  if (minutesOld > 30) return 'critical';
  if (speed > 80) return 'warning';
  return 'good';
}

function getSriLankaDate(): string {
  const now = new Date();
  const sriLankaTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return sriLankaTime.toISOString().split('T')[0];
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function calculateGPSMileage(supabase: any, busId: string, sriLankaDate: string): Promise<number> {
  try {
    const startOfDay = new Date(`${sriLankaDate}T00:00:00+05:30`);
    const endOfDay = new Date(`${sriLankaDate}T23:59:59+05:30`);
    
    const { data: waypoints, error } = await supabase
      .from('gps_location_history')
      .select('latitude, longitude, timestamp')
      .eq('bus_id', busId)
      .gte('timestamp', startOfDay.toISOString())
      .lte('timestamp', endOfDay.toISOString())
      .order('timestamp', { ascending: true });
    
    if (error || !waypoints || waypoints.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const dist = haversineDistance(
        waypoints[i-1].latitude, waypoints[i-1].longitude,
        waypoints[i].latitude, waypoints[i].longitude
      );
      if (dist < 5) totalDistance += dist;
    }
    
    return Math.round(totalDistance * 10) / 10;
  } catch (error) {
    console.error('[GPS] Error calculating mileage:', error);
    return 0;
  }
}

// Process a single bus - returns tracking data or null
async function processBus(
  vehicle: FIOSUnit,
  sessionId: string,
  supabase: any,
  buses: any[],
  sriLankaDate: string
): Promise<{ tracking: any; unmatched: string | null; odometerUpdate: any | null }> {
  const parsedBusNo = parseBusNumber(vehicle.nm);
  const normalizedParsed = normalizeBusNo(parsedBusNo);
  
  // Try to match with database bus using multiple strategies
  let bus = buses.find(b => {
    const normalizedDb = normalizeBusNo(b.bus_no);
    return normalizedDb === normalizedParsed;
  });
  
  // If no match, try partial matching (number-only match)
  if (!bus) {
    const numberMatch = parsedBusNo.match(/(\d{3,5})/);
    if (numberMatch) {
      bus = buses.find(b => {
        const dbNumber = b.bus_no.match(/(\d{3,5})/);
        return dbNumber && dbNumber[1] === numberMatch[1];
      });
    }
  }

  // Auto-create bus if it doesn't exist
  if (!bus) {
    console.log(`[FIOS] Auto-creating missing bus: ${parsedBusNo} (FIOS name: ${vehicle.nm})`);
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
      return { tracking: null, unmatched: vehicle.nm, odometerUpdate: null };
    }
    
    bus = newBus;
    buses.push(newBus);
    console.log(`[FIOS] ✅ Created new bus: ${parsedBusNo}`);
  }

  const lastUpdate = new Date(vehicle.pos.t * 1000).toISOString();
  const status = vehicle.pos.s > 0 ? 'active' : 'inactive';
  const engineHealth = getEngineHealth(vehicle.pos.s, lastUpdate);

  // Fetch telemetry data from messages API (fuel, battery, daily mileage change)
  const telem = await fetchAllTelemData(sessionId, vehicle.id);
  
  // Use odometer from telemetry (handles both Standard and Teltonika devices)
  // Fallback to GPS calculated or manual if no telemetry odometer available
  let finalOdometer: number | null = null;
  let dailyMileage: number | null = null;
  let odometerSource = 'fios';
  let engineHours: number | null = null;
  
  if (telem.odometer && telem.odometer > 0) {
    finalOdometer = telem.odometer;
    dailyMileage = telem.dailyMileage;
    odometerSource = 'fios';
    console.log(`[Odometer] ${bus.bus_no}: Using FIOS odometer = ${finalOdometer} km`);
  } else if (bus.base_odometer_km && bus.base_odometer_km > 0) {
    const todayGPSMileage = await calculateGPSMileage(supabase, bus.id, sriLankaDate);
    
    const { data: historicMileage } = await supabase
      .from('bus_daily_mileage')
      .select('daily_km')
      .eq('bus_id', bus.id)
      .gte('date', bus.base_odometer_date)
      .lt('date', sriLankaDate);
    
    const cumulativeGPSMileage = (historicMileage || []).reduce((sum: number, day: any) => sum + (day.daily_km || 0), 0);
    
    finalOdometer = bus.base_odometer_km + cumulativeGPSMileage + todayGPSMileage;
    dailyMileage = todayGPSMileage;
    odometerSource = 'gps_calculated';
  } else {
    finalOdometer = bus.current_mileage || null;
    dailyMileage = null;
    odometerSource = 'manual';
  }
  
  // Engine hours from counter
  if (vehicle.cneh && vehicle.cneh > 0) {
    engineHours = Math.round(vehicle.cneh * 10) / 10;
  }
  
  // Fuel: use from messages API, also try last message sensor data
  let fuelLiters = telem.fuelLiters;
  if (fuelLiters === null && vehicle.lmsg?.p) {
    // Try to get fuel from last message sensor data
    const fuelFields = ['fuel', 'fuel_level', 'fls', 'fls1', 'can_fuel', 'fuel1', 'adc1', 'adc2'];
    for (const field of fuelFields) {
      if (vehicle.lmsg.p[field] !== undefined) {
        const v = parseFloat(vehicle.lmsg.p[field]);
        if (!isNaN(v) && v >= 0) {
          fuelLiters = v;
          break;
        }
      }
    }
  }
  
  // Store GPS location history
  if (bus.id) {
    await supabase.from('gps_location_history').insert({
      bus_id: bus.id,
      latitude: vehicle.pos.y,
      longitude: vehicle.pos.x,
      speed_kmh: vehicle.pos.s,
      heading: vehicle.pos.c || null,
      altitude_meters: vehicle.pos.z || null,
      odometer_reading: finalOdometer,
      fuel_level_percent: fuelLiters,
      timestamp: lastUpdate,
      data_source: 'fios'
    }).then(() => {}).catch((e: any) => console.warn(`[FIOS] GPS history error for ${bus.bus_no}:`, e));
  }
  
  // Store fuel reading
  if (bus.id && fuelLiters !== null) {
    await supabase.from('bus_fuel_readings').insert({
      bus_id: bus.id,
      fuel_level_liters: fuelLiters,
      odometer_reading: finalOdometer,
      reading_timestamp: lastUpdate,
      data_source: 'fios'
    }).then(() => {}).catch((e: any) => console.warn(`[FIOS] Fuel reading error for ${bus.bus_no}:`, e));
  }
  
  // Save daily mileage
  if (dailyMileage !== null) {
    await supabase
      .from('bus_daily_mileage')
      .upsert({
        bus_id: bus.id,
        date: sriLankaDate,
        end_odometer_km: finalOdometer,
        daily_km: dailyMileage,
        data_source: odometerSource,
        updated_at: new Date().toISOString()
      }, { onConflict: 'bus_id,date' })
      .then(() => {}).catch((e: any) => console.warn(`[FIOS] Daily mileage error for ${bus.bus_no}:`, e));
  }
  
  const ignitionStatus = vehicle.pos.s > 0 ? true : false;
  
  const tracking = {
    bus_id: bus.id,
    bus_no: bus.bus_no,
    current_location: `Lat: ${vehicle.pos.y.toFixed(6)}, Lng: ${vehicle.pos.x.toFixed(6)}`,
    gps_coordinates: { lat: vehicle.pos.y, lng: vehicle.pos.x },
    route_name: bus.route || 'Unknown Route',
    speed_kmh: vehicle.pos.s,
    status: status,
    last_update: lastUpdate,
    fuel_level: fuelLiters,
    fuel_level_liters: fuelLiters,
    tire_pressure: null,
    engine_health: engineHealth,
    engine_temperature: null,
    battery_voltage: telem.batteryVoltage,
    odometer_reading: null,
    driver_name: null,
    alerts: [],
    heading_degrees: vehicle.pos.c || null,
    altitude_meters: vehicle.pos.z || null,
    satellite_count: vehicle.pos.sc || null,
    fios_device_id: vehicle.id || null,
    odometer_km: finalOdometer,
    daily_mileage_km: dailyMileage,
    odometer_source: odometerSource,
    engine_hours: engineHours,
    gsm_signal_strength: (vehicle.pos as any).gsm || null,
    ignition_status: ignitionStatus,
    gps_accuracy: (vehicle.pos as any).hdop || null,
    alarm_active: false
  };
  
  // Prepare odometer update
  let odometerUpdate = null;
  if (finalOdometer && finalOdometer > 0) {
    odometerUpdate = { bus_no: bus.bus_no, bus_id: bus.id, odometer_km: finalOdometer };
  }
  
  return { tracking, unmatched: null, odometerUpdate };
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
      await keepSessionAlive(sessionId);
    }

    // Fetch all vehicle positions (single API call for all 85+ buses)
    const vehicles = await fetchAllVehiclePositions(sessionId);
    console.log(`[FIOS] Total vehicles from KloudPP: ${vehicles.length}`);
    
    // Log all FIOS vehicle names for debugging
    console.log(`[FIOS] Vehicle names: ${vehicles.map(v => v.nm).join(', ')}`);

    // Get all buses from database
    const { data: buses, error: busError } = await supabase
      .from('buses')
      .select('id, bus_no, route, base_odometer_km, base_odometer_date, odometer_source, current_mileage');

    if (busError) throw busError;

    const allBuses = buses || [];
    const sriLankaDate = getSriLankaDate();
    
    // Process buses in PARALLEL BATCHES of 10 (instead of sequential)
    const BATCH_SIZE = 10;
    const allTracking: any[] = [];
    const unmatchedVehicles: string[] = [];
    const odometerUpdates: any[] = [];
    
    for (let i = 0; i < vehicles.length; i += BATCH_SIZE) {
      const batch = vehicles.slice(i, i + BATCH_SIZE);
      console.log(`[FIOS] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(vehicles.length / BATCH_SIZE)} (${batch.length} buses)`);
      
      const results = await Promise.allSettled(
        batch.map(vehicle => processBus(vehicle, sessionId, supabase, allBuses, sriLankaDate))
      );
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { tracking, unmatched, odometerUpdate } = result.value;
          if (tracking) allTracking.push(tracking);
          if (unmatched) unmatchedVehicles.push(unmatched);
          if (odometerUpdate) odometerUpdates.push(odometerUpdate);
        } else {
          console.error('[FIOS] Bus processing error:', result.reason);
        }
      }
    }

    // Delete existing tracking data
    await supabase.from('real_time_tracking').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert new tracking data in batches of 20
    for (let i = 0; i < allTracking.length; i += 20) {
      const batch = allTracking.slice(i, i + 20);
      const { error: insertError } = await supabase
        .from('real_time_tracking')
        .insert(batch);
      if (insertError) {
        console.error(`[FIOS] Insert error for batch ${Math.floor(i / 20) + 1}:`, insertError);
      }
    }

    // Update bus odometers in batches
    for (const update of odometerUpdates) {
      try {
        await supabase
          .from('buses')
          .update({
            current_mileage: Math.round(update.odometer_km),
            updated_at: new Date().toISOString()
          })
          .eq('bus_no', update.bus_no);
      } catch (error) {
        console.error(`[FIOS] Bus update error for ${update.bus_no}:`, error);
      }
    }

    // Trigger fuel alerts check (non-blocking)
    supabase.functions.invoke('check-fuel-alerts').catch(() => {});

    console.log(`[FIOS] ✅ Successfully updated ${allTracking.length}/${vehicles.length} vehicles`);
    if (unmatchedVehicles.length > 0) {
      console.log(`[FIOS] ⚠️ Unmatched vehicles: ${unmatchedVehicles.join(', ')}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${allTracking.length} vehicles from FIOS API`,
        total_from_fios: vehicles.length,
        matched: allTracking.length,
        unmatched: unmatchedVehicles.length,
        unmatchedVehicles: unmatchedVehicles,
        odometer_updates: odometerUpdates.length,
        fios_vehicle_names: vehicles.map(v => v.nm)
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

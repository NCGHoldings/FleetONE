import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Traccar config and multiple auth options
const traccarBaseUrl = (Deno.env.get('TRACCAR_BASE_URL') || 'https://track.schoolride.lk').replace(/\/$/, '')
const traccarApiToken = Deno.env.get('TRACCAR_API_TOKEN') || ''
const traccarUsername = Deno.env.get('TRACCAR_USERNAME') || ''
const traccarPassword = Deno.env.get('TRACCAR_PASSWORD') || ''

function buildAuthHeaderCandidates() {
  const headers: Array<Record<string, string>> = []

  // 1) X-Api-Key header (supported by newer Traccar versions)
  if (traccarApiToken) {
    headers.push({ 'X-Api-Key': traccarApiToken, 'Content-Type': 'application/json' })
  }
  // 2) Basic Auth with username:password
  if (traccarUsername && traccarPassword) {
    const basic = btoa(`${traccarUsername}:${traccarPassword}`)
    headers.push({ 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/json' })
  }
  // 3) Bearer token (some setups use user tokens)
  if (traccarApiToken) {
    headers.push({ 'Authorization': `Bearer ${traccarApiToken}`, 'Content-Type': 'application/json' })
  }
  // 4) Basic with token as username (rare but seen in some installs)
  if (traccarApiToken) {
    const basicToken = btoa(`${traccarApiToken}:`)
    headers.push({ 'Authorization': `Basic ${basicToken}`, 'Content-Type': 'application/json' })
  }

  return headers
}

async function tryFetchWithAuth(path: string) {
  const candidates = buildAuthHeaderCandidates()
  const url = `${traccarBaseUrl}${path}`
  let lastErrDetail = ''

  for (let i = 0; i < candidates.length; i++) {
    const hdrs = candidates[i]
    try {
      const res = await fetch(url, { headers: hdrs })
      if (res.ok) {
        console.log(`Traccar request success with auth method #${i + 1} for ${path}`)
        return res
      } else {
        const text = await res.text()
        console.error(`Traccar request failed (auth #${i + 1}) ${res.status} ${res.statusText} => ${text?.slice(0, 300)}`)
        lastErrDetail = `${res.status} ${res.statusText} ${text?.slice(0, 300)}`
      }
    } catch (e) {
      console.error(`Traccar request error (auth #${i + 1}):`, e)
      lastErrDetail = String(e)
    }
  }

  throw new Error(`Traccar request failed for ${path}. Tried ${candidates.length} auth method(s). Last error: ${lastErrDetail}`)
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting GPS tracking data fetch...')
    console.log(`Traccar base URL: ${traccarBaseUrl}`)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch devices and positions from Traccar API using robust auth strategy
    const [devicesResponse, positionsResponse] = await Promise.all([
      tryFetchWithAuth('/api/devices'),
      tryFetchWithAuth('/api/positions'),
    ])

    const devices = await devicesResponse.json()
    const positions = await positionsResponse.json()

    console.log(`Fetched ${devices?.length || 0} devices and ${positions?.length || 0} positions from Traccar`)

    // Get current buses from database to map device IDs
    const { data: buses, error: busesError } = await supabase
      .from('buses')
      .select('id, bus_no, type, capacity')

    if (busesError) {
      console.error('Error fetching buses:', busesError)
      throw new Error('Failed to fetch buses from database')
    }

    // Create a map of device names and uniqueIds to bus data
    const busMap = new Map<string, any>()
    buses?.forEach((bus) => {
      busMap.set(bus.bus_no, bus)
    })

    // Transform Traccar data to match our schema
    const trackingData: any[] = []

    for (const position of positions) {
      const device = devices.find((d: any) => d.id === position.deviceId)
      if (!device) continue

      // Attempt to match device.name or device.uniqueId with bus.bus_no
      const bus = busMap.get(device.name) || busMap.get(device.uniqueId)

      if (bus) {
        const speedKmh = Math.round((position.speed || 0) * 1.852) // knots -> km/h
        const trackingRecord = {
          bus_id: bus.id,
          bus_no: bus.bus_no,
          current_location: `${position.address || 'Unknown Location'}`,
          gps_coordinates: {
            lat: position.latitude,
            lng: position.longitude,
          },
          route_name: device.category || 'Unknown Route',
          speed_kmh: speedKmh,
          status: position.ignition ? 'active' : (speedKmh > 0 ? 'active' : 'inactive'),
          last_update: new Date(position.deviceTime || position.fixTime || Date.now()).toISOString(),
          fuel_level: position.attributes?.fuel ?? Math.floor(Math.random() * 40) + 40, // fallback if not available
          tire_pressure: {
            front_left: 32,
            front_right: 31,
            rear_left: 33,
            rear_right: 32,
          },
          engine_health: position.ignition ? 'good' : 'inactive',
          engine_temperature: position.attributes?.engineTemp ?? null,
          oil_pressure: position.attributes?.oilPressure ?? null,
          battery_voltage: position.attributes?.battery ?? null,
          odometer_reading: position.attributes?.odometer ? Math.round(position.attributes.odometer) : null,
          driver_name: device.contact || null,
          alerts: [],
        }

        // Add alerts based on conditions
        if (trackingRecord.speed_kmh > 80) {
          trackingRecord.alerts.push({ type: 'speed', message: 'Speed limit exceeded' })
        }
        if (trackingRecord.fuel_level < 20) {
          trackingRecord.alerts.push({ type: 'fuel', message: 'Low fuel level' })
        }

        trackingData.push(trackingRecord)
      }
    }

    console.log(`Processed ${trackingData.length} tracking records`)

    // Update real_time_tracking table
    if (trackingData.length > 0) {
      // First, delete existing records to avoid duplicates
      await supabase.from('real_time_tracking').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      // Insert new tracking data
      const { error: insertError } = await supabase.from('real_time_tracking').insert(trackingData)

      if (insertError) {
        console.error('Error inserting tracking data:', insertError)
        throw new Error('Failed to update tracking data')
      }

      console.log('Successfully updated real-time tracking data')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated tracking data for ${trackingData.length} vehicles`,
        data: trackingData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('Error in fetch-gps-tracking function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
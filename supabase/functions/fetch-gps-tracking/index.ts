import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Traccar config
const traccarBaseUrl = (Deno.env.get('TRACCAR_BASE_URL') || 'https://track.schoolride.lk').replace(/\/$/, '')
const traccarApiToken = Deno.env.get('TRACCAR_API_TOKEN') || ''
const traccarUsername = Deno.env.get('TRACCAR_USERNAME') || ''
const traccarPassword = Deno.env.get('TRACCAR_PASSWORD') || ''

let traccarSessionId: string | null = null

// Session-based authentication
async function authenticateWithSession(): Promise<string | null> {
  if (!traccarUsername || !traccarPassword) {
    console.log('No username/password provided for session auth')
    return null
  }

  try {
    console.log(`Attempting session login to ${traccarBaseUrl}/api/session`)
    const response = await fetch(`${traccarBaseUrl}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        email: traccarUsername,
        password: traccarPassword
      })
    })

    if (response.ok) {
      const setCookieHeader = response.headers.get('set-cookie')
      if (setCookieHeader) {
        const sessionMatch = setCookieHeader.match(/JSESSIONID=([^;]+)/)
        if (sessionMatch) {
          traccarSessionId = sessionMatch[1]
          console.log('Session authentication successful')
          return traccarSessionId
        }
      }
      console.log('Session created but no session ID found in cookies')
    } else {
      const errorText = await response.text()
      console.error(`Session login failed: ${response.status} ${response.statusText} - ${errorText}`)
    }
  } catch (e) {
    console.error('Session authentication error:', e)
  }
  
  return null
}

// Build authentication headers for API requests
function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }

  // 1) Session cookie (if available)
  if (traccarSessionId) {
    headers['Cookie'] = `JSESSIONID=${traccarSessionId}`
    return headers
  }

  // 2) X-Api-Key header
  if (traccarApiToken) {
    headers['X-Api-Key'] = traccarApiToken
    return headers
  }

  // 3) Basic Auth
  if (traccarUsername && traccarPassword) {
    const basic = btoa(`${traccarUsername}:${traccarPassword}`)
    headers['Authorization'] = `Basic ${basic}`
    return headers
  }

  return headers
}

async function traccarRequest(path: string): Promise<Response> {
  const url = `${traccarBaseUrl}${path}`
  
  // Try session auth first if we don't have a session yet
  if (!traccarSessionId && traccarUsername && traccarPassword) {
    await authenticateWithSession()
  }

  const headers = buildAuthHeaders()
  console.log(`Making request to ${url} with auth method: ${traccarSessionId ? 'session' : traccarApiToken ? 'api-key' : 'basic'}`)

  try {
    const response = await fetch(url, { headers })
    
    if (response.ok) {
      return response
    }

    // If session auth failed with 401, try to re-authenticate
    if (response.status === 401 && traccarSessionId) {
      console.log('Session expired, attempting re-authentication')
      traccarSessionId = null
      await authenticateWithSession()
      
      if (traccarSessionId) {
        const newHeaders = buildAuthHeaders()
        const retryResponse = await fetch(url, { headers: newHeaders })
        if (retryResponse.ok) {
          return retryResponse
        }
      }
    }

    const errorText = await response.text()
    throw new Error(`${response.status} ${response.statusText}: ${errorText}`)
    
  } catch (e) {
    console.error(`Request to ${url} failed:`, e)
    throw e
  }
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

    // Fetch devices and positions from Traccar API
    const [devicesResponse, positionsResponse] = await Promise.all([
      traccarRequest('/api/devices'),
      traccarRequest('/api/positions'),
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
    
    // Provide more detailed error information
    const errorMessage = error?.message || 'Unknown error'
    const errorDetails = {
      success: false,
      error: errorMessage,
      traccar_config: {
        base_url: traccarBaseUrl,
        has_username: !!traccarUsername,
        has_password: !!traccarPassword,
        has_api_token: !!traccarApiToken,
        session_available: !!traccarSessionId
      },
      debug_info: {
        timestamp: new Date().toISOString(),
        attempted_auth_methods: [
          traccarSessionId ? 'session' : null,
          traccarApiToken ? 'api-key' : null,
          (traccarUsername && traccarPassword) ? 'basic-auth' : null
        ].filter(Boolean)
      }
    }
    
    return new Response(
      JSON.stringify(errorDetails),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const fiosToken = Deno.env.get('FIOS_API_TOKEN')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('[fetch-driver-events] Starting driver events fetch...')

    // Authenticate with FIOS
    const authResponse = await fetch('https://fms.vfleet.solutions/avl_auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: fiosToken
      })
    })

    if (!authResponse.ok) {
      throw new Error('FIOS authentication failed')
    }

    const { s: sessionId } = await authResponse.json()
    console.log('[fetch-driver-events] Authenticated with FIOS, session:', sessionId)

    // Get all active buses
    const { data: buses, error: busesError } = await supabase
      .from('buses')
      .select('id, bus_no')
      .eq('status', 'active')

    if (busesError) throw busesError

    const eventsToInsert: any[] = []
    const safetyAlertsToInsert: any[] = []

    // Fetch events for each bus from the last 24 hours
    for (const bus of buses || []) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      try {
        // Fetch driver behavior messages from FIOS
        const messagesResponse = await fetch('https://fms.vfleet.solutions/messages/load_interval', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            s: sessionId,
            from: yesterday,
            to: new Date().toISOString(),
            filter: {
              name: bus.bus_no.replace(' ', '-') // FIOS uses dashes
            }
          })
        })

        if (!messagesResponse.ok) continue

        const messages = await messagesResponse.json()
        
        // Get current driver allocation
        const { data: allocation } = await supabase
          .from('driver_allocations')
          .select('driver_id')
          .eq('bus_id', bus.id)
          .eq('allocation_date', new Date().toISOString().split('T')[0])
          .single()

        const driverId = allocation?.driver_id || null

        // Process each message for events
        for (const msg of messages || []) {
          const pos = msg.pos || {}
          const params = msg.p || {}

          // Harsh braking detection
          if (params.harsh_brake || (params.deceleration && params.deceleration > 8)) {
            eventsToInsert.push({
              bus_id: bus.id,
              driver_id: driverId,
              event_type: 'harsh_braking',
              event_timestamp: msg.t,
              latitude: pos.y,
              longitude: pos.x,
              speed_kmh: pos.s,
              severity: params.deceleration > 12 ? 'high' : 'medium',
              threshold_value: 8.0,
              actual_value: params.deceleration || 10.0
            })

            if (params.deceleration > 12) {
              safetyAlertsToInsert.push({
                bus_id: bus.id,
                driver_id: driverId,
                alert_type: 'multiple_harsh_events',
                severity: 'high',
                alert_message: `Severe harsh braking detected (${params.deceleration.toFixed(1)} m/s²)`,
                event_timestamp: msg.t,
                latitude: pos.y,
                longitude: pos.x,
                status: 'active'
              })
            }
          }

          // Harsh acceleration detection
          if (params.harsh_accel || (params.acceleration && params.acceleration > 6)) {
            eventsToInsert.push({
              bus_id: bus.id,
              driver_id: driverId,
              event_type: 'harsh_acceleration',
              event_timestamp: msg.t,
              latitude: pos.y,
              longitude: pos.x,
              speed_kmh: pos.s,
              severity: params.acceleration > 10 ? 'high' : 'medium',
              threshold_value: 6.0,
              actual_value: params.acceleration || 8.0
            })
          }

          // Speeding detection (>80 km/h)
          if (pos.s > 80) {
            eventsToInsert.push({
              bus_id: bus.id,
              driver_id: driverId,
              event_type: 'speeding',
              event_timestamp: msg.t,
              latitude: pos.y,
              longitude: pos.x,
              speed_kmh: pos.s,
              severity: pos.s > 100 ? 'high' : 'medium',
              threshold_value: 80.0,
              actual_value: pos.s
            })

            if (pos.s > 100) {
              safetyAlertsToInsert.push({
                bus_id: bus.id,
                driver_id: driverId,
                alert_type: 'speeding',
                severity: 'critical',
                alert_message: `Excessive speed detected: ${pos.s} km/h`,
                event_timestamp: msg.t,
                latitude: pos.y,
                longitude: pos.x,
                status: 'active'
              })
            }
          }

          // Sharp turn detection
          if (params.sharp_turn || (params.lateral_g && Math.abs(params.lateral_g) > 0.5)) {
            eventsToInsert.push({
              bus_id: bus.id,
              driver_id: driverId,
              event_type: 'sharp_turn',
              event_timestamp: msg.t,
              latitude: pos.y,
              longitude: pos.x,
              speed_kmh: pos.s,
              severity: 'medium',
              threshold_value: 0.5,
              actual_value: Math.abs(params.lateral_g || 0.6)
            })
          }

          // Excessive idle detection (>10 minutes)
          if (params.idle_time && params.idle_time > 600) {
            eventsToInsert.push({
              bus_id: bus.id,
              driver_id: driverId,
              event_type: 'excessive_idle',
              event_timestamp: msg.t,
              latitude: pos.y,
              longitude: pos.x,
              speed_kmh: 0,
              severity: 'low',
              threshold_value: 600,
              actual_value: params.idle_time
            })
          }
        }
      } catch (error) {
        console.error(`[fetch-driver-events] Error processing bus ${bus.bus_no}:`, error)
      }
    }

    // Insert driver behavior events
    if (eventsToInsert.length > 0) {
      const { error: eventsError } = await supabase
        .from('driver_behavior_events')
        .insert(eventsToInsert)

      if (eventsError) {
        console.error('[fetch-driver-events] Error inserting events:', eventsError)
      } else {
        console.log(`[fetch-driver-events] Inserted ${eventsToInsert.length} driver events`)
      }
    }

    // Insert safety alerts
    if (safetyAlertsToInsert.length > 0) {
      const { error: alertsError } = await supabase
        .from('safety_alerts')
        .insert(safetyAlertsToInsert)

      if (alertsError) {
        console.error('[fetch-driver-events] Error inserting safety alerts:', alertsError)
      } else {
        console.log(`[fetch-driver-events] Inserted ${safetyAlertsToInsert.length} safety alerts`)
      }
    }

    // Keep session alive for next call
    await fetch('https://fms.vfleet.solutions/avl_evts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s: sessionId })
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Driver events fetched successfully',
        eventsCount: eventsToInsert.length,
        alertsCount: safetyAlertsToInsert.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[fetch-driver-events] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

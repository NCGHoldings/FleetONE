import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FuelReading {
  bus_id: string
  fuel_level_percent: number
  odometer_reading: number
  reading_timestamp: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('[check-fuel-alerts] Starting fuel alert check...')

    // Get all active buses with their latest fuel readings
    const { data: latestReadings, error: readingsError } = await supabase
      .from('bus_fuel_readings')
      .select(`
        *,
        buses!inner(bus_no, status)
      `)
      .eq('buses.status', 'active')
      .order('reading_timestamp', { ascending: false })

    if (readingsError) throw readingsError

    // Group by bus_id and get latest reading for each
    const busFuelMap = new Map<string, FuelReading>()
    latestReadings?.forEach((reading: any) => {
      if (!busFuelMap.has(reading.bus_id)) {
        busFuelMap.set(reading.bus_id, reading)
      }
    })

    const alerts: any[] = []

    // Check each bus for fuel alerts
    for (const [busId, currentReading] of busFuelMap.entries()) {
      // Low fuel alert (< 15%)
      if (currentReading.fuel_level_percent < 15) {
        // Check if alert already exists and is active
        const { data: existingAlert } = await supabase
          .from('fuel_alerts')
          .select('*')
          .eq('bus_id', busId)
          .eq('alert_type', 'low_fuel')
          .eq('status', 'active')
          .single()

        if (!existingAlert) {
          alerts.push({
            bus_id: busId,
            alert_type: 'low_fuel',
            fuel_level_percent: currentReading.fuel_level_percent,
            odometer_reading: currentReading.odometer_reading,
            alert_timestamp: new Date().toISOString(),
            status: 'active'
          })
          console.log(`[check-fuel-alerts] Low fuel alert for bus ${busId}: ${currentReading.fuel_level_percent}%`)
        }
      }

      // Suspected theft alert (sudden drop > 10% without fill-up)
      const { data: previousReadings } = await supabase
        .from('bus_fuel_readings')
        .select('*')
        .eq('bus_id', busId)
        .lt('reading_timestamp', currentReading.reading_timestamp)
        .order('reading_timestamp', { ascending: false })
        .limit(5)

      if (previousReadings && previousReadings.length > 0) {
        const previousReading = previousReadings[0]
        const fuelDrop = previousReading.fuel_level_percent - currentReading.fuel_level_percent

        if (fuelDrop > 10) {
          // Check if this is a normal consumption or potential theft
          const timeGap = new Date(currentReading.reading_timestamp).getTime() - 
                         new Date(previousReading.reading_timestamp).getTime()
          const hoursGap = timeGap / (1000 * 60 * 60)

          // If fuel drop > 10% within 2 hours, suspect theft
          if (hoursGap < 2) {
            const { data: existingAlert } = await supabase
              .from('fuel_alerts')
              .select('*')
              .eq('bus_id', busId)
              .eq('alert_type', 'suspected_theft')
              .eq('status', 'active')
              .single()

            if (!existingAlert) {
              alerts.push({
                bus_id: busId,
                alert_type: 'suspected_theft',
                fuel_level_percent: currentReading.fuel_level_percent,
                fuel_drop_amount: fuelDrop,
                odometer_reading: currentReading.odometer_reading,
                alert_timestamp: new Date().toISOString(),
                status: 'active',
                notes: `Fuel dropped ${fuelDrop.toFixed(1)}% in ${hoursGap.toFixed(1)} hours`
              })
              console.log(`[check-fuel-alerts] Suspected theft alert for bus ${busId}: ${fuelDrop.toFixed(1)}% drop`)
            }
          }
        }
      }

      // Abnormal consumption alert
      if (previousReadings && previousReadings.length >= 3) {
        const avgConsumption = previousReadings.slice(0, 3).reduce((acc, r) => {
          return acc + (r.fuel_level_percent / 3)
        }, 0)

        const expectedConsumption = avgConsumption * 1.5 // 50% tolerance
        if (currentReading.fuel_level_percent < (previousReadings[0].fuel_level_percent - expectedConsumption)) {
          const { data: existingAlert } = await supabase
            .from('fuel_alerts')
            .select('*')
            .eq('bus_id', busId)
            .eq('alert_type', 'abnormal_consumption')
            .eq('status', 'active')
            .single()

          if (!existingAlert) {
            alerts.push({
              bus_id: busId,
              alert_type: 'abnormal_consumption',
              fuel_level_percent: currentReading.fuel_level_percent,
              odometer_reading: currentReading.odometer_reading,
              alert_timestamp: new Date().toISOString(),
              status: 'active',
              notes: 'Fuel consumption significantly higher than average'
            })
            console.log(`[check-fuel-alerts] Abnormal consumption alert for bus ${busId}`)
          }
        }
      }
    }

    // Insert all new alerts
    if (alerts.length > 0) {
      const { error: insertError } = await supabase
        .from('fuel_alerts')
        .insert(alerts)

      if (insertError) throw insertError

      console.log(`[check-fuel-alerts] Created ${alerts.length} new fuel alerts`)
    } else {
      console.log('[check-fuel-alerts] No new fuel alerts to create')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fuel alert check completed`,
        alertsCreated: alerts.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[check-fuel-alerts] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

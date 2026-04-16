import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { allocations, autoCreateMissing = true } = await req.json()
    console.log('📥 Received bulk import request with', allocations.length, 'allocations')
    console.log('🔧 Auto-create missing entities:', autoCreateMissing)

    const results = {
      success: 0,
      errors: [] as string[],
      warnings: [] as string[],
      rowResults: [] as Array<{
        row: number;
        status: 'success' | 'failed' | 'warning';
        tripId?: string;
        error?: string;
        details?: string;
      }>,
      created: {
        buses: [] as string[],
        routes: [] as string[],
        staff: [] as string[],
        allocations: [] as string[]
      }
    }

    // Process each allocation
    for (let i = 0; i < allocations.length; i++) {
      const allocation = allocations[i];
      const rowNum = i + 1;
      
      try {
        const {
          busNo,
          routeNo,
          routeName,
          driverName,
          conductorName,
          whatsapp,
          date,
          time
        } = allocation

        console.log(`\n========== Processing Row ${rowNum}/${allocations.length} ==========`)

        // Store original Excel data in notes
        const allocationNotes: any = {
          excel_bus_no: busNo,
          excel_route_no: routeNo,
          excel_route_name: routeName,
          excel_driver: driverName,
          excel_conductor: conductorName,
          import_date: new Date().toISOString(),
          warnings: []
        }

        // PHASE 1: Find or create bus - use maybeSingle() for graceful handling
        let { data: bus, error: busSearchError } = await supabase
          .from('buses')
          .select('id, bus_no')
          .eq('bus_no', busNo)
          .maybeSingle()

        if (busSearchError) {
          console.error('⚠️ Bus search error:', busSearchError)
        }

        if (!bus && autoCreateMissing) {
          const { data: newBus, error: busError } = await supabase
            .from('buses')
            .insert({
              bus_no: busNo,
              type: 'Regular',
              model: 'Imported Bus',
              year: new Date().getFullYear(),
              capacity: 40,
              status: 'active',
              expected_km_per_liter: 8.0
            })
            .select('id, bus_no')
            .maybeSingle()

          if (!busError && newBus) {
            bus = newBus
            results.created.buses.push(busNo)
            console.log(`✅ Created new bus: ${busNo}`)
          } else {
            console.warn(`⚠️ Could not create bus ${busNo}:`, busError?.message)
            allocationNotes.warnings.push(`Bus "${busNo}" could not be created or found`)
          }
        } else if (!bus) {
          allocationNotes.warnings.push(`Bus "${busNo}" not found in database`)
        }

        // PHASE 2: Find or create route - use proper filter and maybeSingle()
        const { data: routes, error: routeSearchError } = await supabase
          .from('routes')
          .select('id, route_no, route_name')
          .or(`route_no.eq.${routeNo},route_name.ilike.%${routeName}%`)
          .limit(1)

        if (routeSearchError) {
          console.error('⚠️ Route search error:', routeSearchError)
        }

        const route = routes && routes.length > 0 ? routes[0] : null

        if (!route && autoCreateMissing && routeName) {
          const { data: newRoute, error: routeError } = await supabase
            .from('routes')
            .insert({
              route_no: routeNo || `R-${Date.now()}`,
              route_name: routeName,
              start_location: routeName?.split(' to ')[0] || 'Unknown',
              end_location: routeName?.split(' to ')[1] || 'Unknown',
              distance_km: 45,
              estimated_duration_minutes: 90
            })
            .select('id, route_no, route_name')
            .maybeSingle()

          if (!routeError && newRoute) {
            const route = newRoute
            results.created.routes.push(`${routeNo} - ${routeName}`)
            console.log(`✅ Created new route: ${routeNo}`)
          } else {
            console.warn(`⚠️ Could not create route ${routeNo}:`, routeError?.message)
            allocationNotes.warnings.push(`Route "${routeNo}" could not be created or found`)
          }
        } else if (!route) {
          allocationNotes.warnings.push(`Route "${routeNo}" not found in database`)
        }

        // PHASE 3: Find or create driver
        let { data: driver } = await supabase
          .from('profiles')
          .select('user_id, id')
          .ilike('first_name', driverName?.trim() || '')
          .limit(1)
          .maybeSingle()

        if (!driver && autoCreateMissing && driverName) {
          const driverId = crypto.randomUUID()
          const { data: newDriver, error: driverError } = await supabase
            .from('profiles')
            .insert({
              user_id: driverId,
              first_name: driverName.trim(),
              last_name: '',
              phone: '0000000000',
              status: 'active',
              hire_date: new Date().toISOString().split('T')[0],
              employee_id: `DRV-${Date.now()}`
            })
            .select('user_id, id')
            .maybeSingle()

          if (!driverError && newDriver) {
            await supabase.from('user_roles').insert({ user_id: driverId, role: 'driver' })
            driver = newDriver
            results.created.staff.push(`${driverName} (Driver)`)
          } else {
            allocationNotes.warnings.push(`Driver "${driverName}" could not be created`)
          }
        }

        // PHASE 4: Find or create conductor
        let { data: conductor } = await supabase
          .from('profiles')
          .select('user_id, id')
          .ilike('first_name', conductorName?.trim() || '')
          .limit(1)
          .maybeSingle()

        if (!conductor && autoCreateMissing && conductorName) {
          const conductorId = crypto.randomUUID()
          const { data: newConductor, error: conductorError } = await supabase
            .from('profiles')
            .insert({
              user_id: conductorId,
              first_name: conductorName.trim(),
              last_name: '',
              phone: '0000000000',
              status: 'active',
              hire_date: new Date().toISOString().split('T')[0],
              employee_id: `CON-${Date.now()}`
            })
            .select('user_id, id')
            .maybeSingle()

          if (!conductorError && newConductor) {
            conductor = newConductor
            results.created.staff.push(`${conductorName} (Conductor)`)
          } else {
            allocationNotes.warnings.push(`Conductor "${conductorName}" could not be created`)
          }
        }

        // Parse and validate date
        let allocationDate = date
        if (typeof date === 'number') {
          const excelEpoch = new Date(1899, 11, 30)
          const dateObj = new Date(excelEpoch.getTime() + date * 86400000)
          allocationDate = dateObj.toISOString().split('T')[0]
        } else if (typeof date === 'string') {
          if (/^\d{5}$/.test(date)) {
            const excelEpoch = new Date(1899, 11, 30)
            const dateObj = new Date(excelEpoch.getTime() + parseInt(date) * 86400000)
            allocationDate = dateObj.toISOString().split('T')[0]
          } else {
            allocationDate = date.split('T')[0]
          }
        }

        // Parse time
        let parsedTime = time || '06:00'
        if (typeof time === 'number') {
          const hours = Math.floor(time * 24)
          const minutes = Math.floor((time * 24 - hours) * 60)
          parsedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        }

        // Generate trip_id
        const tripId = `${allocationDate}-${busNo}-${parsedTime.replace(':', '')}`

        // PHASE 5: Insert allocation with graceful degradation - allow NULL IDs
        const allocationData: any = {
          allocation_date: allocationDate,
          bus_id: bus?.id || null,
          route_id: route?.id || null,
          driver_id: driver?.id || null,
          conductor_id: conductor?.id || null,
          start_time: parsedTime,
          end_time: null,
          trip_id: tripId,
          status: 'confirmed',
          whatsapp_sent: false,
          notes: JSON.stringify(allocationNotes)
        }

        const { data: allocationResult, error: allocError } = await supabase
          .from('driver_allocations')
          .insert(allocationData)
          .select('id')
          .maybeSingle()

        if (allocError) {
          throw new Error(`Failed to insert allocation: ${allocError.message}`)
        }

        // PHASE 6: Insert into daily_trips - only if we have bus_id (required)
        if (bus?.id) {
          const tripData: any = {
            trip_date: allocationDate,
            bus_id: bus.id,
            route_id: route?.id || null,
            driver_id: driver?.id || null,
            conductor_id: conductor?.id || null,
            start_time: parsedTime,
            trip_no: tripId,
            status: 'pending',
            data_source: 'import',
            notes: allocationNotes.warnings.length > 0 
              ? `Imported from allocation. Warnings: ${allocationNotes.warnings.join(', ')}` 
              : 'Imported from driver allocation'
          }

          const { error: tripError } = await supabase
            .from('daily_trips')
            .insert(tripData)

          if (tripError) {
            console.error('⚠️ Trip insert error:', tripError)
            throw new Error(`Failed to insert trip: ${tripError.message}`)
          }
        } else {
          allocationNotes.warnings.push('Trip not created - missing bus assignment')
        }

        // Mark as success with warnings if applicable
        if (allocationNotes.warnings.length > 0) {
          results.warnings.push(`Row ${rowNum}: ${allocationNotes.warnings.join(', ')}`)
          results.rowResults.push({
            row: rowNum,
            status: 'warning',
            tripId,
            details: `Created with warnings: ${allocationNotes.warnings.join(', ')}`
          })
          console.log(`⚠️ Row ${rowNum} completed with warnings`)
        } else {
          results.rowResults.push({
            row: rowNum,
            status: 'success',
            tripId
          })
          console.log(`✅ Row ${rowNum} completed successfully`)
        }

        results.success++
        results.created.allocations.push(tripId)

      } catch (error: any) {
        console.error(`❌ Error processing row ${rowNum}:`, error)
        results.errors.push(`Row ${rowNum}: ${error.message}`)
        results.rowResults.push({
          row: rowNum,
          status: 'failed',
          error: error.message
        })
      }
    }

    console.log(`\n========== Import Complete ==========`)
    console.log(`✅ Success: ${results.success}`)
    console.log(`⚠️ Warnings: ${results.warnings.length}`)
    console.log(`❌ Errors: ${results.errors.length}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${allocations.length} allocations: ${results.success} successful, ${results.errors.length} failed, ${results.warnings.length} warnings`,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('❌ Import function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
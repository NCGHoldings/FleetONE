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

    const { allocations } = await req.json()
    console.log('Received bulk import request with', allocations.length, 'allocations')
    console.log('First allocation sample:', JSON.stringify(allocations[0], null, 2))

    const results = {
      success: 0,
      errors: [] as string[],
      rowResults: [] as Array<{
        row: number;
        status: 'success' | 'failed';
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
        console.log('Raw allocation data:', JSON.stringify({
          busNo,
          routeNo,
          routeName,
          driverName,
          conductorName,
          whatsapp,
          date: date, // This is the critical field
          dateType: typeof date,
          time
        }, null, 2))

        // Find or create bus
        let { data: bus } = await supabase
          .from('buses')
          .select('id')
          .eq('bus_no', busNo)
          .single()

        if (!bus) {
          const { data: newBus, error: busError } = await supabase
            .from('buses')
            .insert({
              bus_no: busNo,
              type: 'Regular',
              model: 'Tata LP 1512',
              year: 2020,
              capacity: 40,
              status: 'active',
              expected_km_per_liter: 8.0
            })
            .select('id')
            .single()

          if (busError) throw busError
          bus = newBus
          results.created.buses.push(busNo)
        }

        // Find or create route
        let { data: route } = await supabase
          .from('routes')
          .select('id')
          .or(`route_no.eq.${routeNo},route_name.ilike.%${routeName}%`)
          .single()

        if (!route) {
          const { data: newRoute, error: routeError } = await supabase
            .from('routes')
            .insert({
              route_no: routeNo,
              route_name: routeName,
              start_location: routeName.split(' to ')[0] || 'Unknown',
              end_location: routeName.split(' to ')[1] || 'Unknown',
              distance_km: 45,
              estimated_duration_minutes: 90
            })
            .select('id')
            .single()

          if (routeError) throw routeError
          route = newRoute
          results.created.routes.push(`${routeNo} - ${routeName}`)
        }

        // Find or create driver
        let { data: driver } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('first_name', driverName.trim())
          .single()

        if (!driver) {
          // Create a placeholder user_id for the driver
          const driverId = crypto.randomUUID()
          
          const { data: newDriver, error: driverError } = await supabase
            .from('profiles')
            .insert({
              user_id: driverId,
              first_name: driverName.trim(),
              last_name: 'Driver',
              phone: '0701234567',
              status: 'active',
              hire_date: new Date().toISOString().split('T')[0],
              employee_id: `DRV-${Date.now()}`
            })
            .select('user_id')
            .single()

          if (driverError) {
            console.error('Driver creation error:', driverError)
            // Skip this allocation if we can't create the driver
            results.errors.push(`Failed to create driver ${driverName}: ${driverError.message}`)
            continue
          }

          // Assign driver role
          await supabase
            .from('user_roles')
            .insert({
              user_id: driverId,
              role: 'driver'
            })

          driver = newDriver
          results.created.staff.push(`${driverName} (Driver)`)
        }

        // Find or create conductor
        let { data: conductor } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('first_name', conductorName.trim())
          .single()

        if (!conductor) {
          const conductorId = crypto.randomUUID()
          
          const { data: newConductor, error: conductorError } = await supabase
            .from('profiles')
            .insert({
              user_id: conductorId,
              first_name: conductorName.trim(),
              last_name: 'Conductor',
              phone: whatsapp || '0701234567',
              status: 'active',
              hire_date: new Date().toISOString().split('T')[0],
              employee_id: `CON-${Date.now()}`
            })
            .select('user_id')
            .single()

          if (conductorError) {
            console.error('Conductor creation error:', conductorError)
            results.errors.push(`Failed to create conductor ${conductorName}: ${conductorError.message}`)
            continue
          }

          // Assign conductor role
          await supabase
            .from('user_roles')
            .insert({
              user_id: conductorId,
              role: 'conductor'
            })

          conductor = newConductor
          results.created.staff.push(`${conductorName} (Conductor)`)
        }

        // Parse date with comprehensive validation and logging
        console.log(`[Row ${rowNum}] Starting date parsing for: "${date}"`)
        
        const dateParts = date.trim().split('/');
        console.log(`[Row ${rowNum}] Date parts after split:`, dateParts)
        
        if (dateParts.length !== 3) {
          const error = `Invalid date format: "${date}". Expected DD/MM/YYYY (e.g., 01/10/2025 or 1/10/2025)`;
          console.error(`[Row ${rowNum}] ${error}`)
          throw new Error(error);
        }

        const [day, month, year] = dateParts;
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);

        console.log(`[Row ${rowNum}] Parsed numbers - Day: ${dayNum}, Month: ${monthNum}, Year: ${yearNum}`)

        // Validate date components with detailed error messages
        if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
          const error = `Invalid day: "${day}" (parsed as ${dayNum}). Must be 1-31`;
          console.error(`[Row ${rowNum}] ${error}`)
          throw new Error(error);
        }
        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
          const error = `Invalid month: "${month}" (parsed as ${monthNum}). Must be 1-12`;
          console.error(`[Row ${rowNum}] ${error}`)
          throw new Error(error);
        }
        if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
          const error = `Invalid year: "${year}" (parsed as ${yearNum}). Must be 2000-2100`;
          console.error(`[Row ${rowNum}] ${error}`)
          throw new Error(error);
        }

        // Format as YYYY-MM-DD with zero-padding
        const allocationDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
        
        console.log(`[Row ${rowNum}] ✓ Date parsing SUCCESS: "${date}" -> "${allocationDate}"`)
        
        // Parse time (convert 12-hour to 24-hour format)
        let [timePart, period] = time.split(/(?=[ap]m)/i)
        let [hours, minutes] = timePart.split('.')
        hours = parseInt(hours)
        if (period.toLowerCase() === 'pm' && hours !== 12) hours += 12
        if (period.toLowerCase() === 'am' && hours === 12) hours = 0
        const timeFormatted = `${hours.toString().padStart(2, '0')}:${(minutes || '00').padStart(2, '0')}`

        // Generate trip ID
        const dateStr = allocationDate.replace(/-/g, '')
        const { data: existingTrips } = await supabase
          .from('driver_allocations')
          .select('trip_id')
          .like('trip_id', `T${dateStr}-%`)

        const tripNumber = (existingTrips?.length || 0) + 1
        const tripId = `T${dateStr}-${tripNumber.toString().padStart(4, '0')}`

        // Create driver allocation with comprehensive notes
        const allocationNotes = JSON.stringify({
          bus_no: busNo,
          route_no: routeNo,
          route: routeName,
          driver: driverName,
          conductor: conductorName,
          whatsapp: whatsapp,
          time: time,
          import_source: 'excel_bulk_import',
          import_timestamp: new Date().toISOString()
        })

        const { data: newAllocation, error: allocationError } = await supabase
          .from('driver_allocations')
          .insert({
            trip_id: tripId,
            bus_id: bus.id,
            route_id: route.id,
            driver_id: driver.user_id,
            conductor_id: conductor.user_id,
            allocation_date: allocationDate,
            start_time: timeFormatted,
            whatsapp_sent: false,
            status: 'scheduled',
            notes: allocationNotes,
            created_by: null // Will be set by frontend
          })
          .select()
          .single()

        if (allocationError) throw allocationError

        // Create corresponding daily trip with proper whatsapp field
        const tripNotes = JSON.stringify({
          bus_no: busNo,
          route: routeName,
          driver: driverName,
          conductor: conductorName,
          time: time,
          import_source: 'driver_allocation',
          allocation_id: newAllocation.id
        })

        await supabase
          .from('daily_trips')
          .insert({
            trip_no: tripId,
            trip_date: allocationDate,
            bus_id: bus.id,
            route_id: route.id,
            driver_id: driver.user_id,
            conductor_id: conductor.user_id,
            start_time: timeFormatted,
            status: 'scheduled',
            whatsapp: whatsapp || null,
            notes: tripNotes,
            created_by: null
          })

        results.created.allocations.push(tripId)
        results.success++
        
        results.rowResults.push({
          row: rowNum,
          status: 'success',
          tripId: tripId,
          details: `Bus: ${busNo}, Date: ${allocationDate}, Driver: ${driverName}`
        })
        
        console.log(`[Row ${rowNum}] ✓✓✓ ALLOCATION CREATED SUCCESSFULLY: ${tripId}\n`)

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const errorStack = error instanceof Error ? error.stack : undefined
        
        console.error(`[Row ${rowNum}] ✗✗✗ ALLOCATION FAILED:`, {
          error: errorMessage,
          stack: errorStack,
          allocationData: allocation
        })
        
        results.errors.push(`Row ${rowNum}: ${errorMessage}`)
        results.rowResults.push({
          row: rowNum,
          status: 'failed',
          error: errorMessage,
          details: `Bus: ${allocation.busNo}, Date: ${allocation.date}, Driver: ${allocation.driverName}`
        })
      }
    }
    
    console.log('\n========== BULK IMPORT COMPLETE ==========')
    console.log(`Total processed: ${allocations.length}`)
    console.log(`Successful: ${results.success}`)
    console.log(`Failed: ${results.errors.length}`)
    console.log('==========================================\n')

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in driver-allocation-import function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorStack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
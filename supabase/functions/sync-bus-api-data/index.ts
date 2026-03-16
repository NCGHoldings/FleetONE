import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FieldMapping {
  sourceField: string;
  targetField: string;
  confidence: number;
  transform?: string;
}

// Extract value from nested object using dot notation
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Apply field transformation
function applyTransform(value: any, transform?: string): any {
  if (!transform) return value;
  
  switch (transform) {
    case 'unix_to_iso':
      if (typeof value === 'number') {
        return new Date(value * 1000).toISOString();
      }
      return value;
    default:
      return value;
  }
}

// Map external data to internal format using field mappings
function mapDataToInternal(externalData: any, mappings: FieldMapping[]): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const mapping of mappings) {
    const value = getNestedValue(externalData, mapping.sourceField);
    if (value !== undefined && value !== null) {
      const transformedValue = applyTransform(value, mapping.transform);
      
      // Map to internal field names
      switch (mapping.targetField) {
        case 'latitude':
          result.gps_lat = transformedValue;
          break;
        case 'longitude':
          result.gps_lng = transformedValue;
          break;
        case 'speed':
          result.speed_kmh = transformedValue;
          break;
        case 'odometer':
          result.odometer_km = transformedValue;
          break;
        case 'fuel':
          result.fuel_level_liters = transformedValue;
          break;
        case 'heading':
          result.heading_degrees = transformedValue;
          break;
        case 'timestamp':
          result.last_update = transformedValue;
          break;
        case 'battery':
          result.battery_voltage = transformedValue;
          break;
        case 'altitude':
          result.altitude_meters = transformedValue;
          break;
        case 'satellites':
          result.satellite_count = transformedValue;
          break;
        case 'status':
          result.status = transformedValue === true || transformedValue === 'on' || transformedValue === 'active' 
            ? 'active' : 'inactive';
          break;
      }
    }
  }
  
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { busId } = body; // Optional: sync specific bus only

    console.log('[Sync] Starting API data sync', busId ? `for bus ${busId}` : 'for all buses');

    // Get active API connections
    let query = supabase
      .from('bus_api_connections')
      .select('*')
      .eq('is_active', true);
    
    if (busId) {
      query = query.eq('bus_id', busId);
    }

    const { data: connections, error: connError } = await query;

    if (connError) {
      throw new Error(`Failed to fetch API connections: ${connError.message}`);
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active API connections found', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Sync] Found ${connections.length} active API connections`);

    let successCount = 0;
    let errorCount = 0;
    const results: any[] = [];

    for (const connection of connections) {
      try {
        console.log(`[Sync] Syncing bus ${connection.bus_no} from ${connection.api_name}`);

        // Build request headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (connection.api_auth_type === 'bearer' && connection.api_key) {
          headers['Authorization'] = `Bearer ${connection.api_key}`;
        } else if (connection.api_auth_type === 'api_key' && connection.api_key) {
          headers['X-API-Key'] = connection.api_key;
        } else if (connection.api_auth_type === 'basic' && connection.api_key) {
          headers['Authorization'] = `Basic ${btoa(connection.api_key)}`;
        }

        // Build URL with device identifier
        let url = connection.api_endpoint;
        if (connection.device_identifier) {
          url = url.includes('?')
            ? `${url}&device_id=${connection.device_identifier}`
            : `${url}?device_id=${connection.device_identifier}`;
        }

        // Fetch data from external API
        const response = await fetch(url, { method: 'GET', headers });

        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }

        const data = await response.json();

        // Extract vehicle data (handle various response formats)
        let vehicleData = data;
        if (Array.isArray(data)) {
          vehicleData = data[0];
        } else if (data.items && Array.isArray(data.items)) {
          vehicleData = data.items[0];
        } else if (data.vehicles && Array.isArray(data.vehicles)) {
          vehicleData = data.vehicles[0];
        } else if (data.data) {
          vehicleData = Array.isArray(data.data) ? data.data[0] : data.data;
        }

        // Apply field mappings
        const mappings: FieldMapping[] = connection.field_mappings || [];
        const mappedData = mapDataToInternal(vehicleData, mappings);

        console.log(`[Sync] Mapped data for ${connection.bus_no}:`, JSON.stringify(mappedData));

        // Update real_time_tracking table
        if (Object.keys(mappedData).length > 0) {
          const updateData: any = {
            last_update: mappedData.last_update || new Date().toISOString(),
          };

          if (mappedData.gps_lat && mappedData.gps_lng) {
            updateData.gps_coordinates = {
              lat: mappedData.gps_lat,
              lng: mappedData.gps_lng
            };
          }
          if (mappedData.speed_kmh !== undefined) updateData.speed_kmh = mappedData.speed_kmh;
          if (mappedData.odometer_km !== undefined) updateData.odometer_km = mappedData.odometer_km;
          if (mappedData.fuel_level_liters !== undefined) updateData.fuel_level_liters = mappedData.fuel_level_liters;
          if (mappedData.heading_degrees !== undefined) updateData.heading_degrees = mappedData.heading_degrees;
          if (mappedData.battery_voltage !== undefined) updateData.battery_voltage = mappedData.battery_voltage;
          if (mappedData.altitude_meters !== undefined) updateData.altitude_meters = mappedData.altitude_meters;
          if (mappedData.satellite_count !== undefined) updateData.satellite_count = mappedData.satellite_count;
          if (mappedData.status) updateData.status = mappedData.status;

          const { error: updateError } = await supabase
            .from('real_time_tracking')
            .update(updateData)
            .eq('bus_id', connection.bus_id);

          if (updateError) {
            console.error(`[Sync] Error updating tracking for ${connection.bus_no}:`, updateError);
            throw updateError;
          }

          // Also update buses table odometer if available
          if (mappedData.odometer_km !== undefined) {
            await supabase
              .from('buses')
              .update({ 
                current_mileage: Math.round(mappedData.odometer_km),
                odometer_source: 'external_api'
              })
              .eq('id', connection.bus_id);
          }
        }

        // Update connection status
        await supabase
          .from('bus_api_connections')
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: 'success',
            last_error_message: null
          })
          .eq('id', connection.id);

        successCount++;
        results.push({ bus_no: connection.bus_no, status: 'success' });

      } catch (error) {
        console.error(`[Sync] Error syncing ${connection.bus_no}:`, error);
        
        // Update connection with error
        await supabase
          .from('bus_api_connections')
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: 'failed',
            last_error_message: (error as Error).message
          })
          .eq('id', connection.id);

        errorCount++;
        results.push({ bus_no: connection.bus_no, status: 'error', error: (error as Error).message });
      }
    }

    console.log(`[Sync] Completed: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: successCount,
        errors: errorCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Sync] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FIOSMileageMessage {
  i: number; // Item ID (device ID)
  p: {
    param_value?: number; // Mileage value
    mileage?: number; // Alternative mileage field
    odometer?: number; // Alternative odometer field
  };
  t: number; // Timestamp
  tp: string; // Message type
}

let cachedSessionId: string | null = null;
let sessionExpiry: number = 0;

async function authenticateWithFIOS(token: string): Promise<string> {
  console.log('[FIOS Mileage] Authenticating with token...');
  
  const loginUrl = `https://fios-api.kloudip.com/api?svc=token/login&params=${encodeURIComponent(JSON.stringify({ token, fl: 1 }))}`;
  
  const response = await fetch(loginUrl);
  
  if (!response.ok) {
    throw new Error(`FIOS API returned status ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.eid) {
    throw new Error(`FIOS authentication failed: No session ID returned`);
  }
  
  const sessionId = data.eid;
  console.log('[FIOS Mileage] Authentication successful');
  
  // Cache session ID for 4 minutes
  cachedSessionId = sessionId;
  sessionExpiry = Date.now() + (4 * 60 * 1000);
  
  return sessionId;
}

async function fetchMileageData(sessionId: string, deviceId: number): Promise<number | null> {
  console.log(`[FIOS Mileage] Fetching mileage for device ${deviceId}...`);
  
  // Get last 24 hours of mileage data
  const now = Math.floor(Date.now() / 1000);
  const yesterday = now - (24 * 60 * 60);
  
  const params = {
    itemId: deviceId,
    timeFrom: yesterday,
    timeTo: now,
    flags: 0,
    flagsMask: 0,
    loadCount: 100 // Get last 100 messages
  };
  
  const url = `https://fios-api.kloudip.com/api?svc=messages/load_interval&params=${encodeURIComponent(JSON.stringify(params))}&sid=${sessionId}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data.messages || data.messages.length === 0) {
    console.log(`[FIOS Mileage] No messages found for device ${deviceId}`);
    return null;
  }
  
  // Find the most recent mileage/odometer reading
  for (const msg of data.messages) {
    if (msg.p) {
      const mileage = msg.p.param_value || msg.p.mileage || msg.p.odometer;
      if (mileage && mileage > 0) {
        console.log(`[FIOS Mileage] Found mileage ${mileage} km for device ${deviceId}`);
        return mileage;
      }
    }
  }
  
  console.log(`[FIOS Mileage] No valid mileage data in messages for device ${deviceId}`);
  return null;
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
    }

    // Get all tracking data with FIOS device IDs
    const { data: trackingData, error: trackingError } = await supabase
      .from('real_time_tracking')
      .select('id, bus_id, bus_no, fios_device_id')
      .not('fios_device_id', 'is', null);

    if (trackingError) throw trackingError;

    if (!trackingData || trackingData.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No vehicles with FIOS device IDs found',
          updated: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[FIOS Mileage] Processing mileage for ${trackingData.length} vehicles`);

    const updates = [];
    const odometerUpdates = [];

    for (const vehicle of trackingData) {
      if (!vehicle.fios_device_id) continue;

      const mileage = await fetchMileageData(sessionId, vehicle.fios_device_id);
      
      if (mileage && mileage > 0) {
        // Update tracking table with odometer reading
        const { error: updateError } = await supabase
          .from('real_time_tracking')
          .update({
            odometer_km: mileage,
            daily_mileage_km: null // Will be calculated based on previous readings
          })
          .eq('id', vehicle.id);

        if (updateError) {
          console.error(`[FIOS Mileage] Error updating tracking for ${vehicle.bus_no}:`, updateError);
          continue;
        }

        updates.push({
          bus_no: vehicle.bus_no,
          odometer_km: mileage
        });

        // Trigger bus odometer update and service alert check
        try {
          const { data: updateResult, error: updateError } = await supabase.functions.invoke(
            'update-bus-odometer',
            {
              body: {
                bus_no: vehicle.bus_no,
                current_km: mileage,
                updated_at: new Date().toISOString()
              }
            }
          );

          if (updateError) {
            console.error(`[FIOS Mileage] Odometer update error for ${vehicle.bus_no}:`, updateError);
          } else {
            console.log(`[FIOS Mileage] ✅ Odometer updated for ${vehicle.bus_no}`);
            odometerUpdates.push({
              bus_no: vehicle.bus_no,
              success: true,
              result: updateResult
            });
          }
        } catch (error) {
          console.error(`[FIOS Mileage] Exception updating odometer for ${vehicle.bus_no}:`, error);
          odometerUpdates.push({
            bus_no: vehicle.bus_no,
            success: false,
            error: (error as Error).message
          });
        }
      }
    }

    console.log(`[FIOS Mileage] Successfully processed ${updates.length} mileage updates`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated mileage for ${updates.length} vehicles`,
        updated: updates.length,
        updates: updates,
        odometer_updates: odometerUpdates.length,
        odometer_results: odometerUpdates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[FIOS Mileage] Error:', error);
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

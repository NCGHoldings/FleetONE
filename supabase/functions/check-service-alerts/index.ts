import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

// Validate cron secret for scheduled job security
function validateCronSecret(req: Request): boolean {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret) {
    console.warn('CRON_SECRET not configured - skipping auth check');
    return true; // Allow if not configured (for backward compatibility)
  }
  
  const authHeader = req.headers.get('x-cron-secret') || req.headers.get('authorization');
  const providedSecret = authHeader?.startsWith('Bearer ') 
    ? authHeader.replace('Bearer ', '') 
    : authHeader;
  
  return providedSecret === cronSecret;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate cron authentication
  if (!validateCronSecret(req)) {
    console.error('Unauthorized cron request attempt');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { bus_id, test_mode } = await req.json();

    console.log('Checking service alerts...', { bus_id, test_mode });

    // Fetch service alert configuration
    const { data: config, error: configError } = await supabase
      .from('service_alert_config')
      .select('*')
      .eq('is_enabled', true)
      .single();

    if (configError || !config) {
      console.error('No active service alert config found:', configError);
      return new Response(
        JSON.stringify({ error: 'Service alerts not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch buses that need alerts
    let query = supabase
      .from('buses')
      .select('id, bus_no, current_mileage, last_service_mileage, next_service_mileage, last_alert_km, last_alert_sent_at')
      .not('current_mileage', 'is', null)
      .not('next_service_mileage', 'is', null);

    if (bus_id) {
      query = query.eq('id', bus_id);
    }

    const { data: buses, error: busesError } = await query;

    if (busesError) {
      console.error('Error fetching buses:', busesError);
      throw busesError;
    }

    console.log(`Found ${buses?.length || 0} buses to check`);

    const alertsSent = [];
    const alertsSkipped = [];

    for (const bus of buses || []) {
      const kmRemaining = bus.next_service_mileage - bus.current_mileage;
      
      console.log(`Bus ${bus.bus_no}: ${kmRemaining} km remaining until service`);

      // Check if alert should be sent
      const shouldAlert = kmRemaining <= config.alert_threshold_km;
      const recentAlertSent = bus.last_alert_km && 
        Math.abs(bus.current_mileage - bus.last_alert_km) < 100; // Don't spam alerts

      if (shouldAlert && !recentAlertSent) {
        console.log(`Sending alert for bus ${bus.bus_no}`);

        const alertPayload = {
          alert_type: kmRemaining <= 0 ? 'overdue' : 'upcoming_service',
          bus_no: bus.bus_no,
          bus_id: bus.id,
          current_km: bus.current_mileage,
          next_service_km: bus.next_service_mileage,
          km_remaining: kmRemaining,
          last_service_km: bus.last_service_mileage,
          message: kmRemaining <= 0 
            ? `Bus ${bus.bus_no} is OVERDUE for service by ${Math.abs(kmRemaining)} km`
            : `Bus ${bus.bus_no} requires service in ${kmRemaining} km`,
          service_interval: config.service_interval_km,
        };

        // Send to external API if configured and not in test mode
        let externalResponse = null;
        if (config.external_api_endpoint && config.external_api_key && !test_mode) {
          try {
            const response = await fetch(config.external_api_endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': config.external_api_key,
              },
              body: JSON.stringify(alertPayload),
            });

            externalResponse = await response.json();
            console.log('External API response received');
          } catch (error) {
            console.error('Error sending to external API:', error);
            externalResponse = { error: 'Failed to send to external API' };
          }
        }

        // Log alert in database
        const { error: alertError } = await supabase
          .from('bus_service_alerts')
          .insert({
            bus_id: bus.id,
            alert_type: alertPayload.alert_type,
            triggered_at_km: bus.current_mileage,
            next_service_km: bus.next_service_mileage,
            external_response: externalResponse,
            status: externalResponse?.success ? 'sent' : 'failed',
          });

        if (alertError) {
          console.error('Error logging alert:', alertError);
        }

        // Update bus last_alert info
        await supabase
          .from('buses')
          .update({
            last_alert_km: bus.current_mileage,
            last_alert_sent_at: new Date().toISOString(),
          })
          .eq('id', bus.id);

        alertsSent.push({
          bus_no: bus.bus_no,
          km_remaining: kmRemaining,
        });
      } else {
        alertsSkipped.push({
          bus_no: bus.bus_no,
          km_remaining: kmRemaining,
          reason: recentAlertSent ? 'Recent alert already sent' : 'Not yet at threshold',
        });
      }
    }

    console.log(`Alerts sent: ${alertsSent.length}, skipped: ${alertsSkipped.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        config: {
          service_interval_km: config.service_interval_km,
          alert_threshold_km: config.alert_threshold_km,
        },
        alerts_sent: alertsSent,
        alerts_skipped: alertsSkipped,
        test_mode,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8);
    console.error(`Error ${errorId} in check-service-alerts:`, error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request', errorId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

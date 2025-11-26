import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify API key from external platform
    const apiKey = req.headers.get('x-api-key');
    
    // Fetch config to verify API key
    const { data: config } = await supabase
      .from('service_alert_config')
      .select('external_api_key')
      .single();

    if (!config || config.external_api_key !== apiKey) {
      console.error('Invalid API key from external platform');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { bus_no, service_status, service_date, notes } = await req.json();

    console.log('Received service callback:', { bus_no, service_status, service_date, notes });

    // Find bus by bus number
    const { data: bus, error: busError } = await supabase
      .from('buses')
      .select('id, current_mileage, next_service_mileage, service_interval_km')
      .eq('bus_no', bus_no)
      .single();

    if (busError || !bus) {
      console.error('Bus not found:', bus_no);
      return new Response(
        JSON.stringify({ error: 'Bus not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Update bus service status
    if (service_status === 'service_completed' || service_status === 'completed') {
      const serviceInterval = bus.service_interval_km || 3000;
      const currentMileage = bus.current_mileage || 0;
      
      const { error: updateError } = await supabase
        .from('buses')
        .update({
          last_service_date: service_date || new Date().toISOString(),
          last_service_mileage: currentMileage,
          next_service_mileage: currentMileage + serviceInterval,
          last_alert_km: null,
          last_alert_sent_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bus.id);

      if (updateError) {
        console.error('Error updating bus service status:', updateError);
        throw updateError;
      }

      // Update related service alerts
      const { error: alertUpdateError } = await supabase
        .from('bus_service_alerts')
        .update({
          status: 'completed',
        })
        .eq('bus_id', bus.id)
        .eq('status', 'sent');

      if (alertUpdateError) {
        console.error('Error updating service alerts:', alertUpdateError);
      }

      console.log(`Service completed for bus ${bus_no}, next service at ${currentMileage + serviceInterval} km`);
    } else if (service_status === 'service_scheduled' || service_status === 'scheduled') {
      // Update alert status to scheduled
      const { error: alertUpdateError } = await supabase
        .from('bus_service_alerts')
        .update({
          status: 'scheduled',
        })
        .eq('bus_id', bus.id)
        .eq('status', 'sent');

      if (alertUpdateError) {
        console.error('Error updating service alerts to scheduled:', alertUpdateError);
      }

      console.log(`Service scheduled for bus ${bus_no} on ${service_date}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Service status updated successfully',
        bus_no,
        service_status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in service-callback:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

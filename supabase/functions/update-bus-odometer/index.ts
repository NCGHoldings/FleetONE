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
      console.error('Invalid API key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { bus_no, current_km, updated_at } = await req.json();

    console.log('Received odometer update:', { bus_no, current_km, updated_at });

    if (!bus_no || !current_km) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: bus_no, current_km' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Find bus by bus number
    const { data: bus, error: busError } = await supabase
      .from('buses')
      .select('id, current_mileage, next_service_mileage, last_service_mileage')
      .eq('bus_no', bus_no)
      .single();

    if (busError || !bus) {
      console.error('Bus not found:', bus_no);
      return new Response(
        JSON.stringify({ error: 'Bus not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Fetch service interval from config
    const { data: alertConfig } = await supabase
      .from('service_alert_config')
      .select('service_interval_km')
      .single();

    const serviceInterval = alertConfig?.service_interval_km || 3000;

    // Calculate next service mileage if not set or if service was completed
    let nextServiceMileage = bus.next_service_mileage;
    if (!nextServiceMileage || current_km >= nextServiceMileage) {
      // Service likely completed, reset next service mileage
      nextServiceMileage = current_km + serviceInterval;
      console.log(`Resetting next service mileage to ${nextServiceMileage}`);
    }

    // Update bus odometer
    const { error: updateError } = await supabase
      .from('buses')
      .update({
        current_mileage: current_km,
        next_service_mileage: nextServiceMileage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bus.id);

    if (updateError) {
      console.error('Error updating bus:', updateError);
      throw updateError;
    }

    console.log(`Updated bus ${bus_no} odometer to ${current_km} km`);

    // Trigger service alert check
    const { data: alertResult, error: alertError } = await supabase.functions.invoke(
      'check-service-alerts',
      { body: { bus_id: bus.id, test_mode: false } }
    );

    if (alertError) {
      console.error('Error checking service alerts:', alertError);
    } else {
      console.log('Service alert check result:', alertResult);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Odometer updated successfully',
        bus_no,
        current_km,
        next_service_km: nextServiceMileage,
        km_remaining: nextServiceMileage - current_km,
        alert_check: alertResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in update-bus-odometer:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

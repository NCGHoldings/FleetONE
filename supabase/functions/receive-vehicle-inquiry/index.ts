import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get API key from header
    const apiKey = req.headers.get('x-api-key');
    
    // Validate API key against settings
    const { data: settings } = await supabase
      .from('inquiry_hub_settings')
      .select('setting_value')
      .eq('setting_key', 'webhook_secret')
      .single();

    const configuredApiKey = settings?.setting_value?.api_key;
    
    if (!configuredApiKey || apiKey !== configuredApiKey) {
      console.error('Invalid API key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const inquiryData = await req.json();
    console.log('Received inquiry data:', inquiryData);

    // Validate required fields
    if (!inquiryData.customer_name || !inquiryData.product_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: customer_name, product_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auto-assignment settings
    const { data: assignSettings } = await supabase
      .from('inquiry_hub_settings')
      .select('setting_value')
      .eq('setting_key', 'default_assignees')
      .single();

    let assignedTo = null;
    if (assignSettings?.setting_value) {
      if (inquiryData.product_type === 'yutong') {
        assignedTo = assignSettings.setting_value.yutong;
      } else if (inquiryData.product_type === 'sinotruck') {
        assignedTo = assignSettings.setting_value.sinotruck;
      }
    }

    // Insert inquiry into database
    const { data: inquiry, error: insertError } = await supabase
      .from('vehicle_inquiries')
      .insert({
        source: inquiryData.source || 'website',
        product_type: inquiryData.product_type,
        customer_name: inquiryData.customer_name,
        customer_phone: inquiryData.customer_phone,
        customer_email: inquiryData.customer_email,
        company_name: inquiryData.company_name,
        address: inquiryData.address,
        inquiry_message: inquiryData.inquiry_message,
        interested_model: inquiryData.interested_model,
        quantity: inquiryData.quantity || 1,
        budget_range: inquiryData.budget_range,
        status: 'new',
        priority: inquiryData.priority || 'medium',
        assigned_to: assignedTo,
        external_ref_id: inquiryData.external_ref_id,
        notes: inquiryData.notes,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting inquiry:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create inquiry', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Inquiry created successfully:', inquiry.inquiry_number);

    // TODO: Send notifications if enabled in settings

    return new Response(
      JSON.stringify({
        success: true,
        inquiry_number: inquiry.inquiry_number,
        message: 'Inquiry received successfully',
        data: inquiry,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
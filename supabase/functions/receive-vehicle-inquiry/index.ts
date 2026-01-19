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
      console.error('Invalid API key attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const inquiryData = await req.json();
    console.log('Received inquiry from:', inquiryData.customer_name);

    // Validate required fields
    if (!inquiryData.customer_name || !inquiryData.product_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: customer_name, product_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Input validation - sanitize strings
    const sanitizedData = {
      customer_name: String(inquiryData.customer_name || '').slice(0, 200),
      product_type: String(inquiryData.product_type || '').slice(0, 100),
      customer_phone: String(inquiryData.customer_phone || '').slice(0, 20),
      customer_email: String(inquiryData.customer_email || '').slice(0, 255),
      company_name: String(inquiryData.company_name || '').slice(0, 200),
      address: String(inquiryData.address || '').slice(0, 500),
      inquiry_message: String(inquiryData.inquiry_message || '').slice(0, 2000),
      interested_model: String(inquiryData.interested_model || '').slice(0, 100),
      budget_range: String(inquiryData.budget_range || '').slice(0, 100),
      notes: String(inquiryData.notes || '').slice(0, 1000),
    };

    // Get auto-assignment settings
    const { data: assignSettings } = await supabase
      .from('inquiry_hub_settings')
      .select('setting_value')
      .eq('setting_key', 'default_assignees')
      .single();

    // Define light vehicle brands for matching
    const lightVehicleBrands = ['daihatsu', 'honda', 'hyundai', 'isuzu', 'kia', 'mazda', 'mitsubishi', 'nissan', 'perodua', 'subaru', 'suzuki', 'toyota', 'lightvehicle'];
    const productType = sanitizedData.product_type.toLowerCase();

    let assignedTo = null;
    if (assignSettings?.setting_value) {
      if (productType === 'yutong') {
        assignedTo = assignSettings.setting_value.yutong;
      } else if (productType === 'sinotruck' || productType === 'sinotruk') {
        assignedTo = assignSettings.setting_value.sinotruck;
      } else if (lightVehicleBrands.includes(productType)) {
        assignedTo = assignSettings.setting_value.lightvehicle;
      } else {
        // General or unknown product types
        assignedTo = assignSettings.setting_value.general;
      }
    }
    console.log('Auto-assigned to:', assignedTo, 'for product type:', productType);

    // Insert inquiry into database
    const { data: inquiry, error: insertError } = await supabase
      .from('vehicle_inquiries')
      .insert({
        source: String(inquiryData.source || 'website').slice(0, 50),
        product_type: sanitizedData.product_type,
        customer_name: sanitizedData.customer_name,
        customer_phone: sanitizedData.customer_phone || null,
        customer_email: sanitizedData.customer_email || null,
        company_name: sanitizedData.company_name || null,
        address: sanitizedData.address || null,
        inquiry_message: sanitizedData.inquiry_message || null,
        interested_model: sanitizedData.interested_model || null,
        quantity: Math.min(Math.max(1, parseInt(inquiryData.quantity) || 1), 1000),
        budget_range: sanitizedData.budget_range || null,
        status: 'new',
        priority: ['low', 'medium', 'high', 'urgent'].includes(inquiryData.priority) ? inquiryData.priority : 'medium',
        assigned_to: assignedTo,
        external_ref_id: String(inquiryData.external_ref_id || '').slice(0, 100) || null,
        notes: sanitizedData.notes || null,
      })
      .select()
      .single();

    if (insertError) {
      const errorId = crypto.randomUUID().slice(0, 8);
      console.error(`Error ${errorId} inserting inquiry:`, insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create inquiry', errorId }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Inquiry created successfully:', inquiry.inquiry_number);

    return new Response(
      JSON.stringify({
        success: true,
        inquiry_number: inquiry.inquiry_number,
        message: 'Inquiry received successfully',
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8);
    console.error(`Error ${errorId} in receive-vehicle-inquiry:`, error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request', errorId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

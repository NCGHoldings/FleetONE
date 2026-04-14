import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { requestId, action, reviewNotes } = await req.json();

    console.log('Processing late entry request:', { requestId, action });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('late_entry_requests')
      .update({
        status: action,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes
      })
      .eq('id', requestId);

    if (updateError) {
      throw new Error(`Failed to update request: ${updateError.message}`);
    }

    // Get request details for notification
    const { data: request } = await supabase
      .from('late_entry_requests')
      .select('*, profiles(*)')
      .eq('id', requestId)
      .single();

    console.log(`Late entry request ${action} for date ${request?.trip_date}`);

    // TODO: Send notification to requester

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Request ${action}`,
        requestId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error processing late entry request:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
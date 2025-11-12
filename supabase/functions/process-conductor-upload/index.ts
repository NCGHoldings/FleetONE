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

    const { submissionId } = await req.json();

    console.log('Processing conductor upload:', submissionId);

    // Get submission details
    const { data: submission, error: fetchError } = await supabase
      .from('conductor_submissions')
      .select('*, profiles(*)')
      .eq('id', submissionId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch submission: ${fetchError.message}`);
    }

    // Trigger OCR processing if image exists
    if (submission.image_url) {
      console.log('Triggering OCR for image:', submission.image_url);
      // OCR processing would happen here
      // For now, just log it
    }

    // Notify admins/supervisors about new submission
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['super_admin', 'admin', 'supervisor']);

    console.log(`Notifying ${admins?.length || 0} admins about new submission`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conductor upload processed',
        submissionId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error processing conductor upload:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
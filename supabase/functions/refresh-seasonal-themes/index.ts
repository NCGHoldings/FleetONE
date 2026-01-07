import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
  // Handle CORS preflight requests
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
    // Create Supabase client with service role to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Starting theme refresh...');

    // First, set all themes to inactive
    const { error: deactivateError } = await supabaseClient
      .from('seasonal_themes')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

    if (deactivateError) {
      console.error('Error deactivating themes:', deactivateError);
      throw deactivateError;
    }

    console.log('All themes deactivated');

    // Get current date in YYYY-MM-DD format
    const currentDate = new Date().toISOString().split('T')[0];

    // Then activate themes that should be active
    const { data: activatedThemes, error: activateError } = await supabaseClient
      .from('seasonal_themes')
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('is_enabled', true)
      .lte('start_date', currentDate)
      .gte('end_date', currentDate)
      .select('id, season_name');

    if (activateError) {
      console.error('Error activating themes:', activateError);
      throw activateError;
    }

    const activatedCount = activatedThemes?.length || 0;
    console.log(`Activated ${activatedCount} theme(s):`, activatedThemes);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully refreshed theme status`,
        activated_count: activatedCount,
        activated_themes: activatedThemes
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8);
    console.error(`Error ${errorId} in refresh-seasonal-themes:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred processing your request',
        errorId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

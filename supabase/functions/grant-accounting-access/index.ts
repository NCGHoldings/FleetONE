import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role key to bypass RLS
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

    // Get all users with super_admin, admin, or finance roles
    const { data: userRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['super_admin', 'admin', 'finance']);

    if (rolesError) throw rolesError;

    // Get unique user IDs
    const uniqueUserIds = [...new Set(userRoles?.map(ur => ur.user_id) || [])];

    console.log(`Granting accounting access to ${uniqueUserIds.length} users`);

    // Grant accounting page access to each user
    const grants = uniqueUserIds.map(userId => ({
      user_id: userId,
      page_identifier: 'accounting',
      has_access: true,
      granted_by: userId
    }));

    const { data: grantedPermissions, error: permError } = await supabaseClient
      .from('user_page_permissions')
      .upsert(grants, {
        onConflict: 'user_id,page_identifier',
        ignoreDuplicates: false
      })
      .select();

    if (permError) throw permError;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Granted accounting access to ${uniqueUserIds.length} users`,
        granted: grantedPermissions?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error granting accounting access:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requester is a super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is super_admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin');

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'Forbidden - Super Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all users with super_admin, admin, or finance roles
    const { data: usersWithRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['super_admin', 'admin', 'finance']);

    if (rolesError) throw rolesError;

    const uniqueUserIds = [...new Set(usersWithRoles.map(r => r.user_id))];

    // Grant accounting access to all these users
    const permissionsToInsert = uniqueUserIds.map(userId => ({
      user_id: userId,
      page_identifier: 'accounting',
      has_access: true,
      granted_by: user.id,
    }));

    const { data: grantedPermissions, error: permError } = await supabase
      .from('user_page_permissions')
      .upsert(permissionsToInsert, {
        onConflict: 'user_id,page_identifier',
        ignoreDuplicates: false,
      })
      .select();

    if (permError) throw permError;

    console.log(`✅ Granted accounting access to ${uniqueUserIds.length} users`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Granted accounting access to ${uniqueUserIds.length} users`,
        granted_count: uniqueUserIds.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error granting accounting access:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate secure random password
function generatePassword(length = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  return password;
}

// Generate unique email
function generateEmail(): string {
  const randomId = crypto.randomUUID().split('-')[0];
  return `temp_${randomId}@ncgspeed.local`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify caller is authenticated and has super_admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if caller is super_admin
    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id);

    const isSuperAdmin = callerRoles?.some(r => r.role === 'super_admin');
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Super Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { validityHours, notes, role = 'staff' } = await req.json();

    // Generate credentials
    const email = generateEmail();
    const password = generatePassword();
    const validUntil = new Date(Date.now() + (validityHours * 60 * 60 * 1000)).toISOString();

    console.log(`Creating temporary account: ${email}, validity: ${validityHours}h`);

    // Create user using Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        is_temporary_account: true,
        created_by: callerUser.id,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`User created: ${newUser.user.id}`);

    // Update or create profile (trigger may have already created it)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: newUser.user.id,
        first_name: 'Temporary',
        last_name: 'User',
        hire_date: new Date().toISOString().split('T')[0],
        status: 'active',
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating/updating profile:', profileError);
      // Cleanup: delete the user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: 'Failed to create profile' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Assign role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role });

    if (roleError) {
      console.error('Error assigning role:', roleError);
    }

    // Generate account code
    const { data: codeResult } = await supabaseAdmin.rpc('generate_temp_account_code');
    const accountCode = codeResult || `TEMP-${Date.now()}`;

    // Store temporary account record
    const { data: tempAccount, error: tempError } = await supabaseAdmin
      .from('temporary_accounts')
      .insert({
        account_code: accountCode,
        generated_email: email,
        plain_password_display: password, // Will be shown once then cleared
        validity_hours: validityHours,
        valid_until: validUntil,
        auth_user_id: newUser.user.id,
        profile_id: profile.id,
        created_by: callerUser.id,
        notes,
        status: 'active',
      })
      .select()
      .single();

    if (tempError) {
      console.error('Error creating temp account record:', tempError);
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: 'Failed to create account record' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Temporary account created successfully: ${accountCode}`);

    return new Response(JSON.stringify({
      success: true,
      account: {
        id: tempAccount.id,
        accountCode,
        email,
        password, // Return password for one-time display
        validUntil,
        validityHours,
        role,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-temporary-account:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

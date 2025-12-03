import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptInviteRequest {
  token: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { token, password }: AcceptInviteRequest = await req.json();

    if (!token || !password) {
      return new Response(
        JSON.stringify({ error: "Token and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate invite token
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("pending_invites")
      .select("*")
      .eq("invite_token", token)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (inviteError || !invite) {
      console.error("Invalid invite token:", inviteError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired invitation" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Valid invite found for:", invite.email);

    let userId: string;

    // Try to create user first - if they exist, we'll handle it
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: invite.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: invite.first_name,
        last_name: invite.last_name,
        invite_token: token,
      },
    });

    if (createError) {
      console.log("Create user error:", createError.message);
      
      // If user already exists, try to update their password instead
      if (createError.message?.includes("already been registered") || 
          createError.message?.includes("email_exists")) {
        console.log("User already exists, attempting to update password...");
        
        // Get user by email using a different approach
        const { data: usersData, error: listError } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('user_id', (
            await supabaseAdmin.auth.admin.listUsers({ 
              filter: `email.eq.${invite.email}` 
            })
          ).data?.users?.[0]?.id)
          .single();

        // Try to find user by iterating (fallback for broken listUsers)
        let existingUserId: string | null = null;
        
        try {
          // Use getUserById won't work, try to update by email directly
          const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            '', // We don't have the ID yet
            { password: password }
          );
        } catch (e) {
          // Expected to fail, we need another approach
        }

        // Since listUsers is broken, create a workaround:
        // Look up the user via the invite's email in our profiles table
        const { data: profileData } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .limit(100);
        
        // Get all users and find matching email
        const { data: allUsersResp } = await supabaseAdmin.auth.admin.listUsers();
        if (allUsersResp?.users) {
          const matchingUser = allUsersResp.users.find(u => u.email === invite.email);
          if (matchingUser) {
            existingUserId = matchingUser.id;
          }
        }

        if (existingUserId) {
          // Update the existing user's password
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUserId,
            { 
              password: password,
              email_confirm: true,
              user_metadata: {
                first_name: invite.first_name,
                last_name: invite.last_name,
                invite_token: token,
              },
            }
          );

          if (updateError) {
            console.error("Error updating existing user:", updateError);
            return new Response(
              JSON.stringify({ error: "Failed to update account. Please contact support." }),
              { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }

          console.log("Updated existing user password:", existingUserId);
          userId = existingUserId;
        } else {
          // Cannot find user - return helpful error
          return new Response(
            JSON.stringify({ error: "Account exists but cannot be updated. Please contact support or try logging in with your existing password." }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      } else {
        // Some other error
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: createError.message || "Failed to create user account" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } else if (newUser?.user) {
      console.log("New user created:", newUser.user.id);
      userId = newUser.user.id;
    } else {
      return new Response(
        JSON.stringify({ error: "Failed to create user account" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("User ready with ID:", userId);

    // Update invite status to accepted
    await supabaseAdmin
      .from("pending_invites")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", invite.id);

    console.log("Invite marked as accepted");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account created successfully",
        email: invite.email,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in accept-staff-invite:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@2.1.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  initialRole: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const authToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authToken);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is super_admin
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isSuperAdmin = roles?.some(r => r.role === "super_admin");
    if (!isSuperAdmin) {
      throw new Error("Only super admins can send invites");
    }

    const { email, firstName, lastName, phone, initialRole }: InviteRequest = await req.json();

    console.log("Processing invite for:", email);

    // Check if email already exists
    const { data: existingUser } = await supabaseClient.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === email);

    if (userExists) {
      return new Response(
        JSON.stringify({ error: "User with this email already exists" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Upsert invite atomically to avoid unique constraint races
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    let invite: any = null;
    let inviteError: any = null;

    const upsertResp = await supabaseClient
      .from("pending_invites")
      .upsert(
        {
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          initial_role: initialRole,
          invited_by: user.id,
          invite_token: inviteToken,
          status: "pending",
          expires_at: expiresAt,
        },
        { onConflict: "email" }
      )
      .select()
      .single();

    invite = upsertResp.data;
    inviteError = upsertResp.error;

    // Fallback: if unique constraint still triggers due to race, perform an explicit update
    if (inviteError && String(inviteError.message || '').includes('duplicate key value')) {
      const updateResp = await supabaseClient
        .from("pending_invites")
        .update({
          first_name: firstName,
          last_name: lastName,
          phone,
          initial_role: initialRole,
          invited_by: user.id,
          invite_token: inviteToken,
          status: "pending",
          expires_at: expiresAt,
        })
        .eq("email", email)
        .select()
        .single();

      invite = updateResp.data;
      inviteError = updateResp.error;
    }

    if (inviteError) throw inviteError;

    console.log("Invite created:", invite.id);

    // Generate invite link
    const inviteUrl = `${req.headers.get("origin")}/accept-invite?token=${inviteToken}`;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "NCG Speed Transport <onboarding@resend.dev>",
      to: [email],
      subject: "You've been invited to NCG Speed Transport Management System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to NCG Speed Transport</h2>
          <p>Hi ${firstName},</p>
          <p>You've been invited to join the NCG Speed Transport Management System as a <strong>${initialRole}</strong>.</p>
          <p>To accept your invitation and set up your account, please click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This invitation will expire in 7 days. If you didn't expect this invitation, 
            you can safely ignore this email.
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Or copy and paste this link: <br/>
            ${inviteUrl}
          </p>
        </div>
      `,
    });

    console.log("Email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation sent successfully",
        inviteId: invite.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-staff-invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

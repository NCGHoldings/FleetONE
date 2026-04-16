import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, email, otp, portalAccessId } = await req.json();

    if (action === "send_otp") {
      if (!email || typeof email !== "string" || email.length > 255) {
        return new Response(JSON.stringify({ error: "Invalid email" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: accessData, error: accessError } = await supabase
        .from("customer_portal_access")
        .select("id, customer_id, email, is_active")
        .eq("email", email.toLowerCase().trim())
        .eq("is_active", true)
        .single();

      if (accessError || !accessData) {
        return new Response(JSON.stringify({ error: "Email not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate secure OTP
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      const generatedOtp = String(100000 + (array[0] % 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await supabase
        .from("customer_portal_access")
        .update({ otp_code: generatedOtp, otp_expires_at: expiresAt })
        .eq("id", accessData.id);

      // TODO: Send OTP via email (Resend/Brevo)
      console.log(`OTP generated for ${email}`);

      return new Response(JSON.stringify({ 
        portalAccessId: accessData.id,
        message: "OTP sent" 
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "verify_otp") {
      if (!otp || !portalAccessId) {
        return new Response(JSON.stringify({ error: "Missing OTP or session" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: accessData, error: accessError } = await supabase
        .from("customer_portal_access")
        .select(`
          id, customer_id, email, otp_code, otp_expires_at, login_count,
          customers (customer_name, company_id, companies (company_name))
        `)
        .eq("id", portalAccessId)
        .single();

      if (accessError || !accessData) {
        return new Response(JSON.stringify({ error: "Session expired" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (accessData.otp_code !== otp) {
        return new Response(JSON.stringify({ error: "Invalid OTP" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(accessData.otp_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "OTP expired" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create session
      const sessionToken = crypto.randomUUID();
      const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await supabase.from("customer_portal_sessions").insert({
        portal_access_id: accessData.id,
        session_token: sessionToken,
        expires_at: sessionExpiry,
      });

      // Update login info, clear OTP
      await supabase
        .from("customer_portal_access")
        .update({
          last_login_at: new Date().toISOString(),
          login_count: (accessData.login_count || 0) + 1,
          otp_code: null,
          otp_expires_at: null,
        })
        .eq("id", accessData.id);

      const customerData = accessData.customers as any;

      return new Response(JSON.stringify({
        customerId: accessData.customer_id,
        customerName: customerData?.customer_name || "Customer",
        email: accessData.email,
        sessionToken,
        companyName: customerData?.companies?.company_name || "Company",
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Portal auth error:", error);
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

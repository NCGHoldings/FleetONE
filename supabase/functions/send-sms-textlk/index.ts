import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Text.lk API Endpoint
const TEXTLK_API_URL = "https://app.text.lk/api/v3/sms/send";

Deno.serve(async (req: Request) => {
  // 1. Get secrets
  const apiToken = Deno.env.get("TEXTLK_API_TOKEN");
  const senderId = Deno.env.get("TEXTLK_SENDER_ID") || "FleetONE";

  if (!apiToken) {
    console.error("Missing TEXTLK_API_TOKEN");
    return new Response(JSON.stringify({ error: "Provider configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    console.log("SMS Hook Payload:", JSON.stringify(payload, null, 2));

    const { user, sms } = payload;
    const phone = user?.phone;
    const otp = sms?.otp;

    if (!phone || !otp) {
      return new Response(JSON.stringify({ error: "Missing phone or OTP in payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Format request for text.lk
    // Ensure phone is in the correct format (e.g., 947...)
    const cleanPhone = phone.replace(/\D/g, "");

    const body = {
      recipient: cleanPhone,
      sender_id: senderId,
      type: "plain",
      message: `Your FleetONE security code is: ${otp}. Valid for 5 minutes.`,
    };

    console.log(`Sending SMS to ${cleanPhone} via text.lk...`);

    const response = await fetch(TEXTLK_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    console.log("text.lk response:", JSON.stringify(result));

    if (!response.ok) {
      throw new Error(result.message || "Failed to send SMS via text.lk");
    }

    return new Response(JSON.stringify({ status: "success", provider_response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("SMS Hook Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

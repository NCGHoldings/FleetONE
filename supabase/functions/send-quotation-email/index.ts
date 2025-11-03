import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachment?: {
    filename: string;
    contentBase64: string;
    contentType: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📧 === EMAIL REQUEST RECEIVED ===`);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if API key exists
    if (!BREVO_API_KEY) {
      console.error(`[${timestamp}] ❌ BREVO_API_KEY not found in environment variables`);
      throw new Error('BREVO_API_KEY is not configured. Please add it in Supabase Edge Function secrets.');
    }
    
    console.log(`[${timestamp}] ✅ BREVO_API_KEY found, length:`, BREVO_API_KEY.length);
    console.log(`[${timestamp}] 🔑 API key starts with:`, BREVO_API_KEY.substring(0, 10) + '...');
    
    // Validate API key format (Brevo REST API keys should start with 'xkeysib-')
    if (!BREVO_API_KEY.startsWith('xkeysib-')) {
      console.error(`[${timestamp}] ⚠️ WARNING: API key doesn't start with 'xkeysib-'. This might be an SMTP key instead of a REST API key.`);
      console.error(`[${timestamp}] Please get a REST API key from: https://app.brevo.com/settings/keys/api`);
    }
    
    const body = await req.json();
    console.log(`[${timestamp}] 📋 Request body keys:`, Object.keys(body));
    console.log(`[${timestamp}] 👤 Recipient:`, body.to);
    console.log(`[${timestamp}] 📝 Subject:`, body.subject);
    console.log(`[${timestamp}] 📎 Has attachment:`, !!body.attachment);
    console.log(`[${timestamp}] 📊 Attachment size:`, body.attachment?.contentBase64?.length || 0, 'bytes');

    const { to, subject, text, html, attachment }: EmailRequest = body;

    // Validation
    if (!to) {
      console.error(`[${timestamp}] ❌ Missing recipient email`);
      throw new Error('Recipient email is required');
    }
    if (!subject) {
      console.error(`[${timestamp}] ❌ Missing email subject`);
      throw new Error('Email subject is required');
    }

    console.log(`[${timestamp}] 🔨 Building email data for Brevo...`);
    const brevoPayload: any = {
      sender: {
        name: "NCG Express",
        email: "noreply@ncgexpress.com"
      },
      to: [
        {
          email: to,
          name: to.split('@')[0]
        }
      ],
      subject,
      htmlContent: html || `<p>${text || 'Please find your quotation attached.'}</p>`,
    };

    if (attachment) {
      brevoPayload.attachment = [
        {
          content: attachment.contentBase64,
          name: attachment.filename
        }
      ];
      console.log(`[${timestamp}] 📎 Attachment added:`, attachment.filename);
    }

    console.log(`[${timestamp}] 📤 Sending email via Brevo...`);
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(brevoPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[${timestamp}] ❌ Brevo API error:`, errorData);
      throw new Error(`Brevo API error: ${JSON.stringify(errorData)}`);
    }

    const emailResponse = await response.json();
    console.log(`[${timestamp}] 📬 Brevo response:`, emailResponse);

    console.log(`[${timestamp}] ✅ === EMAIL SENT SUCCESSFULLY ===`);
    return new Response(JSON.stringify({
      success: true,
      data: emailResponse,
      timestamp
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error(`[${timestamp}] ❌ === EMAIL SEND FAILED ===`);
    console.error(`[${timestamp}] Error details:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
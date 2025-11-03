import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.1.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    console.log(`[${timestamp}] 🔨 Building email data...`);
    const emailData: any = {
      from: "NCG Express <onboarding@resend.dev>",
      to: [to],
      subject,
      text: text || "Please find your quotation attached.",
      html: html || `<p>Please find your quotation attached.</p>`,
    };

    if (attachment) {
      emailData.attachments = [
        {
          filename: attachment.filename,
          content: attachment.contentBase64,
          type: attachment.contentType,
        }
      ];
      console.log(`[${timestamp}] 📎 Attachment added:`, attachment.filename);
    }

    console.log(`[${timestamp}] 📤 Sending email via Resend...`);
    const emailResponse = await resend.emails.send(emailData);
    console.log(`[${timestamp}] 📬 Resend response:`, emailResponse);

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
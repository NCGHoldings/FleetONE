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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, text, html, attachment }: EmailRequest = await req.json();

    console.log('Sending email to:', to, 'with subject:', subject);

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
      console.log('Attachment added:', attachment.filename);
    }

    const emailResponse = await resend.emails.send(emailData);

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in send-quotation-email function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
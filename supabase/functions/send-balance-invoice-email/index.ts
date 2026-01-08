import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BalanceInvoiceEmailRequest {
  quotationNo: string;
  customerEmail: string;
  customerName: string;
  balanceDue: number;
  invoiceNo: string;
  pdfBase64: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      quotationNo,
      customerEmail,
      customerName,
      balanceDue,
      invoiceNo,
      pdfBase64,
    }: BalanceInvoiceEmailRequest = await req.json();

    console.log("Sending balance invoice email to:", customerEmail);

    const emailResponse = await resend.emails.send({
      from: "NCG Express <noreply@ncgexpress.lk>",
      to: [customerEmail],
      subject: `Balance Invoice ${invoiceNo} - LKR ${balanceDue.toLocaleString()} Due`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .content {
                background: #f9fafb;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .invoice-details {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #667eea;
              }
              .amount {
                font-size: 32px;
                font-weight: bold;
                color: #667eea;
                text-align: center;
                margin: 20px 0;
              }
              .bank-details {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .bank-details h3 {
                color: #667eea;
                margin-top: 0;
              }
              .bank-info {
                display: flex;
                justify-content: space-between;
                margin: 10px 0;
                padding: 10px;
                background: #f3f4f6;
                border-radius: 4px;
              }
              .footer {
                text-align: center;
                color: #666;
                font-size: 14px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
              }
              .button {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0;">Balance Invoice</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">NCG Express (Private) Limited</p>
            </div>
            
            <div class="content">
              <p>Dear ${customerName},</p>
              
              <p>Thank you for choosing NCG Express for your recent trip. We are pleased to provide you with the final balance invoice for:</p>
              
              <div class="invoice-details">
                <p><strong>Quotation No:</strong> ${quotationNo}</p>
                <p><strong>Invoice No:</strong> ${invoiceNo}</p>
                <p style="margin: 0;"><strong>Invoice Date:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
              </div>

              <div class="amount">
                LKR ${balanceDue.toLocaleString()}
              </div>

              <p style="text-align: center; color: #666;">
                <strong>Amount Due</strong>
              </p>

              <p>This invoice includes any post-trip adjustments such as extra kilometers and additional charges. Please find the detailed invoice attached to this email.</p>

              <div class="bank-details">
                <h3>Payment Instructions</h3>
                <p>Please make the payment to the following bank account:</p>
                
                <div class="bank-info">
                  <span><strong>Bank:</strong></span>
                  <span>Commercial Bank</span>
                </div>
                <div class="bank-info">
                  <span><strong>Account Name:</strong></span>
                  <span>NCG EXPRESS (PRIVATE) LIMITED</span>
                </div>
                <div class="bank-info">
                  <span><strong>Account Number:</strong></span>
                  <span>2000511791</span>
                </div>
                <div class="bank-info">
                  <span><strong>Branch:</strong></span>
                  <span>Nugegoda</span>
                </div>
              </div>

              <p><strong>Important:</strong> Please send us the payment receipt after making the payment. You can reply to this email or contact us at 0777556322.</p>

              <div class="footer">
                <p><strong>NCG EXPRESS (PRIVATE) LIMITED</strong></p>
                <p>157/1, Kebellaowita, Wenwellkola, Polgasowita</p>
                <p>Phone: 0777556322</p>
                <p style="font-size: 12px; color: #999; margin-top: 15px;">
                  This is an automated email. Please do not reply directly to this message.<br>
                  For inquiries, please contact us at the phone number above.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      attachments: [
        {
          filename: `${invoiceNo}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-balance-invoice-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

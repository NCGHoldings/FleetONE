import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const WHATSAPP_API_URL = "https://graph.facebook.com/v21.0";
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
  customerPhone: string;
  customerName: string;
  quotationNo: string;
  pickupLocation: string;
  dropLocation: string;
  numberOfBuses: number;
  busType: string;
  totalAmount: number;
  pdfBase64: string;
}

const handler = async (req: Request): Promise<Response> => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📱 === WHATSAPP SEND REQUEST RECEIVED ===`);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if API credentials exist
    if (!WHATSAPP_ACCESS_TOKEN) {
      console.error(`[${timestamp}] ❌ WHATSAPP_ACCESS_TOKEN not found`);
      throw new Error('WhatsApp API credentials not configured');
    }
    
    if (!WHATSAPP_PHONE_NUMBER_ID) {
      console.error(`[${timestamp}] ❌ WHATSAPP_PHONE_NUMBER_ID not found`);
      throw new Error('WhatsApp Phone Number ID not configured');
    }

    console.log(`[${timestamp}] ✅ WhatsApp credentials found`);

    const body = await req.json();
    console.log(`[${timestamp}] 📋 Request body keys:`, Object.keys(body));

    const {
      customerPhone,
      customerName,
      quotationNo,
      pickupLocation,
      dropLocation,
      numberOfBuses,
      busType,
      totalAmount,
      pdfBase64
    }: WhatsAppRequest = body;

    // Validation
    if (!customerPhone) {
      console.error(`[${timestamp}] ❌ Missing customer phone`);
      throw new Error('Customer phone number is required');
    }
    if (!pdfBase64) {
      console.error(`[${timestamp}] ❌ Missing PDF data`);
      throw new Error('PDF data is required');
    }

    // Format phone number (ensure it starts with country code)
    let formattedPhone = customerPhone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
    if (!formattedPhone.startsWith('+')) {
      // Assume Sri Lanka (+94) if no country code
      formattedPhone = '+94' + formattedPhone.replace(/^0+/, '');
    }
    console.log(`[${timestamp}] 📞 Formatted phone:`, formattedPhone);

    // Step 1: Upload PDF to WhatsApp Media (memory-efficient streaming)
    console.log(`[${timestamp}] 📤 Uploading PDF to WhatsApp...`);
    
    // Decode base64 in chunks to avoid memory issues
    const binaryString = atob(pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const formData = new FormData();
    const pdfFile = new File([bytes], `Quotation_${quotationNo}.pdf`, { type: 'application/pdf' });
    formData.append('file', pdfFile);
    formData.append('messaging_product', 'whatsapp');

    const uploadResponse = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/media`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      console.error(`[${timestamp}] ❌ WhatsApp media upload error:`, errorData);
      throw new Error(`WhatsApp media upload failed: ${JSON.stringify(errorData)}`);
    }

    const uploadData = await uploadResponse.json();
    const mediaId = uploadData.id;
    console.log(`[${timestamp}] ✅ PDF uploaded, Media ID:`, mediaId);

    // Step 2: Send message with PDF
    console.log(`[${timestamp}] 💬 Sending WhatsApp message...`);
    
    const messageBody = `🚌 *NCG Express - Special Hire Quotation*

Dear ${customerName},

Thank you for your interest in NCG Express Special Hire services!

📋 *Quotation No:* ${quotationNo}
📍 *Route:* ${pickupLocation} → ${dropLocation}
🚌 *Buses:* ${numberOfBuses} x ${busType}
💰 *Total Amount:* Rs. ${totalAmount.toLocaleString()}

Please find your detailed quotation document attached.

For any questions, please contact us:
📞 Phone: +94 77 123 4567
✉️ Email: info@ncgexpress.com

Thank you for choosing NCG Express! 🙏

_This is an automated message from NCG Holdings (Private) Limited_`;

    const messagePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "document",
      document: {
        id: mediaId,
        caption: messageBody,
        filename: `NCG_Quotation_${quotationNo}.pdf`
      }
    };

    const messageResponse = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      }
    );

    if (!messageResponse.ok) {
      const errorData = await messageResponse.json();
      console.error(`[${timestamp}] ❌ WhatsApp message send error:`, errorData);
      throw new Error(`WhatsApp message failed: ${JSON.stringify(errorData)}`);
    }

    const messageData = await messageResponse.json();
    console.log(`[${timestamp}] ✅ WhatsApp message sent:`, messageData);

    console.log(`[${timestamp}] ✅ === WHATSAPP SEND COMPLETED ===`);
    return new Response(JSON.stringify({
      success: true,
      data: messageData,
      timestamp,
      phoneNumber: formattedPhone
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: unknown) {
    console.error(`[${timestamp}] ❌ === WHATSAPP SEND FAILED ===`);
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

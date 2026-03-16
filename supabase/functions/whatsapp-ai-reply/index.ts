import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ────────────────────────────────────────────
// WhatsApp AI Auto-Reply Engine
// Handles missed call follow-ups via WhatsApp text
// Supports: English, Sinhala (සිංහල), Tamil (தமிழ்)
// ────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const {
      message,
      phone_number,        // Customer's WhatsApp number
      contact_name,        // Customer's display name (if available)
      is_missed_call,      // true if this is the initial missed call trigger
      language = 'auto',
    } = body;

    if (!phone_number) {
      return new Response(
        JSON.stringify({ error: 'phone_number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Find or create session by phone number ──
    let session: any = null;
    const { data: existingSession } = await supabase
      .from('ai_chat_sessions')
      .select('*')
      .eq('visitor_phone', phone_number)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingSession) {
      session = existingSession;
    } else {
      const { data: newSession, error } = await supabase
        .from('ai_chat_sessions')
        .insert({
          session_token: `wa_${phone_number}_${Date.now()}`,
          visitor_name: contact_name || null,
          visitor_phone: phone_number,
          preferred_language: language === 'auto' ? 'en' : language,
          status: 'active',
        })
        .select()
        .single();
      if (error) throw error;
      session = newSession;
    }

    // ── If missed call, log it and generate greeting ──
    if (is_missed_call) {
      // Log the missed call
      try {
        await supabase.from('whatsapp_missed_calls').insert({
          phone_number,
          contact_name: contact_name || null,
          session_id: session.id,
          status: 'ai_handling',
        });
      } catch (e) {
        console.log('Missed call log note:', e.message);
      }
    }

    const userMessage = is_missed_call
      ? `[SYSTEM: Customer just called via WhatsApp but the call was missed. Send a friendly greeting, apologize for missing the call, and offer to help with their inquiry via text. Be warm and proactive.]`
      : message;

    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Save user message (skip system triggers) ──
    if (!is_missed_call) {
      await supabase.from('ai_chat_messages').insert({
        session_id: session.id,
        role: 'user',
        content: userMessage.slice(0, 5000),
        language: language,
      });
    }

    // ── Get conversation history ──
    const { data: history } = await supabase
      .from('ai_chat_messages')
      .select('role, content')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
      .limit(20);

    // ── Fetch live data from database ──
    const [busTypes, rateCards, yutongModels, sinotruckModels, knowledgeBase] = await Promise.all([
      supabase.from('bus_types').select('name, capacity, features, avg_km_per_l').eq('is_active', true),
      supabase.from('hire_rate_cards').select('hire_type, from_km, to_km, rate_per_km_lkr, flat_fee_lkr, overtime_rate_lkr_per_hour, overnight_charge_lkr_per_day, standard_hours, exceeding_km_rate_lkr, bus_type_id').eq('is_active', true),
      supabase.from('yutong_bus_models').select('model_name, bus_name, capacity, seating_capacity, base_price, unit_price, engine, engine_type, fuel_type, transmission, features, dimensions, fuel_tank_capacity_l, condition').eq('is_active', true),
      supabase.from('sinotruck_truck_models').select('model_name, truck_name, base_price, capacity_kw, horsepower, engine_type, fuel_type, transmission_type, payload_capacity, gvw_gcw, condition, seating_capacity, body_type, max_speed').eq('is_active', true),
      supabase.from('ai_chatbot_knowledge').select('category, question_en, question_si, question_ta, answer_en, answer_si, answer_ta, tags').eq('is_active', true),
    ]);

    let lightVehicleModels: any = { data: [] };
    try {
      lightVehicleModels = await supabase.from('lightvehicle_models').select('model_name, brand, vehicle_name, base_price, fuel_type, transmission, engine_capacity, seating_capacity, condition, features').eq('is_active', true);
    } catch { /* table may not exist */ }

    // ── Get Gemini API key ──
    const { data: apiKeySetting } = await supabase
      .from('inquiry_hub_settings')
      .select('setting_value')
      .eq('setting_key', 'gemini_api_key')
      .single();

    const geminiApiKey = apiKeySetting?.setting_value?.api_key || Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      const fallback = '👋 Thank you for calling NCG Holdings! We missed your call. Please call us again or reply here — our team will get back to you shortly. 🙏';
      return new Response(
        JSON.stringify({ response: fallback, session_token: session.session_token }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Build system prompt ──
    const systemPrompt = buildWhatsAppPrompt(
      busTypes.data || [],
      rateCards.data || [],
      yutongModels.data || [],
      sinotruckModels.data || [],
      lightVehicleModels.data || [],
      knowledgeBase.data || [],
      language,
      contact_name,
    );

    // ── Build message history for Gemini ──
    const geminiContents = [];
    if (history && history.length > 0) {
      for (const msg of history) {
        geminiContents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }
    // Add current message
    geminiContents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    // ── Call Gemini API ──
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: geminiContents,
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024, // Shorter for WhatsApp
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
        ],
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', session_token: session.session_token }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
      || 'Thank you for contacting NCG Holdings. Our team will get back to you shortly. 🙏';

    const detectedLang = detectLanguage(aiResponse);

    // ── Save assistant message ──
    await supabase.from('ai_chat_messages').insert({
      session_id: session.id,
      role: 'assistant',
      content: aiResponse,
      language: detectedLang,
    });

    // ── Update session ──
    await supabase
      .from('ai_chat_sessions')
      .update({ preferred_language: detectedLang, updated_at: new Date().toISOString() })
      .eq('id', session.id);

    return new Response(
      JSON.stringify({
        response: aiResponse,
        session_token: session.session_token,
        language: detectedLang,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('WhatsApp AI reply error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ────────────────────────────────────────────
// WhatsApp-optimized System Prompt
// ────────────────────────────────────────────

function buildWhatsAppPrompt(
  busTypes: any[],
  rateCards: any[],
  yutongModels: any[],
  sinotruckModels: any[],
  lightVehicleModels: any[],
  knowledgeBase: any[],
  language: string,
  contactName?: string,
): string {
  const langInstruction = language === 'si'
    ? 'ALWAYS respond in Sinhala (සිංහල). Use natural, conversational Sinhala.'
    : language === 'ta'
    ? 'ALWAYS respond in Tamil (தமிழ்). Use natural, conversational Tamil.'
    : language === 'auto'
    ? 'Detect the language the user writes in and respond in that SAME language. Default to English if unsure.'
    : 'Respond in English.';

  const busTypesStr = busTypes.map(b =>
    `• ${b.name}: ${b.capacity} seats, ${b.avg_km_per_l || 'N/A'} km/L`
  ).join('\n') || 'No bus types available';

  const rateCardsStr = rateCards.map(r =>
    `• ${r.hire_type} (${r.from_km}-${r.to_km || '∞'} km): ` +
    `${r.flat_fee_lkr ? `Flat: LKR ${r.flat_fee_lkr?.toLocaleString()}, ` : ''}` +
    `${r.rate_per_km_lkr ? `Rate/km: LKR ${r.rate_per_km_lkr}` : ''}`
  ).join('\n') || 'No rate cards';

  const yutongStr = yutongModels.map(y =>
    `• ${y.model_name}${y.bus_name ? ` (${y.bus_name})` : ''}: ${y.capacity} cap, ` +
    `LKR ${y.base_price?.toLocaleString()}, ${y.fuel_type || 'N/A'}, ${y.condition || 'N/A'}`
  ).join('\n') || 'No Yutong models';

  const sinotruckStr = sinotruckModels.map(s =>
    `• ${s.model_name}: ${s.horsepower || 'N/A'} HP, LKR ${s.base_price?.toLocaleString()}, ${s.fuel_type || 'N/A'}`
  ).join('\n') || 'No Sinotruck models';

  const lvStr = lightVehicleModels.map((lv: any) =>
    `• ${lv.brand || ''} ${lv.vehicle_name || lv.model_name}: LKR ${lv.base_price?.toLocaleString()}, ${lv.fuel_type || 'N/A'}`
  ).join('\n') || 'No light vehicles';

  const kbStr = knowledgeBase.map(kb => {
    const q = language === 'si' ? (kb.question_si || kb.question_en) :
              language === 'ta' ? (kb.question_ta || kb.question_en) :
              kb.question_en;
    const a = language === 'si' ? (kb.answer_si || kb.answer_en) :
              language === 'ta' ? (kb.answer_ta || kb.answer_en) :
              kb.answer_en;
    return `Q: ${q}\nA: ${a}`;
  }).join('\n\n') || '';

  return `You are the WhatsApp AI assistant for NCG Holdings (Pvt) Ltd, Sri Lanka's leading transportation and vehicle company.

CONTEXT: You are chatting with a customer on WhatsApp${contactName ? ` named ${contactName}` : ''}. This conversation started because their WhatsApp call was missed, and you're following up to help them.

LANGUAGE: ${langInstruction}

WHATSAPP STYLE RULES:
1. Keep messages SHORT — max 3-4 paragraphs per reply
2. Use emojis naturally (not excessively) 🚌🚛🚗
3. Use bullet points for lists, not long paragraphs
4. Be warm, friendly, and proactive
5. Ask ONE question at a time to guide the conversation
6. Offer specific products/prices from your database
7. If the customer seems ready to buy/book, collect: Name, Phone, Location, Date, Requirements
8. Tell them a human agent will finalize the deal once details are collected

COMPANY INFO:
• NCG Holdings (Pvt) Ltd — Sri Lanka
• Contact: +94 11 234 5678 | info@ncgholdings.lk
• Currency: LKR (Sri Lankan Rupees)

═══ SPECIAL BUS HIRE ═══
Bus Types:
${busTypesStr}

Rate Cards:
${rateCardsStr}

Hire types: School trips, Corporate, Weddings, Tours, Pilgrimages, Airport transfers

═══ YUTONG BUS SALES ═══
Authorized dealer in Sri Lanka:
${yutongStr}

═══ SINOTRUCK SALES ═══
Authorized dealer in Sri Lanka:
${sinotruckStr}

═══ LIGHT VEHICLE SALES ═══
${lvStr}

${kbStr ? `═══ FAQ ═══\n${kbStr}` : ''}

CRITICAL RULES:
• Never make up prices — only use data above
• If unsure, offer to connect with a human agent
• For bookings: collect pickup, drop, date, passengers, bus type preference
• For vehicle sales: collect budget, preferred model, intended use
• Always be honest and helpful`;
}

function detectLanguage(text: string): string {
  const sinhalaCount = (text.match(/[\u0D80-\u0DFF]/g) || []).length;
  const tamilCount = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
  if (sinhalaCount > tamilCount && sinhalaCount > 5) return 'si';
  if (tamilCount > sinhalaCount && tamilCount > 5) return 'ta';
  if (/[\u0D80-\u0DFF]/.test(text)) return 'si';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  return 'en';
}

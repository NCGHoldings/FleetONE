import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ────────────────────────────────────────────
// NCG Holdings AI Chatbot v3 — Smart Data Agent
// Gemini Function Calling + Real-time DB Lookups
// Supports: English, Sinhala (සිංහල), Tamil (தமிழ்)
// ────────────────────────────────────────────

// ── Gemini Tool Definitions ──
const TOOL_DEFINITIONS = [
  {
    name: "lookup_student_fees",
    description: "Look up school bus fees, payment balance, and student details by admission number. Use this when a parent or customer asks about school fees, monthly charges, outstanding balance, or payment status for a specific student. The admission number may be prefixed or in various formats (e.g., N12345, 12345, ADM-12345).",
    parameters: {
      type: "OBJECT",
      properties: {
        admission_number: {
          type: "STRING",
          description: "The student admission number. Extract this from the user message. Examples: N12345, 12345, ADM-001"
        }
      },
      required: ["admission_number"]
    }
  },
  {
    name: "lookup_payment_history",
    description: "Look up recent payment history for a student by admission number. Use this when someone asks about payment records, receipts, past payments, or wants to verify if a payment was made.",
    parameters: {
      type: "OBJECT",
      properties: {
        admission_number: {
          type: "STRING",
          description: "The student admission number"
        },
        limit: {
          type: "NUMBER",
          description: "Number of recent payments to return, default 5"
        }
      },
      required: ["admission_number"]
    }
  },
  {
    name: "estimate_hire_cost",
    description: "Estimate the cost of hiring a bus for a trip. Use this when someone asks about bus hire pricing, trip costs, or wants a quotation for a journey between two locations. Extract the from/to locations and bus type preference from the message.",
    parameters: {
      type: "OBJECT",
      properties: {
        from_location: {
          type: "STRING",
          description: "Starting location/city for the trip"
        },
        to_location: {
          type: "STRING",
          description: "Destination location/city for the trip"
        },
        bus_type: {
          type: "STRING",
          description: "Preferred bus type: 'super_luxury_ac', 'luxury_ac', 'semi_luxury', 'non_ac', 'coaster' or empty for all options"
        },
        num_days: {
          type: "NUMBER",
          description: "Number of days for the trip, default 1"
        }
      },
      required: ["from_location", "to_location"]
    }
  },
  {
    name: "search_system_data",
    description: "Search across the entire NCG system for information. Use this as a general-purpose lookup when the user asks about anything in the system: vehicles, drivers, routes, bookings, maintenance, complaints, expenses, invoices, quotations, fleet details, or any other operational data. This searches multiple tables.",
    parameters: {
      type: "OBJECT",
      properties: {
        search_type: {
          type: "STRING",
          description: "Type of data to search: 'vehicle', 'driver', 'route', 'booking', 'quotation', 'complaint', 'maintenance', 'expense', 'school_branch', 'fleet_status', 'trip', 'invoice'"
        },
        search_term: {
          type: "STRING",
          description: "The search term — could be a vehicle number, name, route code, booking ID, etc."
        },
        filters: {
          type: "STRING",
          description: "Optional additional filter context like date range, status, etc."
        }
      },
      required: ["search_type"]
    }
  },
  {
    name: "get_dashboard_summary",
    description: "Get a summary of key business metrics. Use when someone asks about overall status, today's numbers, fleet health, total students, revenue, or any dashboard-level information.",
    parameters: {
      type: "OBJECT",
      properties: {
        metric_type: {
          type: "STRING",
          description: "Type of summary: 'fleet', 'school_bus', 'special_hire', 'finance', 'all'"
        }
      },
      required: ["metric_type"]
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return errorResponse('Server configuration error', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      return errorResponse('Invalid JSON body', 400);
    }

    const {
      message,
      session_token,
      language = 'auto',
      visitor_name,
      visitor_phone,
      visitor_email,
    } = body;

    if (!message || typeof message !== 'string') {
      return errorResponse('Message is required', 400);
    }

    console.log(`[AI-CHATBOT-v3] Message: "${message.slice(0, 80)}..." lang=${language}`);

    // ── Retrieve or create chat session ──
    let session: any = null;

    if (session_token) {
      try {
        const { data, error } = await supabase
          .from('ai_chat_sessions')
          .select('*')
          .eq('session_token', session_token)
          .single();
        if (!error && data) session = data;
      } catch (e) {
        console.error('[AI-CHATBOT-v3] Error finding session:', e);
      }
    }

    if (!session) {
      const newToken = session_token || crypto.randomUUID();
      try {
        const { data, error } = await supabase
          .from('ai_chat_sessions')
          .insert({
            session_token: newToken,
            visitor_name: visitor_name || null,
            visitor_phone: visitor_phone || null,
            visitor_email: visitor_email || null,
            preferred_language: language === 'auto' ? 'en' : language,
            status: 'active',
          })
          .select()
          .single();
        if (error) {
          console.error('[AI-CHATBOT-v3] Error creating session:', error);
          return errorResponse(`Session creation failed: ${error.message}`, 500);
        }
        session = data;
      } catch (e) {
        console.error('[AI-CHATBOT-v3] Session create exception:', e);
        return errorResponse('Failed to create chat session', 500);
      }
    }

    // ── Save user message ──
    try {
      await supabase.from('ai_chat_messages').insert({
        session_id: session.id,
        role: 'user',
        content: message.slice(0, 5000),
        language: language,
      });
    } catch (e) {
      console.error('[AI-CHATBOT-v3] Error saving user message:', e);
    }

    // ── Get conversation history (last 20 messages) ──
    let history: any[] = [];
    try {
      const { data } = await supabase
        .from('ai_chat_messages')
        .select('role, content')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true })
        .limit(20);
      history = data || [];
    } catch (e) {
      console.error('[AI-CHATBOT-v3] Error loading history:', e);
    }

    // ── Fetch static reference data ──
    let busTypes: any[] = [];
    let rateCards: any[] = [];
    let yutongModels: any[] = [];
    let sinotruckModels: any[] = [];
    let lightVehicleModels: any[] = [];
    let knowledgeBase: any[] = [];

    try {
      const results = await Promise.allSettled([
        supabase.from('bus_types').select('name, capacity, features, avg_km_per_l').eq('is_active', true),
        supabase.from('hire_rate_cards').select('hire_type, from_km, to_km, rate_per_km_lkr, flat_fee_lkr, overtime_rate_lkr_per_hour, overnight_charge_lkr_per_day, standard_hours, exceeding_km_rate_lkr, bus_type_id').eq('is_active', true),
        supabase.from('yutong_bus_models').select('model_name, bus_name, capacity, seating_capacity, base_price, unit_price, engine, engine_type, fuel_type, transmission, features, dimensions, fuel_tank_capacity_l, condition').eq('is_active', true),
        supabase.from('sinotruck_truck_models').select('model_name, truck_name, base_price, capacity_kw, horsepower, engine_type, fuel_type, transmission_type, payload_capacity, gvw_gcw, condition, seating_capacity, body_type, max_speed').eq('is_active', true),
        supabase.from('ai_chatbot_knowledge').select('category, question_en, question_si, question_ta, answer_en, answer_si, answer_ta, tags').eq('is_active', true),
      ]);

      if (results[0].status === 'fulfilled') busTypes = results[0].value.data || [];
      if (results[1].status === 'fulfilled') rateCards = results[1].value.data || [];
      if (results[2].status === 'fulfilled') yutongModels = results[2].value.data || [];
      if (results[3].status === 'fulfilled') sinotruckModels = results[3].value.data || [];
      if (results[4].status === 'fulfilled') knowledgeBase = results[4].value.data || [];
    } catch (e) {
      console.error('[AI-CHATBOT-v3] Error fetching reference data:', e);
    }

    // Try light vehicles (table may not exist)
    try {
      const { data } = await supabase.from('lightvehicle_models').select('model_name, brand, vehicle_name, base_price, fuel_type, transmission, engine_capacity, seating_capacity, condition, features').eq('is_active', true);
      lightVehicleModels = data || [];
    } catch { /* optional table */ }

    console.log(`[AI-CHATBOT-v3] Data loaded: bus=${busTypes.length}, rates=${rateCards.length}, yutong=${yutongModels.length}, sinotruck=${sinotruckModels.length}, kb=${knowledgeBase.length}`);

    // ── Get Gemini API key ──
    let geminiApiKey = Deno.env.get('GEMINI_API_KEY') || '';

    try {
      const { data: apiKeySetting } = await supabase
        .from('inquiry_hub_settings')
        .select('setting_value')
        .eq('setting_key', 'gemini_api_key')
        .single();

      if (apiKeySetting?.setting_value?.api_key) {
        geminiApiKey = apiKeySetting.setting_value.api_key;
      }
    } catch (e) {
      console.error('[AI-CHATBOT-v3] Error reading API key:', e);
    }

    if (!geminiApiKey) {
      const fallbackMsg = getFallbackResponse(language);
      await saveAssistantMessage(supabase, session.id, fallbackMsg, language);
      return jsonResponse({ response: fallbackMsg, session_token: session.session_token, language });
    }

    // ── Build system prompt ──
    const systemPrompt = buildSystemPrompt(busTypes, rateCards, yutongModels, sinotruckModels, lightVehicleModels, knowledgeBase, language);

    // ── Build message history for Gemini ──
    const geminiContents: any[] = [];
    for (const msg of history) {
      geminiContents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    // ── PASS 1: Call Gemini with Function Calling enabled ──
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];
    let geminiResult = await callGeminiWithTools(geminiApiKey, models, systemPrompt, geminiContents);

    if (!geminiResult.ok) {
      if (geminiResult.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Gemini API rate limit reached. Please wait 30 seconds and try again.', session_token: session.session_token }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return errorResponse(geminiResult.error || 'Failed to connect to Gemini', 502);
    }

    let aiResponse = '';
    const candidate = geminiResult.data?.candidates?.[0];

    if (!candidate) {
      aiResponse = 'I apologize, I could not generate a response. Please try again.';
    } else {
      // Check if Gemini wants to call a function
      const functionCall = candidate.content?.parts?.find((p: any) => p.functionCall);

      if (functionCall?.functionCall) {
        const { name: fnName, args: fnArgs } = functionCall.functionCall;
        console.log(`[AI-CHATBOT-v3] 🔧 Function call: ${fnName}(${JSON.stringify(fnArgs)})`);

        // ── Execute the database tool ──
        const toolResult = await executeToolCall(supabase, fnName, fnArgs || {});
        console.log(`[AI-CHATBOT-v3] 🔧 Tool result: ${JSON.stringify(toolResult).slice(0, 200)}...`);

        // ── PASS 2: Send tool result back to Gemini for natural language formatting ──
        const pass2Contents = [
          ...geminiContents,
          {
            role: 'model',
            parts: [{ functionCall: { name: fnName, args: fnArgs || {} } }]
          },
          {
            role: 'user',
            parts: [{
              functionResponse: {
                name: fnName,
                response: toolResult
              }
            }]
          }
        ];

        const pass2Result = await callGeminiWithTools(geminiApiKey, models, systemPrompt, pass2Contents);

        if (pass2Result.ok && pass2Result.data?.candidates?.[0]) {
          aiResponse = pass2Result.data.candidates[0].content?.parts?.[0]?.text || '';
        }

        if (!aiResponse) {
          // Fallback: format the tool result directly
          aiResponse = formatToolResultFallback(fnName, toolResult, language);
        }
      } else {
        // Direct text response (no function call needed)
        aiResponse = candidate.content?.parts?.[0]?.text
          || 'I apologize, I could not generate a response. Please try again.';
      }
    }

    const detectedLang = detectLanguage(aiResponse);
    console.log(`[AI-CHATBOT-v3] ✅ Response (${detectedLang}), length: ${aiResponse.length}`);

    // ── Save assistant message ──
    await saveAssistantMessage(supabase, session.id, aiResponse, detectedLang);

    // ── Update session ──
    try {
      await supabase
        .from('ai_chat_sessions')
        .update({ preferred_language: detectedLang, updated_at: new Date().toISOString() })
        .eq('id', session.id);
    } catch { /* non-critical */ }

    return jsonResponse({
      response: aiResponse,
      session_token: session.session_token,
      language: detectedLang,
    });

  } catch (error) {
    console.error('[AI-CHATBOT-v3] Unhandled error:', error);
    return errorResponse(`Unexpected error: ${error?.message || 'Unknown'}`, 500);
  }
});

// ────────────────────────────────────────────
// Gemini API Caller with Function Calling
// ────────────────────────────────────────────
async function callGeminiWithTools(
  apiKey: string,
  models: string[],
  systemPrompt: string,
  contents: any[]
): Promise<{ ok: boolean; data?: any; error?: string; status?: number }> {

  for (const model of models) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    console.log(`[AI-CHATBOT-v3] Trying model: ${model}...`);

    try {
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: contents,
          tools: [{
            functionDeclarations: TOOL_DEFINITIONS
          }],
          toolConfig: {
            functionCallingConfig: {
              mode: "AUTO"
            }
          },
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[AI-CHATBOT-v3] ✅ Model ${model} succeeded`);
        return { ok: true, data };
      }

      const status = response.status;
      console.error(`[AI-CHATBOT-v3] Model ${model} returned ${status}`);

      if (status === 429) {
        return { ok: false, error: 'Rate limit reached', status: 429 };
      }
      // Only retry with next model for 404 or 400
      if (status !== 404 && status !== 400) {
        const errText = await response.text();
        return { ok: false, error: errText.slice(0, 200), status };
      }
    } catch (e) {
      console.error(`[AI-CHATBOT-v3] Model ${model} fetch error:`, e);
      continue;
    }
  }

  return { ok: false, error: 'Failed to connect to any Gemini model' };
}

// ────────────────────────────────────────────
// Tool Execution Engine
// ────────────────────────────────────────────
async function executeToolCall(supabase: any, toolName: string, args: any): Promise<any> {
  try {
    switch (toolName) {
      case 'lookup_student_fees':
        return await toolLookupStudentFees(supabase, args);
      case 'lookup_payment_history':
        return await toolLookupPaymentHistory(supabase, args);
      case 'estimate_hire_cost':
        return await toolEstimateHireCost(supabase, args);
      case 'search_system_data':
        return await toolSearchSystemData(supabase, args);
      case 'get_dashboard_summary':
        return await toolGetDashboardSummary(supabase, args);
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (err: any) {
    console.error(`[AI-CHATBOT-v3] Tool ${toolName} error:`, err);
    return { error: `Tool execution failed: ${err.message}` };
  }
}

// ── Tool: Lookup Student Fees ──
async function toolLookupStudentFees(supabase: any, args: any) {
  const admNo = String(args.admission_number || '').trim().toUpperCase();
  if (!admNo) return { error: 'No admission number provided' };

  // Try exact match first, then partial match
  let { data: students, error } = await supabase
    .from('school_students')
    .select('admission_no, student_name, grade, fixed_monthly_amount, payment_balance, current_amount_due, payment_status, payment_amount, last_payment_date, route, pickup_point, dropoff_point, bus_reg_no, driver_name, driver_contact_no, parent_name, father_contact_no, mother_contact_no, care_taker_name, care_taker_contact_no, school_location, service_type, is_active, branch_id')
    .or(`admission_no.ilike.${admNo},admission_no.ilike.%${admNo}%`)
    .limit(5);

  if (error) {
    console.error('[AI-CHATBOT-v3] Student lookup error:', error);
    return { error: `Database error: ${error.message}` };
  }

  if (!students || students.length === 0) {
    return {
      found: false,
      message: `No student found with admission number "${admNo}". Please check the number and try again.`,
      admission_number_searched: admNo
    };
  }

  // Get branch name for the student
  const student = students[0];
  let branchName = '';
  if (student.branch_id) {
    try {
      const { data: branch } = await supabase
        .from('school_branches')
        .select('branch_name')
        .eq('id', student.branch_id)
        .single();
      branchName = branch?.branch_name || '';
    } catch { /* ignore */ }
  }

  return {
    found: true,
    student: {
      admission_no: student.admission_no,
      name: student.student_name,
      grade: student.grade,
      monthly_fee: student.fixed_monthly_amount,
      outstanding_balance: student.payment_balance,
      current_amount_due: student.current_amount_due,
      payment_status: student.payment_status,
      last_payment_amount: student.payment_amount,
      last_payment_date: student.last_payment_date,
      route: student.route,
      pickup_point: student.pickup_point,
      dropoff_point: student.dropoff_point,
      bus_number: student.bus_reg_no,
      driver: student.driver_name,
      driver_contact: student.driver_contact_no,
      parent_name: student.parent_name,
      school_location: student.school_location,
      service_type: student.service_type,
      branch: branchName,
      is_active: student.is_active,
    },
    total_matches: students.length,
  };
}

// ── Tool: Lookup Payment History ──
async function toolLookupPaymentHistory(supabase: any, args: any) {
  const admNo = String(args.admission_number || '').trim().toUpperCase();
  const limit = Math.min(args.limit || 5, 20);

  if (!admNo) return { error: 'No admission number provided' };

  // First find the student
  const { data: students } = await supabase
    .from('school_students')
    .select('id, student_name, admission_no')
    .or(`admission_no.ilike.${admNo},admission_no.ilike.%${admNo}%`)
    .limit(1);

  if (!students || students.length === 0) {
    return { found: false, message: `No student found with admission number "${admNo}"` };
  }

  const student = students[0];

  // Get payment history
  const { data: payments, error } = await supabase
    .from('school_payment_transactions')
    .select('payment_month, amount_paid, fixed_amount, difference, payment_date, payment_method, reference_no, payment_balance_after, notes')
    .eq('student_id', student.id)
    .order('payment_date', { ascending: false })
    .limit(limit);

  if (error) {
    return { error: `Payment lookup error: ${error.message}` };
  }

  return {
    found: true,
    student_name: student.student_name,
    admission_no: student.admission_no,
    payments: (payments || []).map((p: any) => ({
      month: p.payment_month,
      amount_paid: p.amount_paid,
      monthly_fee: p.fixed_amount,
      difference: p.difference,
      date: p.payment_date,
      method: p.payment_method,
      reference: p.reference_no,
      balance_after: p.payment_balance_after,
      notes: p.notes,
    })),
    total_payments: (payments || []).length,
  };
}

// ── Tool: Estimate Hire Cost ──
async function toolEstimateHireCost(supabase: any, args: any) {
  const fromLoc = args.from_location || '';
  const toLoc = args.to_location || '';
  const preferredType = args.bus_type || '';
  const numDays = args.num_days || 1;

  // Get all active rate cards
  const { data: rates } = await supabase
    .from('hire_rate_cards')
    .select('*, bus_types!inner(name, capacity)')
    .eq('is_active', true);

  // Get bus types
  const { data: buses } = await supabase
    .from('bus_types')
    .select('id, name, capacity, features, avg_km_per_l')
    .eq('is_active', true);

  // Try to estimate distance using Google Maps distance calculation
  let estimatedKm: number | null = null;
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && supabaseKey) {
      const distResponse = await fetch(`${supabaseUrl}/functions/v1/calculate-distance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ origin: fromLoc, destination: toLoc }),
      });
      if (distResponse.ok) {
        const distData = await distResponse.json();
        estimatedKm = distData?.distance_km || distData?.distance || null;
      }
    }
  } catch (e) {
    console.error('[AI-CHATBOT-v3] Distance estimation error:', e);
  }

  // Build cost estimates for each bus type
  const estimates: any[] = [];

  if (rates && rates.length > 0) {
    for (const rate of rates) {
      const busName = rate.bus_types?.name || rate.hire_type || 'Standard';
      const capacity = rate.bus_types?.capacity || 0;

      // Filter by preferred type if specified
      if (preferredType) {
        const busNameLower = busName.toLowerCase();
        const prefLower = preferredType.toLowerCase().replace(/_/g, ' ');
        if (!busNameLower.includes(prefLower) && !prefLower.includes('all')) {
          continue;
        }
      }

      let estimatedCost: number | null = null;

      if (estimatedKm && rate.rate_per_km_lkr) {
        estimatedCost = estimatedKm * Number(rate.rate_per_km_lkr);
        if (rate.flat_fee_lkr) estimatedCost += Number(rate.flat_fee_lkr);
        if (numDays > 1 && rate.overnight_charge_lkr_per_day) {
          estimatedCost += (numDays - 1) * Number(rate.overnight_charge_lkr_per_day);
        }
      }

      estimates.push({
        bus_type: busName,
        capacity: capacity,
        rate_per_km: rate.rate_per_km_lkr,
        flat_fee: rate.flat_fee_lkr,
        overtime_rate_per_hour: rate.overtime_rate_lkr_per_hour,
        overnight_charge_per_day: rate.overnight_charge_lkr_per_day,
        standard_hours: rate.standard_hours,
        exceeding_km_rate: rate.exceeding_km_rate_lkr,
        km_range: `${rate.from_km || 0} - ${rate.to_km || '∞'} km`,
        estimated_cost: estimatedCost ? Math.round(estimatedCost) : null,
      });
    }
  }

  // If no rate cards, use bus types for information
  if (estimates.length === 0 && buses) {
    for (const bus of buses) {
      estimates.push({
        bus_type: bus.name,
        capacity: bus.capacity,
        features: bus.features,
        note: 'Please contact us for exact pricing: +94 11 234 5678',
      });
    }
  }

  return {
    route: `${fromLoc} → ${toLoc}`,
    estimated_distance_km: estimatedKm,
    num_days: numDays,
    estimates: estimates,
    note: estimatedKm
      ? 'Prices are estimates. Final cost may vary based on actual route, waiting time, and conditions.'
      : 'Could not calculate exact distance. Showing rate cards for reference. Contact +94 11 234 5678 for exact pricing.',
    contact: '+94 11 234 5678',
    available_bus_types: (buses || []).map((b: any) => ({ name: b.name, capacity: b.capacity, features: b.features })),
  };
}

// ── Tool: Search System Data ──
async function toolSearchSystemData(supabase: any, args: any) {
  const searchType = args.search_type || '';
  const searchTerm = args.search_term || '';
  const filters = args.filters || '';

  try {
    switch (searchType) {
      case 'vehicle': {
        const { data } = await supabase
          .from('vehicles')
          .select('registration_no, make, model, year, vehicle_type, fuel_type, status, current_mileage, next_service_due, insurance_expiry')
          .or(searchTerm ? `registration_no.ilike.%${searchTerm}%,make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%` : 'id.not.is.null')
          .limit(10);
        return { type: 'vehicles', results: data || [], count: (data || []).length };
      }

      case 'driver': {
        const { data } = await supabase
          .from('drivers')
          .select('name, phone, license_number, license_type, license_expiry, status, assigned_vehicle')
          .or(searchTerm ? `name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,license_number.ilike.%${searchTerm}%` : 'id.not.is.null')
          .limit(10);
        return { type: 'drivers', results: data || [], count: (data || []).length };
      }

      case 'route': {
        const { data } = await supabase
          .from('school_routes')
          .select('route_code, route_name, start_location, end_location, total_students, bus_reg_no, driver_name, net_profit, is_active')
          .or(searchTerm ? `route_code.ilike.%${searchTerm}%,route_name.ilike.%${searchTerm}%` : 'id.not.is.null')
          .limit(10);
        return { type: 'routes', results: data || [], count: (data || []).length };
      }

      case 'booking':
      case 'quotation': {
        const { data } = await supabase
          .from('special_hire_quotations')
          .select('quotation_no, customer_name, from_location, to_location, travel_date, return_date, bus_type, total_amount, status, created_at')
          .or(searchTerm ? `quotation_no.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%` : 'id.not.is.null')
          .order('created_at', { ascending: false })
          .limit(10);
        return { type: 'quotations', results: data || [], count: (data || []).length };
      }

      case 'complaint': {
        const { data } = await supabase
          .from('complaints')
          .select('complaint_no, complainant_name, subject, status, priority, category, created_at')
          .or(searchTerm ? `complaint_no.ilike.%${searchTerm}%,complainant_name.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%` : 'id.not.is.null')
          .order('created_at', { ascending: false })
          .limit(10);
        return { type: 'complaints', results: data || [], count: (data || []).length };
      }

      case 'maintenance': {
        const { data } = await supabase
          .from('work_orders')
          .select('work_order_no, vehicle_id, description, status, priority, estimated_cost, actual_cost, scheduled_date')
          .or(searchTerm ? `work_order_no.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%` : 'id.not.is.null')
          .order('created_at', { ascending: false })
          .limit(10);
        return { type: 'maintenance', results: data || [], count: (data || []).length };
      }

      case 'school_branch': {
        const { data } = await supabase
          .from('school_branches')
          .select('branch_name, branch_code, location, contact_no, total_students, total_income, outstanding_amount, is_active')
          .or(searchTerm ? `branch_name.ilike.%${searchTerm}%,branch_code.ilike.%${searchTerm}%` : 'id.not.is.null')
          .limit(10);
        return { type: 'school_branches', results: data || [], count: (data || []).length };
      }

      case 'trip': {
        const { data } = await supabase
          .from('daily_trips')
          .select('trip_date, vehicle_reg_no, route_name, conductor_name, total_income, total_expense, net_income')
          .or(searchTerm ? `vehicle_reg_no.ilike.%${searchTerm}%,route_name.ilike.%${searchTerm}%` : 'id.not.is.null')
          .order('trip_date', { ascending: false })
          .limit(10);
        return { type: 'trips', results: data || [], count: (data || []).length };
      }

      case 'invoice': {
        const { data } = await supabase
          .from('ar_invoices')
          .select('invoice_number, customer_name, total_amount, amount_paid, balance_due, status, invoice_date, due_date')
          .or(searchTerm ? `invoice_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%` : 'id.not.is.null')
          .order('invoice_date', { ascending: false })
          .limit(10);
        return { type: 'invoices', results: data || [], count: (data || []).length };
      }

      case 'expense': {
        const { data } = await supabase
          .from('expenses')
          .select('expense_number, description, total_amount, status, expense_date, vendor_name, category')
          .or(searchTerm ? `expense_number.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,vendor_name.ilike.%${searchTerm}%` : 'id.not.is.null')
          .order('expense_date', { ascending: false })
          .limit(10);
        return { type: 'expenses', results: data || [], count: (data || []).length };
      }

      case 'fleet_status': {
        const { data: vehicles } = await supabase
          .from('vehicles')
          .select('registration_no, status, vehicle_type')
          .limit(100);

        const statusCounts: Record<string, number> = {};
        const typeCounts: Record<string, number> = {};
        (vehicles || []).forEach((v: any) => {
          statusCounts[v.status || 'unknown'] = (statusCounts[v.status || 'unknown'] || 0) + 1;
          typeCounts[v.vehicle_type || 'unknown'] = (typeCounts[v.vehicle_type || 'unknown'] || 0) + 1;
        });

        return {
          type: 'fleet_status',
          total_vehicles: (vehicles || []).length,
          by_status: statusCounts,
          by_type: typeCounts,
        };
      }

      default:
        return { error: `Unknown search type: ${searchType}. Available: vehicle, driver, route, booking, quotation, complaint, maintenance, school_branch, trip, invoice, expense, fleet_status` };
    }
  } catch (err: any) {
    // Table might not exist
    console.error(`[AI-CHATBOT-v3] Search error for ${searchType}:`, err);
    return { type: searchType, results: [], count: 0, note: `Could not search ${searchType}. The table may not exist or have different columns.` };
  }
}

// ── Tool: Dashboard Summary ──
async function toolGetDashboardSummary(supabase: any, args: any) {
  const metricType = args.metric_type || 'all';
  const summary: any = {};

  try {
    if (metricType === 'fleet' || metricType === 'all') {
      const { count: totalVehicles } = await supabase.from('vehicles').select('*', { count: 'exact', head: true });
      const { count: activeVehicles } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('status', 'active');
      summary.fleet = { total_vehicles: totalVehicles || 0, active: activeVehicles || 0 };
    }
  } catch { summary.fleet = { note: 'Could not fetch fleet data' }; }

  try {
    if (metricType === 'school_bus' || metricType === 'all') {
      const { count: totalStudents } = await supabase.from('school_students').select('*', { count: 'exact', head: true }).eq('is_active', true);
      const { count: totalBranches } = await supabase.from('school_branches').select('*', { count: 'exact', head: true });
      const { count: totalRoutes } = await supabase.from('school_routes').select('*', { count: 'exact', head: true }).eq('is_active', true);
      summary.school_bus = {
        total_active_students: totalStudents || 0,
        total_branches: totalBranches || 0,
        total_routes: totalRoutes || 0,
      };
    }
  } catch { summary.school_bus = { note: 'Could not fetch school bus data' }; }

  try {
    if (metricType === 'special_hire' || metricType === 'all') {
      const today = new Date().toISOString().split('T')[0];
      const { count: totalQuotations } = await supabase.from('special_hire_quotations').select('*', { count: 'exact', head: true });
      const { count: pendingQuotations } = await supabase.from('special_hire_quotations').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      summary.special_hire = {
        total_quotations: totalQuotations || 0,
        pending: pendingQuotations || 0,
      };
    }
  } catch { summary.special_hire = { note: 'Could not fetch special hire data' }; }

  try {
    if (metricType === 'finance' || metricType === 'all') {
      const { count: totalInvoices } = await supabase.from('ar_invoices').select('*', { count: 'exact', head: true });
      const { count: unpaidInvoices } = await supabase.from('ar_invoices').select('*', { count: 'exact', head: true }).in('status', ['pending', 'overdue']);
      summary.finance = {
        total_invoices: totalInvoices || 0,
        unpaid: unpaidInvoices || 0,
      };
    }
  } catch { summary.finance = { note: 'Could not fetch finance data' }; }

  return summary;
}


// ────────────────────────────────────────────
// Fallback Response Formatter
// ────────────────────────────────────────────
function formatToolResultFallback(toolName: string, result: any, language: string): string {
  if (result.error) {
    if (language === 'si') return `සමාවන්න, තොරතුරු සෙවීමේදී දෝෂයක් ඇති විය: ${result.error} 🙏`;
    if (language === 'ta') return `மன்னிக்கவும், தகவல் தேடலில் பிழை: ${result.error} 🙏`;
    return `Sorry, there was an error looking up the information: ${result.error} 🙏`;
  }

  if (toolName === 'lookup_student_fees' && result.found) {
    const s = result.student;
    if (language === 'si') {
      return `📋 සිසුවා: ${s.name}\n` +
        `📝 ඇතුළත් අංකය: ${s.admission_no}\n` +
        `💰 මාසික ගාස්තුව: LKR ${Number(s.monthly_fee || 0).toLocaleString()}\n` +
        `📊 ගෙවීම් ශේෂය: LKR ${Number(s.outstanding_balance || 0).toLocaleString()}\n` +
        `🔄 ගෙවීම් තත්ත්වය: ${s.payment_status || 'N/A'}\n` +
        `🚌 මාර්ගය: ${s.route || 'N/A'}\n` +
        `📅 අවසන් ගෙවීම: ${s.last_payment_date || 'N/A'}`;
    }
    if (language === 'ta') {
      return `📋 மாணவர்: ${s.name}\n` +
        `📝 சேர்க்கை எண்: ${s.admission_no}\n` +
        `💰 மாத கட்டணம்: LKR ${Number(s.monthly_fee || 0).toLocaleString()}\n` +
        `📊 நிலுவை: LKR ${Number(s.outstanding_balance || 0).toLocaleString()}\n` +
        `🔄 நிலை: ${s.payment_status || 'N/A'}\n` +
        `🚌 பாதை: ${s.route || 'N/A'}\n` +
        `📅 கடைசி கட்டணம்: ${s.last_payment_date || 'N/A'}`;
    }
    return `📋 Student: ${s.name}\n` +
      `📝 Admission No: ${s.admission_no}\n` +
      `💰 Monthly Fee: LKR ${Number(s.monthly_fee || 0).toLocaleString()}\n` +
      `📊 Outstanding Balance: LKR ${Number(s.outstanding_balance || 0).toLocaleString()}\n` +
      `🔄 Payment Status: ${s.payment_status || 'N/A'}\n` +
      `🚌 Route: ${s.route || 'N/A'}\n` +
      `📅 Last Payment: ${s.last_payment_date || 'N/A'}`;
  }

  if (toolName === 'lookup_student_fees' && !result.found) {
    if (language === 'si') return `සමාවන්න, "${result.admission_number_searched}" ඇතුළත් අංකය සහිත සිසුවෙක් හමු නොවීය. කරුණාකර අංකය පරීක්ෂා කර නැවත උත්සාහ කරන්න. 🙏`;
    if (language === 'ta') return `மன்னிக்கவும், "${result.admission_number_searched}" சேர்க்கை எண்ணுடன் மாணவர் கிடைக்கவில்லை. எண்ணை சரிபார்த்து மீண்டும் முயற்சிக்கவும். 🙏`;
    return `Sorry, no student found with admission number "${result.admission_number_searched}". Please check the number and try again. 🙏`;
  }

  return JSON.stringify(result, null, 2);
}

// ────────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────────

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function jsonResponse(data: any) {
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function saveAssistantMessage(supabase: any, sessionId: string, content: string, language: string) {
  try {
    await supabase.from('ai_chat_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: content,
      language: language,
    });
  } catch (e) {
    console.error('[AI-CHATBOT-v3] Error saving assistant message:', e);
  }
}

function buildSystemPrompt(
  busTypes: any[], rateCards: any[], yutongModels: any[],
  sinotruckModels: any[], lightVehicleModels: any[],
  knowledgeBase: any[], language: string,
): string {
  const langInstruction = language === 'si'
    ? 'ALWAYS respond in Sinhala (සිංහල). Use natural, conversational Sinhala. Even if user writes in romanized Sinhala (like "mata dana ganna puluwanda"), detect it and respond in Sinhala Unicode script.'
    : language === 'ta'
      ? 'ALWAYS respond in Tamil (தமிழ்). Use natural, conversational Tamil.'
      : language === 'auto'
        ? `Detect the language the user is writing in. If they write in Sinhala (including romanized Sinhala like "mata", "kiyada", "puluwanda", "ganna", "ekak", "wage", "kiyak"), respond in Sinhala Unicode (සිංහල). If Tamil, respond in Tamil. If English, respond in English. ALWAYS respond in the SAME language.`
        : 'Respond in English.';

  const busTypesStr = busTypes.map(b =>
    `- ${b.name}: ${b.capacity} seats${b.features ? `, Features: ${b.features}` : ''}`
  ).join('\n') || 'No bus types available';

  const rateCardsStr = rateCards.map(r =>
    `- ${r.hire_type} (${r.from_km}-${r.to_km || '∞'} km): ` +
    `${r.flat_fee_lkr ? `Flat Fee: LKR ${Number(r.flat_fee_lkr).toLocaleString()}, ` : ''}` +
    `${r.rate_per_km_lkr ? `Rate/km: LKR ${r.rate_per_km_lkr}, ` : ''}` +
    `${r.overtime_rate_lkr_per_hour ? `Overtime: LKR ${r.overtime_rate_lkr_per_hour}/hr, ` : ''}` +
    `${r.overnight_charge_lkr_per_day ? `Overnight: LKR ${r.overnight_charge_lkr_per_day}/day` : ''}`
  ).join('\n') || 'No rate cards available';

  const yutongStr = yutongModels.map(y =>
    `- ${y.model_name}${y.bus_name ? ` (${y.bus_name})` : ''}: ` +
    `${y.capacity || 'N/A'} capacity, ${y.seating_capacity ? `${y.seating_capacity} seats, ` : ''}` +
    `Price: LKR ${Number(y.base_price || 0).toLocaleString()}, ` +
    `${y.engine ? `Engine: ${y.engine}, ` : ''}${y.fuel_type || 'N/A'} fuel, ${y.condition || 'N/A'}`
  ).join('\n') || 'No Yutong models available';

  const sinotruckStr = sinotruckModels.map(s =>
    `- ${s.model_name}${s.truck_name ? ` (${s.truck_name})` : ''}: ` +
    `${s.horsepower || 'N/A'} HP, Price: LKR ${Number(s.base_price || 0).toLocaleString()}, ` +
    `${s.engine_type || 'N/A'} engine, ${s.fuel_type || 'N/A'} fuel, ${s.condition || 'N/A'}`
  ).join('\n') || 'No Sinotruck models available';

  const lightVehicleStr = lightVehicleModels.map((lv: any) =>
    `- ${lv.brand || ''} ${lv.vehicle_name || lv.model_name}: ` +
    `Price: LKR ${Number(lv.base_price || 0).toLocaleString()}, ` +
    `${lv.fuel_type || 'N/A'} fuel, ${lv.transmission || 'N/A'}`
  ).join('\n') || 'No light vehicle models available';

  const kbStr = knowledgeBase.map(kb => {
    const q = language === 'si' ? (kb.question_si || kb.question_en) :
      language === 'ta' ? (kb.question_ta || kb.question_en) : kb.question_en;
    const a = language === 'si' ? (kb.answer_si || kb.answer_en) :
      language === 'ta' ? (kb.answer_ta || kb.answer_en) : kb.answer_en;
    return `Q: ${q}\nA: ${a}`;
  }).join('\n\n') || '';

  return `You are Nimal — a real human customer service agent at NCG Holdings (Pvt) Ltd, Sri Lanka.
You are NOT a bot. You are a friendly, warm Sri Lankan person who genuinely cares about helping customers.
You have full access to the company database and can look up any information instantly.

CRITICAL — BEHAVE LIKE A REAL HUMAN:
- NEVER say "I am an AI", "As an AI", "I'm a chatbot", or any robotic phrases
- Talk naturally like a Sri Lankan customer service person would talk
- Use warmth, empathy, and casual friendliness
- React emotionally — if a parent asks about their child, show care
- If someone says thank you, respond warmly
- Keep it SHORT and NATURAL — humans don't write essays

LANGUAGE RULES (CRITICAL):
${langInstruction}

SINHALA CONVERSATION STYLE (VERY IMPORTANT):
When speaking Sinhala, use natural colloquial Sinhala like a real person. Examples:
- Greeting: "ආයුබෝවන්! කියන්න, මොකද්ද ඕනේ? 😊"
- School fees: "ඔව් බලමු! admission number එක දෙන්නකෝ, මම check කරලා කියන්නම්"
- Giving info: "ඔබේ ළමයාගේ මාසික ගාස්තුව රුපියල් 5,000යි. Balance එක ටිකක් තියෙනවා, රුපියල් 2,500ක්"
- Empathy: "ඔයාට worry වෙන්න එපා, මම balance එක check කරලා දැන් කියන්නම්"
- Hire cost: "ගාල්ලේ ඉඳන් යාපනෙට නේද? බලමු මිල ගණන්..."
- Not found: "හම්මෝ, ඒ number එකට student කෙනෙක් නැහැනේ. Number එක හරියටම check කරලා ආයේ try කරන්න 🙏"
- Thank response: "ඒක මගේ වැඩනේ, ඕනෑම වෙලාවක අමතන්න! 🙏"
- Use natural words: "ඉතින්", "හරි", "නේද", "බලමු", "ඔව්", "ඔන්න"

ROMANIZED SINHALA DETECTION:
Users may type Sinhala in English letters OR use voice input which comes in English text.
You MUST detect romanized Sinhala and respond in proper Sinhala Unicode.
Common words: "mata", "dana ganna", "puluwanda", "kiyada", "kiyak", "mage", "lamaya", "lamayage", "wage", "ekak", "walata", "idhan", "idan", "bus", "school", "fees", "cost", "mokakda", "kohomada", "kawda", "harida", "onna"

TAMIL CONVERSATION STYLE:
Be warm and natural: "வணக்கம்! சொல்லுங்க, என்ன உதவி வேணும்?"

COMPANY: NCG Holdings (Pvt) Ltd, Sri Lanka
SERVICES: Special Bus Hire, School Bus Transport, Yutong Bus Sales, Sinotruck Sales, Light Vehicle Sales
CONTACT: +94 11 234 5678 | info@ncgholdings.lk | Currency: LKR

WHEN TO USE TOOLS:
- Student fees/payments → use lookup_student_fees with the admission number
- Payment history → use lookup_payment_history
- Bus hire cost → use estimate_hire_cost with from/to locations
- Vehicle/driver/route lookup → use search_system_data
- Overall statistics → use get_dashboard_summary

PRIVACY: Only share student details if admission number is provided. Hide full phone numbers.

SPECIAL HIRE - Bus Types:
${busTypesStr}

SPECIAL HIRE - Rate Cards:
${rateCardsStr}

YUTONG BUS MODELS:
${yutongStr}

SINOTRUCK MODELS:
${sinotruckStr}

LIGHT VEHICLES:
${lightVehicleStr}

${kbStr ? `FAQ:\n${kbStr}` : ''}

FORMATTING: Keep responses SHORT — max 3-4 lines for simple questions. Use emojis naturally. Format prices with commas. Be human, warm, natural.`;
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

function getFallbackResponse(language: string): string {
  if (language === 'si') return 'ආයුබෝවන්! AI සහායක තාවකාලිකව නොමැත. +94 11 234 5678 අමතන්න. 🙏';
  if (language === 'ta') return 'வணக்கம்! AI உதவியாளர் தற்காலிகமாக கிடைக்கவில்லை. +94 11 234 5678 அழைக்கவும். 🙏';
  return 'Welcome! Our AI assistant needs a Gemini API key to work. Please add it in Settings → AI Chatbot → Gemini API Key. 🙏';
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Starting OCR extraction with Lovable AI');

    const prompt = `Analyze this Sri Lankan bus trip sheet. This sheet contains MULTIPLE trips for ONE bus on ONE day.

CRITICAL: Look for a TABLE with numbered rows (usually 1, 2, 3, 4) showing different trips.

Extract:

1. BUS NUMBER: Format XXXX or XX-XXXX (e.g., 0746, NE-0746, NP-0748)
   - Look at the top of the sheet for bus registration number

2. DATE: Format DD/MM/YYYY or දිනය
   - Look for the date field at the top of the sheet

3. TRIP TABLE (rows labeled 1, 2, 3, 4):
   For EACH ROW that has data, extract:
   - Trip number (1, 2, 3, or 4)
   - Revenue fields for that specific trip:
     * බස්රථ / බස් රථ / bus collection (Regular passenger income)
     * ඇවිලා / ඇමතුම් / call booking (Phone bookings)
     * ඒජන්ට් / agent booking (Agent commissions)
     * ගමන් මල් / luggage (Luggage fees)
     * විශේෂ / special (Special income)
   - Odometer readings if visible:
     * ආරම්භක / start odometer
     * අවසාන / end odometer

4. DAILY EXPENSES (වියදම් section - ONE SET for entire day):
   
   Common Sri Lankan bus expense categories (extract EXACT field names):
   
   FUEL & TRANSPORT:
   - ඩීසල් / ඩිසල් / diesel / fuel (Total fuel cost) → "fuel_cost"
   - අධිවේගී / හයිවේ / හයිවෙ / highway / toll / expressway (Highway tolls) → "highway_toll"
   
   STAFF COSTS:
   - රියදුරු / ඩ්‍රයිවර් / driver (Driver salary) → "driver_salary"
   - කොන්දොස්තර / රනර් / හෙල්පර් / conductor / runner / helper (Conductor/Helper) → "conductor_salary"
   - කෑම / ආහාර / භෝජන / food / meals (Staff food ONLY) → "food"
   
   MAINTENANCE & REPAIRS:
   - අළුත්වැඩියා / අළුත්වැඩ / repair / repairs (Repairs) → "repair"
   - ග්‍රීස් / ග්රීස් මැද / grease / lubricant (Grease/Lubricant) → "grease"
   - තෙල් / ඔයිල් / oil / engine oil (Engine oil) → "oil"
   - ටයර් / ටයර / ටියුබ් / tyre / tire / tube (Tyre/Tube) → "tyre_tube"
   - කම්මැලි / කම්කරු / වැඩ / labour / labor (Labour charges) → "labour"
   - අමතර කොටස් / පාර්ට්ස් / parts / spares (Spare parts) → "spare_parts"
   
   SERVICES:
   - විදවණ / සෝදනය / වොෂ් / wash / body wash (Vehicle wash) → "body_wash"
   - යාත්රා / පාර්කින් / parking (Parking) → "parking"
   
   OFFICIAL & OTHER:
   - පොලීසිය / පොලිස් / දඩ / police / fine (Police fines) → "police"
   - බලපත්‍ර / පර්මිට් / permit / license (Permits/Licenses) → "permit"
   - රක්ෂණ / insurance (Insurance) → "insurance"
   - දුරකථන / ෆෝන් / phone / mobile (Phone/Communication) → "phone"
   - Any other clear expense → "other"
   
CRITICAL MAPPING RULES TO AVOID MISTAKES:
⚠️ "කෑම" or "ආහාර" or "food" → MUST map to "food" field (NOT driver_salary!)
⚠️ "ග්‍රීස්" or "grease" → MUST map to "grease" field (NOT food!)
⚠️ "හයිවේ" or "අධිවේගී" or "highway" → MUST map to "highway_toll" field (NOT other!)
⚠️ "රනර්" or "කොන්දොස්තර" or "runner" → MUST map to "conductor_salary" field (NOT driver!)
⚠️ Double-check each expense category - numbers are correct, focus on field names
⚠️ If unsure about a category, include it in "other" with the detected label

IMPORTANT INSTRUCTIONS:
- Extract ALL trips from the table rows
- Revenue is PER TRIP (different for each row)
- Expenses are ONCE for the whole day (not per trip)
- Remove commas from numbers
- If a field is empty/unclear, use 0
- For each expense, include "detected_as" showing the exact text you saw
- Map expense names carefully according to the rules above
- Return ONLY valid JSON, no markdown

Return JSON in this exact format:
{
  "busNumber": "0746",
  "date": "01/10/2025",
  "trips": [
    {
      "trip_no": 1,
      "income": {
        "bus_collection": 87706,
        "call_booking": 8520,
        "agent_booking": 0,
        "luggage_income": 0,
        "special_income": 0
      },
      "odometer_start": 659214,
      "odometer_end": 659588
    },
    {
      "trip_no": 2,
      "income": {
        "bus_collection": 85140,
        "call_booking": 8486,
        "agent_booking": 0,
        "luggage_income": 0,
        "special_income": 0
      },
      "odometer_start": 659588,
      "odometer_end": 659960
    }
  ],
  "daily_expenses": {
    "fuel_cost": {"amount": 22500, "detected_as": "ඩීසල්"},
    "driver_salary": {"amount": 4000, "detected_as": "රියදුරු"},
    "conductor_salary": {"amount": 800, "detected_as": "කොන්දොස්තර"},
    "food": {"amount": 1500, "detected_as": "කෑම"},
    "parking": {"amount": 500, "detected_as": "යාත්රා"},
    "body_wash": {"amount": 400, "detected_as": "විදවණ"},
    "highway_toll": {"amount": 3500, "detected_as": "හයිවේ"},
    "grease": {"amount": 2250, "detected_as": "ග්‍රීස්"},
    "tyre_tube": {"amount": 0, "detected_as": ""},
    "oil": {"amount": 0, "detected_as": ""},
    "labour": {"amount": 0, "detected_as": ""},
    "spare_parts": {"amount": 0, "detected_as": ""},
    "police": {"amount": 0, "detected_as": ""},
    "repair": {"amount": 0, "detected_as": ""},
    "permit": {"amount": 0, "detected_as": ""},
    "insurance": {"amount": 0, "detected_as": ""},
    "phone": {"amount": 0, "detected_as": ""},
    "other": {"amount": 0, "detected_as": ""}
  },
  "confidence": 0.92
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: { 
                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        console.error('Payment required');
        return new Response(JSON.stringify({ error: 'Payment required, please add credits to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('OCR extraction successful');
    
    // Parse the JSON response
    let extractedData;
    try {
      extractedData = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid JSON response from AI');
    }

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ocr-extract function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

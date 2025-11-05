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
⚠️ "ග්‍රීස් ගැසීම" or "greasing service" → MUST map to "repair" field (service work, NOT material)
⚠️ "ග්‍රීස්" alone (material purchase) → maps to "grease" field
⚠️ "ආහාර" → maps to "food" field (same as "කෑම")
⚠️ Double-check each expense category - numbers are correct, focus on field names
⚠️ If unsure about a category, include it in "other" with the value

CRITICAL NUMBER FORMAT RULES FOR SRI LANKAN NUMBERS:
⚠️ COMMA (,) is the THOUSAND SEPARATOR in Sri Lankan format
⚠️ ALL amounts are WHOLE NUMBERS with NO decimals or cents
⚠️ When you see "106,520" → interpret as 106520 (one hundred six thousand five hundred twenty)
⚠️ When you see "8,312" → interpret as 8312 (eight thousand three hundred twelve)
⚠️ When you see "2,500" → interpret as 2500 (two thousand five hundred)
⚠️ NEVER treat comma as decimal point
⚠️ Remove ALL commas from numbers before returning them
⚠️ Examples:
   * Sheet shows "106,520" → Return 106520 in JSON
   * Sheet shows "8,312" → Return 8312 in JSON
   * Sheet shows "50,000" → Return 50000 in JSON

IMPORTANT INSTRUCTIONS:
- Extract ALL trips from the table rows
- Revenue is PER TRIP (different for each row)
- Expenses are ONCE for the whole day (not per trip)
- If a field is empty/unclear, use 0
- Map expense names carefully according to the rules above
- Return ONLY valid JSON, no markdown
- All expense amounts should be simple numbers (not objects)

Return JSON in this exact format:
{
  "busNumber": "0746",
  "date": "01/10/2025",
  "trips": [
    {
      "trip_no": 1,
      "income": {
        "bus_collection": 106520,
        "call_booking": 8312,
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
    "fuel_cost": 22500,
    "driver_salary": 4000,
    "conductor_salary": 800,
    "food": 1500,
    "parking": 500,
    "body_wash": 400,
    "highway_toll": 3500,
    "grease": 2250,
    "tyre_tube": 0,
    "oil": 0,
    "labour": 0,
    "spare_parts": 0,
    "police": 0,
    "repair": 0,
    "permit": 0,
    "insurance": 0,
    "phone": 0,
    "other": 0
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
    console.log('Raw AI response:', content);
    
    // Parse the JSON response
    let extractedData;
    try {
      extractedData = JSON.parse(content);
      console.log('First trip bus_collection:', extractedData.trips?.[0]?.income?.bus_collection);
      console.log('Daily fuel_cost:', extractedData.daily_expenses?.fuel_cost);
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
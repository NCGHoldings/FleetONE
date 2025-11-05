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
   - ඩීසල් / diesel (Total fuel cost for the day)
   - රියදුරු / driver (Driver salary)
   - කොන්දොස්තර / conductor (Conductor salary)
   - කෑම / food (Food expenses)
   - යාත්රා / parking (Parking fees)
   - විදවණ / body wash / wash (Vehicle wash)
   - පොලීසිය / police (Fines/Police)
   - අළුත්වැඩියා / repair (Repair costs)
   - Other expenses if visible

IMPORTANT INSTRUCTIONS:
- Extract ALL trips from the table rows
- Revenue is PER TRIP (different for each row)
- Expenses are ONCE for the whole day (not per trip)
- Remove commas from numbers
- If a field is empty/unclear, use 0
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
    "fuel_cost": 22500,
    "driver_salary": 4000,
    "conductor_salary": 800,
    "food": 1500,
    "parking": 500,
    "body_wash": 400,
    "police": 0,
    "repair": 0,
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

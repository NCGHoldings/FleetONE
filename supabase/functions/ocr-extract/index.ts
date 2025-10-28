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

    const prompt = `Analyze this handwritten Sri Lankan bus trip sheet and extract the following information:

1. BUS NUMBER: Format XX-XXXX (e.g., NP-0748, WP-1234). Look for the bus registration number.
2. DATE: Format DD/MM/YYYY or similar. Look for the trip date.
3. INCOME SECTION (ආදායම / Revenue):
   - බස්රථ / බස් රථ / bus collection / Bus Collection (Regular passenger income)
   - ඇවිලා / ඇමතුම් / call booking / Call Booking (Phone bookings)
   - ඒජන්ට් / agent booking / Agent Booking (Agent commissions)
   - ගමන් මල් / luggage income / Luggage (Luggage fees)
   - විශේෂ / special / Special (Special income)
   
4. EXPENSE SECTION (වියදම / Expenses):
   - ඩීසල් / diesel / fuel (Fuel cost)
   - රියදුරු / driver / Driver Salary (Driver payment)
   - කොන්දොස්තර / conductor / Conductor Salary (Conductor payment)
   - කෑම / food (Food expenses)
   - යාත්රා / parking (Parking fees)
   - විදවණ / body wash / wash (Vehicle wash)
   - පොලීසිය / police / Police (Fines)
   - අළුත්වැඩියා / repair / Repair (Repair costs)

IMPORTANT INSTRUCTIONS:
- Extract ALL numbers you see, even if handwritten
- For each field, provide the numeric value (without currency symbols or commas)
- If a field is not present or unclear, use null
- Be very careful with bus numbers - they are critical for matching
- Return ONLY valid JSON, no markdown or extra text

Return as JSON in this exact format:
{
  "busNumber": "XX-XXXX",
  "date": "DD/MM/YYYY",
  "income": {
    "bus_collection": 0,
    "call_booking": 0,
    "agent_booking": 0,
    "luggage_income": 0,
    "special_income": 0
  },
  "expenses": {
    "fuel_cost": 0,
    "salary": 0,
    "conductor_salary": 0,
    "food": 0,
    "parking": 0,
    "body_wash": 0,
    "police": 0,
    "repair": 0
  },
  "confidence": 0.95
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

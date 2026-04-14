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
    const { analyticsData, analysisType = "comprehensive" } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare context for AI analysis
    const context = prepareAnalyticsContext(analyticsData);
    const systemPrompt = getSystemPrompt(analysisType);
    const userPrompt = buildUserPrompt(context, analysisType);

    console.log("Analyzing trips with AI...", { analysisType });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const insights = data.choices[0].message.content;

    console.log("AI analysis completed successfully");

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-trips function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function prepareAnalyticsContext(data: any) {
  return {
    overview: {
      totalIncome: data.overview?.totalIncome || 0,
      totalExpenses: data.overview?.totalExpenses || 0,
      netProfit: data.overview?.netProfit || 0,
      totalTrips: data.overview?.totalTrips || 0,
      avgEfficiency: data.overview?.avgEfficiency || 0,
      profitMargin: data.overview?.profitMargin || 0,
    },
    topDrivers: (data.drivers || []).slice(0, 5).map((d: any) => ({
      name: d.driverName,
      trips: d.totalTrips,
      income: d.totalIncome,
      netIncome: d.netIncome,
      efficiency: d.avgEfficiency,
    })),
    topRoutes: (data.routes || []).slice(0, 5).map((r: any) => ({
      name: r.routeName,
      income: r.totalIncome,
      expenses: r.totalExpenses,
      netIncome: r.netIncome,
      trips: r.totalTrips,
    })),
    topBuses: (data.buses || []).slice(0, 5).map((b: any) => ({
      registration: b.busRegistration,
      trips: b.totalTrips,
      income: b.totalIncome,
      netIncome: b.netIncome,
      efficiency: b.avgEfficiency,
    })),
  };
}

function getSystemPrompt(analysisType: string) {
  const basePrompt = `You are an expert business analyst specializing in public transportation operations. 
Analyze the provided trip data and provide actionable insights in a clear, professional manner.
Focus on identifying patterns, opportunities, and risks.`;

  const typeSpecific = {
    comprehensive: "Provide a comprehensive analysis covering profitability, efficiency, performance, and recommendations.",
    profitability: "Focus specifically on profit optimization and cost reduction opportunities.",
    efficiency: "Analyze operational efficiency and fuel consumption patterns.",
    performance: "Evaluate driver, route, and bus performance with improvement suggestions.",
    risks: "Identify potential risks, anomalies, and areas requiring immediate attention.",
  };

  return `${basePrompt}\n\n${typeSpecific[analysisType as keyof typeof typeSpecific] || typeSpecific.comprehensive}`;
}

function buildUserPrompt(context: any, analysisType: string) {
  return `Analyze this transportation data and provide insights:

**Overall Performance:**
- Total Income: ₹${context.overview.totalIncome.toLocaleString()}
- Total Expenses: ₹${context.overview.totalExpenses.toLocaleString()}
- Net Profit: ₹${context.overview.netProfit.toLocaleString()}
- Total Trips: ${context.overview.totalTrips}
- Average Efficiency: ${context.overview.avgEfficiency.toFixed(2)} km/L
- Profit Margin: ${context.overview.profitMargin.toFixed(1)}%

**Top 5 Drivers:**
${context.topDrivers.map((d: any, i: number) => 
  `${i+1}. ${d.name}: ${d.trips} trips, ₹${d.netIncome.toLocaleString()} net, ${d.efficiency.toFixed(2)} km/L`
).join('\n')}

**Top 5 Routes:**
${context.topRoutes.map((r: any, i: number) => 
  `${i+1}. ${r.name}: ₹${r.netIncome.toLocaleString()} net, ${r.trips} trips`
).join('\n')}

**Top 5 Buses:**
${context.topBuses.map((b: any, i: number) => 
  `${i+1}. ${b.registration}: ${b.trips} trips, ₹${b.netIncome.toLocaleString()} net, ${b.efficiency.toFixed(2)} km/L`
).join('\n')}

Provide insights in the following format:
1. **Key Findings** (3-5 most important observations)
2. **Profit Opportunities** (specific actionable recommendations)
3. **Efficiency Improvements** (operational optimization suggestions)
4. **Risk Areas** (potential problems or anomalies)
5. **Top Performers** (recognize excellence)
6. **Action Items** (prioritized next steps)

Keep it concise, data-driven, and actionable.`;
}

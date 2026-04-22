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
    const { action, content, prompt } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = getSystemPrompt(action);
    const userPrompt = buildUserPrompt(action, content, prompt);

    console.log(`Processing diary action: ${action}`);

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
        temperature: action === 'extract_tasks' ? 0.2 : 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in smart-diary-assistant:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getSystemPrompt(action: string) {
  const basePrompt = `You are a helpful, private Smart Diary Assistant. Your goal is to assist the user with their personal diary notes. You must be concise, professional, and directly address the user's request.`;

  switch (action) {
    case 'summarize':
      return `${basePrompt}\nProvide a brief, bulleted summary of the provided diary entry.`;
    case 'suggest':
      return `${basePrompt}\nThe user has written some thoughts. Suggest 2-3 logical continuations, ideas, or reflections they might want to add.`;
    case 'ask':
      return `${basePrompt}\nAnswer the user's specific question using the context of their diary entry. If the answer is not in the text, provide general helpful advice based on the topic.`;
    case 'extract_tasks':
      return `${basePrompt}\nExtract any actionable tasks, to-dos, or commitments mentioned in the diary entry. 
Format your response STRICTLY as a JSON array of objects, with each object having a 'task_text' string property and an optional 'deadline' string property (ISO format) if a date/time is mentioned.
Example: [{"task_text": "Call the client", "deadline": "2026-04-24T10:00:00Z"}, {"task_text": "Buy groceries"}]
Return ONLY the JSON array, no markdown blocks or conversational text.`;
    default:
      return basePrompt;
  }
}

function buildUserPrompt(action: string, content: string, prompt: string) {
  if (action === 'ask') {
    return `Diary Content:\n"""\n${content}\n"""\n\nUser Question: ${prompt}`;
  }
  
  return `Diary Content:\n"""\n${content}\n"""`;
}

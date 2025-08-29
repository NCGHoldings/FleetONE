import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    if (!mapboxToken) {
      console.error('MAPBOX_ACCESS_TOKEN not found');
      return new Response(
        JSON.stringify({ error: 'Mapbox token not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log(`Searching locations for query: ${query}`);

    // Use Mapbox Geocoding API to search for locations in Sri Lanka
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=LK&limit=5&types=place,locality,neighborhood,address`;
    
    const response = await fetch(geocodingUrl);
    const data = await response.json();

    console.log(`Mapbox response:`, data);

    if (!data.features) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Format the suggestions
    const suggestions = data.features.map((feature: any) => ({
      id: feature.id,
      place_name: feature.place_name,
      text: feature.text,
      coordinates: feature.center,
      context: feature.context || []
    }));

    console.log(`Returning ${suggestions.length} suggestions`);

    return new Response(
      JSON.stringify({ suggestions }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in search-locations:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to search locations' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
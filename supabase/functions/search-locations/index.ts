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

    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!googleApiKey) {
      console.error('GOOGLE_PLACES_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'Google Places API key not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log(`Searching locations for query: ${query}`);

    // Use Google Places Autocomplete API to search for all types of locations in Sri Lanka
    const placesUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&components=country:lk&types=establishment|geocode&key=${googleApiKey}`;
    
    const response = await fetch(placesUrl);
    const data = await response.json();

    console.log(`Google Places response:`, data);

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.error_message);
      return new Response(
        JSON.stringify({ error: 'Failed to search locations' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    if (!data.predictions || data.predictions.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Format the suggestions to match the expected interface
    const suggestions = await Promise.all(
      data.predictions.slice(0, 5).map(async (prediction: any) => {
        // Get place details to retrieve coordinates
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry&key=${googleApiKey}`;
        
        try {
          const detailsResponse = await fetch(detailsUrl);
          const detailsData = await detailsResponse.json();
          
          const coordinates = detailsData.result?.geometry?.location 
            ? [detailsData.result.geometry.location.lng, detailsData.result.geometry.location.lat]
            : [0, 0];

          return {
            id: prediction.place_id,
            place_name: prediction.description,
            text: prediction.structured_formatting?.main_text || prediction.description,
            coordinates: coordinates,
            context: prediction.terms || []
          };
        } catch (error) {
          console.error('Error fetching place details:', error);
          return {
            id: prediction.place_id,
            place_name: prediction.description,
            text: prediction.structured_formatting?.main_text || prediction.description,
            coordinates: [0, 0],
            context: prediction.terms || []
          };
        }
      })
    );

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

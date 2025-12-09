import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { query, getDetails, placeId } = await req.json();
    
    // Initialize Supabase client for caching
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If requesting place details (coordinates) for a specific place
    if (getDetails && placeId) {
      console.log(`Fetching details for place_id: ${placeId}`);
      
      // Check cache first for coordinates
      const { data: cachedLocation } = await supabase
        .from('cached_locations')
        .select('coordinates')
        .eq('place_id', placeId)
        .single();
      
      if (cachedLocation?.coordinates) {
        console.log('Returning cached coordinates');
        // Update hit count
        await supabase.rpc('increment_cache_hit', { p_place_id: placeId }).catch(() => {});
        return new Response(
          JSON.stringify({ coordinates: cachedLocation.coordinates }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch from Google Place Details API
      const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
      if (!googleApiKey) {
        return new Response(
          JSON.stringify({ error: 'Google Places API key not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${googleApiKey}`;
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();
      
      const coordinates = detailsData.result?.geometry?.location 
        ? [detailsData.result.geometry.location.lng, detailsData.result.geometry.location.lat]
        : [0, 0];

      // Cache the coordinates
      await supabase
        .from('cached_locations')
        .update({ coordinates, last_accessed_at: new Date().toISOString() })
        .eq('place_id', placeId)
        .catch(() => {});

      console.log('Fetched and cached coordinates from Google API');
      return new Response(
        JSON.stringify({ coordinates }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Regular autocomplete search
    if (!query || query.trim().length < 3) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const searchQuery = query.trim().toLowerCase();
    console.log(`Searching locations for query: ${searchQuery}`);

    // Step 1: Check cache first using text search
    const { data: cachedResults } = await supabase
      .from('cached_locations')
      .select('place_id, place_name, main_text')
      .or(`place_name.ilike.%${searchQuery}%,main_text.ilike.%${searchQuery}%`)
      .limit(5);

    if (cachedResults && cachedResults.length >= 3) {
      console.log(`Returning ${cachedResults.length} cached results`);
      
      // Update access timestamps in background
      const placeIds = cachedResults.map(r => r.place_id);
      supabase
        .from('cached_locations')
        .update({ last_accessed_at: new Date().toISOString() })
        .in('place_id', placeIds)
        .then(() => {});

      const suggestions = cachedResults.map(result => ({
        id: result.place_id,
        place_name: result.place_name,
        text: result.main_text,
        coordinates: [0, 0], // Will be fetched on selection
        context: []
      }));

      return new Response(
        JSON.stringify({ suggestions, fromCache: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Step 2: Query Google Places Autocomplete API (NO Place Details calls!)
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!googleApiKey) {
      console.error('GOOGLE_PLACES_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'Google Places API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Use session token to reduce costs (bundles autocomplete requests)
    const sessionToken = crypto.randomUUID();
    const placesUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&components=country:lk&types=establishment|geocode&sessiontoken=${sessionToken}&key=${googleApiKey}`;
    
    const response = await fetch(placesUrl);
    const data = await response.json();

    console.log(`Google Places Autocomplete response status: ${data.status}`);

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.error_message);
      return new Response(
        JSON.stringify({ error: 'Failed to search locations' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!data.predictions || data.predictions.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Format suggestions WITHOUT fetching Place Details (coordinates fetched on selection)
    const suggestions = data.predictions.slice(0, 5).map((prediction: any) => ({
      id: prediction.place_id,
      place_name: prediction.description,
      text: prediction.structured_formatting?.main_text || prediction.description,
      coordinates: [0, 0], // Will be fetched when user selects
      context: prediction.terms || []
    }));

    // Cache the results in background (don't await)
    Promise.all(
      suggestions.map(async (suggestion: any) => {
        await supabase
          .from('cached_locations')
          .upsert({
            place_id: suggestion.id,
            place_name: suggestion.place_name,
            main_text: suggestion.text,
            search_terms: [searchQuery],
            last_accessed_at: new Date().toISOString()
          }, { onConflict: 'place_id' })
          .catch(() => {});
      })
    );

    console.log(`Returning ${suggestions.length} suggestions from Google API (1 API call only)`);

    return new Response(
      JSON.stringify({ suggestions, fromCache: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in search-locations:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to search locations' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
-- Create cached_locations table for storing previously searched locations
CREATE TABLE public.cached_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id TEXT NOT NULL UNIQUE,
  place_name TEXT NOT NULL,
  main_text TEXT NOT NULL,
  coordinates JSONB,
  search_terms TEXT[] DEFAULT '{}',
  hit_count INTEGER DEFAULT 1,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_cached_locations_place_id ON public.cached_locations(place_id);
CREATE INDEX idx_cached_locations_search_terms ON public.cached_locations USING GIN(search_terms);
CREATE INDEX idx_cached_locations_place_name ON public.cached_locations USING gin(to_tsvector('english', place_name));

-- Enable RLS
ALTER TABLE public.cached_locations ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read cached locations (for performance)
CREATE POLICY "Anyone can read cached locations" 
ON public.cached_locations 
FOR SELECT 
USING (true);

-- Allow edge functions (service role) to insert/update cached locations
CREATE POLICY "Service role can manage cached locations" 
ON public.cached_locations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.cached_locations IS 'Cache for Google Places API results to reduce API costs';
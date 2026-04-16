-- Table for storing saved routes and locations
CREATE TABLE IF NOT EXISTS public.saved_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_name TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    stops JSONB DEFAULT '[]'::jsonb,
    total_km NUMERIC NOT NULL DEFAULT 0,
    estimated_hours NUMERIC NOT NULL DEFAULT 0,
    parking_location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- RLS Policies
ALTER TABLE public.saved_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users"
    ON public.saved_routes FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users"
    ON public.saved_routes FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for all authenticated users"
    ON public.saved_routes FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users"
    ON public.saved_routes FOR DELETE
    USING (auth.role() = 'authenticated');

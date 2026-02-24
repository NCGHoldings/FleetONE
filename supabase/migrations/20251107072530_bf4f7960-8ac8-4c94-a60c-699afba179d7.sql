-- Add gl_code column to routes table for General Ledger export
ALTER TABLE public.routes 
ADD COLUMN gl_code TEXT;

-- Add an index for faster lookups
CREATE INDEX idx_routes_gl_code ON public.routes(gl_code);

-- Add a comment
COMMENT ON COLUMN public.routes.gl_code IS 'Short code for GL export (e.g., COL-BAD, KAN-GAL)';
-- Schema Hardening: Add company_id to core operational tables
-- This allows for robust multi-tenant isolation in future updates

-- 1. Routes Table
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
CREATE INDEX IF NOT EXISTS idx_routes_company ON public.routes(company_id);

-- 2. Buses Table
ALTER TABLE public.buses ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
CREATE INDEX IF NOT EXISTS idx_buses_company ON public.buses(company_id);

-- 3. School Routes Table
ALTER TABLE public.school_routes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
CREATE INDEX IF NOT EXISTS idx_school_routes_company ON public.school_routes(company_id);

-- 4. Data Population
-- Set a default company_id for existing records (using NAS ID as the historical default)
DO $$
DECLARE
    v_default_id UUID := 'eaf60d6b-ca4f-4dd0-a655-88bbf8f43742';
BEGIN
    -- Check if the default company exists before updating
    IF EXISTS (SELECT 1 FROM public.companies WHERE id = v_default_id) THEN
        UPDATE public.routes SET company_id = v_default_id WHERE company_id IS NULL;
        UPDATE public.buses SET company_id = v_default_id WHERE company_id IS NULL;
        UPDATE public.school_routes SET company_id = v_default_id WHERE company_id IS NULL;
    ELSE
        -- Fallback: Use the first available company
        SELECT id INTO v_default_id FROM public.companies LIMIT 1;
        IF v_default_id IS NOT NULL THEN
            UPDATE public.routes SET company_id = v_default_id WHERE company_id IS NULL;
            UPDATE public.buses SET company_id = v_default_id WHERE company_id IS NULL;
            UPDATE public.school_routes SET company_id = v_default_id WHERE company_id IS NULL;
        END IF;
    END IF;
END $$;

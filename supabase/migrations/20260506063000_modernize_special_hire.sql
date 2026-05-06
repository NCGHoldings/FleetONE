-- Modernize Special Hire Quotations and Submissions (Defensive Version)
DO $$ 
BEGIN 
    -- 1. Update public.special_hire_quotations
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'special_hire_quotations') THEN
        RAISE NOTICE 'Altering table public.special_hire_quotations...';
        
        -- Add branch column
        ALTER TABLE public.special_hire_quotations ADD COLUMN IF NOT EXISTS branch TEXT;
        
        -- Update hire_type constraint
        -- We try to find the constraint name first if it's not the default
        ALTER TABLE public.special_hire_quotations DROP CONSTRAINT IF EXISTS special_hire_quotations_hire_type_check;
        ALTER TABLE public.special_hire_quotations 
        ADD CONSTRAINT special_hire_quotations_hire_type_check 
        CHECK (hire_type IN ('Outside', 'Lyceum', 'Internal'));
        
        -- Fix RLS Policies
        DROP POLICY IF EXISTS "Public insert quotations" ON public.special_hire_quotations;
        CREATE POLICY "Public insert quotations" 
        ON public.special_hire_quotations 
        FOR INSERT 
        TO anon 
        WITH CHECK (true);
    ELSE
        RAISE WARNING 'Table public.special_hire_quotations NOT FOUND. Please check if the table name is correct or if it exists in a different schema.';
    END IF;

    -- 2. Update public.special_hire_submissions
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'special_hire_submissions') THEN
        RAISE NOTICE 'Altering table public.special_hire_submissions...';
        
        -- Add branch column
        ALTER TABLE public.special_hire_submissions ADD COLUMN IF NOT EXISTS branch TEXT;
        
        -- Fix RLS Policies
        DROP POLICY IF EXISTS "Allow anonymous submissions" ON public.special_hire_submissions;
        CREATE POLICY "Allow anonymous submissions" 
        ON public.special_hire_submissions 
        FOR INSERT 
        TO anon 
        WITH CHECK (true);
    ELSE
        RAISE WARNING 'Table public.special_hire_submissions NOT FOUND.';
    END IF;

    -- 3. Fix visibility for bus types
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bus_types') THEN
        RAISE NOTICE 'Fixing bus_types policies...';
        
        DROP POLICY IF EXISTS "Public read bus types" ON public.bus_types;
        CREATE POLICY "Public read bus types" 
        ON public.bus_types 
        FOR SELECT 
        TO anon 
        USING (is_active = true);
    ELSE
        RAISE WARNING 'Table public.bus_types NOT FOUND.';
    END IF;
END $$;

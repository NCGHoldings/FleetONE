-- Migration to add project_id and section_type to landed_cost_vouchers

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landed_cost_vouchers' AND column_name = 'project_id') THEN
        ALTER TABLE public.landed_cost_vouchers ADD COLUMN project_id UUID REFERENCES public.projects(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'landed_cost_vouchers' AND column_name = 'section_type') THEN
        ALTER TABLE public.landed_cost_vouchers ADD COLUMN section_type TEXT;
    END IF;
END $$;

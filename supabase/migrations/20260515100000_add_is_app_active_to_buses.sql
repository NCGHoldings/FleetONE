-- Migration: Add is_app_active column to public.buses

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'buses' 
        AND column_name = 'is_app_active'
    ) THEN
        ALTER TABLE public.buses ADD COLUMN is_app_active BOOLEAN DEFAULT false;
    END IF;
END $$;

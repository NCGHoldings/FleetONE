-- Migration: Add route_leader column to public.routes

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'routes' 
        AND column_name = 'route_leader'
    ) THEN
        ALTER TABLE public.routes ADD COLUMN route_leader TEXT;
    END IF;
END $$;

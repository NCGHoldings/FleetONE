-- Add master_config JSONB column to routes for Gamification and Cost configurations
ALTER TABLE public.routes
ADD COLUMN IF NOT EXISTS master_config JSONB DEFAULT '{}'::jsonb;

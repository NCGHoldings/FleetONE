-- Add ARI status column to accident_records table
ALTER TABLE public.accident_records 
ADD COLUMN IF NOT EXISTS ari_status text NOT NULL DEFAULT 'incomplete';

-- Add check constraint to ensure only valid values
ALTER TABLE public.accident_records 
ADD CONSTRAINT ari_status_check CHECK (ari_status IN ('complete', 'incomplete'));
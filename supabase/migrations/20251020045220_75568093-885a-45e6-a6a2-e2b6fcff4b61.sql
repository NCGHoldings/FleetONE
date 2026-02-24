-- Remove unique constraint on bl_number in accident_records table
-- This allows multiple records to have the same BL number or no BL number
-- Some companies don't have BL numbers, so we need to allow duplicates

ALTER TABLE public.accident_records 
DROP CONSTRAINT IF EXISTS accident_records_bl_number_key;

-- Add index for searching (non-unique) if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_accident_records_bl_number ON public.accident_records(bl_number) 
WHERE bl_number IS NOT NULL;
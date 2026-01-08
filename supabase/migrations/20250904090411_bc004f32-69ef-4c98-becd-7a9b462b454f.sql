-- Add new fields for trip status management and refund tracking
-- Add status enum values for trip management
DO $$ BEGIN
    CREATE TYPE trip_status AS ENUM ('draft', 'confirmed', 'paid', 'completed', 'cancelled', 'on_hold', 'no_bus_allocated', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alter the existing status column to use the new enum (it might fail if data exists, that's okay)
-- We'll keep the existing column as text for backward compatibility and add new fields

-- Add new columns to special_hire_quotations table
ALTER TABLE public.special_hire_quotations 
ADD COLUMN IF NOT EXISTS trip_status text DEFAULT 'confirmed',
ADD COLUMN IF NOT EXISTS cancellation_reason text,
ADD COLUMN IF NOT EXISTS status_changed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS status_changed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS refund_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_status text DEFAULT 'none' CHECK (refund_status IN ('none', 'pending', 'processed', 'completed')),
ADD COLUMN IF NOT EXISTS refund_processed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS refund_processed_at timestamp with time zone;

-- Update existing records to use new trip_status field
UPDATE public.special_hire_quotations 
SET trip_status = status 
WHERE trip_status IS NULL OR trip_status = 'confirmed';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quotations_trip_status ON public.special_hire_quotations(trip_status);
CREATE INDEX IF NOT EXISTS idx_quotations_refund_status ON public.special_hire_quotations(refund_status);

-- Create function to update status change timestamp
CREATE OR REPLACE FUNCTION public.update_trip_status_timestamp()
RETURNS trigger AS $$
BEGIN
  IF NEW.trip_status != OLD.trip_status THEN
    NEW.status_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status change timestamp
DROP TRIGGER IF EXISTS update_trip_status_trigger ON public.special_hire_quotations;
CREATE TRIGGER update_trip_status_trigger
  BEFORE UPDATE ON public.special_hire_quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trip_status_timestamp();
-- Add driver_id column to insurance_records table
ALTER TABLE public.insurance_records 
ADD COLUMN driver_id uuid REFERENCES public.profiles(user_id);

-- Add index for better query performance
CREATE INDEX idx_insurance_records_driver_id ON public.insurance_records(driver_id);
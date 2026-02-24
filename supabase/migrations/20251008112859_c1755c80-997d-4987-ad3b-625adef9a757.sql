-- Add emergency contact columns to school_students table
ALTER TABLE public.school_students 
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_number TEXT;
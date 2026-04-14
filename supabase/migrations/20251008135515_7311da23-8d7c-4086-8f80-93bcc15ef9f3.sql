-- Add remarks column to school_students table for special notes about each student
ALTER TABLE public.school_students 
ADD COLUMN IF NOT EXISTS remarks text;
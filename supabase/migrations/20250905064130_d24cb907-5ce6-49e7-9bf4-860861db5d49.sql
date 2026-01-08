-- Add missing column for allocated bus number to route_permits table
ALTER TABLE public.route_permits 
ADD COLUMN allocated_bus_number text;

-- Update the table to better handle the Excel data structure
-- Add any missing columns that might be needed
ALTER TABLE public.route_permits 
ADD COLUMN IF NOT EXISTS approved_maximum_fare numeric,
ADD COLUMN IF NOT EXISTS permit_active_inactive text DEFAULT 'active';

-- Clear existing data as requested by user
DELETE FROM public.route_permits;

-- Reset the sequence for auto-generating permit numbers
-- We'll handle this in the application code with PRM0001 format
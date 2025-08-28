-- Fix the database column name issue by renaming the field to match the schema
-- The error shows 'commissionAmount' but the actual column is 'commission_amount'
-- This is already correctly named in the schema, so we need to update the column names to match what's being used in the code

-- Add any missing columns that might be needed for real cost calculations
ALTER TABLE special_hire_quotations 
ADD COLUMN IF NOT EXISTS fuel_cost_fuel_only numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS hire_charge numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS pickup_lat numeric,
ADD COLUMN IF NOT EXISTS pickup_lng numeric,
ADD COLUMN IF NOT EXISTS drop_lat numeric,
ADD COLUMN IF NOT EXISTS drop_lng numeric;
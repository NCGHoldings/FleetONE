-- Update the global diesel price from 350 to 392 LKR per liter
-- This affects all calculations system-wide: Fuel Analytics, Conductor Fuel Entry, etc.
UPDATE public.fuel_settings 
SET diesel_price_lkr_per_l = 392.00
WHERE is_default = true;

-- Also update any non-default entries to keep them in sync
UPDATE public.fuel_settings 
SET diesel_price_lkr_per_l = 392.00;

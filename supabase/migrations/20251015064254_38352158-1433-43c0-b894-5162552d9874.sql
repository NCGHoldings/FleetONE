-- Add customerTotalWithFuel column to store the final customer total amount
ALTER TABLE special_hire_quotations 
ADD COLUMN IF NOT EXISTS customer_total_with_fuel NUMERIC DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN special_hire_quotations.customer_total_with_fuel IS 
'Final total amount customer pays including fuel, after all adjustments (commission pass-through, discounts, additional charges)';
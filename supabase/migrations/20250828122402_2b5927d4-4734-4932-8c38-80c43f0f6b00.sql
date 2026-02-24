-- Add new columns for tiered pricing structure
ALTER TABLE hire_rate_cards 
ADD COLUMN first_100km_rate_per_km_lkr numeric,
ADD COLUMN additional_km_rate_per_km_lkr numeric;

-- Update the table comment
COMMENT ON COLUMN hire_rate_cards.flat_fee_lkr IS 'Base flat fee for the hire';
COMMENT ON COLUMN hire_rate_cards.first_100km_rate_per_km_lkr IS 'Rate per KM for the first 100 kilometers';
COMMENT ON COLUMN hire_rate_cards.additional_km_rate_per_km_lkr IS 'Rate per KM for kilometers beyond 100';

-- Remove the old rate_per_km_lkr column as it's no longer needed for the new structure
-- (keeping it for now in case there's existing data, but will deprecate)
COMMENT ON COLUMN hire_rate_cards.rate_per_km_lkr IS 'DEPRECATED - Use first_100km_rate_per_km_lkr and additional_km_rate_per_km_lkr instead';
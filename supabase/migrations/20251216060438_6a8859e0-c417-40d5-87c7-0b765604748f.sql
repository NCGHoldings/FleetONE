-- Add representative_name and designation columns for company customers
ALTER TABLE yutong_quotations 
ADD COLUMN IF NOT EXISTS representative_name TEXT,
ADD COLUMN IF NOT EXISTS designation TEXT;

-- Add comment for clarity
COMMENT ON COLUMN yutong_quotations.representative_name IS 'Optional customer name when customer type is company';
COMMENT ON COLUMN yutong_quotations.designation IS 'Optional designation/role when customer type is company';
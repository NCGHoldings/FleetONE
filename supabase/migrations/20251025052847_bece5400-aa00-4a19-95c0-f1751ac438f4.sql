-- Add missing columns to yutong_quotations table for invoice generation
ALTER TABLE yutong_quotations 
ADD COLUMN IF NOT EXISTS seating_capacity TEXT,
ADD COLUMN IF NOT EXISTS attention_to TEXT;

-- Add helpful comment
COMMENT ON COLUMN yutong_quotations.seating_capacity IS 'Bus seating capacity (e.g., "51+1+1")';
COMMENT ON COLUMN yutong_quotations.attention_to IS 'Contact person name for invoice attention line';
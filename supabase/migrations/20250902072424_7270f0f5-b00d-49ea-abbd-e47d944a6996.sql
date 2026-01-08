-- Add missing quotation_no column to yutong_quotations table
ALTER TABLE yutong_quotations 
ADD COLUMN quotation_no text NOT NULL DEFAULT '';

-- Create a unique index on quotation_no to prevent duplicates
CREATE UNIQUE INDEX idx_yutong_quotations_quotation_no ON yutong_quotations(quotation_no);

-- Update existing records with a generated quotation number if any exist
UPDATE yutong_quotations 
SET quotation_no = 'YTQ-' || extract(epoch from created_at)::bigint::text 
WHERE quotation_no = '' OR quotation_no IS NULL;
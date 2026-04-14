-- Add customer linking fields to yutong_quotations table
ALTER TABLE public.yutong_quotations
ADD COLUMN IF NOT EXISTS main_customer_name text,
ADD COLUMN IF NOT EXISTS is_sub_customer boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS relationship_notes text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_main_customer_name ON public.yutong_quotations(main_customer_name);

-- Add comment for documentation
COMMENT ON COLUMN public.yutong_quotations.main_customer_name IS 'Links this quotation to a main customer name for grouping';
COMMENT ON COLUMN public.yutong_quotations.is_sub_customer IS 'Indicates if this quotation belongs to a sub-customer';
COMMENT ON COLUMN public.yutong_quotations.relationship_notes IS 'Notes about the relationship between main and sub-customer';
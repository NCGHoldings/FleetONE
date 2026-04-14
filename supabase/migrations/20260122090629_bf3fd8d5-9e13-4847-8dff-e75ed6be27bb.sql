-- Add description column to items table (if not exists)
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add company_id column to item_categories table for multi-company support
ALTER TABLE public.item_categories 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_item_categories_company ON public.item_categories(company_id);

-- Comment for documentation
COMMENT ON COLUMN public.item_categories.company_id IS 'Company ID for multi-company data isolation';
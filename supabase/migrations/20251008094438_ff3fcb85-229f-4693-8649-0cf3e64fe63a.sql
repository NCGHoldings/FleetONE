-- Add customer relationship fields to yutong_customers table
ALTER TABLE public.yutong_customers
ADD COLUMN IF NOT EXISTS parent_customer_id uuid REFERENCES public.yutong_customers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_main_customer boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS relationship_notes text;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_parent_customer ON public.yutong_customers(parent_customer_id);

-- Add comment for documentation
COMMENT ON COLUMN public.yutong_customers.parent_customer_id IS 'References the main customer if this is a sub-customer (family member, etc.)';
COMMENT ON COLUMN public.yutong_customers.is_main_customer IS 'True if this is a main customer account, false if sub-customer';
COMMENT ON COLUMN public.yutong_customers.relationship_notes IS 'Notes about relationship to main customer (e.g., Son, Daughter, Business Partner)';
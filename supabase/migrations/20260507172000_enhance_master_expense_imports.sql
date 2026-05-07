-- Migration: Enhance Master Expense Tracking
-- Description: Adds mapping_config and import_type to master_expense_imports for generic data pipelines.

ALTER TABLE public.master_expense_imports 
ADD COLUMN IF NOT EXISTS mapping_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS import_category TEXT DEFAULT 'Expense'; -- 'Expense', 'AP_Invoice', 'AP_Payment', 'Master_Data'

-- Add some helper columns to master_expense_records for easier generic mapping
ALTER TABLE public.master_expense_records
ADD COLUMN IF NOT EXISTS document_number TEXT,
ADD COLUMN IF NOT EXISTS external_reference TEXT,
ADD COLUMN IF NOT EXISTS vendor_name TEXT,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS business_unit TEXT,
ADD COLUMN IF NOT EXISTS chassis_no TEXT,
ADD COLUMN IF NOT EXISTS mapped_vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS mapped_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.master_expense_imports.mapping_config IS 'Stores the mapping of Excel headers to system database fields';

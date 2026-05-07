-- Add missing columns to gl_settings for Tax and Staff accounts
ALTER TABLE public.gl_settings 
ADD COLUMN IF NOT EXISTS input_tax_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tax_payable_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS staff_advance_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.gl_settings.input_tax_account_id IS 'Input VAT (AP side - asset)';
COMMENT ON COLUMN public.gl_settings.tax_payable_account_id IS 'Output VAT (AR side - liability)';
COMMENT ON COLUMN public.gl_settings.staff_advance_account_id IS 'IOU and Staff Advances (asset)';

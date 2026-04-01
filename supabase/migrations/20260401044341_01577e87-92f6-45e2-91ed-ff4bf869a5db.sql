-- Add bank detail columns to special_hire_quotations (point-in-time capture)
ALTER TABLE special_hire_quotations
ADD COLUMN IF NOT EXISTS payment_bank_name text,
ADD COLUMN IF NOT EXISTS payment_account_name text,
ADD COLUMN IF NOT EXISTS payment_account_no text;

-- Add bank detail columns to special_hire_finance_settings (configurable defaults)
ALTER TABLE special_hire_finance_settings
ADD COLUMN IF NOT EXISTS quotation_bank_name text DEFAULT 'Commercial Bank - Nugegoda',
ADD COLUMN IF NOT EXISTS quotation_account_name text DEFAULT 'NCG EXPRESS (PVT) LTD',
ADD COLUMN IF NOT EXISTS quotation_account_no text DEFAULT '1001077213';

-- Backfill existing quotations with old Sampath Bank details
UPDATE special_hire_quotations
SET payment_bank_name = 'Sampath Bank - Nugegoda',
    payment_account_name = 'NCG EXPRESS (PVT) LTD',
    payment_account_no = '1934 1401 7578'
WHERE payment_bank_name IS NULL;

-- Update existing finance settings rows with new Commercial Bank defaults
UPDATE special_hire_finance_settings
SET quotation_bank_name = 'Commercial Bank - Nugegoda',
    quotation_account_name = 'NCG EXPRESS (PVT) LTD',
    quotation_account_no = '1001077213'
WHERE quotation_bank_name IS NULL;
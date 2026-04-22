-- Add 'NCGH' (NCG Holding) to business_unit_code check constraints

-- 1. Update expense_requests
ALTER TABLE public.expense_requests DROP CONSTRAINT IF EXISTS expense_requests_business_unit_code_check;
ALTER TABLE public.expense_requests ADD CONSTRAINT expense_requests_business_unit_code_check 
    CHECK (business_unit_code IN ('SBO', 'SPH', 'YUT', 'SNT', 'LTV', 'NCGE', 'NCGH'));

-- 2. Update petty_cash_funds
ALTER TABLE public.petty_cash_funds DROP CONSTRAINT IF EXISTS petty_cash_funds_business_unit_code_check;
ALTER TABLE public.petty_cash_funds ADD CONSTRAINT petty_cash_funds_business_unit_code_check 
    CHECK (business_unit_code IN ('SBO', 'SPH', 'YUT', 'SNT', 'LTV', 'NCGE', 'NCGH'));

-- 3. Update iou_records
ALTER TABLE public.iou_records DROP CONSTRAINT IF EXISTS iou_records_business_unit_code_check;
ALTER TABLE public.iou_records ADD CONSTRAINT iou_records_business_unit_code_check 
    CHECK (business_unit_code IN ('SBO', 'SPH', 'YUT', 'SNT', 'LTV', 'NCGE', 'NCGH'));

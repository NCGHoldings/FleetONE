
-- Populate contact details for LIVE NCG Holdings parent company
UPDATE public.companies 
SET 
  phone = '+94 77 766 5501',
  email = 'info@ncgholdings.lk'
WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- Populate contact details for LIVE sub-companies (NCG Fleet Management)
UPDATE public.companies 
SET 
  phone = '+94 77 766 5501',
  email = 'info@ncgholdings.lk'
WHERE parent_company_id = 'a0000000-0000-0000-0000-000000000001'
  AND (phone IS NULL OR phone = '');

-- Notify PostgREST to pick up any changes
NOTIFY pgrst, 'reload schema';

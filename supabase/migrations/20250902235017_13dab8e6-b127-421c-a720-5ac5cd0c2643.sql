
-- Allow 'paid' and 'completed' statuses for special_hire_quotations

ALTER TABLE public.special_hire_quotations
DROP CONSTRAINT IF EXISTS special_hire_quotations_status_check;

ALTER TABLE public.special_hire_quotations
ADD CONSTRAINT special_hire_quotations_status_check
CHECK (status IN ('draft','sent','accepted','rejected','confirmed','declined','paid','completed'));

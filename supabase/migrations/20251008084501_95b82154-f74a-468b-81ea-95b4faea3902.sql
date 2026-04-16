-- Remove any default value from quotation_no column that might reference the old sequence
ALTER TABLE public.yutong_quotations 
ALTER COLUMN quotation_no DROP DEFAULT;

-- Ensure the trigger is properly set up to generate quotation numbers
DROP TRIGGER IF EXISTS set_yutong_quotation_no_trigger ON public.yutong_quotations;

CREATE TRIGGER set_yutong_quotation_no_trigger
BEFORE INSERT ON public.yutong_quotations
FOR EACH ROW
EXECUTE FUNCTION public.set_yutong_quotation_no();
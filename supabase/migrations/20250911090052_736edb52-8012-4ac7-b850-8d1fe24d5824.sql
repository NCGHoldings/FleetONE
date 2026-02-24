-- Create sequence for Yutong quotation numbers
CREATE SEQUENCE IF NOT EXISTS public.yutong_quotation_seq START 1;

-- Create function to generate Yutong quotation numbers
CREATE OR REPLACE FUNCTION public.generate_yutong_quotation_no()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  seq_val bigint;
BEGIN
  seq_val := nextval('public.yutong_quotation_seq');
  RETURN 'YTQ-' || lpad(seq_val::text, 6, '0');
END;
$$;

-- Create trigger function to set quotation number
CREATE OR REPLACE FUNCTION public.set_yutong_quotation_no()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.quotation_no IS NULL OR NEW.quotation_no = '' THEN
    NEW.quotation_no = public.generate_yutong_quotation_no();
  END IF;
  RETURN NEW;
END;
$$;

-- Update the default value for quotation_no column
ALTER TABLE public.yutong_quotations 
ALTER COLUMN quotation_no SET DEFAULT generate_yutong_quotation_no();

-- Create trigger to automatically set quotation number on insert
DROP TRIGGER IF EXISTS set_yutong_quotation_no_trigger ON public.yutong_quotations;
CREATE TRIGGER set_yutong_quotation_no_trigger
  BEFORE INSERT ON public.yutong_quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_yutong_quotation_no();
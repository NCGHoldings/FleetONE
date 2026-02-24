-- Drop the old sequence with CASCADE to handle dependencies
DROP SEQUENCE IF EXISTS public.yutong_quotation_seq CASCADE;

-- Create a new sequence for invoices (if they need one)
CREATE SEQUENCE IF NOT EXISTS public.yutong_invoice_seq START 1;

-- Update the generate_yutong_quotation_no function to use date-based format
CREATE OR REPLACE FUNCTION public.generate_yutong_quotation_no(quotation_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  date_str TEXT;
  pattern TEXT;
  last_no TEXT;
  next_num INTEGER;
BEGIN
  -- Format date as YYYYMMDD
  date_str := TO_CHAR(quotation_date, 'YYYYMMDD');
  pattern := 'YTQ-' || date_str || '-%';
  
  -- Get the highest quotation number for this date
  SELECT quotation_no INTO last_no
  FROM yutong_quotations
  WHERE quotation_no LIKE pattern
  ORDER BY quotation_no DESC
  LIMIT 1;
  
  -- Extract number and increment
  IF last_no IS NULL THEN
    next_num := 1;
  ELSE
    next_num := CAST(SUBSTRING(last_no FROM '\d{4}$') AS INTEGER) + 1;
  END IF;
  
  -- Return formatted quotation number
  RETURN 'YTQ-' || date_str || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$function$;

-- Update the trigger function to pass the creation date
CREATE OR REPLACE FUNCTION public.set_yutong_quotation_no()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.quotation_no IS NULL OR NEW.quotation_no = '' THEN
    NEW.quotation_no = public.generate_yutong_quotation_no(COALESCE(NEW.created_at::DATE, CURRENT_DATE));
  END IF;
  RETURN NEW;
END;
$function$;

-- Update yutong_invoices default if needed (set to use new invoice sequence)
ALTER TABLE public.yutong_invoices 
ALTER COLUMN invoice_no SET DEFAULT nextval('public.yutong_invoice_seq');
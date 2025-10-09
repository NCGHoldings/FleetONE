-- Fix generate_yutong_quotation_no to handle versioned quotation numbers
CREATE OR REPLACE FUNCTION public.generate_yutong_quotation_no(quotation_date date DEFAULT CURRENT_DATE)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  date_str TEXT;
  pattern TEXT;
  last_base_no TEXT;
  next_num INTEGER;
BEGIN
  -- Format date as YYYYMMDD
  date_str := TO_CHAR(quotation_date, 'YYYYMMDD');
  pattern := 'YTQ-' || date_str || '-%';
  
  -- Get the highest base quotation number for this date (strip version suffix)
  SELECT REGEXP_REPLACE(quotation_no, '-v.*$', '') INTO last_base_no
  FROM yutong_quotations
  WHERE quotation_no LIKE pattern
  ORDER BY REGEXP_REPLACE(quotation_no, '-v.*$', '') DESC
  LIMIT 1;
  
  -- Extract the 4-digit sequence number and increment
  IF last_base_no IS NULL THEN
    next_num := 1;
  ELSE
    -- Extract the last 4 digits from the base quotation number (before any version)
    next_num := CAST(SUBSTRING(last_base_no FROM '\d{4}$') AS INTEGER) + 1;
  END IF;
  
  -- Return formatted base quotation number (without version suffix)
  RETURN 'YTQ-' || date_str || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$function$;
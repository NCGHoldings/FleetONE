-- Fix set_initial_yutong_quotation_version trigger to use actual version number
CREATE OR REPLACE FUNCTION public.set_initial_yutong_quotation_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only apply to new records (not updates)
  IF TG_OP = 'INSERT' THEN
    -- Set version number to 1.0 if not already set
    IF NEW.version_number IS NULL OR NEW.version_number = '' THEN
      NEW.version_number = '1.0';
    END IF;
    
    -- Add version suffix to quotation number if not already present
    -- FIXED: Use actual NEW.version_number instead of hardcoding 1.0
    IF NEW.quotation_no IS NOT NULL AND NEW.quotation_no != '' AND NEW.quotation_no NOT LIKE '%-v%' THEN
      NEW.quotation_no = NEW.quotation_no || '-v' || NEW.version_number;
    END IF;
    
    -- Set as active version if not specified
    IF NEW.is_active_version IS NULL THEN
      NEW.is_active_version = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
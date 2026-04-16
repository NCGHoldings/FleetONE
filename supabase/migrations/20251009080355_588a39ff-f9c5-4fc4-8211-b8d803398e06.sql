-- Drop existing triggers that cause race conditions
DROP TRIGGER IF EXISTS set_yutong_quotation_no_trigger ON yutong_quotations;
DROP TRIGGER IF EXISTS set_yutong_quotation_version_trigger ON yutong_quotations;

-- Drop old functions
DROP FUNCTION IF EXISTS set_yutong_quotation_no();
DROP FUNCTION IF EXISTS set_initial_yutong_quotation_version();

-- Create unified function to handle quotation number and versioning
CREATE OR REPLACE FUNCTION public.set_yutong_quotation_details()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only apply to new records (INSERT operations)
  IF TG_OP = 'INSERT' THEN
    
    -- Step 1: Generate base quotation_no if not provided
    IF NEW.quotation_no IS NULL OR NEW.quotation_no = '' THEN
      NEW.quotation_no = public.generate_yutong_quotation_no(COALESCE(NEW.created_at::DATE, CURRENT_DATE));
    END IF;
    
    -- Step 2: Handle versioning for new quotations (without parent)
    IF NEW.parent_quotation_id IS NULL THEN
      -- Set version number to 1.0 if not already set
      IF NEW.version_number IS NULL OR NEW.version_number = '' THEN
        NEW.version_number = '1.0';
      END IF;
      
      -- Add version suffix to quotation number if not already present
      IF NEW.quotation_no NOT LIKE '%-v%' THEN
        NEW.quotation_no = NEW.quotation_no || '-v1.0';
      END IF;
    END IF;
    -- For edited quotations (with parent), the application provides the complete versioned quotation_no
    
    -- Step 3: Set as active version if not specified
    IF NEW.is_active_version IS NULL THEN
      NEW.is_active_version = true;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create single trigger to handle all quotation details
CREATE TRIGGER set_yutong_quotation_details_trigger
  BEFORE INSERT ON yutong_quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_yutong_quotation_details();
-- Add versioning columns to yutong_quotations table
ALTER TABLE public.yutong_quotations
ADD COLUMN parent_quotation_id UUID REFERENCES public.yutong_quotations(id),
ADD COLUMN version_number TEXT DEFAULT '1.0',
ADD COLUMN edit_type TEXT,
ADD COLUMN edit_reason TEXT,
ADD COLUMN is_active_version BOOLEAN DEFAULT true;

-- Create indexes for performance
CREATE INDEX idx_yutong_quotations_parent_id ON public.yutong_quotations(parent_quotation_id);
CREATE INDEX idx_yutong_quotations_parent_version ON public.yutong_quotations(parent_quotation_id, version_number);
CREATE INDEX idx_yutong_quotations_active_version ON public.yutong_quotations(is_active_version);

-- Create trigger function to set initial version for new quotations
CREATE OR REPLACE FUNCTION public.set_initial_yutong_quotation_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only apply to new records (not updates)
  IF TG_OP = 'INSERT' THEN
    -- Set version number to 1.0 if not already set
    IF NEW.version_number IS NULL OR NEW.version_number = '' THEN
      NEW.version_number = '1.0';
    END IF;
    
    -- Add version suffix to quotation number if not already present
    IF NEW.quotation_no IS NOT NULL AND NEW.quotation_no != '' AND NEW.quotation_no NOT LIKE '%-v%' THEN
      NEW.quotation_no = NEW.quotation_no || '-v1.0';
    END IF;
    
    -- Set as active version if not specified
    IF NEW.is_active_version IS NULL THEN
      NEW.is_active_version = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER set_yutong_quotation_version_trigger
BEFORE INSERT ON public.yutong_quotations
FOR EACH ROW
EXECUTE FUNCTION public.set_initial_yutong_quotation_version();
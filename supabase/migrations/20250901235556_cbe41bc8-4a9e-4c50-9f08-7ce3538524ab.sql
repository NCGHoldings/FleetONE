-- Add percentage_adjustment field to special_hire_quotations table
ALTER TABLE public.special_hire_quotations 
ADD COLUMN percentage_adjustment numeric DEFAULT 0;

-- Add audit_log column to track changes
ALTER TABLE public.special_hire_quotations 
ADD COLUMN audit_log jsonb DEFAULT '[]'::jsonb;

-- Create index for better performance on audit_log queries
CREATE INDEX idx_special_hire_quotations_audit_log ON public.special_hire_quotations USING GIN(audit_log);

-- Add comments for documentation
COMMENT ON COLUMN public.special_hire_quotations.percentage_adjustment IS 'Percentage adjustment applied to total cost (positive for surcharge, negative for discount)';
COMMENT ON COLUMN public.special_hire_quotations.audit_log IS 'Audit trail of changes made to quotation';
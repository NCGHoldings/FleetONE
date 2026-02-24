-- Add approval workflow for discount handling (excluding existing columns)

-- Create approval status enum
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Add new columns for approval workflow and discount separation
ALTER TABLE public.special_hire_quotations 
ADD COLUMN approval_status approval_status DEFAULT 'approved',
ADD COLUMN approved_by uuid REFERENCES auth.users(id),
ADD COLUMN approval_date timestamp with time zone,
ADD COLUMN approval_comments text,
ADD COLUMN discount_percentage numeric DEFAULT 0;

-- Update existing quotations to have approved status (backward compatibility)
UPDATE public.special_hire_quotations 
SET approval_status = 'approved' 
WHERE approval_status IS NULL;

-- Add indexes for better performance
CREATE INDEX idx_special_hire_quotations_approval_status ON public.special_hire_quotations(approval_status);
CREATE INDEX idx_special_hire_quotations_approved_by ON public.special_hire_quotations(approved_by);
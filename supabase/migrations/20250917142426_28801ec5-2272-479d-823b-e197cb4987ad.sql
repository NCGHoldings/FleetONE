-- Add foreign key relationship between special_hire_quotations and profiles
ALTER TABLE public.special_hire_quotations 
ADD CONSTRAINT fk_special_hire_quotations_created_by 
FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Update existing records to set created_by from auth context if possible
-- This will help with existing quotations that don't have creator info
UPDATE public.special_hire_quotations 
SET created_by = auth.uid() 
WHERE created_by IS NULL AND auth.uid() IS NOT NULL;
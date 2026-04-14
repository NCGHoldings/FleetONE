-- Add submission_id to quotations to link quotations to their originating submission
ALTER TABLE public.special_hire_quotations
ADD COLUMN IF NOT EXISTS submission_id uuid REFERENCES public.special_hire_submissions(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_quotations_submission_id ON public.special_hire_quotations(submission_id);

-- Add quotation_id to submissions to track the generated quotation
ALTER TABLE public.special_hire_submissions
ADD COLUMN IF NOT EXISTS quotation_id uuid REFERENCES public.special_hire_quotations(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_submissions_quotation_id ON public.special_hire_submissions(quotation_id);
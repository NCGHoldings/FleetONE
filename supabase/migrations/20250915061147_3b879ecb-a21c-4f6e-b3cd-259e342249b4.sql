-- Fix feedback_complaints table to allow anonymous submissions
-- Make reported_by nullable to support anonymous complaints
ALTER TABLE public.feedback_complaints 
ALTER COLUMN reported_by DROP NOT NULL;

-- Add a comment to clarify the purpose
COMMENT ON COLUMN public.feedback_complaints.reported_by IS 'User ID of the person who reported the complaint. NULL for anonymous submissions.';
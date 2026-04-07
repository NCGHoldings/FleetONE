
-- Drop the existing public complaint insert policy and recreate to allow good_feedback type too
DROP POLICY IF EXISTS "Allow public complaint submissions" ON public.feedback_complaints;

CREATE POLICY "Allow public complaint submissions"
ON public.feedback_complaints
FOR INSERT
TO anon
WITH CHECK (
  type IN ('complaint', 'good_feedback')
  AND status = 'new'
  AND reported_by IS NULL
  AND escalation_level = 1
);

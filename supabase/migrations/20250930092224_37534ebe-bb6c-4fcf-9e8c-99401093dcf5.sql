-- Add DELETE policy for feedback_complaints
CREATE POLICY "Supervisors can delete feedback"
ON public.feedback_complaints
FOR DELETE
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role)
);
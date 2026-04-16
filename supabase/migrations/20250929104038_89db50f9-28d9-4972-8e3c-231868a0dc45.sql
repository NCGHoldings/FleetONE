-- Add DELETE policy for daily_trips table to allow supervisors to delete trips
CREATE POLICY "Supervisors can delete daily trips" 
ON public.daily_trips 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));
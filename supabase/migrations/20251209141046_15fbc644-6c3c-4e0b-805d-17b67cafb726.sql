-- Add RLS policy for users with trips_analytics page permission
CREATE POLICY "Users with trips_analytics page permission can view trips"
ON public.daily_trips
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_page_permissions
    WHERE user_id = auth.uid()
    AND page_identifier = 'trips_analytics'
    AND has_access = true
  )
);
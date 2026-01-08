-- Fix the NSP Daily Sales UPDATE policy that was using incorrect JWT claims
-- Drop the broken UPDATE policy
DROP POLICY IF EXISTS "Admins and supervisors can update NSP sales" ON public.nsp_daily_sales;

-- Create correct UPDATE policy using has_role() function
CREATE POLICY "Admins and supervisors can update NSP sales" ON public.nsp_daily_sales
FOR UPDATE 
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor')
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor')
);
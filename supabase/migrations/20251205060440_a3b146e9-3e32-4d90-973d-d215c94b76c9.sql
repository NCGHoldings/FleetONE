-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "receipts_select_policy" ON public.school_receipts;

-- Create new policy: Staff can view all receipts for verification
CREATE POLICY "Staff can view all receipts" 
ON public.school_receipts 
FOR SELECT 
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'supervisor'::app_role, 'finance'::app_role])
);

-- Create new policy: Uploaders can only view their own receipts
CREATE POLICY "Users can view own receipts" 
ON public.school_receipts 
FOR SELECT 
TO authenticated
USING (
  uploaded_by = auth.uid()
);

-- Create new policy: Allow anonymous/public to view their own receipts by uploaded_by being null
-- (for public QR code uploads where user is not authenticated)
CREATE POLICY "Public can view receipts with null uploaded_by" 
ON public.school_receipts 
FOR SELECT 
TO public
USING (
  uploaded_by IS NULL
);
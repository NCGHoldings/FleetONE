-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone can upload receipts" ON public.school_receipts;
DROP POLICY IF EXISTS "Users can view receipts" ON public.school_receipts;

-- Create a policy that allows anyone (authenticated or anonymous) to insert receipts
CREATE POLICY "Allow receipt uploads"
ON public.school_receipts
FOR INSERT
WITH CHECK (true);

-- Create a policy for viewing receipts
CREATE POLICY "Allow viewing receipts"
ON public.school_receipts
FOR SELECT
USING (uploaded_by = auth.uid() OR uploaded_by IS NULL OR auth.role() = 'authenticated');
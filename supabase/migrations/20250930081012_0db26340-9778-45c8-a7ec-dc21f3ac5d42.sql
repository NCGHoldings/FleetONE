-- Allow anonymous users to upload receipts (parents submitting via public form)
DROP POLICY IF EXISTS "Parents can upload receipts" ON public.school_receipts;

CREATE POLICY "Anyone can upload receipts"
ON public.school_receipts
FOR INSERT
TO public
WITH CHECK (true);

-- Add comment
COMMENT ON POLICY "Anyone can upload receipts" ON public.school_receipts 
IS 'Allows parents to submit payment receipts via public form without authentication';
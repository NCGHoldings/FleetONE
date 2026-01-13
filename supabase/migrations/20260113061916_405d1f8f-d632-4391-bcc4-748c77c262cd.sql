-- Add RLS policies for lightvehicle_quotation_signatures table
CREATE POLICY "Authenticated users can view signatures" 
ON public.lightvehicle_quotation_signatures
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create signatures" 
ON public.lightvehicle_quotation_signatures
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update signatures" 
ON public.lightvehicle_quotation_signatures
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete signatures" 
ON public.lightvehicle_quotation_signatures
FOR DELETE
TO authenticated
USING (true);
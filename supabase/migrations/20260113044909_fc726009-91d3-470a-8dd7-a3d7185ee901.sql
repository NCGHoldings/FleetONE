-- Allow authenticated users to SELECT all quotations
CREATE POLICY "Authenticated users can view quotations" 
ON public.lightvehicle_quotations
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to INSERT new quotations
CREATE POLICY "Authenticated users can create quotations" 
ON public.lightvehicle_quotations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to UPDATE quotations
CREATE POLICY "Authenticated users can update quotations" 
ON public.lightvehicle_quotations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to DELETE quotations
CREATE POLICY "Authenticated users can delete quotations" 
ON public.lightvehicle_quotations
FOR DELETE
TO authenticated
USING (true);
-- Allow authenticated users to SELECT all vehicle models
CREATE POLICY "Authenticated users can view vehicle models" 
ON public.lightvehicle_models
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to INSERT new vehicle models
CREATE POLICY "Authenticated users can create vehicle models" 
ON public.lightvehicle_models
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to UPDATE vehicle models
CREATE POLICY "Authenticated users can update vehicle models" 
ON public.lightvehicle_models
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to DELETE vehicle models
CREATE POLICY "Authenticated users can delete vehicle models" 
ON public.lightvehicle_models
FOR DELETE
TO authenticated
USING (true);
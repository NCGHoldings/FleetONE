-- Drop ALL existing policies on school_receipts
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'school_receipts' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.school_receipts';
    END LOOP;
END $$;

-- Create simple policy that allows anyone to insert
CREATE POLICY "receipts_insert_policy"
ON public.school_receipts
FOR INSERT
WITH CHECK (true);

-- Create policy for viewing receipts (authenticated users can see all, or their own)
CREATE POLICY "receipts_select_policy"
ON public.school_receipts
FOR SELECT
USING (
    auth.role() = 'authenticated' OR 
    uploaded_by = auth.uid() OR 
    uploaded_by IS NULL
);
-- Allow anonymous users (public form) to insert into conductor_submissions
DROP POLICY IF EXISTS "Allow public to submit (anonymous)" ON public.conductor_submissions;
CREATE POLICY "Allow public to submit (anonymous)"
  ON public.conductor_submissions FOR INSERT
  TO anon
  WITH CHECK (true);

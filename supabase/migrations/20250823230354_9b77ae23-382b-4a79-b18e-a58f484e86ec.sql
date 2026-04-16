-- Allow supervisors to insert routes (for Excel import)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'routes' AND policyname = 'Supervisors can insert routes'
  ) THEN
    CREATE POLICY "Supervisors can insert routes"
    ON public.routes
    FOR INSERT
    TO authenticated
    WITH CHECK (
      has_role(auth.uid(), 'super_admin'::app_role) OR 
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'supervisor'::app_role)
    );
  END IF;
END $$;

-- Allow supervisors to insert profiles (to create stub staff for allocations)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Supervisors can insert profiles'
  ) THEN
    CREATE POLICY "Supervisors can insert profiles"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
      has_role(auth.uid(), 'super_admin'::app_role) OR 
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'supervisor'::app_role)
    );
  END IF;
END $$;
-- Allow public access to fleet_master_roster for Conductor App auto-fill
CREATE POLICY "Public users can view fleet roster"
  ON public.fleet_master_roster FOR SELECT
  TO anon USING (true);

CREATE POLICY "Public users can view buses"
  ON public.buses FOR SELECT
  TO anon USING (true);

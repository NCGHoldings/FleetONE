-- Add public read access to fuel_settings so the Conductor Upload portal can read the live diesel price
CREATE POLICY "Allow public read access to fuel_settings" ON public.fuel_settings FOR SELECT USING (true);

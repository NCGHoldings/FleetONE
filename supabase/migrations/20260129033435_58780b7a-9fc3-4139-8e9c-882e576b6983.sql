-- Add missing columns to lightvehicle_customer_payments
ALTER TABLE public.lightvehicle_customer_payments
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS cheque_no TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- Backfill status for existing records based on verified flag
UPDATE public.lightvehicle_customer_payments 
SET status = CASE WHEN verified = true THEN 'verified' ELSE 'pending' END,
    verification_status = CASE WHEN verified = true THEN 'verified' ELSE 'pending' END
WHERE status IS NULL OR verification_status IS NULL;

-- Fix RLS policy for customer_payments (currently targets public, should be authenticated)
DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_customer_payments" ON public.lightvehicle_customer_payments;
DROP POLICY IF EXISTS "authenticated_users_manage_payments" ON public.lightvehicle_customer_payments;

CREATE POLICY "Authenticated users can manage lightvehicle_customer_payments" 
  ON public.lightvehicle_customer_payments 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Add RLS policies for lightvehicle_addons
DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_addons" ON public.lightvehicle_addons;
CREATE POLICY "Authenticated users can manage lightvehicle_addons" 
  ON public.lightvehicle_addons 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Add RLS policies for lightvehicle_customers
DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_customers" ON public.lightvehicle_customers;
CREATE POLICY "Authenticated users can manage lightvehicle_customers" 
  ON public.lightvehicle_customers 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Add RLS policies for lightvehicle_customization_options
DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_customization_options" ON public.lightvehicle_customization_options;
CREATE POLICY "Authenticated users can manage lightvehicle_customization_options" 
  ON public.lightvehicle_customization_options 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Add RLS policies for lightvehicle_model_images
DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_model_images" ON public.lightvehicle_model_images;
CREATE POLICY "Authenticated users can manage lightvehicle_model_images" 
  ON public.lightvehicle_model_images 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Add RLS policies for lightvehicle_referral_commission_payments
DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_referral_commission_payments" ON public.lightvehicle_referral_commission_payments;
CREATE POLICY "Authenticated users can manage lightvehicle_referral_commission_payments" 
  ON public.lightvehicle_referral_commission_payments 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Add RLS policies for lightvehicle_responsible_persons
DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_responsible_persons" ON public.lightvehicle_responsible_persons;
CREATE POLICY "Authenticated users can manage lightvehicle_responsible_persons" 
  ON public.lightvehicle_responsible_persons 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Add RLS policies for lightvehicle_shipment_group_orders
DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_shipment_group_orders" ON public.lightvehicle_shipment_group_orders;
CREATE POLICY "Authenticated users can manage lightvehicle_shipment_group_orders" 
  ON public.lightvehicle_shipment_group_orders 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Add RLS policies for lightvehicle_shipment_groups
DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_shipment_groups" ON public.lightvehicle_shipment_groups;
CREATE POLICY "Authenticated users can manage lightvehicle_shipment_groups" 
  ON public.lightvehicle_shipment_groups 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Add RLS policies for lightvehicle_vehicle_data_sheets
DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_vehicle_data_sheets" ON public.lightvehicle_vehicle_data_sheets;
CREATE POLICY "Authenticated users can manage lightvehicle_vehicle_data_sheets" 
  ON public.lightvehicle_vehicle_data_sheets 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Add RLS policies for lightvehicle_vehicle_records
DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_vehicle_records" ON public.lightvehicle_vehicle_records;
CREATE POLICY "Authenticated users can manage lightvehicle_vehicle_records" 
  ON public.lightvehicle_vehicle_records 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);
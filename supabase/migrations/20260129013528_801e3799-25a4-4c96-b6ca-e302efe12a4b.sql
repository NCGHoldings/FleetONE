-- Fix missing RLS policies for Light Vehicle tables
-- These tables currently only have service_role policies

-- 1. lightvehicle_orders
CREATE POLICY "Authenticated users can view lightvehicle_orders" 
  ON public.lightvehicle_orders 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can insert lightvehicle_orders" 
  ON public.lightvehicle_orders 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update lightvehicle_orders" 
  ON public.lightvehicle_orders 
  FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can delete lightvehicle_orders" 
  ON public.lightvehicle_orders 
  FOR DELETE 
  TO authenticated 
  USING (true);

-- 2. lightvehicle_order_tasks
CREATE POLICY "Authenticated users can manage lightvehicle_order_tasks" 
  ON public.lightvehicle_order_tasks 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 3. lightvehicle_payment_schedules
CREATE POLICY "Authenticated users can manage lightvehicle_payment_schedules" 
  ON public.lightvehicle_payment_schedules 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 4. lightvehicle_quotation_addons
CREATE POLICY "Authenticated users can manage lightvehicle_quotation_addons" 
  ON public.lightvehicle_quotation_addons 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 5. lightvehicle_invoice_records
CREATE POLICY "Authenticated users can manage lightvehicle_invoice_records" 
  ON public.lightvehicle_invoice_records 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 6. lightvehicle_invoice_documents
CREATE POLICY "Authenticated users can manage lightvehicle_invoice_documents" 
  ON public.lightvehicle_invoice_documents 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 7. lightvehicle_invoice_signatures
CREATE POLICY "Authenticated users can manage lightvehicle_invoice_signatures" 
  ON public.lightvehicle_invoice_signatures 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);
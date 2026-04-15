-- Clean up duplicate/redundant policies on school_receipts
DROP POLICY IF EXISTS "Authenticated users can insert receipts" ON public.school_receipts;

-- Clean up duplicate SELECT policies on magiya_daily_reports (keep admin-managed one)
DROP POLICY IF EXISTS "Allow public select on magiya reports" ON public.magiya_daily_reports;

-- Add policies for vendor portal tables so the OTP flow works via service_role 
-- but normal users cannot access
CREATE POLICY "Service role full access vendor_portal_access" 
ON public.vendor_portal_access FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access vendor_portal_sessions" 
ON public.vendor_portal_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view vendor invoices" 
ON public.vendor_submitted_invoices FOR SELECT TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Service role full access vendor_submitted_invoices" 
ON public.vendor_submitted_invoices FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage webhooks" 
ON public.webhook_endpoints FOR ALL TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Service role full access webhook_endpoints" 
ON public.webhook_endpoints FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view webhook deliveries" 
ON public.webhook_deliveries FOR SELECT TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Service role full access webhook_deliveries" 
ON public.webhook_deliveries FOR ALL TO service_role USING (true) WITH CHECK (true);
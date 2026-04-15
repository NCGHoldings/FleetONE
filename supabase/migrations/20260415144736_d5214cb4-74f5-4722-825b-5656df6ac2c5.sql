
-- 1. Fix magiya_daily_reports: Remove overly permissive public policy
DROP POLICY IF EXISTS "service role full access" ON magiya_daily_reports;

CREATE POLICY "Authenticated users can view reports"
ON magiya_daily_reports FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage reports"
ON magiya_daily_reports FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- 2. Fix magiya_passenger_bookings: Enable RLS
ALTER TABLE magiya_passenger_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view bookings"
ON magiya_passenger_bookings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage bookings"
ON magiya_passenger_bookings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- 3. Fix payroll_records: Restrict to finance/admin only
DROP POLICY IF EXISTS "All authenticated users can view payroll" ON payroll_records;

CREATE POLICY "Finance and admins can view payroll"
ON payroll_records FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role) 
  OR public.has_role(auth.uid(), 'admin'::app_role) 
  OR public.has_role(auth.uid(), 'finance'::app_role)
);

-- 4. Fix vendor portal tables: Enable RLS
ALTER TABLE IF EXISTS vendor_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vendor_portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vendor_submitted_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Vendor portal access: admin-only management
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_portal_access' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "Admins manage vendor access" ON vendor_portal_access FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role) OR public.has_role(auth.uid(), ''super_admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role) OR public.has_role(auth.uid(), ''super_admin''::app_role))';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_portal_sessions' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "Admins manage vendor sessions" ON vendor_portal_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role) OR public.has_role(auth.uid(), ''super_admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role) OR public.has_role(auth.uid(), ''super_admin''::app_role))';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_submitted_invoices' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "Admins manage vendor invoices" ON vendor_submitted_invoices FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role) OR public.has_role(auth.uid(), ''super_admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role) OR public.has_role(auth.uid(), ''super_admin''::app_role))';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_endpoints' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "Admins manage webhooks" ON webhook_endpoints FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role) OR public.has_role(auth.uid(), ''super_admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role) OR public.has_role(auth.uid(), ''super_admin''::app_role))';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_deliveries' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "Admins manage webhook deliveries" ON webhook_deliveries FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role) OR public.has_role(auth.uid(), ''super_admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role) OR public.has_role(auth.uid(), ''super_admin''::app_role))';
  END IF;
END $$;

-- 5. Fix school_receipts: Require authentication for inserts
DROP POLICY IF EXISTS "receipts_insert_policy" ON school_receipts;

CREATE POLICY "Authenticated users can insert receipts"
ON school_receipts FOR INSERT TO authenticated
WITH CHECK (true);

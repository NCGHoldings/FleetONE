-- Migration: Broaden Yutong Invoice RLS policies
-- Problem: yutong_invoice_records and yutong_invoice_documents were locked to
--          super_admin only, blocking admin/finance users from approving invoices.
-- Fix: Allow has_any_role(['super_admin', 'admin', 'finance']) for all operations.

BEGIN;

-- yutong_invoice_documents
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'yutong_invoice_documents' AND schemaname = 'public')
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.yutong_invoice_documents'; END LOOP;
END $$;

CREATE POLICY "Finance roles read access" ON public.yutong_invoice_documents FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));
CREATE POLICY "Finance roles insert access" ON public.yutong_invoice_documents FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));
CREATE POLICY "Finance roles update access" ON public.yutong_invoice_documents FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));
CREATE POLICY "Finance roles delete access" ON public.yutong_invoice_documents FOR DELETE USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- yutong_invoice_records
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'yutong_invoice_records' AND schemaname = 'public')
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.yutong_invoice_records'; END LOOP;
END $$;

CREATE POLICY "Finance roles read access" ON public.yutong_invoice_records FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));
CREATE POLICY "Finance roles insert access" ON public.yutong_invoice_records FOR INSERT WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));
CREATE POLICY "Finance roles update access" ON public.yutong_invoice_records FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));
CREATE POLICY "Finance roles delete access" ON public.yutong_invoice_records FOR DELETE USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

COMMIT;
-- Fix RLS policies for yutong_invoice_records and yutong_invoice_documents
-- The migration 20260415000001 accidentally restricted these to super_admin only,
-- preventing regular admin/finance users from creating invoices.

-- =============================================
-- yutong_invoice_records
-- =============================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'yutong_invoice_records' AND schemaname = 'public')
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.yutong_invoice_records';
  END LOOP;
END $$;

CREATE POLICY "yutong_invoice_records_select"
  ON public.yutong_invoice_records FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance','supervisor']::app_role[]));

CREATE POLICY "yutong_invoice_records_insert"
  ON public.yutong_invoice_records FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance','supervisor']::app_role[]));

CREATE POLICY "yutong_invoice_records_update"
  ON public.yutong_invoice_records FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance','supervisor']::app_role[]));

CREATE POLICY "yutong_invoice_records_delete"
  ON public.yutong_invoice_records FOR DELETE
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::app_role[]));

-- =============================================
-- yutong_invoice_documents
-- =============================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'yutong_invoice_documents' AND schemaname = 'public')
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.yutong_invoice_documents';
  END LOOP;
END $$;

CREATE POLICY "yutong_invoice_documents_select"
  ON public.yutong_invoice_documents FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance','supervisor']::app_role[]));

CREATE POLICY "yutong_invoice_documents_insert"
  ON public.yutong_invoice_documents FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance','supervisor']::app_role[]));

CREATE POLICY "yutong_invoice_documents_update"
  ON public.yutong_invoice_documents FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance','supervisor']::app_role[]));

CREATE POLICY "yutong_invoice_documents_delete"
  ON public.yutong_invoice_documents FOR DELETE
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::app_role[]));

-- =============================================
-- yutong_invoice_signatures (also likely super_admin only)
-- =============================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'yutong_invoice_signatures' AND schemaname = 'public')
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.yutong_invoice_signatures';
  END LOOP;
END $$;

CREATE POLICY "yutong_invoice_signatures_select"
  ON public.yutong_invoice_signatures FOR SELECT
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance','supervisor']::app_role[]));

CREATE POLICY "yutong_invoice_signatures_insert"
  ON public.yutong_invoice_signatures FOR INSERT
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance','supervisor']::app_role[]));

CREATE POLICY "yutong_invoice_signatures_update"
  ON public.yutong_invoice_signatures FOR UPDATE
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','admin','finance','supervisor']::app_role[]));

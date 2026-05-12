-- =====================================================================
-- FIX: bank_reconciliation_items RLS — allow authenticated finance users
-- The hardening migration (20260415000001) locked this table to super_admin
-- only, silently blocking ALL draft reconciliation saves for regular users.
-- This migration re-opens authenticated access for CRUD operations.
-- =====================================================================

-- 1. Drop all existing super_admin-only policies
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies
    WHERE tablename = 'bank_reconciliation_items' AND schemaname = 'public'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.bank_reconciliation_items';
  END LOOP;
END $$;

-- 2. Create open authenticated policies (matches other finance tables like bank_reconciliations)
CREATE POLICY "Authenticated select bank_reconciliation_items"
  ON public.bank_reconciliation_items FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated insert bank_reconciliation_items"
  ON public.bank_reconciliation_items FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update bank_reconciliation_items"
  ON public.bank_reconciliation_items FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated delete bank_reconciliation_items"
  ON public.bank_reconciliation_items FOR DELETE
  TO authenticated USING (true);

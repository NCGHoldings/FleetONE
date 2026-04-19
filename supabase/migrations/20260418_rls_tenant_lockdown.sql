-- Migration: Phase 3 RLS Lockdown
-- Ensures military-grade tenant isolation at the PostgreSQL core.
-- Malicious requests that bypass the frontend will still be universally hard-blocked by these rules.

BEGIN;

-- 1. Create the Master Tenant Validation Function
-- This function acts as the "Bouncer", inspecting every single row read/written
CREATE OR REPLACE FUNCTION public.can_access_tenant_record(
  target_company_id UUID,
  target_business_unit_code TEXT DEFAULT NULL,
  target_document_number TEXT DEFAULT NULL,
  target_source_module TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  has_mgmt_role BOOLEAN;
  direct_access BOOLEAN;
  sub_access BOOLEAN;
BEGIN
  -- 1. Management users have global access
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'finance')
  ) INTO has_mgmt_role;

  IF has_mgmt_role THEN
    RETURN TRUE;
  END IF;

  -- 2. Direct access: user explicitly has access to the exact target_company_id (e.g. NCG Holdings parent user)
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_access
    WHERE user_id = auth.uid()
    AND company_id = target_company_id
  ) INTO direct_access;

  IF direct_access THEN
    RETURN TRUE;
  END IF;

  -- 3. Consolidated Bridged Access: User has access to a sub-company, and the queried record
  -- belongs to the parent company (NCG Holdings) BUT is scoped to the sub-company via short_code or legacy prefix.
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_access uca
    JOIN public.companies c ON c.id = uca.company_id
    WHERE uca.user_id = auth.uid()
      AND c.parent_company_id = target_company_id
      AND (
        -- Match natively assigned business unit code
        (target_business_unit_code IS NOT NULL AND c.short_code = target_business_unit_code)
        OR
        -- Match inferred module from custom prefixes (Invoices, Receipts, Payments)
        (target_document_number IS NOT NULL AND target_document_number ILIKE c.short_code || '-%')
        OR
        -- Match inferred module from customer registry
        (target_source_module IS NOT NULL AND (
          (c.short_code = 'YUT' AND target_source_module = 'yutong') OR
          (c.short_code = 'SNT' AND target_source_module = 'sinotruck') OR
          (c.short_code = 'SBS' AND target_source_module = 'school_bus') OR
          (c.short_code = 'SPH' AND target_source_module = 'special_hire') OR
          (c.short_code = 'LTV' AND target_source_module = 'light_vehicle')
        ))
      )
  ) INTO sub_access;

  RETURN sub_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Lock down the tables (Ensures missing policies default to DO NOT ALLOW)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ap_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ap_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;


-- 3. Drop any weak historical policies (Wipe the slate clean)
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('customers', 'ar_invoices', 'ap_invoices', 'ar_receipts', 'ap_payments', 'journal_entries', 'vendors')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;


-- 4. Deploy strict Isolation Policies linked to the central Master Function
CREATE POLICY "RLS Tenant Lockdown: Customers" ON public.customers
FOR ALL USING (public.can_access_tenant_record(company_id, NULL, NULL, source_module));

CREATE POLICY "RLS Tenant Lockdown: AR Invoices" ON public.ar_invoices
FOR ALL USING (public.can_access_tenant_record(company_id, business_unit_code, invoice_number, NULL));

CREATE POLICY "RLS Tenant Lockdown: AP Invoices" ON public.ap_invoices
FOR ALL USING (public.can_access_tenant_record(company_id, business_unit_code, invoice_number, NULL));

CREATE POLICY "RLS Tenant Lockdown: AR Receipts" ON public.ar_receipts
FOR ALL USING (public.can_access_tenant_record(company_id, business_unit_code, receipt_number, NULL));

CREATE POLICY "RLS Tenant Lockdown: AP Payments" ON public.ap_payments
FOR ALL USING (public.can_access_tenant_record(company_id, business_unit_code, payment_number, NULL));

CREATE POLICY "RLS Tenant Lockdown: Journal Entries" ON public.journal_entries
FOR ALL USING (public.can_access_tenant_record(company_id, business_unit_code, NULL, NULL));

CREATE POLICY "RLS Tenant Lockdown: Vendors" ON public.vendors
FOR ALL USING (public.can_access_tenant_record(company_id, business_unit_code, NULL, NULL));

COMMIT;

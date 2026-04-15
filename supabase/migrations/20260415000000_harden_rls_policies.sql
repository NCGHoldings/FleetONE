-- ==================================================================
-- NCG FLEETFLOW SECURITY HARDENING SCRIPT
-- Closes 348+ permissive RLS policies by enforcing company_id checks
-- ==================================================================

-- 1. Create High-Performance Security Definer Function
CREATE OR REPLACE FUNCTION public.has_company_access(_company_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_company_access 
    WHERE user_id = auth.uid() AND company_id = _company_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Enable missing RLS on vulnerable tables
ALTER TABLE IF EXISTS public.stock_transfer_lines ENABLE ROW LEVEL SECURITY;

-- 3. Harden Policies for Multi-Company Tables
DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'ap_payment_lines' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.ap_payment_lines'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.ap_payment_lines FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.ap_payment_lines FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.ap_payment_lines FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.ap_payment_lines FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'ap_reconciliation_items' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.ap_reconciliation_items'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.ap_reconciliation_items FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.ap_reconciliation_items FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.ap_reconciliation_items FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.ap_reconciliation_items FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'api_keys' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.api_keys'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.api_keys FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.api_keys FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.api_keys FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.api_keys FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'ar_reconciliation_items' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.ar_reconciliation_items'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.ar_reconciliation_items FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.ar_reconciliation_items FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.ar_reconciliation_items FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.ar_reconciliation_items FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'asset_maintenance_logs' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.asset_maintenance_logs'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.asset_maintenance_logs FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.asset_maintenance_logs FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.asset_maintenance_logs FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.asset_maintenance_logs FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'asset_maintenance_teams' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.asset_maintenance_teams'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.asset_maintenance_teams FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.asset_maintenance_teams FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.asset_maintenance_teams FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.asset_maintenance_teams FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bank_fee_charges' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.bank_fee_charges'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.bank_fee_charges FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.bank_fee_charges FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.bank_fee_charges FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.bank_fee_charges FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bin_locations' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.bin_locations'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.bin_locations FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.bin_locations FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.bin_locations FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.bin_locations FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'blocked_periods' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.blocked_periods'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.blocked_periods FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.blocked_periods FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.blocked_periods FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.blocked_periods FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'cheque_books' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.cheque_books'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.cheque_books FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.cheque_books FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.cheque_books FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.cheque_books FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'companies' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.companies'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.companies FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.companies FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.companies FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.companies FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'company_expense_categories' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.company_expense_categories'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.company_expense_categories FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.company_expense_categories FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.company_expense_categories FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.company_expense_categories FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'composite_items' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.composite_items'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.composite_items FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.composite_items FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.composite_items FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.composite_items FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'custom_reports' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.custom_reports'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.custom_reports FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.custom_reports FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.custom_reports FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.custom_reports FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'customer_categories' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.customer_categories'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.customer_categories FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.customer_categories FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.customer_categories FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.customer_categories FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'customer_price_lists' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.customer_price_lists'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.customer_price_lists FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.customer_price_lists FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.customer_price_lists FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.customer_price_lists FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'customer_support_requests' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.customer_support_requests'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.customer_support_requests FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.customer_support_requests FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.customer_support_requests FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.customer_support_requests FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'delivery_notes' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.delivery_notes'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.delivery_notes FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.delivery_notes FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.delivery_notes FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.delivery_notes FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'expense_requests' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.expense_requests'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.expense_requests FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.expense_requests FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.expense_requests FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.expense_requests FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'gl_posting_log' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.gl_posting_log'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.gl_posting_log FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.gl_posting_log FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.gl_posting_log FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.gl_posting_log FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'gl_settings' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.gl_settings'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.gl_settings FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.gl_settings FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.gl_settings FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.gl_settings FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'governance_items' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.governance_items'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.governance_items FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.governance_items FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.governance_items FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.governance_items FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'inspection_templates' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.inspection_templates'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.inspection_templates FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.inspection_templates FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.inspection_templates FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.inspection_templates FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'inter_bank_transfers' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.inter_bank_transfers'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.inter_bank_transfers FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.inter_bank_transfers FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.inter_bank_transfers FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.inter_bank_transfers FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'intercompany_reconciliations' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.intercompany_reconciliations'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.intercompany_reconciliations FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.intercompany_reconciliations FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.intercompany_reconciliations FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.intercompany_reconciliations FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'iou_records' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.iou_records'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.iou_records FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.iou_records FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.iou_records FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.iou_records FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'landed_cost_vouchers' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.landed_cost_vouchers'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.landed_cost_vouchers FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.landed_cost_vouchers FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.landed_cost_vouchers FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.landed_cost_vouchers FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'leasing_finance_settings' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.leasing_finance_settings'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.leasing_finance_settings FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.leasing_finance_settings FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.leasing_finance_settings FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.leasing_finance_settings FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_finance_settings' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_finance_settings'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.lightvehicle_finance_settings FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.lightvehicle_finance_settings FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.lightvehicle_finance_settings FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.lightvehicle_finance_settings FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'marketing_job_requests' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.marketing_job_requests'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.marketing_job_requests FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.marketing_job_requests FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.marketing_job_requests FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.marketing_job_requests FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'marketing_projects' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.marketing_projects'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.marketing_projects FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.marketing_projects FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.marketing_projects FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.marketing_projects FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'marketing_social_accounts' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.marketing_social_accounts'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.marketing_social_accounts FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.marketing_social_accounts FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.marketing_social_accounts FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.marketing_social_accounts FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'marketing_tasks' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.marketing_tasks'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.marketing_tasks FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.marketing_tasks FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.marketing_tasks FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.marketing_tasks FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'module_gl_mappings' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.module_gl_mappings'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.module_gl_mappings FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.module_gl_mappings FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.module_gl_mappings FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.module_gl_mappings FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'ncg_express_finance_settings' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.ncg_express_finance_settings'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.ncg_express_finance_settings FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.ncg_express_finance_settings FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.ncg_express_finance_settings FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.ncg_express_finance_settings FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'numbering_sequences' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.numbering_sequences'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.numbering_sequences FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.numbering_sequences FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.numbering_sequences FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.numbering_sequences FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'payment_links' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.payment_links'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.payment_links FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.payment_links FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.payment_links FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.payment_links FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'payment_reminder_log' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.payment_reminder_log'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.payment_reminder_log FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.payment_reminder_log FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.payment_reminder_log FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.payment_reminder_log FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'payment_reminder_rules' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.payment_reminder_rules'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.payment_reminder_rules FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.payment_reminder_rules FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.payment_reminder_rules FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.payment_reminder_rules FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'payment_reminders_sent' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.payment_reminders_sent'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.payment_reminders_sent FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.payment_reminders_sent FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.payment_reminders_sent FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.payment_reminders_sent FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'payment_terms' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.payment_terms'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.payment_terms FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.payment_terms FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.payment_terms FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.payment_terms FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'pending_gl_postings' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.pending_gl_postings'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.pending_gl_postings FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.pending_gl_postings FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.pending_gl_postings FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.pending_gl_postings FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'petty_cash_funds' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.petty_cash_funds'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.petty_cash_funds FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.petty_cash_funds FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.petty_cash_funds FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.petty_cash_funds FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'petty_cash_reconciliation_items' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.petty_cash_reconciliation_items'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.petty_cash_reconciliation_items FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.petty_cash_reconciliation_items FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.petty_cash_reconciliation_items FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.petty_cash_reconciliation_items FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'petty_cash_reconciliations' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.petty_cash_reconciliations'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.petty_cash_reconciliations FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.petty_cash_reconciliations FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.petty_cash_reconciliations FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.petty_cash_reconciliations FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'pick_lists' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.pick_lists'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.pick_lists FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.pick_lists FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.pick_lists FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.pick_lists FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'price_list_items' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.price_list_items'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.price_list_items FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.price_list_items FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.price_list_items FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.price_list_items FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'price_lists' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.price_lists'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.price_lists FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.price_lists FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.price_lists FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.price_lists FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'quality_inspections' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.quality_inspections'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.quality_inspections FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.quality_inspections FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.quality_inspections FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.quality_inspections FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'recurring_invoice_log' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.recurring_invoice_log'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.recurring_invoice_log FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.recurring_invoice_log FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.recurring_invoice_log FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.recurring_invoice_log FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'recurring_invoices' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.recurring_invoices'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.recurring_invoices FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.recurring_invoices FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.recurring_invoices FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.recurring_invoices FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'report_schedules' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.report_schedules'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.report_schedules FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.report_schedules FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.report_schedules FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.report_schedules FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'request_for_quotations' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.request_for_quotations'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.request_for_quotations FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.request_for_quotations FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.request_for_quotations FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.request_for_quotations FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sales_orders' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.sales_orders'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.sales_orders FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.sales_orders FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.sales_orders FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.sales_orders FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sbus' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.sbus'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.sbus FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.sbus FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.sbus FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.sbus FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'scheduled_tasks' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.scheduled_tasks'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.scheduled_tasks FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.scheduled_tasks FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.scheduled_tasks FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.scheduled_tasks FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'school_ar_invoice_batches' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.school_ar_invoice_batches'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.school_ar_invoice_batches FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.school_ar_invoice_batches FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.school_ar_invoice_batches FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.school_ar_invoice_batches FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'school_bus_expense_gl_mappings' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.school_bus_expense_gl_mappings'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.school_bus_expense_gl_mappings FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.school_bus_expense_gl_mappings FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.school_bus_expense_gl_mappings FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.school_bus_expense_gl_mappings FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'school_bus_finance_settings' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.school_bus_finance_settings'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.school_bus_finance_settings FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.school_bus_finance_settings FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.school_bus_finance_settings FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.school_bus_finance_settings FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sinotruck_finance_settings' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.sinotruck_finance_settings'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.sinotruck_finance_settings FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.sinotruck_finance_settings FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.sinotruck_finance_settings FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.sinotruck_finance_settings FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'special_hire_finance_settings' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.special_hire_finance_settings'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.special_hire_finance_settings FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.special_hire_finance_settings FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.special_hire_finance_settings FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.special_hire_finance_settings FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'stock_transfer_lines' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.stock_transfer_lines'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.stock_transfer_lines FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.stock_transfer_lines FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.stock_transfer_lines FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.stock_transfer_lines FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'subledger_reconciliations' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.subledger_reconciliations'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.subledger_reconciliations FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.subledger_reconciliations FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.subledger_reconciliations FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.subledger_reconciliations FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'supplier_quotations' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.supplier_quotations'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.supplier_quotations FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.supplier_quotations FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.supplier_quotations FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.supplier_quotations FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'unit_of_measures' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.unit_of_measures'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.unit_of_measures FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.unit_of_measures FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.unit_of_measures FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.unit_of_measures FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'uom_conversions' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.uom_conversions'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.uom_conversions FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.uom_conversions FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.uom_conversions FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.uom_conversions FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_company_access' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.user_company_access'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.user_company_access FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.user_company_access FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.user_company_access FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.user_company_access FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'vendor_bank_accounts' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.vendor_bank_accounts'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.vendor_bank_accounts FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.vendor_bank_accounts FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.vendor_bank_accounts FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.vendor_bank_accounts FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'vendor_categories' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.vendor_categories'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.vendor_categories FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.vendor_categories FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.vendor_categories FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.vendor_categories FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'vendor_portal_access' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.vendor_portal_access'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.vendor_portal_access FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.vendor_portal_access FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.vendor_portal_access FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.vendor_portal_access FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'vendor_submitted_invoices' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.vendor_submitted_invoices'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.vendor_submitted_invoices FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.vendor_submitted_invoices FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.vendor_submitted_invoices FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.vendor_submitted_invoices FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'webhook_deliveries' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.webhook_deliveries'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.webhook_deliveries FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.webhook_deliveries FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.webhook_deliveries FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.webhook_deliveries FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'webhook_endpoints' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.webhook_endpoints'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.webhook_endpoints FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.webhook_endpoints FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.webhook_endpoints FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.webhook_endpoints FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'workflow_execution_log' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.workflow_execution_log'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.workflow_execution_log FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.workflow_execution_log FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.workflow_execution_log FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.workflow_execution_log FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'workflow_rules' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.workflow_rules'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.workflow_rules FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.workflow_rules FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.workflow_rules FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.workflow_rules FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'yutong_finance_settings' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.yutong_finance_settings'; END LOOP; END $$;
CREATE POLICY "Company specific read access" ON public.yutong_finance_settings FOR SELECT USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific insert access" ON public.yutong_finance_settings FOR INSERT WITH CHECK (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific update access" ON public.yutong_finance_settings FOR UPDATE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Company specific delete access" ON public.yutong_finance_settings FOR DELETE USING (has_company_access(company_id) OR public.has_role(auth.uid(), 'super_admin'::app_role));


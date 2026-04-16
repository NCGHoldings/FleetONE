-- ==================================================================
-- NCG FLEETFLOW SECURITY HARDENING SCRIPT (PHASE 2 - CHILD TABLES)
-- Locks down 104 vulnerable child lacking company_id to Super Admin only
-- ==================================================================

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'accident_audit_trail' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.accident_audit_trail'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.accident_audit_trail FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.accident_audit_trail FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.accident_audit_trail FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.accident_audit_trail FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'accident_documents' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.accident_documents'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.accident_documents FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.accident_documents FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.accident_documents FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.accident_documents FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'accident_records' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.accident_records'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.accident_records FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.accident_records FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.accident_records FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.accident_records FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'ap_reconciliations' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.ap_reconciliations'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.ap_reconciliations FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.ap_reconciliations FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.ap_reconciliations FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.ap_reconciliations FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'api_usage_logs' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.api_usage_logs'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.api_usage_logs FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.api_usage_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.api_usage_logs FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.api_usage_logs FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'approval_configurations' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.approval_configurations'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.approval_configurations FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.approval_configurations FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.approval_configurations FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.approval_configurations FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'approval_name_suggestions' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.approval_name_suggestions'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.approval_name_suggestions FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.approval_name_suggestions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.approval_name_suggestions FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.approval_name_suggestions FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'ar_reconciliations' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.ar_reconciliations'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.ar_reconciliations FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.ar_reconciliations FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.ar_reconciliations FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.ar_reconciliations FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'asset_disposals' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.asset_disposals'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.asset_disposals FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.asset_disposals FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.asset_disposals FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.asset_disposals FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bank_reconciliation_items' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.bank_reconciliation_items'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.bank_reconciliation_items FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.bank_reconciliation_items FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.bank_reconciliation_items FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.bank_reconciliation_items FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bank_statement_imports' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.bank_statement_imports'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.bank_statement_imports FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.bank_statement_imports FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.bank_statement_imports FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.bank_statement_imports FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'batch_numbers' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.batch_numbers'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.batch_numbers FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.batch_numbers FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.batch_numbers FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.batch_numbers FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bus_fuel_readings' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.bus_fuel_readings'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.bus_fuel_readings FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.bus_fuel_readings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.bus_fuel_readings FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.bus_fuel_readings FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bus_loan_payments' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.bus_loan_payments'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.bus_loan_payments FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.bus_loan_payments FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.bus_loan_payments FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.bus_loan_payments FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bus_loans' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.bus_loans'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.bus_loans FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.bus_loans FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.bus_loans FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.bus_loans FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bus_service_alerts' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.bus_service_alerts'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.bus_service_alerts FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.bus_service_alerts FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.bus_service_alerts FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.bus_service_alerts FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bus_types' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.bus_types'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.bus_types FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.bus_types FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.bus_types FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.bus_types FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'business_flow_logs' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.business_flow_logs'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.business_flow_logs FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.business_flow_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.business_flow_logs FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.business_flow_logs FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'cashbook_entries' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.cashbook_entries'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.cashbook_entries FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.cashbook_entries FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.cashbook_entries FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.cashbook_entries FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'coa_upload_history' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.coa_upload_history'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.coa_upload_history FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.coa_upload_history FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.coa_upload_history FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.coa_upload_history FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'cogs_transactions' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.cogs_transactions'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.cogs_transactions FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.cogs_transactions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.cogs_transactions FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.cogs_transactions FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'completed_trips' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.completed_trips'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.completed_trips FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.completed_trips FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.completed_trips FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.completed_trips FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'currencies' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.currencies'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.currencies FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.currencies FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.currencies FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.currencies FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'customer_portal_access' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.customer_portal_access'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.customer_portal_access FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.customer_portal_access FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.customer_portal_access FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.customer_portal_access FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'daily_bus_expenses' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.daily_bus_expenses'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.daily_bus_expenses FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.daily_bus_expenses FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.daily_bus_expenses FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.daily_bus_expenses FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'data_archive_policies' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.data_archive_policies'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.data_archive_policies FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.data_archive_policies FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.data_archive_policies FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.data_archive_policies FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'document_versions' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.document_versions'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.document_versions FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.document_versions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.document_versions FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.document_versions FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'documents' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.documents'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.documents FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.documents FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.documents FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.documents FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'driver_behavior_events' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.driver_behavior_events'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.driver_behavior_events FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.driver_behavior_events FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.driver_behavior_events FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.driver_behavior_events FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'exchange_rates' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.exchange_rates'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.exchange_rates FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.exchange_rates FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.exchange_rates FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.exchange_rates FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'fleet_analytics_daily' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.fleet_analytics_daily'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.fleet_analytics_daily FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.fleet_analytics_daily FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.fleet_analytics_daily FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.fleet_analytics_daily FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'fuel_alerts' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.fuel_alerts'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.fuel_alerts FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.fuel_alerts FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.fuel_alerts FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.fuel_alerts FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'governance_audit_log' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.governance_audit_log'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.governance_audit_log FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.governance_audit_log FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.governance_audit_log FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.governance_audit_log FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'governance_notifications' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.governance_notifications'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.governance_notifications FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.governance_notifications FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.governance_notifications FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.governance_notifications FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'gps_location_history' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.gps_location_history'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.gps_location_history FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.gps_location_history FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.gps_location_history FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.gps_location_history FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'inquiry_activity_log' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.inquiry_activity_log'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.inquiry_activity_log FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.inquiry_activity_log FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.inquiry_activity_log FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.inquiry_activity_log FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'inventory_ageing_config' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.inventory_ageing_config'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.inventory_ageing_config FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.inventory_ageing_config FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.inventory_ageing_config FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.inventory_ageing_config FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'late_entry_requests' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.late_entry_requests'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.late_entry_requests FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.late_entry_requests FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.late_entry_requests FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.late_entry_requests FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_addons' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_addons'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_addons FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_addons FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_addons FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_addons FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_cash_receipts' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_cash_receipts'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_cash_receipts FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_cash_receipts FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_cash_receipts FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_cash_receipts FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_customer_payments' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_customer_payments'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_customer_payments FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_customer_payments FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_customer_payments FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_customer_payments FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_customers' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_customers'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_customers FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_customers FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_customers FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_customers FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_customization_options' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_customization_options'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_customization_options FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_customization_options FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_customization_options FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_customization_options FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_invoice_documents' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_invoice_documents'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_invoice_documents FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_invoice_documents FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_invoice_documents FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_invoice_documents FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_invoice_records' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_invoice_records'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_invoice_records FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_invoice_records FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_invoice_records FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_invoice_records FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_invoice_signatures' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_invoice_signatures'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_invoice_signatures FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_invoice_signatures FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_invoice_signatures FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_invoice_signatures FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_model_images' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_model_images'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_model_images FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_model_images FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_model_images FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_model_images FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_models' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_models'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_models FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_models FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_models FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_models FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_order_tasks' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_order_tasks'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_order_tasks FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_order_tasks FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_order_tasks FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_order_tasks FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_orders' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_orders'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_orders FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_orders FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_orders FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_orders FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_payment_schedules' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_payment_schedules'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_payment_schedules FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_payment_schedules FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_payment_schedules FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_payment_schedules FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_quotation_addons' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_quotation_addons'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_quotation_addons FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_quotation_addons FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_quotation_addons FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_quotation_addons FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_quotation_signatures' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_quotation_signatures'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_quotation_signatures FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_quotation_signatures FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_quotation_signatures FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_quotation_signatures FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_quotations' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_quotations'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_quotations FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_quotations FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_quotations FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_quotations FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_referral_commission_payments' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_referral_commission_payments'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_referral_commission_payments FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_referral_commission_payments FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_referral_commission_payments FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_referral_commission_payments FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_responsible_persons' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_responsible_persons'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_responsible_persons FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_responsible_persons FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_responsible_persons FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_responsible_persons FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_shipment_group_orders' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_shipment_group_orders'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_shipment_group_orders FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_shipment_group_orders FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_shipment_group_orders FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_shipment_group_orders FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_shipment_groups' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_shipment_groups'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_shipment_groups FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_shipment_groups FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_shipment_groups FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_shipment_groups FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_vehicle_data_sheets' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_vehicle_data_sheets'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_vehicle_data_sheets FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_vehicle_data_sheets FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_vehicle_data_sheets FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_vehicle_data_sheets FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lightvehicle_vehicle_records' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.lightvehicle_vehicle_records'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.lightvehicle_vehicle_records FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.lightvehicle_vehicle_records FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.lightvehicle_vehicle_records FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.lightvehicle_vehicle_records FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'marketing_credit_settings' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.marketing_credit_settings'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.marketing_credit_settings FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.marketing_credit_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.marketing_credit_settings FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.marketing_credit_settings FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'marketing_social_stats' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.marketing_social_stats'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.marketing_social_stats FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.marketing_social_stats FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.marketing_social_stats FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.marketing_social_stats FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'marketing_task_assignees' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.marketing_task_assignees'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.marketing_task_assignees FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.marketing_task_assignees FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.marketing_task_assignees FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.marketing_task_assignees FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'marketing_task_categories' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.marketing_task_categories'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.marketing_task_categories FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.marketing_task_categories FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.marketing_task_categories FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.marketing_task_categories FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'marketing_task_feedback' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.marketing_task_feedback'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.marketing_task_feedback FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.marketing_task_feedback FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.marketing_task_feedback FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.marketing_task_feedback FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'marketing_team_members' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.marketing_team_members'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.marketing_team_members FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.marketing_team_members FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.marketing_team_members FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.marketing_team_members FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'nsp_daily_sales' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.nsp_daily_sales'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.nsp_daily_sales FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.nsp_daily_sales FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.nsp_daily_sales FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.nsp_daily_sales FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'payment_batch_items' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.payment_batch_items'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.payment_batch_items FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.payment_batch_items FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.payment_batch_items FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.payment_batch_items FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'payment_batches' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.payment_batches'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.payment_batches FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.payment_batches FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.payment_batches FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.payment_batches FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'petty_cash_transactions' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.petty_cash_transactions'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.petty_cash_transactions FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.petty_cash_transactions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.petty_cash_transactions FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.petty_cash_transactions FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'recurring_invoice_history' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.recurring_invoice_history'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.recurring_invoice_history FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.recurring_invoice_history FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.recurring_invoice_history FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.recurring_invoice_history FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'safety_alerts' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.safety_alerts'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.safety_alerts FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.safety_alerts FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.safety_alerts FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.safety_alerts FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'school_payment_import_items' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.school_payment_import_items'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.school_payment_import_items FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.school_payment_import_items FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.school_payment_import_items FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.school_payment_import_items FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'school_payment_import_settings' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.school_payment_import_settings'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.school_payment_import_settings FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.school_payment_import_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.school_payment_import_settings FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.school_payment_import_settings FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'school_payment_imports' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.school_payment_imports'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.school_payment_imports FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.school_payment_imports FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.school_payment_imports FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.school_payment_imports FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'school_payment_pattern_history' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.school_payment_pattern_history'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.school_payment_pattern_history FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.school_payment_pattern_history FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.school_payment_pattern_history FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.school_payment_pattern_history FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'school_receipts' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.school_receipts'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.school_receipts FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.school_receipts FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.school_receipts FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.school_receipts FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'segments' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.segments'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.segments FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.segments FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.segments FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.segments FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'serial_numbers' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.serial_numbers'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.serial_numbers FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.serial_numbers FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.serial_numbers FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.serial_numbers FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sinotruck_cash_receipts' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.sinotruck_cash_receipts'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.sinotruck_cash_receipts FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.sinotruck_cash_receipts FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.sinotruck_cash_receipts FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.sinotruck_cash_receipts FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sinotruck_invoice_documents' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.sinotruck_invoice_documents'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.sinotruck_invoice_documents FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.sinotruck_invoice_documents FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.sinotruck_invoice_documents FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.sinotruck_invoice_documents FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sinotruck_invoice_records' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.sinotruck_invoice_records'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.sinotruck_invoice_records FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.sinotruck_invoice_records FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.sinotruck_invoice_records FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.sinotruck_invoice_records FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sinotruck_invoice_signatures' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.sinotruck_invoice_signatures'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.sinotruck_invoice_signatures FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.sinotruck_invoice_signatures FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.sinotruck_invoice_signatures FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.sinotruck_invoice_signatures FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sinotruck_orders' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.sinotruck_orders'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.sinotruck_orders FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.sinotruck_orders FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.sinotruck_orders FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.sinotruck_orders FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sinotruck_referral_commission_payments' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.sinotruck_referral_commission_payments'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.sinotruck_referral_commission_payments FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.sinotruck_referral_commission_payments FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.sinotruck_referral_commission_payments FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.sinotruck_referral_commission_payments FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sinotruck_truck_model_images' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.sinotruck_truck_model_images'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.sinotruck_truck_model_images FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.sinotruck_truck_model_images FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.sinotruck_truck_model_images FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.sinotruck_truck_model_images FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'system_flow_diagrams' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.system_flow_diagrams'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.system_flow_diagrams FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.system_flow_diagrams FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.system_flow_diagrams FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.system_flow_diagrams FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'system_notifications' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.system_notifications'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.system_notifications FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.system_notifications FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.system_notifications FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.system_notifications FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_activity_log' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.user_activity_log'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.user_activity_log FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.user_activity_log FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.user_activity_log FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.user_activity_log FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_page_permissions' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.user_page_permissions'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.user_page_permissions FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.user_page_permissions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.user_page_permissions FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.user_page_permissions FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_school_branch_access' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.user_school_branch_access'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.user_school_branch_access FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.user_school_branch_access FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.user_school_branch_access FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.user_school_branch_access FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'vendor_performance' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.vendor_performance'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.vendor_performance FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.vendor_performance FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.vendor_performance FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.vendor_performance FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'vendor_portal_sessions' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.vendor_portal_sessions'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.vendor_portal_sessions FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.vendor_portal_sessions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.vendor_portal_sessions FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.vendor_portal_sessions FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'wht_certificate_details' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.wht_certificate_details'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.wht_certificate_details FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.wht_certificate_details FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.wht_certificate_details FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.wht_certificate_details FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'wht_certificates' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.wht_certificates'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.wht_certificates FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.wht_certificates FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.wht_certificates FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.wht_certificates FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'yutong_cash_receipts' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.yutong_cash_receipts'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.yutong_cash_receipts FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.yutong_cash_receipts FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.yutong_cash_receipts FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.yutong_cash_receipts FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'yutong_invoice_documents' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.yutong_invoice_documents'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.yutong_invoice_documents FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.yutong_invoice_documents FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.yutong_invoice_documents FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.yutong_invoice_documents FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'yutong_invoice_records' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.yutong_invoice_records'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.yutong_invoice_records FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.yutong_invoice_records FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.yutong_invoice_records FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.yutong_invoice_records FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'yutong_old_sales' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.yutong_old_sales'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.yutong_old_sales FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.yutong_old_sales FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.yutong_old_sales FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.yutong_old_sales FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'yutong_old_sales_imports' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.yutong_old_sales_imports'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.yutong_old_sales_imports FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.yutong_old_sales_imports FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.yutong_old_sales_imports FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.yutong_old_sales_imports FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'yutong_referral_commission_payments' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.yutong_referral_commission_payments'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.yutong_referral_commission_payments FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.yutong_referral_commission_payments FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.yutong_referral_commission_payments FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.yutong_referral_commission_payments FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'yutong_vehicle_data_sheets' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.yutong_vehicle_data_sheets'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.yutong_vehicle_data_sheets FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.yutong_vehicle_data_sheets FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.yutong_vehicle_data_sheets FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.yutong_vehicle_data_sheets FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'yutong_vehicle_records' AND schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.yutong_vehicle_records'; END LOOP; END $$;
CREATE POLICY "Super admin specific read access" ON public.yutong_vehicle_records FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific insert access" ON public.yutong_vehicle_records FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific update access" ON public.yutong_vehicle_records FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin specific delete access" ON public.yutong_vehicle_records FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::app_role));


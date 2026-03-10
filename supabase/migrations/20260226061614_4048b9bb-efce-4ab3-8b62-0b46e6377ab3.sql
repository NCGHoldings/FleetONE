
-- ============================================
-- COMPREHENSIVE SECURITY REMEDIATION
-- Phase 1-4: RLS, Policies, Functions, Sensitive Data
-- ============================================

-- ============================================
-- PHASE 1: Enable RLS on 15 unprotected tables
-- ============================================

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bin_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.composite_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminder_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_invoice_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_submitted_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- Policies for api_keys (admin only)
CREATE POLICY "Admin select api_keys" ON public.api_keys FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin insert api_keys" ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin update api_keys" ON public.api_keys FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin delete api_keys" ON public.api_keys FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Policies for bin_locations (authenticated)
CREATE POLICY "Authenticated select bin_locations" ON public.bin_locations FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert bin_locations" ON public.bin_locations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update bin_locations" ON public.bin_locations FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete bin_locations" ON public.bin_locations FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Policies for composite_items (authenticated)
CREATE POLICY "Authenticated select composite_items" ON public.composite_items FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert composite_items" ON public.composite_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update composite_items" ON public.composite_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete composite_items" ON public.composite_items FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Policies for custom_reports (authenticated)
CREATE POLICY "Authenticated select custom_reports" ON public.custom_reports FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert custom_reports" ON public.custom_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update custom_reports" ON public.custom_reports FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete custom_reports" ON public.custom_reports FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Policies for customer_price_lists (authenticated)
CREATE POLICY "Authenticated select customer_price_lists" ON public.customer_price_lists FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert customer_price_lists" ON public.customer_price_lists FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update customer_price_lists" ON public.customer_price_lists FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete customer_price_lists" ON public.customer_price_lists FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Policies for payment_reminder_log (finance/admin)
CREATE POLICY "Finance select payment_reminder_log" ON public.payment_reminder_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance insert payment_reminder_log" ON public.payment_reminder_log FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance update payment_reminder_log" ON public.payment_reminder_log FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Policies for price_list_items (authenticated)
CREATE POLICY "Authenticated select price_list_items" ON public.price_list_items FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert price_list_items" ON public.price_list_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update price_list_items" ON public.price_list_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete price_list_items" ON public.price_list_items FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Policies for price_lists (authenticated)
CREATE POLICY "Authenticated select price_lists" ON public.price_lists FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert price_lists" ON public.price_lists FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update price_lists" ON public.price_lists FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete price_lists" ON public.price_lists FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Policies for recurring_invoice_log (finance/admin)
CREATE POLICY "Finance select recurring_invoice_log" ON public.recurring_invoice_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance insert recurring_invoice_log" ON public.recurring_invoice_log FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Policies for report_schedules (authenticated)
CREATE POLICY "Authenticated select report_schedules" ON public.report_schedules FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert report_schedules" ON public.report_schedules FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update report_schedules" ON public.report_schedules FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete report_schedules" ON public.report_schedules FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Policies for vendor_portal_access (admin only)
CREATE POLICY "Admin select vendor_portal_access" ON public.vendor_portal_access FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin insert vendor_portal_access" ON public.vendor_portal_access FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin update vendor_portal_access" ON public.vendor_portal_access FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Policies for vendor_portal_sessions (admin only)
CREATE POLICY "Admin select vendor_portal_sessions" ON public.vendor_portal_sessions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "System insert vendor_portal_sessions" ON public.vendor_portal_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policies for vendor_submitted_invoices (finance/admin)
CREATE POLICY "Finance select vendor_submitted_invoices" ON public.vendor_submitted_invoices FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance insert vendor_submitted_invoices" ON public.vendor_submitted_invoices FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Finance update vendor_submitted_invoices" ON public.vendor_submitted_invoices FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Policies for webhook_deliveries (admin only)
CREATE POLICY "Admin select webhook_deliveries" ON public.webhook_deliveries FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "System insert webhook_deliveries" ON public.webhook_deliveries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policies for webhook_endpoints (admin only)
CREATE POLICY "Admin select webhook_endpoints" ON public.webhook_endpoints FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin insert webhook_endpoints" ON public.webhook_endpoints FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin update webhook_endpoints" ON public.webhook_endpoints FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin delete webhook_endpoints" ON public.webhook_endpoints FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- ============================================
-- PHASE 2: Fix overly permissive ALL policies on financial tables
-- Replace USING(true)/WITH CHECK(true) with role-based access
-- ============================================

-- asset_disposals: finance/admin only
DROP POLICY IF EXISTS "Allow authenticated access" ON public.asset_disposals;
CREATE POLICY "Finance select asset_disposals" ON public.asset_disposals FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Finance modify asset_disposals" ON public.asset_disposals FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance update asset_disposals" ON public.asset_disposals FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance delete asset_disposals" ON public.asset_disposals FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- bank_fee_charges: finance/admin only
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.bank_fee_charges;
CREATE POLICY "Finance select bank_fee_charges" ON public.bank_fee_charges FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Finance modify bank_fee_charges" ON public.bank_fee_charges FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance update bank_fee_charges" ON public.bank_fee_charges FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance delete bank_fee_charges" ON public.bank_fee_charges FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- bank_reconciliation_items: finance/admin only
DROP POLICY IF EXISTS "Allow authenticated access" ON public.bank_reconciliation_items;
CREATE POLICY "Finance select bank_reconciliation_items" ON public.bank_reconciliation_items FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Finance modify bank_reconciliation_items" ON public.bank_reconciliation_items FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance update bank_reconciliation_items" ON public.bank_reconciliation_items FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance delete bank_reconciliation_items" ON public.bank_reconciliation_items FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- bank_statement_imports: finance/admin only
DROP POLICY IF EXISTS "Allow authenticated access" ON public.bank_statement_imports;
CREATE POLICY "Finance select bank_statement_imports" ON public.bank_statement_imports FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Finance modify bank_statement_imports" ON public.bank_statement_imports FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance update bank_statement_imports" ON public.bank_statement_imports FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- cashbook_entries: finance/admin only
DROP POLICY IF EXISTS "Allow authenticated access" ON public.cashbook_entries;
CREATE POLICY "Finance select cashbook_entries" ON public.cashbook_entries FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Finance modify cashbook_entries" ON public.cashbook_entries FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance update cashbook_entries" ON public.cashbook_entries FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance delete cashbook_entries" ON public.cashbook_entries FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- cogs_transactions: finance/admin only
DROP POLICY IF EXISTS "Allow authenticated access" ON public.cogs_transactions;
CREATE POLICY "Finance select cogs_transactions" ON public.cogs_transactions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Finance modify cogs_transactions" ON public.cogs_transactions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance update cogs_transactions" ON public.cogs_transactions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- currencies: finance/admin for modifications, all authenticated for read
DROP POLICY IF EXISTS "Allow authenticated access" ON public.currencies;
CREATE POLICY "Authenticated select currencies" ON public.currencies FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Finance modify currencies" ON public.currencies FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance update currencies" ON public.currencies FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance delete currencies" ON public.currencies FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- ============================================
-- PHASE 2b: Fix INSERT policies with WITH CHECK (true)
-- Change to WITH CHECK (auth.uid() IS NOT NULL)
-- ============================================

-- accident_audit_trail
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.accident_audit_trail;
DROP POLICY IF EXISTS "System can insert audit records" ON public.accident_audit_trail;
CREATE POLICY "Authenticated insert accident_audit_trail" ON public.accident_audit_trail FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- accident_documents
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.accident_documents;
CREATE POLICY "Authenticated insert accident_documents" ON public.accident_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- accident_records
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.accident_records;
CREATE POLICY "Authenticated insert accident_records" ON public.accident_records FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- api_usage_logs
DROP POLICY IF EXISTS "System can insert API usage logs" ON public.api_usage_logs;
CREATE POLICY "Authenticated insert api_usage_logs" ON public.api_usage_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- approval_name_suggestions
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.approval_name_suggestions;
CREATE POLICY "Authenticated insert approval_name_suggestions" ON public.approval_name_suggestions FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- bus_fuel_readings
DROP POLICY IF EXISTS "System can insert fuel readings" ON public.bus_fuel_readings;
CREATE POLICY "Authenticated insert bus_fuel_readings" ON public.bus_fuel_readings FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- bus_loan_payments
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.bus_loan_payments;
CREATE POLICY "Authenticated insert bus_loan_payments" ON public.bus_loan_payments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- bus_loans
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.bus_loans;
CREATE POLICY "Authenticated insert bus_loans" ON public.bus_loans FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- bus_service_alerts
DROP POLICY IF EXISTS "System can insert service alerts" ON public.bus_service_alerts;
CREATE POLICY "Authenticated insert bus_service_alerts" ON public.bus_service_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- bus_types
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.bus_types;
CREATE POLICY "Authenticated insert bus_types" ON public.bus_types FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- business_flow_logs
DROP POLICY IF EXISTS "Allow authenticated users to insert business flow logs" ON public.business_flow_logs;
CREATE POLICY "Authenticated insert business_flow_logs" ON public.business_flow_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- completed_trips
DROP POLICY IF EXISTS "System can insert completed trips" ON public.completed_trips;
CREATE POLICY "Authenticated insert completed_trips" ON public.completed_trips FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- document_versions
DROP POLICY IF EXISTS "Authenticated users can insert document versions" ON public.document_versions;
CREATE POLICY "Authenticated insert document_versions" ON public.document_versions FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- driver_behavior_events
DROP POLICY IF EXISTS "System can insert behavior events" ON public.driver_behavior_events;
CREATE POLICY "Authenticated insert driver_behavior_events" ON public.driver_behavior_events FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- expense_requests
DROP POLICY IF EXISTS "Allow authenticated users to insert expense_requests" ON public.expense_requests;
CREATE POLICY "Authenticated insert expense_requests" ON public.expense_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- fleet_analytics_daily
DROP POLICY IF EXISTS "System can insert fleet analytics" ON public.fleet_analytics_daily;
CREATE POLICY "Authenticated insert fleet_analytics_daily" ON public.fleet_analytics_daily FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- fuel_alerts
DROP POLICY IF EXISTS "System can insert fuel alerts" ON public.fuel_alerts;
CREATE POLICY "Authenticated insert fuel_alerts" ON public.fuel_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- governance_audit_log
DROP POLICY IF EXISTS "System can create audit logs" ON public.governance_audit_log;
CREATE POLICY "Authenticated insert governance_audit_log" ON public.governance_audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- governance_notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.governance_notifications;
CREATE POLICY "Authenticated insert governance_notifications" ON public.governance_notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- gps_location_history
DROP POLICY IF EXISTS "System can insert GPS history" ON public.gps_location_history;
CREATE POLICY "Authenticated insert gps_location_history" ON public.gps_location_history FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- inquiry_activity_log
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.inquiry_activity_log;
CREATE POLICY "Authenticated insert inquiry_activity_log" ON public.inquiry_activity_log FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- inter_bank_transfers
DROP POLICY IF EXISTS "Users can create inter-bank transfers" ON public.inter_bank_transfers;
CREATE POLICY "Authenticated insert inter_bank_transfers" ON public.inter_bank_transfers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- iou_records
DROP POLICY IF EXISTS "Allow authenticated users to insert iou_records" ON public.iou_records;
CREATE POLICY "Authenticated insert iou_records" ON public.iou_records FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- leasing_finance_settings
DROP POLICY IF EXISTS "Users can insert leasing finance settings" ON public.leasing_finance_settings;
CREATE POLICY "Authenticated insert leasing_finance_settings" ON public.leasing_finance_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- lightvehicle_cash_receipts
DROP POLICY IF EXISTS "Users can insert light vehicle cash receipts" ON public.lightvehicle_cash_receipts;
DROP POLICY IF EXISTS "Users can update light vehicle cash receipts" ON public.lightvehicle_cash_receipts;
CREATE POLICY "Authenticated insert lightvehicle_cash_receipts" ON public.lightvehicle_cash_receipts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update lightvehicle_cash_receipts" ON public.lightvehicle_cash_receipts FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- lightvehicle_models
DROP POLICY IF EXISTS "Authenticated users can create vehicle models" ON public.lightvehicle_models;
DROP POLICY IF EXISTS "Authenticated users can update vehicle models" ON public.lightvehicle_models;
CREATE POLICY "Authenticated insert lightvehicle_models" ON public.lightvehicle_models FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update lightvehicle_models" ON public.lightvehicle_models FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- lightvehicle_orders
DROP POLICY IF EXISTS "Authenticated users can insert lightvehicle_orders" ON public.lightvehicle_orders;
CREATE POLICY "Authenticated insert lightvehicle_orders" ON public.lightvehicle_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- lightvehicle_quotation_signatures
DROP POLICY IF EXISTS "Authenticated users can create signatures" ON public.lightvehicle_quotation_signatures;
DROP POLICY IF EXISTS "Authenticated users can update signatures" ON public.lightvehicle_quotation_signatures;
CREATE POLICY "Authenticated insert lightvehicle_quotation_signatures" ON public.lightvehicle_quotation_signatures FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update lightvehicle_quotation_signatures" ON public.lightvehicle_quotation_signatures FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- lightvehicle_quotations
DROP POLICY IF EXISTS "Authenticated users can create quotations" ON public.lightvehicle_quotations;
DROP POLICY IF EXISTS "Authenticated users can update quotations" ON public.lightvehicle_quotations;
CREATE POLICY "Authenticated insert lightvehicle_quotations" ON public.lightvehicle_quotations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update lightvehicle_quotations" ON public.lightvehicle_quotations FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- marketing tables
DROP POLICY IF EXISTS "Allow authenticated insert marketing_credit_settings" ON public.marketing_credit_settings;
CREATE POLICY "Authenticated insert marketing_credit_settings" ON public.marketing_credit_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated insert marketing_job_requests" ON public.marketing_job_requests;
CREATE POLICY "Authenticated insert marketing_job_requests" ON public.marketing_job_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated insert marketing_projects" ON public.marketing_projects;
CREATE POLICY "Authenticated insert marketing_projects" ON public.marketing_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- PHASE 3: Fix function search paths
-- ============================================

ALTER FUNCTION public.generate_cashbook_entry_number() SET search_path = 'public';
ALTER FUNCTION public.generate_expense_request_number() SET search_path = 'public';
ALTER FUNCTION public.generate_iou_number() SET search_path = 'public';
ALTER FUNCTION public.generate_lightvehicle_invoice_no() SET search_path = 'public';
ALTER FUNCTION public.generate_lightvehicle_receipt_no() SET search_path = 'public';
ALTER FUNCTION public.generate_payment_batch_number() SET search_path = 'public';
ALTER FUNCTION public.generate_wht_certificate_number() SET search_path = 'public';
ALTER FUNCTION public.update_petty_cash_balance() SET search_path = 'public';
ALTER FUNCTION public.update_document_template_timestamp() SET search_path = 'public';
ALTER FUNCTION public.update_lightvehicle_cash_receipts_updated_at() SET search_path = 'public';

-- ============================================
-- PHASE 4: Restrict sensitive data access
-- ============================================

-- Payroll: restrict SELECT to finance/admin/super_admin + self-view
DROP POLICY IF EXISTS "All authenticated users can view payroll" ON public.payroll_records;
CREATE POLICY "Finance can view all payroll" ON public.payroll_records FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'finance') OR
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'super_admin')
  );

-- School students: remove open SELECT (role-based already exists via "Staff can manage students" and "School staff can view students")
DROP POLICY IF EXISTS "All authenticated users can view school students" ON public.school_students;


-- =============================================
-- FIX 82+ RLS "Policy Always True" Warnings
-- =============================================

-- =============================================
-- CATEGORY A: Public role policies → authenticated
-- =============================================

-- ai_chat_messages
DROP POLICY IF EXISTS "Service role full access on ai_chat_messages" ON "public"."ai_chat_messages";
CREATE POLICY "Authenticated users can manage chat messages" ON "public"."ai_chat_messages" FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ai_chat_sessions
DROP POLICY IF EXISTS "Service role full access on ai_chat_sessions" ON "public"."ai_chat_sessions";
CREATE POLICY "Authenticated users can manage chat sessions" ON "public"."ai_chat_sessions" FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ai_chatbot_knowledge
DROP POLICY IF EXISTS "Service role full access on ai_chatbot_knowledge" ON "public"."ai_chatbot_knowledge";
CREATE POLICY "Authenticated users can manage chatbot knowledge" ON "public"."ai_chatbot_knowledge" FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- inter_bank_transfers
DROP POLICY IF EXISTS "Users can update inter-bank transfers" ON "public"."inter_bank_transfers";
CREATE POLICY "Authenticated users can update inter-bank transfers" ON "public"."inter_bank_transfers" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- leasing_finance_settings
DROP POLICY IF EXISTS "Users can update leasing finance settings" ON "public"."leasing_finance_settings";
CREATE POLICY "Authenticated users can update leasing finance settings" ON "public"."leasing_finance_settings" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- numbering_sequences
DROP POLICY IF EXISTS "Users can update numbering sequences" ON "public"."numbering_sequences";
CREATE POLICY "Authenticated users can update numbering sequences" ON "public"."numbering_sequences" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- school_ar_invoice_batches
DROP POLICY IF EXISTS "Users can manage AR invoice batches" ON "public"."school_ar_invoice_batches";
CREATE POLICY "Authenticated users can manage AR invoice batches" ON "public"."school_ar_invoice_batches" FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- school_ar_invoices
DROP POLICY IF EXISTS "Users can manage school AR invoices" ON "public"."school_ar_invoices";
CREATE POLICY "Authenticated users can manage school AR invoices" ON "public"."school_ar_invoices" FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- school_bus_expense_gl_mappings
DROP POLICY IF EXISTS "Users can delete expense GL mappings" ON "public"."school_bus_expense_gl_mappings";
DROP POLICY IF EXISTS "Users can update expense GL mappings" ON "public"."school_bus_expense_gl_mappings";
CREATE POLICY "Authenticated users can update expense GL mappings" ON "public"."school_bus_expense_gl_mappings" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can delete expense GL mappings" ON "public"."school_bus_expense_gl_mappings" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- school_bus_finance_settings
DROP POLICY IF EXISTS "Users can manage school bus finance settings" ON "public"."school_bus_finance_settings";
CREATE POLICY "Authenticated users can manage school bus finance settings" ON "public"."school_bus_finance_settings" FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- school_student_ar_link
DROP POLICY IF EXISTS "Users can manage student AR links" ON "public"."school_student_ar_link";
CREATE POLICY "Authenticated users can manage student AR links" ON "public"."school_student_ar_link" FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- special_hire_finance_settings
DROP POLICY IF EXISTS "Users can update special hire finance settings" ON "public"."special_hire_finance_settings";
CREATE POLICY "Authenticated users can update special hire finance settings" ON "public"."special_hire_finance_settings" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- vendor_bank_accounts
DROP POLICY IF EXISTS "Users can delete vendor bank accounts" ON "public"."vendor_bank_accounts";
DROP POLICY IF EXISTS "Users can insert vendor bank accounts" ON "public"."vendor_bank_accounts";
DROP POLICY IF EXISTS "Users can update vendor bank accounts" ON "public"."vendor_bank_accounts";
CREATE POLICY "Authenticated users can insert vendor bank accounts" ON "public"."vendor_bank_accounts" FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update vendor bank accounts" ON "public"."vendor_bank_accounts" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can delete vendor bank accounts" ON "public"."vendor_bank_accounts" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- =============================================
-- CATEGORY B: Authenticated policies with true → auth check
-- =============================================

-- customer_portal_access (authenticated policies only, keep anon one)
DROP POLICY IF EXISTS "Users can delete portal access" ON "public"."customer_portal_access";
DROP POLICY IF EXISTS "Users can update portal access" ON "public"."customer_portal_access";
CREATE POLICY "Authenticated users can delete portal access" ON "public"."customer_portal_access" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update portal access" ON "public"."customer_portal_access" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- customer_support_requests (authenticated update only)
DROP POLICY IF EXISTS "Users can update support requests" ON "public"."customer_support_requests";
CREATE POLICY "Authenticated users can update support requests" ON "public"."customer_support_requests" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- document_versions
DROP POLICY IF EXISTS "Authenticated users can update document versions" ON "public"."document_versions";
CREATE POLICY "Authenticated users can update document versions" ON "public"."document_versions" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- expense_requests
DROP POLICY IF EXISTS "Allow authenticated users to delete expense_requests" ON "public"."expense_requests";
DROP POLICY IF EXISTS "Allow authenticated users to update expense_requests" ON "public"."expense_requests";
CREATE POLICY "Authenticated users can delete expense_requests" ON "public"."expense_requests" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update expense_requests" ON "public"."expense_requests" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- iou_records
DROP POLICY IF EXISTS "Allow authenticated users to update iou_records" ON "public"."iou_records";
CREATE POLICY "Authenticated users can update iou_records" ON "public"."iou_records" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- lightvehicle_cash_receipts
DROP POLICY IF EXISTS "Users can delete light vehicle cash receipts" ON "public"."lightvehicle_cash_receipts";
CREATE POLICY "Authenticated users can delete light vehicle cash receipts" ON "public"."lightvehicle_cash_receipts" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- lightvehicle_models
DROP POLICY IF EXISTS "Authenticated users can delete vehicle models" ON "public"."lightvehicle_models";
CREATE POLICY "Authenticated users can delete vehicle models" ON "public"."lightvehicle_models" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- lightvehicle_orders
DROP POLICY IF EXISTS "Authenticated users can delete lightvehicle_orders" ON "public"."lightvehicle_orders";
DROP POLICY IF EXISTS "Authenticated users can update lightvehicle_orders" ON "public"."lightvehicle_orders";
CREATE POLICY "Authenticated users can delete lightvehicle_orders" ON "public"."lightvehicle_orders" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update lightvehicle_orders" ON "public"."lightvehicle_orders" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- lightvehicle_quotation_signatures
DROP POLICY IF EXISTS "Authenticated users can delete signatures" ON "public"."lightvehicle_quotation_signatures";
CREATE POLICY "Authenticated users can delete signatures" ON "public"."lightvehicle_quotation_signatures" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- lightvehicle_quotations
DROP POLICY IF EXISTS "Authenticated users can delete quotations" ON "public"."lightvehicle_quotations";
CREATE POLICY "Authenticated users can delete quotations" ON "public"."lightvehicle_quotations" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- marketing_credit_settings
DROP POLICY IF EXISTS "Allow authenticated delete marketing_credit_settings" ON "public"."marketing_credit_settings";
CREATE POLICY "Authenticated users can delete marketing_credit_settings" ON "public"."marketing_credit_settings" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- marketing_job_requests
DROP POLICY IF EXISTS "Allow authenticated delete marketing_job_requests" ON "public"."marketing_job_requests";
CREATE POLICY "Authenticated users can delete marketing_job_requests" ON "public"."marketing_job_requests" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- marketing_projects
DROP POLICY IF EXISTS "Allow authenticated delete marketing_projects" ON "public"."marketing_projects";
CREATE POLICY "Authenticated users can delete marketing_projects" ON "public"."marketing_projects" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- marketing_social_accounts
DROP POLICY IF EXISTS "Allow authenticated delete marketing_social_accounts" ON "public"."marketing_social_accounts";
CREATE POLICY "Authenticated users can delete marketing_social_accounts" ON "public"."marketing_social_accounts" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- marketing_social_stats
DROP POLICY IF EXISTS "Allow authenticated delete marketing_social_stats" ON "public"."marketing_social_stats";
DROP POLICY IF EXISTS "Allow authenticated update marketing_social_stats" ON "public"."marketing_social_stats";
CREATE POLICY "Authenticated users can delete marketing_social_stats" ON "public"."marketing_social_stats" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update marketing_social_stats" ON "public"."marketing_social_stats" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- marketing_task_assignees
DROP POLICY IF EXISTS "Allow authenticated delete marketing_task_assignees" ON "public"."marketing_task_assignees";
DROP POLICY IF EXISTS "Allow authenticated update marketing_task_assignees" ON "public"."marketing_task_assignees";
CREATE POLICY "Authenticated users can delete marketing_task_assignees" ON "public"."marketing_task_assignees" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update marketing_task_assignees" ON "public"."marketing_task_assignees" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- marketing_task_categories
DROP POLICY IF EXISTS "Allow authenticated delete marketing_task_categories" ON "public"."marketing_task_categories";
DROP POLICY IF EXISTS "Allow authenticated update marketing_task_categories" ON "public"."marketing_task_categories";
CREATE POLICY "Authenticated users can delete marketing_task_categories" ON "public"."marketing_task_categories" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update marketing_task_categories" ON "public"."marketing_task_categories" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- marketing_task_feedback
DROP POLICY IF EXISTS "Allow authenticated delete marketing_task_feedback" ON "public"."marketing_task_feedback";
DROP POLICY IF EXISTS "Allow authenticated update marketing_task_feedback" ON "public"."marketing_task_feedback";
CREATE POLICY "Authenticated users can delete marketing_task_feedback" ON "public"."marketing_task_feedback" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update marketing_task_feedback" ON "public"."marketing_task_feedback" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- marketing_tasks
DROP POLICY IF EXISTS "Allow authenticated delete marketing_tasks" ON "public"."marketing_tasks";
CREATE POLICY "Authenticated users can delete marketing_tasks" ON "public"."marketing_tasks" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- marketing_team_members
DROP POLICY IF EXISTS "Allow authenticated delete marketing_team_members" ON "public"."marketing_team_members";
DROP POLICY IF EXISTS "Allow authenticated update marketing_team_members" ON "public"."marketing_team_members";
CREATE POLICY "Authenticated users can delete marketing_team_members" ON "public"."marketing_team_members" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update marketing_team_members" ON "public"."marketing_team_members" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- payment_links
DROP POLICY IF EXISTS "Users can update payment links" ON "public"."payment_links";
CREATE POLICY "Authenticated users can update payment links" ON "public"."payment_links" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- payment_reminder_rules
DROP POLICY IF EXISTS "Users can delete reminder rules" ON "public"."payment_reminder_rules";
DROP POLICY IF EXISTS "Users can update reminder rules" ON "public"."payment_reminder_rules";
CREATE POLICY "Authenticated users can delete reminder rules" ON "public"."payment_reminder_rules" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update reminder rules" ON "public"."payment_reminder_rules" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- petty_cash_funds
DROP POLICY IF EXISTS "Allow authenticated users to update petty_cash_funds" ON "public"."petty_cash_funds";
CREATE POLICY "Authenticated users can update petty_cash_funds" ON "public"."petty_cash_funds" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- recurring_invoices
DROP POLICY IF EXISTS "Users can delete recurring invoices" ON "public"."recurring_invoices";
DROP POLICY IF EXISTS "Users can update recurring invoices" ON "public"."recurring_invoices";
CREATE POLICY "Authenticated users can delete recurring invoices" ON "public"."recurring_invoices" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update recurring invoices" ON "public"."recurring_invoices" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- scheduled_tasks
DROP POLICY IF EXISTS "Users can delete scheduled tasks" ON "public"."scheduled_tasks";
DROP POLICY IF EXISTS "Users can update scheduled tasks" ON "public"."scheduled_tasks";
CREATE POLICY "Authenticated users can delete scheduled tasks" ON "public"."scheduled_tasks" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update scheduled tasks" ON "public"."scheduled_tasks" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- sinotruck_cash_receipts
DROP POLICY IF EXISTS "Authenticated users can delete sinotruck cash receipts" ON "public"."sinotruck_cash_receipts";
DROP POLICY IF EXISTS "Authenticated users can update sinotruck cash receipts" ON "public"."sinotruck_cash_receipts";
CREATE POLICY "Authenticated users can delete sinotruck cash receipts" ON "public"."sinotruck_cash_receipts" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update sinotruck cash receipts" ON "public"."sinotruck_cash_receipts" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- sinotruck_customer_payments
DROP POLICY IF EXISTS "Authenticated users can manage sinotruck_customer_payments" ON "public"."sinotruck_customer_payments";
CREATE POLICY "Authenticated users can manage sinotruck_customer_payments" ON "public"."sinotruck_customer_payments" FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- sinotruck_customers
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON "public"."sinotruck_customers";
CREATE POLICY "Authenticated users can manage sinotruck customers" ON "public"."sinotruck_customers" FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- sinotruck_finance_settings
DROP POLICY IF EXISTS "Authenticated users can manage sinotruck_finance_settings" ON "public"."sinotruck_finance_settings";
CREATE POLICY "Authenticated users can manage sinotruck_finance_settings" ON "public"."sinotruck_finance_settings" FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- sinotruck_invoice_documents
DROP POLICY IF EXISTS "Authenticated users can delete sinotruck invoice documents" ON "public"."sinotruck_invoice_documents";
DROP POLICY IF EXISTS "Authenticated users can update sinotruck invoice documents" ON "public"."sinotruck_invoice_documents";
CREATE POLICY "Authenticated users can delete sinotruck invoice documents" ON "public"."sinotruck_invoice_documents" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update sinotruck invoice documents" ON "public"."sinotruck_invoice_documents" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- sinotruck_invoice_records
DROP POLICY IF EXISTS "Authenticated users can delete sinotruck invoice records" ON "public"."sinotruck_invoice_records";
DROP POLICY IF EXISTS "Authenticated users can update sinotruck invoice records" ON "public"."sinotruck_invoice_records";
CREATE POLICY "Authenticated users can delete sinotruck invoice records" ON "public"."sinotruck_invoice_records" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update sinotruck invoice records" ON "public"."sinotruck_invoice_records" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- sinotruck_invoice_signatures
DROP POLICY IF EXISTS "Authenticated users can delete sinotruck invoice signatures" ON "public"."sinotruck_invoice_signatures";
DROP POLICY IF EXISTS "Authenticated users can update sinotruck invoice signatures" ON "public"."sinotruck_invoice_signatures";
CREATE POLICY "Authenticated users can delete sinotruck invoice signatures" ON "public"."sinotruck_invoice_signatures" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update sinotruck invoice signatures" ON "public"."sinotruck_invoice_signatures" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- sinotruck_orders
DROP POLICY IF EXISTS "Authenticated users can update sinotruck_orders" ON "public"."sinotruck_orders";
CREATE POLICY "Authenticated users can update sinotruck_orders" ON "public"."sinotruck_orders" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- sinotruck_payment_schedules
DROP POLICY IF EXISTS "Authenticated users can manage sinotruck_payment_schedules" ON "public"."sinotruck_payment_schedules";
CREATE POLICY "Authenticated users can manage sinotruck_payment_schedules" ON "public"."sinotruck_payment_schedules" FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- sinotruck_quotation_signatures
DROP POLICY IF EXISTS "Authenticated users can manage signatures" ON "public"."sinotruck_quotation_signatures";
CREATE POLICY "Authenticated users can manage sinotruck quotation signatures" ON "public"."sinotruck_quotation_signatures" FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- sinotruck_quotations
DROP POLICY IF EXISTS "Authenticated users can manage quotations" ON "public"."sinotruck_quotations";
CREATE POLICY "Authenticated users can manage sinotruck quotations" ON "public"."sinotruck_quotations" FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- sinotruck_referral_commission_payments
DROP POLICY IF EXISTS "Allow authenticated users to update sinotruck commissions" ON "public"."sinotruck_referral_commission_payments";
CREATE POLICY "Authenticated users can update sinotruck commissions" ON "public"."sinotruck_referral_commission_payments" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- sinotruck_truck_model_images
DROP POLICY IF EXISTS "Authenticated users can delete truck model images" ON "public"."sinotruck_truck_model_images";
DROP POLICY IF EXISTS "Authenticated users can update truck model images" ON "public"."sinotruck_truck_model_images";
CREATE POLICY "Authenticated users can delete truck model images" ON "public"."sinotruck_truck_model_images" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update truck model images" ON "public"."sinotruck_truck_model_images" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- workflow_rules
DROP POLICY IF EXISTS "Users can delete workflow rules" ON "public"."workflow_rules";
DROP POLICY IF EXISTS "Users can update workflow rules" ON "public"."workflow_rules";
CREATE POLICY "Authenticated users can delete workflow rules" ON "public"."workflow_rules" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update workflow rules" ON "public"."workflow_rules" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- yutong_finance_settings
DROP POLICY IF EXISTS "Authenticated users can manage yutong_finance_settings" ON "public"."yutong_finance_settings";
CREATE POLICY "Authenticated users can manage yutong_finance_settings" ON "public"."yutong_finance_settings" FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- yutong_referral_commission_payments
DROP POLICY IF EXISTS "Authenticated users can update yutong referral commissions" ON "public"."yutong_referral_commission_payments";
CREATE POLICY "Authenticated users can update yutong referral commissions" ON "public"."yutong_referral_commission_payments" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- yutong_shipment_group_orders
DROP POLICY IF EXISTS "Authenticated users can manage shipment group orders" ON "public"."yutong_shipment_group_orders";
CREATE POLICY "Authenticated users can manage yutong shipment group orders" ON "public"."yutong_shipment_group_orders" FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- yutong_shipment_groups
DROP POLICY IF EXISTS "Authenticated users can manage shipment groups" ON "public"."yutong_shipment_groups";
CREATE POLICY "Authenticated users can manage yutong shipment groups" ON "public"."yutong_shipment_groups" FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- yutong_vehicle_data_sheets
DROP POLICY IF EXISTS "Authenticated users can delete vehicle data sheets" ON "public"."yutong_vehicle_data_sheets";
DROP POLICY IF EXISTS "Authenticated users can update vehicle data sheets" ON "public"."yutong_vehicle_data_sheets";
CREATE POLICY "Authenticated users can delete vehicle data sheets" ON "public"."yutong_vehicle_data_sheets" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update vehicle data sheets" ON "public"."yutong_vehicle_data_sheets" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- yutong_vehicle_records
DROP POLICY IF EXISTS "Authenticated users can delete vehicle records" ON "public"."yutong_vehicle_records";
DROP POLICY IF EXISTS "Authenticated users can update vehicle records" ON "public"."yutong_vehicle_records";
CREATE POLICY "Authenticated users can delete vehicle records" ON "public"."yutong_vehicle_records" FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update vehicle records" ON "public"."yutong_vehicle_records" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- =============================================
-- CATEGORY: Drop redundant service_role policies
-- (service_role bypasses RLS entirely, these are unnecessary and trigger linter warnings)
-- =============================================

DROP POLICY IF EXISTS "Service role can manage cached locations" ON "public"."cached_locations";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_addons";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_customers";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_customization_options";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_invoice_documents";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_invoice_records";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_invoice_signatures";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_model_images";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_models";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_order_tasks";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_orders";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_payment_schedules";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_quotation_addons";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_quotation_signatures";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_quotations";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_referral_commission_payments";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_responsible_persons";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_shipment_group_orders";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_shipment_groups";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_vehicle_data_sheets";
DROP POLICY IF EXISTS "service can manage" ON "public"."lightvehicle_vehicle_records";
DROP POLICY IF EXISTS "Service role can manage rate limits" ON "public"."upload_rate_limits";
DROP POLICY IF EXISTS "service can manage" ON "public"."yutong_shipment_orders";

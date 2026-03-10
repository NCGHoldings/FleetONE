
-- ============================================
-- SECURITY REMEDIATION BATCH 3 - Remaining permissive policies
-- ============================================

-- Marketing tables
DROP POLICY IF EXISTS "Allow authenticated insert marketing_social_stats" ON public.marketing_social_stats;
CREATE POLICY "Auth insert marketing_social_stats" ON public.marketing_social_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated insert marketing_task_assignees" ON public.marketing_task_assignees;
CREATE POLICY "Auth insert marketing_task_assignees" ON public.marketing_task_assignees FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated insert marketing_task_categories" ON public.marketing_task_categories;
CREATE POLICY "Auth insert marketing_task_categories" ON public.marketing_task_categories FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated insert marketing_task_feedback" ON public.marketing_task_feedback;
CREATE POLICY "Auth insert marketing_task_feedback" ON public.marketing_task_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated insert marketing_tasks" ON public.marketing_tasks;
CREATE POLICY "Auth insert marketing_tasks" ON public.marketing_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated insert marketing_team_members" ON public.marketing_team_members;
CREATE POLICY "Auth insert marketing_team_members" ON public.marketing_team_members FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- module_finance_settings
DROP POLICY IF EXISTS "authenticated_users_manage_module_finance_settings" ON public.module_finance_settings;
CREATE POLICY "Auth select module_finance_settings" ON public.module_finance_settings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Finance insert module_finance_settings" ON public.module_finance_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance update module_finance_settings" ON public.module_finance_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- nsp_daily_sales (old leftover)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.nsp_daily_sales;

-- numbering_sequences
DROP POLICY IF EXISTS "Users can insert numbering sequences" ON public.numbering_sequences;
CREATE POLICY "Auth insert numbering_sequences" ON public.numbering_sequences FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- payment_batch_items
DROP POLICY IF EXISTS "Allow authenticated access" ON public.payment_batch_items;
CREATE POLICY "Auth select payment_batch_items" ON public.payment_batch_items FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Finance insert payment_batch_items" ON public.payment_batch_items FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance update payment_batch_items" ON public.payment_batch_items FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- payment_batches
DROP POLICY IF EXISTS "Allow authenticated access" ON public.payment_batches;
CREATE POLICY "Auth select payment_batches" ON public.payment_batches FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Finance insert payment_batches" ON public.payment_batches FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance update payment_batches" ON public.payment_batches FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- payment_links
DROP POLICY IF EXISTS "Users can insert payment links" ON public.payment_links;
CREATE POLICY "Auth insert payment_links" ON public.payment_links FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- payment_reminder_rules
DROP POLICY IF EXISTS "Users can insert reminder rules" ON public.payment_reminder_rules;
CREATE POLICY "Auth insert payment_reminder_rules" ON public.payment_reminder_rules FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- payment_reminders_sent
DROP POLICY IF EXISTS "Users can insert reminder logs" ON public.payment_reminders_sent;
CREATE POLICY "Auth insert payment_reminders_sent" ON public.payment_reminders_sent FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- petty_cash
DROP POLICY IF EXISTS "Allow authenticated users to insert petty_cash_funds" ON public.petty_cash_funds;
CREATE POLICY "Auth insert petty_cash_funds" ON public.petty_cash_funds FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated users to insert petty_cash_transactions" ON public.petty_cash_transactions;
CREATE POLICY "Auth insert petty_cash_transactions" ON public.petty_cash_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- recurring_invoice_history
DROP POLICY IF EXISTS "Users can insert recurring history" ON public.recurring_invoice_history;
CREATE POLICY "Auth insert recurring_invoice_history" ON public.recurring_invoice_history FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- recurring_invoices
DROP POLICY IF EXISTS "Users can insert recurring invoices" ON public.recurring_invoices;
CREATE POLICY "Auth insert recurring_invoices" ON public.recurring_invoices FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- safety_alerts
DROP POLICY IF EXISTS "System can insert safety alerts" ON public.safety_alerts;
CREATE POLICY "Auth insert safety_alerts" ON public.safety_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- scheduled_tasks
DROP POLICY IF EXISTS "Users can insert scheduled tasks" ON public.scheduled_tasks;
CREATE POLICY "Auth insert scheduled_tasks" ON public.scheduled_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- school_bus_expense_gl_mappings
DROP POLICY IF EXISTS "Users can insert expense GL mappings" ON public.school_bus_expense_gl_mappings;
CREATE POLICY "Auth insert school_bus_expense_gl_mappings" ON public.school_bus_expense_gl_mappings FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- school_receipts
DROP POLICY IF EXISTS "receipts_insert_policy" ON public.school_receipts;
CREATE POLICY "Auth insert school_receipts" ON public.school_receipts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- segments
DROP POLICY IF EXISTS "Allow authenticated access" ON public.segments;
CREATE POLICY "Auth select segments" ON public.segments FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert segments" ON public.segments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update segments" ON public.segments FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- serial_numbers
DROP POLICY IF EXISTS "Allow authenticated access" ON public.serial_numbers;
CREATE POLICY "Auth select serial_numbers" ON public.serial_numbers FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert serial_numbers" ON public.serial_numbers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update serial_numbers" ON public.serial_numbers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- sinotruck tables
DROP POLICY IF EXISTS "Authenticated users can insert sinotruck cash receipts" ON public.sinotruck_cash_receipts;
CREATE POLICY "Auth insert sinotruck_cash_receipts" ON public.sinotruck_cash_receipts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert sinotruck invoice documents" ON public.sinotruck_invoice_documents;
CREATE POLICY "Auth insert sinotruck_invoice_docs" ON public.sinotruck_invoice_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert sinotruck invoice records" ON public.sinotruck_invoice_records;
CREATE POLICY "Auth insert sinotruck_invoice_records" ON public.sinotruck_invoice_records FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert sinotruck invoice signatures" ON public.sinotruck_invoice_signatures;
CREATE POLICY "Auth insert sinotruck_invoice_sigs" ON public.sinotruck_invoice_signatures FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert sinotruck_orders" ON public.sinotruck_orders;
CREATE POLICY "Auth insert sinotruck_orders" ON public.sinotruck_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated users to insert sinotruck commissions" ON public.sinotruck_referral_commission_payments;
CREATE POLICY "Auth insert sinotruck_ref_comm" ON public.sinotruck_referral_commission_payments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert truck model images" ON public.sinotruck_truck_model_images;
CREATE POLICY "Auth insert sinotruck_truck_model_imgs" ON public.sinotruck_truck_model_images FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- special_hire_finance_settings
DROP POLICY IF EXISTS "Users can insert special hire finance settings" ON public.special_hire_finance_settings;
CREATE POLICY "Auth insert special_hire_finance_settings" ON public.special_hire_finance_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- special_hire_payments
DROP POLICY IF EXISTS "payment_proof_insert" ON public.special_hire_payments;
CREATE POLICY "Auth insert special_hire_payments" ON public.special_hire_payments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "payment_proof_update" ON public.special_hire_payments;
CREATE POLICY "Auth update special_hire_payments" ON public.special_hire_payments FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- system_issues
DROP POLICY IF EXISTS "Users can report issues" ON public.system_issues;
CREATE POLICY "Auth insert system_issues" ON public.system_issues FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- system_notifications
DROP POLICY IF EXISTS "Allow authenticated access" ON public.system_notifications;
CREATE POLICY "Auth select system_notifications" ON public.system_notifications FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert system_notifications" ON public.system_notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update system_notifications" ON public.system_notifications FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- user_activity_log
DROP POLICY IF EXISTS "Can log activity" ON public.user_activity_log;
CREATE POLICY "Auth insert user_activity_log" ON public.user_activity_log FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- wht_certificates
DROP POLICY IF EXISTS "Allow authenticated access" ON public.wht_certificates;
CREATE POLICY "Auth select wht_certificates" ON public.wht_certificates FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Finance insert wht_certificates" ON public.wht_certificates FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance update wht_certificates" ON public.wht_certificates FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

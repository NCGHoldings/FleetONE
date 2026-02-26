
-- ============================================
-- SECURITY REMEDIATION BATCH 2 (corrected)
-- ============================================

-- Fix function search paths
ALTER FUNCTION public.generate_sbs_batch_number() SET search_path = 'public';
ALTER FUNCTION public.generate_sbs_invoice_number(text) SET search_path = 'public';
ALTER FUNCTION public.generate_job_request_number() SET search_path = 'public';
ALTER FUNCTION public.generate_marketing_project_number() SET search_path = 'public';
ALTER FUNCTION public.generate_marketing_task_number() SET search_path = 'public';
ALTER FUNCTION public.generate_next_lightvehicle_version_number(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_liability_account_setting(uuid) SET search_path = 'public';
ALTER FUNCTION public.track_sinotruck_referral_commission() SET search_path = 'public';
ALTER FUNCTION public.update_leasing_finance_settings_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_liability_account_setting(uuid, uuid) SET search_path = 'public';

-- batch_numbers
DROP POLICY IF EXISTS "Allow authenticated access" ON public.batch_numbers;
CREATE POLICY "Auth select batch_numbers" ON public.batch_numbers FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert batch_numbers" ON public.batch_numbers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update batch_numbers" ON public.batch_numbers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- data_archive_policies
DROP POLICY IF EXISTS "Allow authenticated access" ON public.data_archive_policies;
CREATE POLICY "Auth select data_archive_policies" ON public.data_archive_policies FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin insert data_archive_policies" ON public.data_archive_policies FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin update data_archive_policies" ON public.data_archive_policies FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- exchange_rates
DROP POLICY IF EXISTS "Allow authenticated access" ON public.exchange_rates;
CREATE POLICY "Auth select exchange_rates" ON public.exchange_rates FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Finance insert exchange_rates" ON public.exchange_rates FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance update exchange_rates" ON public.exchange_rates FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- inventory_ageing_config
DROP POLICY IF EXISTS "Allow authenticated access" ON public.inventory_ageing_config;
CREATE POLICY "Auth select inventory_ageing_config" ON public.inventory_ageing_config FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin insert inventory_ageing_config" ON public.inventory_ageing_config FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin update inventory_ageing_config" ON public.inventory_ageing_config FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- lightvehicle ALL policies -> per-operation
DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_addons" ON public.lightvehicle_addons;
CREATE POLICY "Auth select lv_addons" ON public.lightvehicle_addons FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert lv_addons" ON public.lightvehicle_addons FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update lv_addons" ON public.lightvehicle_addons FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete lv_addons" ON public.lightvehicle_addons FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_customer_payments" ON public.lightvehicle_customer_payments;
CREATE POLICY "Auth select lv_cust_pay" ON public.lightvehicle_customer_payments FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert lv_cust_pay" ON public.lightvehicle_customer_payments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update lv_cust_pay" ON public.lightvehicle_customer_payments FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_customers" ON public.lightvehicle_customers;
CREATE POLICY "Auth select lv_customers" ON public.lightvehicle_customers FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert lv_customers" ON public.lightvehicle_customers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update lv_customers" ON public.lightvehicle_customers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_customization_optio" ON public.lightvehicle_customization_options;
CREATE POLICY "Auth select lv_custom_opts" ON public.lightvehicle_customization_options FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert lv_custom_opts" ON public.lightvehicle_customization_options FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update lv_custom_opts" ON public.lightvehicle_customization_options FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_invoice_documents" ON public.lightvehicle_invoice_documents;
CREATE POLICY "Auth select lv_inv_docs" ON public.lightvehicle_invoice_documents FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert lv_inv_docs" ON public.lightvehicle_invoice_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update lv_inv_docs" ON public.lightvehicle_invoice_documents FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_invoice_records" ON public.lightvehicle_invoice_records;
CREATE POLICY "Auth select lv_inv_records" ON public.lightvehicle_invoice_records FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert lv_inv_records" ON public.lightvehicle_invoice_records FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update lv_inv_records" ON public.lightvehicle_invoice_records FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_invoice_signatures" ON public.lightvehicle_invoice_signatures;
CREATE POLICY "Auth select lv_inv_sigs" ON public.lightvehicle_invoice_signatures FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert lv_inv_sigs" ON public.lightvehicle_invoice_signatures FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update lv_inv_sigs" ON public.lightvehicle_invoice_signatures FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_model_images" ON public.lightvehicle_model_images;
CREATE POLICY "Auth select lv_model_imgs" ON public.lightvehicle_model_images FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert lv_model_imgs" ON public.lightvehicle_model_images FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update lv_model_imgs" ON public.lightvehicle_model_images FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_order_tasks" ON public.lightvehicle_order_tasks;
CREATE POLICY "Auth select lv_order_tasks" ON public.lightvehicle_order_tasks FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert lv_order_tasks" ON public.lightvehicle_order_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update lv_order_tasks" ON public.lightvehicle_order_tasks FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_payment_schedules" ON public.lightvehicle_payment_schedules;
CREATE POLICY "Auth select lv_pay_sched" ON public.lightvehicle_payment_schedules FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert lv_pay_sched" ON public.lightvehicle_payment_schedules FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update lv_pay_sched" ON public.lightvehicle_payment_schedules FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_quotation_addons" ON public.lightvehicle_quotation_addons;
CREATE POLICY "Auth select lv_quot_addons" ON public.lightvehicle_quotation_addons FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert lv_quot_addons" ON public.lightvehicle_quotation_addons FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update lv_quot_addons" ON public.lightvehicle_quotation_addons FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_referral_commission" ON public.lightvehicle_referral_commission_payments;
CREATE POLICY "Auth select lv_ref_comm" ON public.lightvehicle_referral_commission_payments FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert lv_ref_comm" ON public.lightvehicle_referral_commission_payments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update lv_ref_comm" ON public.lightvehicle_referral_commission_payments FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_responsible_persons" ON public.lightvehicle_responsible_persons;
CREATE POLICY "Auth select lv_resp_persons" ON public.lightvehicle_responsible_persons FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert lv_resp_persons" ON public.lightvehicle_responsible_persons FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update lv_resp_persons" ON public.lightvehicle_responsible_persons FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_shipment_group_orde" ON public.lightvehicle_shipment_group_orders;
CREATE POLICY "Auth select lv_ship_grp_orders" ON public.lightvehicle_shipment_group_orders FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert lv_ship_grp_orders" ON public.lightvehicle_shipment_group_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update lv_ship_grp_orders" ON public.lightvehicle_shipment_group_orders FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_shipment_groups" ON public.lightvehicle_shipment_groups;
CREATE POLICY "Auth select lv_ship_groups" ON public.lightvehicle_shipment_groups FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert lv_ship_groups" ON public.lightvehicle_shipment_groups FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update lv_ship_groups" ON public.lightvehicle_shipment_groups FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_vehicle_data_sheets" ON public.lightvehicle_vehicle_data_sheets;
CREATE POLICY "Auth select lv_data_sheets" ON public.lightvehicle_vehicle_data_sheets FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert lv_data_sheets" ON public.lightvehicle_vehicle_data_sheets FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update lv_data_sheets" ON public.lightvehicle_vehicle_data_sheets FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_vehicle_records" ON public.lightvehicle_vehicle_records;
CREATE POLICY "Auth select lv_vehicle_records" ON public.lightvehicle_vehicle_records FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert lv_vehicle_records" ON public.lightvehicle_vehicle_records FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update lv_vehicle_records" ON public.lightvehicle_vehicle_records FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- lightvehicle_finance_settings
DROP POLICY IF EXISTS "Authenticated users can manage lightvehicle_finance_settings" ON public.lightvehicle_finance_settings;
CREATE POLICY "Auth select lv_finance_settings" ON public.lightvehicle_finance_settings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Finance insert lv_finance_settings" ON public.lightvehicle_finance_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Finance update lv_finance_settings" ON public.lightvehicle_finance_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- nsp_daily_sales
DROP POLICY IF EXISTS "authenticated_users_crud" ON public.nsp_daily_sales;
CREATE POLICY "Auth select nsp_daily_sales" ON public.nsp_daily_sales FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert nsp_daily_sales" ON public.nsp_daily_sales FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update nsp_daily_sales" ON public.nsp_daily_sales FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete nsp_daily_sales" ON public.nsp_daily_sales FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- customer_portal_access
DROP POLICY IF EXISTS "Users can insert portal access" ON public.customer_portal_access;
CREATE POLICY "Auth insert customer_portal_access" ON public.customer_portal_access FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- customer_support_requests
DROP POLICY IF EXISTS "Users can insert support requests" ON public.customer_support_requests;
CREATE POLICY "Auth insert customer_support_requests" ON public.customer_support_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- marketing tables (only existing ones)
DROP POLICY IF EXISTS "Allow authenticated insert marketing_social_accounts" ON public.marketing_social_accounts;
CREATE POLICY "Auth insert marketing_social_accounts" ON public.marketing_social_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated update marketing_credit_settings" ON public.marketing_credit_settings;
CREATE POLICY "Auth update marketing_credit_settings" ON public.marketing_credit_settings FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated update marketing_job_requests" ON public.marketing_job_requests;
CREATE POLICY "Auth update marketing_job_requests" ON public.marketing_job_requests FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated update marketing_projects" ON public.marketing_projects;
CREATE POLICY "Auth update marketing_projects" ON public.marketing_projects FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated update marketing_social_accounts" ON public.marketing_social_accounts;
CREATE POLICY "Auth update marketing_social_accounts" ON public.marketing_social_accounts FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated update marketing_tasks" ON public.marketing_tasks;
CREATE POLICY "Auth update marketing_tasks" ON public.marketing_tasks FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

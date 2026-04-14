
-- Fix remaining function search paths
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

-- nsp_daily_sales
DROP POLICY IF EXISTS "authenticated_users_crud" ON public.nsp_daily_sales;
DROP POLICY IF EXISTS "Authenticated select nsp_daily_sales" ON public.nsp_daily_sales;
DROP POLICY IF EXISTS "Authenticated insert nsp_daily_sales" ON public.nsp_daily_sales;
DROP POLICY IF EXISTS "Authenticated update nsp_daily_sales" ON public.nsp_daily_sales;
DROP POLICY IF EXISTS "Authenticated delete nsp_daily_sales" ON public.nsp_daily_sales;
CREATE POLICY "Authenticated select nsp_daily_sales" ON public.nsp_daily_sales FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert nsp_daily_sales" ON public.nsp_daily_sales FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update nsp_daily_sales" ON public.nsp_daily_sales FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete nsp_daily_sales" ON public.nsp_daily_sales FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- customer_portal_access
DROP POLICY IF EXISTS "Users can insert portal access" ON public.customer_portal_access;
DROP POLICY IF EXISTS "Authenticated insert customer_portal_access" ON public.customer_portal_access;
CREATE POLICY "Authenticated insert customer_portal_access" ON public.customer_portal_access FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- customer_support_requests
DROP POLICY IF EXISTS "Users can insert support requests" ON public.customer_support_requests;
DROP POLICY IF EXISTS "Authenticated insert customer_support_requests" ON public.customer_support_requests;
CREATE POLICY "Authenticated insert customer_support_requests" ON public.customer_support_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- marketing_social_accounts
DROP POLICY IF EXISTS "Allow authenticated insert marketing_social_accounts" ON public.marketing_social_accounts;
DROP POLICY IF EXISTS "Authenticated insert marketing_social_accounts" ON public.marketing_social_accounts;
CREATE POLICY "Authenticated insert marketing_social_accounts" ON public.marketing_social_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

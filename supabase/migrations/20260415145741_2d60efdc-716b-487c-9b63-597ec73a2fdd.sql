-- ============================================
-- 1. CUSTOMER PORTAL: Remove anon access to OTP codes
-- ============================================
DROP POLICY IF EXISTS "Anyone can view portal access for login" ON public.customer_portal_access;
DROP POLICY IF EXISTS "Anyone can update portal access for OTP" ON public.customer_portal_access;
DROP POLICY IF EXISTS "Authenticated insert customer_portal_access" ON public.customer_portal_access;

-- Service role handles OTP flow
CREATE POLICY "Service role manages portal access"
ON public.customer_portal_access FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- 2. CUSTOMER PORTAL SESSIONS: Remove anon access
-- ============================================
DROP POLICY IF EXISTS "Anyone can view their session" ON public.customer_portal_sessions;
DROP POLICY IF EXISTS "Anyone can insert portal sessions" ON public.customer_portal_sessions;

-- Service role handles session management
CREATE POLICY "Service role manages portal sessions"
ON public.customer_portal_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- 3. AR INVOICES: Remove public role policies
-- ============================================
DROP POLICY IF EXISTS "Users can manage AR invoices" ON public.ar_invoices;
DROP POLICY IF EXISTS "Users can view AR invoices" ON public.ar_invoices;

-- ============================================
-- 4. AR INVOICE LINES: Remove public role policies
-- ============================================
DROP POLICY IF EXISTS "Users can manage AR invoice lines" ON public.ar_invoice_lines;
DROP POLICY IF EXISTS "Users can view AR invoice lines" ON public.ar_invoice_lines;

-- ============================================
-- 5. STAFF REGISTRY: Restrict to admin/HR
-- ============================================
DROP POLICY IF EXISTS "Staff registry manageable by authenticated users" ON public.staff_registry;
DROP POLICY IF EXISTS "Staff registry viewable by authenticated users" ON public.staff_registry;

CREATE POLICY "Admin and HR can manage staff registry"
ON public.staff_registry FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Supervisors can view staff registry"
ON public.staff_registry FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'finance'::app_role));

-- ============================================
-- 6. MARKETING SOCIAL ACCOUNTS: Restrict OAuth tokens
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated read marketing_social_accounts" ON public.marketing_social_accounts;
DROP POLICY IF EXISTS "Auth insert marketing_social_accounts" ON public.marketing_social_accounts;
DROP POLICY IF EXISTS "Auth update marketing_social_accounts" ON public.marketing_social_accounts;
DROP POLICY IF EXISTS "Authenticated insert marketing_social_accounts" ON public.marketing_social_accounts;
DROP POLICY IF EXISTS "Authenticated users can delete marketing_social_accounts" ON public.marketing_social_accounts;

CREATE POLICY "Admins can manage marketing social accounts"
ON public.marketing_social_accounts FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- ============================================
-- 7. AI CHAT: Restrict to admin/support
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage chat sessions" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Authenticated users can manage chat messages" ON public.ai_chat_messages;

CREATE POLICY "Admins can manage chat sessions"
ON public.ai_chat_sessions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Allow anon/service to create sessions (chatbot widget)
CREATE POLICY "Service role manages chat sessions"
ON public.ai_chat_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can manage chat messages"
ON public.ai_chat_messages FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Service role manages chat messages"
ON public.ai_chat_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- 8. VENDOR BANK ACCOUNTS: Remove public read
-- ============================================
DROP POLICY IF EXISTS "Users can view vendor bank accounts" ON public.vendor_bank_accounts;

CREATE POLICY "Finance can view vendor bank accounts"
ON public.vendor_bank_accounts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role));
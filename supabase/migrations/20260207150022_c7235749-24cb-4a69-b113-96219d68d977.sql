-- ===========================================
-- Customer Portal Access Tables
-- ===========================================

-- Customer Portal Access (OTP-based login)
CREATE TABLE public.customer_portal_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    otp_code TEXT,
    otp_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payment Links for online payments
CREATE TABLE public.payment_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id),
    customer_id UUID REFERENCES public.customers(id) NOT NULL,
    ar_invoice_id UUID REFERENCES public.ar_invoices(id),
    link_code TEXT UNIQUE NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ,
    payment_provider TEXT DEFAULT 'manual',
    payment_reference TEXT,
    paid_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Customer Portal Session Tokens
CREATE TABLE public.customer_portal_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_access_id UUID REFERENCES public.customer_portal_access(id) ON DELETE CASCADE NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Customer Support Requests
CREATE TABLE public.customer_support_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id),
    customer_id UUID REFERENCES public.customers(id) NOT NULL,
    portal_access_id UUID REFERENCES public.customer_portal_access(id),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    related_invoice_id UUID REFERENCES public.ar_invoices(id),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_to UUID,
    resolved_at TIMESTAMPTZ,
    response_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_support_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_portal_access
CREATE POLICY "Users can view portal access" ON public.customer_portal_access FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert portal access" ON public.customer_portal_access FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update portal access" ON public.customer_portal_access FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete portal access" ON public.customer_portal_access FOR DELETE TO authenticated USING (true);

-- Public access for portal login (anon)
CREATE POLICY "Anyone can view portal access for login" ON public.customer_portal_access FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can update portal access for OTP" ON public.customer_portal_access FOR UPDATE TO anon USING (true);

-- RLS Policies for payment_links
CREATE POLICY "Users can view payment links" ON public.payment_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert payment links" ON public.payment_links FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update payment links" ON public.payment_links FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Anyone can view payment links by code" ON public.payment_links FOR SELECT TO anon USING (true);

-- RLS Policies for sessions
CREATE POLICY "Users can view portal sessions" ON public.customer_portal_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert portal sessions" ON public.customer_portal_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can view their session" ON public.customer_portal_sessions FOR SELECT TO anon USING (true);

-- RLS Policies for support requests
CREATE POLICY "Users can view support requests" ON public.customer_support_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert support requests" ON public.customer_support_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update support requests" ON public.customer_support_requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Anyone can insert support requests" ON public.customer_support_requests FOR INSERT TO anon WITH CHECK (true);

-- Indexes
CREATE INDEX idx_portal_access_customer ON public.customer_portal_access(customer_id);
CREATE INDEX idx_portal_access_email ON public.customer_portal_access(email);
CREATE INDEX idx_payment_links_customer ON public.payment_links(customer_id);
CREATE INDEX idx_payment_links_code ON public.payment_links(link_code);
CREATE INDEX idx_portal_sessions_token ON public.customer_portal_sessions(session_token);
CREATE INDEX idx_support_requests_customer ON public.customer_support_requests(customer_id);
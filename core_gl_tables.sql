-- ============================================================
-- CORE GL TABLES CREATION SCRIPT
-- Run this in Supabase SQL Editor to bring the GL system online
-- ============================================================

-- 1. Create the journal_status enum (required by journal_entries)
DO $$ BEGIN
    CREATE TYPE public.journal_status AS ENUM ('draft', 'posted', 'voided', 'reversed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 2. JOURNAL ENTRIES — The core GL container
-- ============================================================
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_number TEXT NOT NULL DEFAULT '',
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    reference TEXT,
    status public.journal_status DEFAULT 'draft',
    total_debit DECIMAL(15, 2) DEFAULT 0,
    total_credit DECIMAL(15, 2) DEFAULT 0,
    company_id UUID REFERENCES public.companies(id),
    source_module TEXT,
    period_id UUID,
    business_unit_id UUID,
    business_unit_code TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency TEXT,
    next_run_date DATE,
    is_reversal BOOLEAN DEFAULT false,
    reversed_entry_id UUID,
    approval_status TEXT DEFAULT 'approved',
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    posted_by UUID,
    posted_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate entry_number
CREATE OR REPLACE FUNCTION generate_je_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.entry_number IS NULL OR NEW.entry_number = '' THEN
        NEW.entry_number := 'JE-' || LPAD(nextval('je_number_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS je_number_seq START 1;

DROP TRIGGER IF EXISTS set_je_number ON public.journal_entries;
CREATE TRIGGER set_je_number
    BEFORE INSERT ON public.journal_entries
    FOR EACH ROW EXECUTE FUNCTION generate_je_number();

-- ============================================================
-- 3. JOURNAL ENTRY LINES — The double-entry legs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
    debit DECIMAL(15, 2) DEFAULT 0,
    credit DECIMAL(15, 2) DEFAULT 0,
    description TEXT,
    company_id UUID REFERENCES public.companies(id),
    cost_center_id UUID,
    project_id UUID,
    segment_id UUID,
    bus_id UUID,
    route_id UUID,
    trip_id UUID,
    expense_id UUID,
    location_id UUID,
    business_unit_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_jel_journal_entry_id ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account_id ON public.journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_je_company_id ON public.journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_je_entry_date ON public.journal_entries(entry_date);

-- ============================================================
-- 4. VENDORS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_code TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    vendor_type TEXT,
    vendor_category_id UUID,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    tax_id TEXT,
    payment_terms INTEGER,
    currency TEXT DEFAULT 'LKR',
    bank_name TEXT,
    bank_branch TEXT,
    bank_account TEXT,
    ap_account_id UUID REFERENCES public.chart_of_accounts(id),
    wht_applicable BOOLEAN DEFAULT false,
    wht_rate DECIMAL(5, 2),
    is_active BOOLEAN DEFAULT true,
    company_id UUID REFERENCES public.companies(id),
    business_unit_code TEXT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. AR INVOICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ar_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    customer_id UUID REFERENCES public.customers(id),
    total_amount DECIMAL(15, 2) NOT NULL,
    subtotal DECIMAL(15, 2),
    tax_amount DECIMAL(15, 2),
    discount_amount DECIMAL(15, 2),
    paid_amount DECIMAL(15, 2) DEFAULT 0,
    balance DECIMAL(15, 2) NOT NULL,
    status TEXT DEFAULT 'draft',
    reference TEXT,
    notes TEXT,
    journal_entry_id UUID REFERENCES public.journal_entries(id),
    company_id UUID REFERENCES public.companies(id),
    business_unit_code TEXT,
    bus_id UUID,
    bus_no TEXT,
    bus_type TEXT,
    bus_category_id UUID,
    bus_sub_category_id UUID,
    period_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. EXPENSE REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expense_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_number TEXT NOT NULL DEFAULT '',
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expense_category TEXT NOT NULL,
    expense_subcategory TEXT,
    amount DECIMAL(15, 2) DEFAULT 0,
    description TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    receipt_attachment_url TEXT,
    receipt_ocr_data JSONB,
    ocr_fields_modified TEXT[],
    additional_docs JSONB,
    fuel_liters DECIMAL(10, 2),
    fuel_price_per_liter DECIMAL(10, 2),
    gl_posted BOOLEAN DEFAULT false,
    journal_entry_id UUID REFERENCES public.journal_entries(id),
    ap_invoice_id UUID,
    ap_payment_id UUID,
    iou_id UUID,
    petty_cash_fund_id UUID,
    bank_account_id UUID,
    vendor_id UUID,
    vendor_name_draft TEXT,
    bus_id UUID,
    company_id UUID REFERENCES public.companies(id),
    business_unit_code TEXT NOT NULL DEFAULT 'MAIN',
    approved_by UUID,
    reviewed_by UUID,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate expense request number
CREATE OR REPLACE FUNCTION generate_exp_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
        NEW.request_number := 'EXP-' || LPAD(nextval('exp_number_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS exp_number_seq START 1;

DROP TRIGGER IF EXISTS set_exp_number ON public.expense_requests;
CREATE TRIGGER set_exp_number
    BEFORE INSERT ON public.expense_requests
    FOR EACH ROW EXECUTE FUNCTION generate_exp_number();

-- ============================================================
-- 7. GL SETTINGS TABLE (per-company account mappings)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gl_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) UNIQUE,
    trade_receivable_account_id UUID REFERENCES public.chart_of_accounts(id),
    trade_payable_account_id UUID REFERENCES public.chart_of_accounts(id),
    sales_revenue_account_id UUID REFERENCES public.chart_of_accounts(id),
    bank_account_id UUID REFERENCES public.chart_of_accounts(id),
    expense_account_id UUID REFERENCES public.chart_of_accounts(id),
    default_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
    tax_payable_account_id UUID REFERENCES public.chart_of_accounts(id),
    input_tax_account_id UUID REFERENCES public.chart_of_accounts(id),
    customer_advance_account_id UUID REFERENCES public.chart_of_accounts(id),
    wht_payable_account_id UUID REFERENCES public.chart_of_accounts(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. MODULE FINANCE SETTINGS (category → GL mapping)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.module_finance_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    module_name TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id),
    settings JSONB DEFAULT '{}',
    mappings JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(module_name, company_id)
);

-- ============================================================
-- 9. Enable Row Level Security
-- ============================================================
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gl_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_finance_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (RLS policies)
CREATE POLICY "auth_je" ON public.journal_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_jel" ON public.journal_entry_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_vendors" ON public.vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_ar" ON public.ar_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_exp" ON public.expense_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_gl" ON public.gl_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_mfs" ON public.module_finance_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- DONE! Your GL system is now online.
-- ============================================================
SELECT 'SUCCESS: All core GL tables created!' as result,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('journal_entries', 'journal_entry_lines', 'vendors', 'ar_invoices', 'expense_requests', 'gl_settings', 'module_finance_settings')) as tables_created;

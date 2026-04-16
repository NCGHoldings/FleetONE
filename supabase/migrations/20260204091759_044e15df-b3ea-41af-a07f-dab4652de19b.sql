-- =============================================
-- EXPENSE MANAGEMENT SYSTEM SCHEMA
-- =============================================

-- 1. Expense Requests Table (Main expense tracking)
CREATE TABLE public.expense_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    request_number TEXT NOT NULL UNIQUE,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    business_unit_code TEXT NOT NULL CHECK (business_unit_code IN ('SBO', 'SPH', 'YUT', 'SNT', 'LTV', 'NCGE')),
    company_id UUID REFERENCES public.companies(id),
    expense_category TEXT NOT NULL,
    expense_subcategory TEXT,
    description TEXT,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    bus_id UUID REFERENCES public.buses(id),
    vendor_id UUID REFERENCES public.vendors(id),
    vendor_name_draft TEXT,
    payment_method TEXT DEFAULT 'to_be_paid' CHECK (payment_method IN ('cash', 'bank', 'petty_cash', 'iou', 'to_be_paid')),
    petty_cash_fund_id UUID,
    iou_id UUID,
    receipt_attachment_url TEXT,
    additional_docs JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_finance', 'pending_approval', 'approved', 'rejected', 'paid')),
    created_by UUID,
    reviewed_by UUID,
    approved_by UUID,
    ap_invoice_id UUID REFERENCES public.ap_invoices(id),
    ap_payment_id UUID REFERENCES public.ap_payments(id),
    gl_posted BOOLEAN DEFAULT FALSE,
    journal_entry_id UUID REFERENCES public.journal_entries(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Petty Cash Funds Table
CREATE TABLE public.petty_cash_funds (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    fund_name TEXT NOT NULL,
    fund_code TEXT UNIQUE,
    business_unit_code TEXT NOT NULL CHECK (business_unit_code IN ('SBO', 'SPH', 'YUT', 'SNT', 'LTV', 'NCGE')),
    company_id UUID REFERENCES public.companies(id),
    custodian_id UUID REFERENCES public.staff_registry(id),
    opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
    current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
    gl_account_id UUID REFERENCES public.chart_of_accounts(id),
    is_active BOOLEAN DEFAULT TRUE,
    last_replenished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Petty Cash Transactions Table
CREATE TABLE public.petty_cash_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    petty_cash_fund_id UUID NOT NULL REFERENCES public.petty_cash_funds(id),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('disbursement', 'replenishment')),
    expense_request_id UUID REFERENCES public.expense_requests(id),
    amount NUMERIC(15,2) NOT NULL,
    balance_after NUMERIC(15,2) NOT NULL,
    receipt_number TEXT,
    description TEXT,
    journal_entry_id UUID REFERENCES public.journal_entries(id),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. IOU Records Table
CREATE TABLE public.iou_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    iou_number TEXT NOT NULL UNIQUE,
    business_unit_code TEXT NOT NULL CHECK (business_unit_code IN ('SBO', 'SPH', 'YUT', 'SNT', 'LTV', 'NCGE')),
    company_id UUID REFERENCES public.companies(id),
    staff_id UUID REFERENCES public.staff_registry(id),
    amount NUMERIC(15,2) NOT NULL,
    purpose TEXT,
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    settled_amount NUMERIC(15,2) DEFAULT 0,
    balance NUMERIC(15,2) GENERATED ALWAYS AS (amount - settled_amount) STORED,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_settled', 'settled', 'overdue')),
    expense_request_ids UUID[] DEFAULT '{}',
    journal_entry_id UUID REFERENCES public.journal_entries(id),
    issued_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints for expense_requests after petty_cash and iou tables exist
ALTER TABLE public.expense_requests 
    ADD CONSTRAINT expense_requests_petty_cash_fund_id_fkey 
    FOREIGN KEY (petty_cash_fund_id) REFERENCES public.petty_cash_funds(id);

ALTER TABLE public.expense_requests 
    ADD CONSTRAINT expense_requests_iou_id_fkey 
    FOREIGN KEY (iou_id) REFERENCES public.iou_records(id);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_expense_requests_business_unit ON public.expense_requests(business_unit_code);
CREATE INDEX idx_expense_requests_status ON public.expense_requests(status);
CREATE INDEX idx_expense_requests_company ON public.expense_requests(company_id);
CREATE INDEX idx_expense_requests_date ON public.expense_requests(request_date);
CREATE INDEX idx_expense_requests_category ON public.expense_requests(expense_category);
CREATE INDEX idx_expense_requests_vendor ON public.expense_requests(vendor_id);

CREATE INDEX idx_petty_cash_funds_business_unit ON public.petty_cash_funds(business_unit_code);
CREATE INDEX idx_petty_cash_transactions_fund ON public.petty_cash_transactions(petty_cash_fund_id);

CREATE INDEX idx_iou_records_business_unit ON public.iou_records(business_unit_code);
CREATE INDEX idx_iou_records_staff ON public.iou_records(staff_id);
CREATE INDEX idx_iou_records_status ON public.iou_records(status);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.expense_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iou_records ENABLE ROW LEVEL SECURITY;

-- Expense Requests Policies
CREATE POLICY "Allow authenticated users to view expense_requests"
ON public.expense_requests FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert expense_requests"
ON public.expense_requests FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update expense_requests"
ON public.expense_requests FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete expense_requests"
ON public.expense_requests FOR DELETE
TO authenticated
USING (true);

-- Petty Cash Funds Policies
CREATE POLICY "Allow authenticated users to view petty_cash_funds"
ON public.petty_cash_funds FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert petty_cash_funds"
ON public.petty_cash_funds FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update petty_cash_funds"
ON public.petty_cash_funds FOR UPDATE
TO authenticated
USING (true);

-- Petty Cash Transactions Policies
CREATE POLICY "Allow authenticated users to view petty_cash_transactions"
ON public.petty_cash_transactions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert petty_cash_transactions"
ON public.petty_cash_transactions FOR INSERT
TO authenticated
WITH CHECK (true);

-- IOU Records Policies
CREATE POLICY "Allow authenticated users to view iou_records"
ON public.iou_records FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert iou_records"
ON public.iou_records FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update iou_records"
ON public.iou_records FOR UPDATE
TO authenticated
USING (true);

-- =============================================
-- AUTO-GENERATE REQUEST NUMBER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION generate_expense_request_number()
RETURNS TRIGGER AS $$
DECLARE
    next_seq INTEGER;
    date_part TEXT;
BEGIN
    date_part := TO_CHAR(NEW.request_date, 'YYYYMMDD');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(request_number FROM 13) AS INTEGER)
    ), 0) + 1
    INTO next_seq
    FROM public.expense_requests
    WHERE request_number LIKE 'EXP-' || date_part || '-%';
    
    NEW.request_number := 'EXP-' || date_part || '-' || LPAD(next_seq::TEXT, 3, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_expense_request_number
    BEFORE INSERT ON public.expense_requests
    FOR EACH ROW
    WHEN (NEW.request_number IS NULL OR NEW.request_number = '')
    EXECUTE FUNCTION generate_expense_request_number();

-- =============================================
-- AUTO-GENERATE IOU NUMBER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION generate_iou_number()
RETURNS TRIGGER AS $$
DECLARE
    next_seq INTEGER;
    date_part TEXT;
BEGIN
    date_part := TO_CHAR(NEW.issued_date, 'YYYYMMDD');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(iou_number FROM 13) AS INTEGER)
    ), 0) + 1
    INTO next_seq
    FROM public.iou_records
    WHERE iou_number LIKE 'IOU-' || date_part || '-%';
    
    NEW.iou_number := 'IOU-' || date_part || '-' || LPAD(next_seq::TEXT, 3, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_iou_number
    BEFORE INSERT ON public.iou_records
    FOR EACH ROW
    WHEN (NEW.iou_number IS NULL OR NEW.iou_number = '')
    EXECUTE FUNCTION generate_iou_number();

-- =============================================
-- UPDATE PETTY CASH BALANCE TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION update_petty_cash_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type = 'disbursement' THEN
        UPDATE public.petty_cash_funds
        SET current_balance = current_balance - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.petty_cash_fund_id;
    ELSIF NEW.transaction_type = 'replenishment' THEN
        UPDATE public.petty_cash_funds
        SET current_balance = current_balance + NEW.amount,
            last_replenished_at = NOW(),
            updated_at = NOW()
        WHERE id = NEW.petty_cash_fund_id;
    END IF;
    
    -- Update balance_after in the transaction
    SELECT current_balance INTO NEW.balance_after
    FROM public.petty_cash_funds
    WHERE id = NEW.petty_cash_fund_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_petty_cash_balance
    BEFORE INSERT ON public.petty_cash_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_petty_cash_balance();

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================

CREATE TRIGGER update_expense_requests_updated_at
    BEFORE UPDATE ON public.expense_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_petty_cash_funds_updated_at
    BEFORE UPDATE ON public.petty_cash_funds
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_iou_records_updated_at
    BEFORE UPDATE ON public.iou_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
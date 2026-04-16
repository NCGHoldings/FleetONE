-- Create sinotruck_orders table
CREATE TABLE IF NOT EXISTS public.sinotruck_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_no TEXT NOT NULL,
    quotation_id UUID REFERENCES public.sinotruck_quotations(id),
    customer_id UUID REFERENCES public.sinotruck_customers(id),
    truck_model TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    payment_mode TEXT CHECK (payment_mode IN ('cash', 'lease')),
    payment_structure JSONB,
    current_phase TEXT DEFAULT 'order_confirmation',
    order_date TIMESTAMPTZ DEFAULT NOW(),
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    status TEXT DEFAULT 'active',
    progress_percentage INTEGER DEFAULT 0,
    notes TEXT,
    total_paid DECIMAL(15, 2) DEFAULT 0,
    balance_due DECIMAL(15, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create sinotruck_payment_schedules table
CREATE TABLE IF NOT EXISTS public.sinotruck_payment_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.sinotruck_orders(id) ON DELETE CASCADE,
    milestone_name TEXT NOT NULL,
    payment_type TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'pending',
    payment_date DATE,
    payment_reference TEXT,
    sequence_order INTEGER,
    is_lc_payment BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sinotruck_customer_payments table
CREATE TABLE IF NOT EXISTS public.sinotruck_customer_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.sinotruck_orders(id) ON DELETE CASCADE,
    payment_schedule_id UUID REFERENCES public.sinotruck_payment_schedules(id),
    payment_amount DECIMAL(15, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL,
    payment_reference TEXT,
    bank_name TEXT,
    cheque_no TEXT,
    bank_slip_no TEXT,
    notes TEXT,
    status TEXT DEFAULT 'received',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sinotruck_orders_updated_at
    BEFORE UPDATE ON public.sinotruck_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sinotruck_payment_schedules_updated_at
    BEFORE UPDATE ON public.sinotruck_payment_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE public.sinotruck_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sinotruck_payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sinotruck_customer_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON public.sinotruck_orders
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.sinotruck_payment_schedules
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.sinotruck_customer_payments
    FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger to generate order number
CREATE OR REPLACE FUNCTION generate_sinotruck_order_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
    year_prefix TEXT;
BEGIN
    year_prefix := to_char(NOW(), 'YY');
    
    -- Get the next number (count + 1)
    SELECT COUNT(*) + 1 INTO next_num
    FROM public.sinotruck_orders
    WHERE order_no LIKE 'SO-' || year_prefix || '-%';
    
    -- Format: SO-24-001
    NEW.order_no := 'SO-' || year_prefix || '-' || lpad(next_num::text, 3, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sinotruck_order_number
    BEFORE INSERT ON public.sinotruck_orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_sinotruck_order_number();

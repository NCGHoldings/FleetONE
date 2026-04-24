-- Migration: Master Expense Tracking Module
-- Description: Creates tables for tracking uploaded external expense sheets and their raw records for intelligent mapping.

CREATE TABLE IF NOT EXISTS public.master_expense_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sector TEXT NOT NULL, -- e.g., 'Special Hire', 'Yutong', 'NCG Holding'
    expense_type TEXT NOT NULL, -- e.g., 'Fuel', 'PickMe'
    total_amount NUMERIC(15,2) DEFAULT 0.00,
    status TEXT DEFAULT 'Pending Mapping', -- 'Pending Mapping', 'Completed'
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.master_expense_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users in same company"
    ON public.master_expense_imports FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users in same company"
    ON public.master_expense_imports FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users in same company"
    ON public.master_expense_imports FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users in same company"
    ON public.master_expense_imports FOR DELETE
    USING (auth.role() = 'authenticated');


CREATE TABLE IF NOT EXISTS public.master_expense_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_id UUID REFERENCES public.master_expense_imports(id) ON DELETE CASCADE,
    raw_data JSONB NOT NULL,
    expense_date DATE,
    amount NUMERIC(15,2) DEFAULT 0.00,
    mapped_vehicle_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
    mapped_quotation_id UUID REFERENCES public.special_hire_quotations(id) ON DELETE SET NULL,
    is_confirmed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.master_expense_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users"
    ON public.master_expense_records FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users"
    ON public.master_expense_records FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users"
    ON public.master_expense_records FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users"
    ON public.master_expense_records FOR DELETE
    USING (auth.role() = 'authenticated');

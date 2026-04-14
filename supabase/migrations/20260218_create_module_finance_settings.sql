-- Create module_finance_settings table for storing GL account mappings
-- for modules that don't have their own dedicated settings table.
-- Used by: Payroll, Maintenance, Insurance, Expense Requests, Route Permits
CREATE TABLE IF NOT EXISTS public.module_finance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    module_name TEXT NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, module_name)
);
-- Enable RLS
ALTER TABLE public.module_finance_settings ENABLE ROW LEVEL SECURITY;
-- Allow authenticated users to manage settings
CREATE POLICY "authenticated_users_manage_module_finance_settings" ON public.module_finance_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Add gl_posted and journal_entry_id to asset_maintenance_logs if not present
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'asset_maintenance_logs'
        AND column_name = 'gl_posted'
) THEN
ALTER TABLE public.asset_maintenance_logs
ADD COLUMN gl_posted BOOLEAN DEFAULT false;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'asset_maintenance_logs'
        AND column_name = 'journal_entry_id'
) THEN
ALTER TABLE public.asset_maintenance_logs
ADD COLUMN journal_entry_id UUID REFERENCES public.journal_entries(id);
END IF;
END $$;
-- Add ap_invoice_id to expense_requests if not present
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'expense_requests'
        AND column_name = 'ap_invoice_id'
) THEN
ALTER TABLE public.expense_requests
ADD COLUMN ap_invoice_id UUID;
END IF;
END $$;
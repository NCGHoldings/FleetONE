
-- Final migration: Add hierarchy fields to companies table and remaining tables

-- Accounting Activity Log
ALTER TABLE public.accounting_activity_log 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

CREATE INDEX IF NOT EXISTS idx_accounting_activity_log_company ON public.accounting_activity_log(company_id);

-- Accounting Audit Log
ALTER TABLE public.accounting_audit_log 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

CREATE INDEX IF NOT EXISTS idx_accounting_audit_log_company ON public.accounting_audit_log(company_id);

-- Auto Posting Rules
ALTER TABLE public.auto_posting_rules 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

CREATE INDEX IF NOT EXISTS idx_auto_posting_rules_company ON public.auto_posting_rules(company_id);

-- Approval Workflows
ALTER TABLE public.approval_workflows 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

CREATE INDEX IF NOT EXISTS idx_approval_workflows_company ON public.approval_workflows(company_id);

-- Add parent_company_id and hierarchy fields to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS parent_company_id UUID REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS business_unit_type TEXT,
ADD COLUMN IF NOT EXISTS company_code TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS tax_registration TEXT,
ADD COLUMN IF NOT EXISTS fiscal_year_start INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'LKR';

CREATE INDEX IF NOT EXISTS idx_companies_parent ON public.companies(parent_company_id);

-- Add comments for documentation
COMMENT ON COLUMN public.companies.parent_company_id IS 'Reference to parent company for hierarchical structure (e.g., NCG Holding)';
COMMENT ON COLUMN public.companies.business_unit_type IS 'Type of business unit: school_bus, special_hire, yutong, sinotruck, light_vehicle, etc.';
COMMENT ON COLUMN public.companies.company_code IS 'Short code for the company (e.g., NCG, SCH, SPH)';

-- Add expense GL mapping columns to school_bus_finance_settings
ALTER TABLE school_bus_finance_settings
ADD COLUMN IF NOT EXISTS expense_account_id UUID REFERENCES chart_of_accounts(id),
ADD COLUMN IF NOT EXISTS fuel_expense_account_id UUID REFERENCES chart_of_accounts(id),
ADD COLUMN IF NOT EXISTS maintenance_expense_account_id UUID REFERENCES chart_of_accounts(id),
ADD COLUMN IF NOT EXISTS salary_expense_account_id UUID REFERENCES chart_of_accounts(id),
ADD COLUMN IF NOT EXISTS expense_cash_account_id UUID REFERENCES chart_of_accounts(id),
ADD COLUMN IF NOT EXISTS auto_post_expenses BOOLEAN DEFAULT false;

-- Add bus linkage and GL posting columns to route_expenses
ALTER TABLE route_expenses
ADD COLUMN IF NOT EXISTS bus_id UUID REFERENCES buses(id),
ADD COLUMN IF NOT EXISTS bus_no TEXT,
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id),
ADD COLUMN IF NOT EXISTS posted_to_gl BOOLEAN DEFAULT false;

-- Create expense type to GL account mapping table for granular branch-level mappings
CREATE TABLE IF NOT EXISTS school_bus_expense_gl_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  branch_id UUID REFERENCES school_branches(id),
  expense_type TEXT NOT NULL,
  expense_category TEXT,
  gl_account_id UUID REFERENCES chart_of_accounts(id) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, branch_id, expense_type, expense_category)
);

-- Enable RLS
ALTER TABLE school_bus_expense_gl_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view expense GL mappings"
ON school_bus_expense_gl_mappings FOR SELECT
USING (true);

CREATE POLICY "Users can insert expense GL mappings"
ON school_bus_expense_gl_mappings FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update expense GL mappings"
ON school_bus_expense_gl_mappings FOR UPDATE
USING (true);

CREATE POLICY "Users can delete expense GL mappings"
ON school_bus_expense_gl_mappings FOR DELETE
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_expense_gl_mappings_branch 
ON school_bus_expense_gl_mappings(branch_id, expense_type);

-- Add comment
COMMENT ON TABLE school_bus_expense_gl_mappings IS 'Maps expense types to GL accounts per branch for School Bus module';
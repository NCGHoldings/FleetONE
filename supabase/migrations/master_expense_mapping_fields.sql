-- Add mapping fields for generic expenses
ALTER TABLE master_expense_records 
ADD COLUMN IF NOT EXISTS mapped_expense_account_id UUID REFERENCES chart_of_accounts(id),
ADD COLUMN IF NOT EXISTS mapped_payment_account_id UUID REFERENCES chart_of_accounts(id),
ADD COLUMN IF NOT EXISTS gl_journal_id UUID REFERENCES journal_entries(id);

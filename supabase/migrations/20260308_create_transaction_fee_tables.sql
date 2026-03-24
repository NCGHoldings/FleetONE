-- Transaction Fee System Migration
-- Creates tables for automated transaction fee/commission tracking

-- Settings table stores per-company configuration
CREATE TABLE IF NOT EXISTS transaction_fee_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  fee_percentage DECIMAL(5,2) DEFAULT 0.50,
  fee_revenue_account_id UUID REFERENCES chart_of_accounts(id),
  fee_receivable_account_id UUID REFERENCES chart_of_accounts(id),
  auto_post_to_gl BOOLEAN DEFAULT true,
  gl_prefix TEXT DEFAULT 'TXFEE',
  applicable_modules TEXT[] DEFAULT ARRAY['all'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

-- Fee log table records every fee charged
CREATE TABLE IF NOT EXISTS transaction_fees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  source_module TEXT NOT NULL,
  source_transaction_id UUID,
  source_reference TEXT,
  transaction_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  fee_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  fee_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  journal_entry_id UUID REFERENCES journal_entries(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'waived')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_fees_company ON transaction_fees(company_id);
CREATE INDEX IF NOT EXISTS idx_transaction_fees_module ON transaction_fees(source_module);
CREATE INDEX IF NOT EXISTS idx_transaction_fees_status ON transaction_fees(status);
CREATE INDEX IF NOT EXISTS idx_transaction_fees_created ON transaction_fees(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_fee_settings_company ON transaction_fee_settings(company_id);

-- Enable RLS
ALTER TABLE transaction_fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_fees ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow authenticated users)
CREATE POLICY "Allow authenticated users to manage transaction_fee_settings"
  ON transaction_fee_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage transaction_fees"
  ON transaction_fees FOR ALL TO authenticated USING (true) WITH CHECK (true);

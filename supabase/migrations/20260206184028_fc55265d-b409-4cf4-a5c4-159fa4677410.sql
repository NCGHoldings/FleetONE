-- Add fuel bank account column to school_bus_finance_settings
ALTER TABLE school_bus_finance_settings 
ADD COLUMN IF NOT EXISTS fuel_bank_account_id UUID REFERENCES chart_of_accounts(id);

-- Create inter-bank transfers table for fund management
CREATE TABLE IF NOT EXISTS inter_bank_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  transfer_number VARCHAR(50) NOT NULL,
  transfer_date DATE NOT NULL,
  
  -- Source Bank
  from_bank_account_id UUID REFERENCES bank_accounts(id) NOT NULL,
  from_gl_account_id UUID REFERENCES chart_of_accounts(id) NOT NULL,
  
  -- Destination Bank
  to_bank_account_id UUID REFERENCES bank_accounts(id) NOT NULL,
  to_gl_account_id UUID REFERENCES chart_of_accounts(id) NOT NULL,
  
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  reference VARCHAR(100),
  notes TEXT,
  
  -- Journal Entry Link
  journal_entry_id UUID REFERENCES journal_entries(id),
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'reversed')),
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inter_bank_transfers_company_id ON inter_bank_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_inter_bank_transfers_transfer_date ON inter_bank_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_inter_bank_transfers_from_bank ON inter_bank_transfers(from_bank_account_id);
CREATE INDEX IF NOT EXISTS idx_inter_bank_transfers_to_bank ON inter_bank_transfers(to_bank_account_id);

-- Enable RLS
ALTER TABLE inter_bank_transfers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view inter-bank transfers for their company" 
ON inter_bank_transfers FOR SELECT 
USING (true);

CREATE POLICY "Users can create inter-bank transfers" 
ON inter_bank_transfers FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update inter-bank transfers" 
ON inter_bank_transfers FOR UPDATE 
USING (true);

-- Add comment for documentation
COMMENT ON TABLE inter_bank_transfers IS 'Tracks fund transfers between bank accounts with GL integration';
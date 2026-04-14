-- 1. Create Daily Cash Settlements
CREATE TABLE IF NOT EXISTS daily_cash_settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settlement_date DATE NOT NULL,
  bus_id UUID REFERENCES buses(id),
  expected_cash DECIMAL(15, 2) NOT NULL DEFAULT 0,
  actual_cash DECIMAL(15, 2) NOT NULL DEFAULT 0,
  shortage DECIMAL(15, 2) NOT NULL DEFAULT 0,
  overage DECIMAL(15, 2) NOT NULL DEFAULT 0,
  cashier_id UUID REFERENCES profiles(id),
  status VARCHAR(50) DEFAULT 'Draft',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Bank Deposits
CREATE TABLE IF NOT EXISTS bank_deposits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deposit_date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  bank_account_gl VARCHAR(100) NOT NULL,
  reference_no VARCHAR(100),
  deposited_by UUID REFERENCES profiles(id),
  offset_expenses JSONB,
  status VARCHAR(50) DEFAULT 'Completed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE daily_cash_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_deposits ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
CREATE POLICY "Enable all for authenticated users on daily_cash_settlements" 
ON daily_cash_settlements FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users on bank_deposits" 
ON bank_deposits FOR ALL USING (auth.role() = 'authenticated');

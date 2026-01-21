-- Create missing tables
CREATE TABLE IF NOT EXISTS approval_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  document_type TEXT NOT NULL,
  min_amount DECIMAL(18,2),
  max_amount DECIMAL(18,2),
  required_approvers INTEGER DEFAULT 1,
  approver_roles TEXT[] DEFAULT ARRAY['finance'],
  sequential_approval BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  module TEXT,
  record_type TEXT,
  record_id UUID,
  description TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ar_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  reconciliation_date DATE NOT NULL,
  period_start DATE,
  period_end DATE,
  opening_balance DECIMAL(18,2) DEFAULT 0,
  closing_balance DECIMAL(18,2) DEFAULT 0,
  customer_statement_balance DECIMAL(18,2) DEFAULT 0,
  discrepancy_amount DECIMAL(18,2) DEFAULT 0,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  reconciled_by UUID,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ap_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id),
  reconciliation_date DATE NOT NULL,
  period_start DATE,
  period_end DATE,
  opening_balance DECIMAL(18,2) DEFAULT 0,
  closing_balance DECIMAL(18,2) DEFAULT 0,
  vendor_statement_balance DECIMAL(18,2) DEFAULT 0,
  discrepancy_amount DECIMAL(18,2) DEFAULT 0,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  reconciled_by UUID,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE approval_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_reconciliations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated can manage approval_configurations" ON approval_configurations
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can view user_activity_log" ON user_activity_log
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Can log activity" ON user_activity_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated can manage ar_reconciliations" ON ar_reconciliations
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can manage ap_reconciliations" ON ap_reconciliations
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ar_reconciliations_customer ON ar_reconciliations(customer_id);
CREATE INDEX IF NOT EXISTS idx_ap_reconciliations_vendor ON ap_reconciliations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user ON user_activity_log(user_id, created_at);
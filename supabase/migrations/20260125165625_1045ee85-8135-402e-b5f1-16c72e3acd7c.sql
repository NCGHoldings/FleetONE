-- Add referral_agent_id to sinotruck_quotations
ALTER TABLE sinotruck_quotations 
ADD COLUMN IF NOT EXISTS referral_agent_id UUID REFERENCES referral_agents(id);

-- Create sinotruck_referral_commission_payments table
CREATE TABLE IF NOT EXISTS sinotruck_referral_commission_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES sinotruck_quotations(id) ON DELETE CASCADE,
  referral_agent_id UUID REFERENCES referral_agents(id),
  commission_amount NUMERIC DEFAULT 0,
  commission_pct NUMERIC DEFAULT 3,
  payment_status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  paid_by UUID,
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quotation_id)
);

-- Enable RLS on the new table
ALTER TABLE sinotruck_referral_commission_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sinotruck_referral_commission_payments
CREATE POLICY "Allow authenticated users to view sinotruck commissions"
ON sinotruck_referral_commission_payments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert sinotruck commissions"
ON sinotruck_referral_commission_payments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update sinotruck commissions"
ON sinotruck_referral_commission_payments FOR UPDATE
TO authenticated
USING (true);

-- Create trigger function for automatic commission tracking
CREATE OR REPLACE FUNCTION track_sinotruck_referral_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- When quotation is confirmed and has a referral agent
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') AND NEW.referral_agent_id IS NOT NULL THEN
    -- Insert commission payment record
    INSERT INTO sinotruck_referral_commission_payments (
      quotation_id, 
      referral_agent_id, 
      commission_amount, 
      commission_pct, 
      payment_status
    ) VALUES (
      NEW.id, 
      NEW.referral_agent_id, 
      COALESCE(NEW.total_price, 0) * 0.03, 
      3.0, 
      'pending'
    ) ON CONFLICT (quotation_id) DO NOTHING;
    
    -- Update referral agent totals
    UPDATE referral_agents 
    SET 
      total_referrals = total_referrals + 1,
      total_commission_earned = total_commission_earned + (COALESCE(NEW.total_price, 0) * 0.03),
      updated_at = NOW()
    WHERE id = NEW.referral_agent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on sinotruck_quotations
DROP TRIGGER IF EXISTS track_sinotruck_referral_commission_trigger ON sinotruck_quotations;
CREATE TRIGGER track_sinotruck_referral_commission_trigger
AFTER INSERT OR UPDATE ON sinotruck_quotations
FOR EACH ROW EXECUTE FUNCTION track_sinotruck_referral_commission();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sinotruck_quotations_referral_agent 
ON sinotruck_quotations(referral_agent_id);

CREATE INDEX IF NOT EXISTS idx_sinotruck_commission_agent 
ON sinotruck_referral_commission_payments(referral_agent_id);

CREATE INDEX IF NOT EXISTS idx_sinotruck_commission_status 
ON sinotruck_referral_commission_payments(payment_status);
-- Create Yutong referral commission payments table
CREATE TABLE public.yutong_referral_commission_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_agent_id UUID REFERENCES public.referral_agents(id) NOT NULL,
  yutong_quotation_id UUID REFERENCES public.yutong_quotations(id) NOT NULL,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_pct NUMERIC(5,2) DEFAULT 3.0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),
  payment_reference TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.yutong_referral_commission_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view yutong referral commissions"
ON public.yutong_referral_commission_payments FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert yutong referral commissions"
ON public.yutong_referral_commission_payments FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update yutong referral commissions"
ON public.yutong_referral_commission_payments FOR UPDATE
TO authenticated USING (true);

-- Trigger function to auto-create commission when quotation confirmed
CREATE OR REPLACE FUNCTION public.track_yutong_referral_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'confirmed' and has referral agent
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' AND NEW.referral_agent_id IS NOT NULL THEN
    -- Check if commission record already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.yutong_referral_commission_payments 
      WHERE yutong_quotation_id = NEW.id
    ) THEN
      -- Create commission payment record (3% default)
      INSERT INTO public.yutong_referral_commission_payments (
        referral_agent_id,
        yutong_quotation_id,
        commission_amount,
        commission_pct,
        payment_status
      ) VALUES (
        NEW.referral_agent_id,
        NEW.id,
        COALESCE(NEW.total_price, 0) * 0.03,
        3.0,
        'pending'
      );
      
      -- Update agent totals
      UPDATE public.referral_agents 
      SET 
        total_referrals = total_referrals + 1,
        total_commission_earned = total_commission_earned + (COALESCE(NEW.total_price, 0) * 0.03),
        updated_at = NOW()
      WHERE id = NEW.referral_agent_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER track_yutong_referral_commission_trigger
AFTER UPDATE ON public.yutong_quotations
FOR EACH ROW
EXECUTE FUNCTION public.track_yutong_referral_commission();

-- Index for faster lookups
CREATE INDEX idx_yutong_referral_commission_agent ON public.yutong_referral_commission_payments(referral_agent_id);
CREATE INDEX idx_yutong_referral_commission_quotation ON public.yutong_referral_commission_payments(yutong_quotation_id);
CREATE INDEX idx_yutong_referral_commission_status ON public.yutong_referral_commission_payments(payment_status);
-- Create referral_commission_payments table to track individual commission payments
CREATE TABLE public.referral_commission_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_agent_id UUID NOT NULL REFERENCES public.referral_agents(id) ON DELETE CASCADE,
  quotation_id UUID NOT NULL REFERENCES public.special_hire_quotations(id) ON DELETE CASCADE,
  commission_amount DECIMAL NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_by UUID REFERENCES auth.users(id),
  payment_reference TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_referral_commission_payments_agent_id ON public.referral_commission_payments(referral_agent_id);
CREATE INDEX idx_referral_commission_payments_quotation_id ON public.referral_commission_payments(quotation_id);
CREATE INDEX idx_referral_commission_payments_status ON public.referral_commission_payments(payment_status);

-- Enable RLS
ALTER TABLE public.referral_commission_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users with finance roles can manage commission payments"
ON public.referral_commission_payments
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'finance'::app_role]));

CREATE POLICY "All authenticated users can view commission payments"
ON public.referral_commission_payments
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create updated_at trigger
CREATE TRIGGER update_referral_commission_payments_updated_at
  BEFORE UPDATE ON public.referral_commission_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-track referral commissions when quotation is confirmed
CREATE OR REPLACE FUNCTION public.track_referral_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if:
  -- 1. Status changed to 'confirmed'
  -- 2. Quotation has a referral agent
  -- 3. Record doesn't already exist for this quotation
  IF NEW.status = 'confirmed' AND 
     NEW.referral_agent_id IS NOT NULL AND
     (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    
    -- Check if commission record already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.referral_commission_payments 
      WHERE quotation_id = NEW.id
    ) THEN
      -- Insert commission payment record
      INSERT INTO public.referral_commission_payments (
        referral_agent_id,
        quotation_id,
        commission_amount,
        payment_status
      ) VALUES (
        NEW.referral_agent_id,
        NEW.id,
        COALESCE(NEW.referral_commission_amount, 0),
        'pending'
      );
      
      -- Update referral_agents totals
      UPDATE public.referral_agents
      SET 
        total_referrals = total_referrals + 1,
        total_commission_earned = total_commission_earned + COALESCE(NEW.referral_commission_amount, 0),
        updated_at = now()
      WHERE id = NEW.referral_agent_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for tracking referral commissions
CREATE TRIGGER track_referral_commission_trigger
  AFTER INSERT OR UPDATE OF status ON public.special_hire_quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.track_referral_commission();
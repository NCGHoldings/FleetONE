-- Create referral_agents table for simple agent tracking
CREATE TABLE IF NOT EXISTS public.referral_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  phone text,
  default_commission_pct numeric DEFAULT 3.0 CHECK (default_commission_pct >= 0 AND default_commission_pct <= 100),
  total_referrals integer DEFAULT 0 CHECK (total_referrals >= 0),
  total_commission_earned numeric DEFAULT 0 CHECK (total_commission_earned >= 0),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Add indexes for performance
CREATE INDEX idx_referral_agents_status ON public.referral_agents(status);
CREATE INDEX idx_referral_agents_name ON public.referral_agents(agent_name);

-- Enable RLS
ALTER TABLE public.referral_agents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_agents
CREATE POLICY "All authenticated users can view active agents"
ON public.referral_agents
FOR SELECT
TO authenticated
USING (status = 'active' OR auth.role() = 'authenticated');

CREATE POLICY "Admins can manage agents"
ON public.referral_agents
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'supervisor')
);

-- Add referral agent columns to special_hire_quotations
ALTER TABLE public.special_hire_quotations 
ADD COLUMN IF NOT EXISTS referral_agent_id uuid REFERENCES public.referral_agents(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS referral_commission_pct numeric DEFAULT 0 CHECK (referral_commission_pct >= 0 AND referral_commission_pct <= 100),
ADD COLUMN IF NOT EXISTS referral_commission_amount numeric DEFAULT 0 CHECK (referral_commission_amount >= 0);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotations_referral_agent ON public.special_hire_quotations(referral_agent_id);

-- Create function to update agent stats automatically
CREATE OR REPLACE FUNCTION public.update_agent_referral_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a quotation is inserted with an agent
  IF TG_OP = 'INSERT' AND NEW.referral_agent_id IS NOT NULL THEN
    UPDATE public.referral_agents
    SET 
      total_referrals = total_referrals + 1,
      total_commission_earned = total_commission_earned + COALESCE(NEW.referral_commission_amount, 0),
      updated_at = now()
    WHERE id = NEW.referral_agent_id;
  END IF;
  
  -- When a quotation is updated (agent changed or commission changed)
  IF TG_OP = 'UPDATE' THEN
    -- Decrease stats from old agent if agent was changed
    IF OLD.referral_agent_id IS NOT NULL AND OLD.referral_agent_id != COALESCE(NEW.referral_agent_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      UPDATE public.referral_agents
      SET 
        total_referrals = GREATEST(0, total_referrals - 1),
        total_commission_earned = GREATEST(0, total_commission_earned - COALESCE(OLD.referral_commission_amount, 0)),
        updated_at = now()
      WHERE id = OLD.referral_agent_id;
    END IF;
    
    -- Increase stats for new agent
    IF NEW.referral_agent_id IS NOT NULL AND (OLD.referral_agent_id IS NULL OR OLD.referral_agent_id != NEW.referral_agent_id) THEN
      UPDATE public.referral_agents
      SET 
        total_referrals = total_referrals + 1,
        total_commission_earned = total_commission_earned + COALESCE(NEW.referral_commission_amount, 0),
        updated_at = now()
      WHERE id = NEW.referral_agent_id;
    END IF;
    
    -- Update commission amount if same agent but amount changed
    IF NEW.referral_agent_id IS NOT NULL AND OLD.referral_agent_id = NEW.referral_agent_id AND OLD.referral_commission_amount != NEW.referral_commission_amount THEN
      UPDATE public.referral_agents
      SET 
        total_commission_earned = total_commission_earned - COALESCE(OLD.referral_commission_amount, 0) + COALESCE(NEW.referral_commission_amount, 0),
        updated_at = now()
      WHERE id = NEW.referral_agent_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on special_hire_quotations
DROP TRIGGER IF EXISTS trigger_update_agent_referral_stats ON public.special_hire_quotations;
CREATE TRIGGER trigger_update_agent_referral_stats
AFTER INSERT OR UPDATE ON public.special_hire_quotations
FOR EACH ROW
EXECUTE FUNCTION public.update_agent_referral_stats();

-- Create trigger for updated_at on referral_agents
CREATE TRIGGER update_referral_agents_updated_at
BEFORE UPDATE ON public.referral_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.referral_agents IS 'Stores referral agents who bring business to the company';
COMMENT ON COLUMN public.referral_agents.default_commission_pct IS 'Default commission percentage for this agent (usually 3%)';
COMMENT ON COLUMN public.referral_agents.total_referrals IS 'Auto-calculated count of trips referred by this agent';
COMMENT ON COLUMN public.referral_agents.total_commission_earned IS 'Auto-calculated total commission earned from all referrals';
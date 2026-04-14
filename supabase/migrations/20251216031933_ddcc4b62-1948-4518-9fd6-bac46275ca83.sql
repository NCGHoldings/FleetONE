-- Add referral_agent_id column to yutong_quotations table
ALTER TABLE yutong_quotations 
ADD COLUMN IF NOT EXISTS referral_agent_id UUID REFERENCES referral_agents(id);

-- Add contact_person column if not exists
ALTER TABLE yutong_quotations 
ADD COLUMN IF NOT EXISTS contact_person TEXT;

-- Add customer_address column if not exists  
ALTER TABLE yutong_quotations 
ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- Add customer_type column if not exists
ALTER TABLE yutong_quotations 
ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'personal';
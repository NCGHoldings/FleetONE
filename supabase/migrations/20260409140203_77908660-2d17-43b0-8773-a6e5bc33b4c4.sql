
-- Fix payment: real max from PAY-2026-XXXXX format is 25679
UPDATE numbering_sequences 
SET next_number = 25680, updated_at = now()
WHERE entity_type = 'payment' AND is_active = true;

-- Fix customer: real max from CUST-2026-XXXX format is 27
UPDATE numbering_sequences 
SET next_number = 28, updated_at = now()
WHERE entity_type = 'customer' AND is_active = true;

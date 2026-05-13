-- Fix: Remove "Test" prefix from the SPH (Special Hire) sub-company name.
-- The company was created with "Test Special Hire" as a placeholder name,
-- which leaks into AR Invoice previews via the {{company_name}} placeholder.

-- Update the SPH company name from "Test Special Hire" to the correct business name
UPDATE companies
SET name = 'NCG Express (Pvt) Ltd — Special Hire',
    company_name = 'NCG Express (Pvt) Ltd — Special Hire',
    updated_at = NOW()
WHERE short_code = 'SPH'
  AND (name ILIKE '%test%special%hire%' OR company_name ILIKE '%test%special%hire%');

-- Verify
SELECT id, name, company_name, short_code FROM companies WHERE short_code = 'SPH';

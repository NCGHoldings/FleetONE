-- Remove system users that were auto-synced from profiles table
-- Exclude any that are referenced by other tables (e.g. petty_cash_funds)
DELETE FROM staff_registry
WHERE notes LIKE '%Auto-synced from profiles%'
AND id NOT IN (SELECT DISTINCT staff_registry_id FROM staff_attendance WHERE staff_registry_id IS NOT NULL)
AND id NOT IN (SELECT DISTINCT staff_id FROM staff_commissions WHERE staff_id IS NOT NULL)
AND id NOT IN (SELECT DISTINCT custodian_id FROM petty_cash_funds WHERE custodian_id IS NOT NULL);
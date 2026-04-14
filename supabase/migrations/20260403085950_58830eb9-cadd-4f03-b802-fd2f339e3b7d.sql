
-- Update special_hire_finance_settings to point to correct account
UPDATE special_hire_finance_settings 
SET default_bank_account_id = '5a48ae07-19e0-46d8-bd5c-1adc371d3d63'
WHERE default_bank_account_id = '6702d2bf-8a12-4f82-83eb-d37b61b4993e';

-- Move JE lines from orphan account to correct account (13001011)
UPDATE journal_entry_lines 
SET account_id = '5a48ae07-19e0-46d8-bd5c-1adc371d3d63'
WHERE account_id = '6702d2bf-8a12-4f82-83eb-d37b61b4993e';

-- Delete orphan account 1300101211
DELETE FROM chart_of_accounts 
WHERE id = '6702d2bf-8a12-4f82-83eb-d37b61b4993e';

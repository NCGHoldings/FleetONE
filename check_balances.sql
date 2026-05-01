SELECT 
  ba.id AS bank_account_id, 
  ba.account_name, 
  ba.current_balance AS bank_balance, 
  coa.account_code, 
  coa.current_balance AS coa_balance,
  (SELECT SUM(debit - credit) FROM journal_entry_lines WHERE account_id = coa.id) AS coa_calculated_balance,
  (SELECT SUM(debit - credit) FROM bank_transactions WHERE bank_account_id = ba.id) AS bank_calculated_balance
FROM bank_accounts ba
JOIN chart_of_accounts coa ON ba.gl_account_id = coa.id
WHERE ba.account_number = '1001077213';

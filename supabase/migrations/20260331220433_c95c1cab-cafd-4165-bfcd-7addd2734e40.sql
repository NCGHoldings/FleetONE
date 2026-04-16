
SET session_replication_role = 'origin';

UPDATE chart_of_accounts
SET current_balance = 0
WHERE company_id = 'f40b0a9d-ae5b-41b3-9188-535ae94c9020'
  AND current_balance != 0;

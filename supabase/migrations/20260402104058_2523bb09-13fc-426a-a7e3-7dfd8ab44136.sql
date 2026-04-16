
-- Void duplicate journal entries
UPDATE journal_entries SET status = 'void' WHERE id IN ('a51f6856-88b5-482e-a373-dc8a39423a17', 'b33c6ea0-4912-4549-8eea-ac084f3b649c');

-- Reverse COA current_balance impact
-- TRADE PAYABLE - INTERNAL was wrongly debited 224K (debit decreases credit-normal account)
UPDATE chart_of_accounts SET current_balance = current_balance + 224000 WHERE id = '41b99fcb-fcd6-4bac-88b1-e59b3550ded5';
-- SEYLAN BANK was wrongly credited 224K (credit decreases debit-normal account)
UPDATE chart_of_accounts SET current_balance = current_balance + 224000 WHERE id = '9b3a2559-e73f-45ae-82e3-3c2326a582f1';

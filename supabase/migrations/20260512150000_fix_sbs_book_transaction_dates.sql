-- =====================================================================
-- Migration: Fix School Bus System Book Transaction Dates  
-- Purpose: Correct wrong-dated bank_transactions (book side) that were
--          recorded with the system processing date instead of the
--          actual bank transaction date. These mismatches cause bank
--          reconciliation failures.
--
-- Root Cause: The `reference` column stores the user's input
--             (CDM-A0008441, 099, bus, etc.), while `description`
--             stores "School Bus Payment from School Bus Students...".
--             We match on `reference` + `debit_amount`.
--
-- Bank Account: Sampath Bank C/A - 000311003310 (13001012)
-- Period: April 2026
-- =====================================================================

-- Fix CDM-A0008441 entries → should be April 1 (LKR 1,000 x2)
UPDATE bank_transactions
SET transaction_date = '2026-04-01'
WHERE reference ILIKE '%CDM- A0008441%'
  AND debit_amount = 1000.00
  AND transaction_date != '2026-04-01'
  AND transaction_date >= '2026-04-01'
  AND transaction_date <= '2026-05-31';

-- Fix Lea002117 → should be April 1 (LKR 23,625)
UPDATE bank_transactions
SET transaction_date = '2026-04-01'
WHERE reference ILIKE '%Lea002117%'
  AND debit_amount = 23625.00
  AND transaction_date != '2026-04-01'
  AND transaction_date >= '2026-04-01'
  AND transaction_date <= '2026-05-31';

-- Fix Bus Payment → should be April 2 (LKR 12,500)
UPDATE bank_transactions
SET transaction_date = '2026-04-02'
WHERE reference ILIKE '%Bus Payment%'
  AND debit_amount = 12500.00
  AND transaction_date != '2026-04-02'
  AND transaction_date >= '2026-04-01'
  AND transaction_date <= '2026-05-31';

-- Fix 099 → should be April 2 (LKR 3,900)
UPDATE bank_transactions
SET transaction_date = '2026-04-02'
WHERE reference = '099'
  AND debit_amount = 3900.00
  AND transaction_date != '2026-04-02'
  AND transaction_date >= '2026-04-01'
  AND transaction_date <= '2026-05-31';

-- Fix CDM-A0008441 → should be April 2 (LKR 2,000)
UPDATE bank_transactions
SET transaction_date = '2026-04-02'
WHERE reference ILIKE '%CDM- A0008441%'
  AND debit_amount = 2000.00
  AND transaction_date != '2026-04-02'
  AND transaction_date >= '2026-04-01'
  AND transaction_date <= '2026-05-31';

-- Fix 099 → should be April 7 (LKR 9,700)
UPDATE bank_transactions
SET transaction_date = '2026-04-07'
WHERE reference = '099'
  AND debit_amount = 9700.00
  AND transaction_date != '2026-04-07'
  AND transaction_date >= '2026-04-01'
  AND transaction_date <= '2026-05-31';

-- Fix bus → should be April 7 (LKR 2,000)
UPDATE bank_transactions
SET transaction_date = '2026-04-07'
WHERE reference ILIKE 'bus'
  AND debit_amount = 2000.00
  AND transaction_date != '2026-04-07'
  AND transaction_date >= '2026-04-01'
  AND transaction_date <= '2026-05-31';

-- Fix NCG Holdings → should be April 8 (LKR 7,800)
UPDATE bank_transactions
SET transaction_date = '2026-04-08'
WHERE reference ILIKE '%NCG Holdings%'
  AND debit_amount = 7800.00
  AND transaction_date != '2026-04-08'
  AND transaction_date >= '2026-04-01'
  AND transaction_date <= '2026-05-31';

-- Fix 099 → should be April 16 (LKR 9,000)
UPDATE bank_transactions
SET transaction_date = '2026-04-16'
WHERE reference = '099'
  AND debit_amount = 9000.00
  AND transaction_date != '2026-04-16'
  AND transaction_date >= '2026-04-01'
  AND transaction_date <= '2026-05-31';

-- =====================================================================
-- STEP 2: Sync the linked journal_entries dates to match
-- The bank_transactions.source_id links to either journal_entries 
-- or ar_receipts which link to journal_entries
-- =====================================================================

-- Via direct link: bank_transactions.source_type = 'journal_entry'
UPDATE journal_entries je
SET entry_date = bt.transaction_date
FROM bank_transactions bt
WHERE bt.source_id = je.id
  AND bt.source_type = 'journal_entry'
  AND je.entry_date != bt.transaction_date
  AND bt.transaction_date >= '2026-04-01'
  AND bt.transaction_date <= '2026-04-30';

-- Via ar_receipts link: bank_transactions.source_type = 'ar_receipt'
UPDATE journal_entries je
SET entry_date = bt.transaction_date
FROM bank_transactions bt
JOIN ar_receipts ar ON ar.id = bt.source_id AND bt.source_type = 'ar_receipt'
WHERE ar.journal_entry_id = je.id
  AND je.entry_date != bt.transaction_date
  AND bt.transaction_date >= '2026-04-01'
  AND bt.transaction_date <= '2026-04-30';

-- Also sync ar_receipts.receipt_date
UPDATE ar_receipts ar
SET receipt_date = bt.transaction_date
FROM bank_transactions bt
WHERE bt.source_id = ar.id
  AND bt.source_type = 'ar_receipt'
  AND ar.receipt_date != bt.transaction_date
  AND bt.transaction_date >= '2026-04-01'
  AND bt.transaction_date <= '2026-04-30';

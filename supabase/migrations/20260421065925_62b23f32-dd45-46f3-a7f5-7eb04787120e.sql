ALTER TABLE ap_payments DROP CONSTRAINT IF EXISTS ap_payments_payee_type_check;
ALTER TABLE ap_payments ADD CONSTRAINT ap_payments_payee_type_check
CHECK (payee_type = ANY (ARRAY['vendor'::text, 'customer'::text, 'direct'::text]));

ALTER TABLE ap_payments DROP CONSTRAINT IF EXISTS ap_payments_payee_consistency_check;
ALTER TABLE ap_payments ADD CONSTRAINT ap_payments_payee_consistency_check
CHECK (
  (payee_type = 'vendor' AND vendor_id IS NOT NULL AND payee_customer_id IS NULL)
  OR (payee_type = 'customer' AND payee_customer_id IS NOT NULL AND vendor_id IS NULL)
  OR (payee_type = 'direct' AND vendor_id IS NULL AND payee_customer_id IS NULL)
);

UPDATE journal_entries
SET source_module = 'school_bus_fuel_import'
WHERE entry_number LIKE 'FUEL-BLK-%' AND source_module IS NULL;

CREATE TEMP TABLE _fuel_dups ON COMMIT DROP AS
WITH fuel_jes AS (
  SELECT DISTINCT je.id, je.entry_date, je.created_at, jel.bus_id
  FROM journal_entries je
  JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
  WHERE je.entry_number LIKE 'FUEL-BLK-%' AND jel.bus_id IS NOT NULL
),
ranked AS (
  SELECT id, bus_id, entry_date, created_at,
         ROW_NUMBER() OVER (PARTITION BY bus_id, entry_date ORDER BY created_at) AS rn
  FROM fuel_jes
)
SELECT id, bus_id, entry_date FROM ranked WHERE rn > 1;

DO $$
DECLARE
  r RECORD;
  acc RECORD;
  net NUMERIC;
  is_debit_normal BOOLEAN;
  adjustment NUMERIC;
BEGIN
  FOR r IN
    SELECT jel.account_id, jel.debit, jel.credit
    FROM journal_entry_lines jel
    WHERE jel.journal_entry_id IN (SELECT id FROM _fuel_dups)
      AND jel.account_id IS NOT NULL
  LOOP
    SELECT current_balance, account_type INTO acc FROM chart_of_accounts WHERE id = r.account_id;
    IF acc IS NULL THEN CONTINUE; END IF;
    net := COALESCE(r.debit,0) - COALESCE(r.credit,0);
    is_debit_normal := acc.account_type IN ('asset','expense');
    adjustment := CASE WHEN is_debit_normal THEN net ELSE -net END;
    UPDATE chart_of_accounts
       SET current_balance = COALESCE(current_balance,0) - adjustment,
           updated_at = now()
     WHERE id = r.account_id;
  END LOOP;
END $$;

UPDATE daily_bus_expenses SET journal_entry_id = NULL WHERE journal_entry_id IN (SELECT id FROM _fuel_dups);
UPDATE ap_payments SET journal_entry_id = NULL WHERE journal_entry_id IN (SELECT id FROM _fuel_dups);
UPDATE ap_invoices SET journal_entry_id = NULL WHERE journal_entry_id IN (SELECT id FROM _fuel_dups);

DELETE FROM journal_entry_lines WHERE journal_entry_id IN (SELECT id FROM _fuel_dups);
DELETE FROM journal_entries WHERE id IN (SELECT id FROM _fuel_dups);

WITH surviving AS (
  SELECT jel.bus_id, je.entry_date, SUM(jel.debit) AS fuel_total
  FROM journal_entries je
  JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
  WHERE je.entry_number LIKE 'FUEL-BLK-%' AND jel.debit > 0 AND jel.bus_id IS NOT NULL
  GROUP BY jel.bus_id, je.entry_date
)
UPDATE daily_bus_expenses dbe
   SET fuel_cost = s.fuel_total,
       updated_at = now()
  FROM surviving s
 WHERE dbe.bus_id = s.bus_id AND dbe.expense_date = s.entry_date;

WITH surviving AS (
  SELECT DISTINCT ON (jel.bus_id, je.entry_date) je.id AS je_id, jel.bus_id, je.entry_date
  FROM journal_entries je
  JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
  WHERE je.entry_number LIKE 'FUEL-BLK-%' AND jel.bus_id IS NOT NULL
  ORDER BY jel.bus_id, je.entry_date, je.created_at
)
UPDATE daily_bus_expenses dbe
   SET journal_entry_id = s.je_id
  FROM surviving s
 WHERE dbe.bus_id = s.bus_id AND dbe.expense_date = s.entry_date AND dbe.journal_entry_id IS NULL;

WITH surviving AS (
  SELECT je.id AS je_id, je.entry_date, je.company_id, je.total_debit,
         jel.bus_id, b.bus_no,
         ROW_NUMBER() OVER (PARTITION BY je.entry_date ORDER BY je.created_at) AS seq
  FROM journal_entries je
  JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id AND jel.debit > 0
  LEFT JOIN buses b ON b.id = jel.bus_id
  WHERE je.entry_number LIKE 'FUEL-BLK-%'
)
INSERT INTO ap_payments (
  company_id, business_unit_code, payment_number, payment_date,
  payment_method, payee_type, vendor_id, bank_account_id,
  bus_id, bus_no, amount, is_direct_payment,
  status, approval_status, approved_at, journal_entry_id, notes
)
SELECT s.company_id, 'SBO',
       'DP-FUEL-' || to_char(s.entry_date, 'YYYYMMDD') || '-BF-' || lpad(s.seq::text, 3, '0'),
       s.entry_date,
       'direct', 'direct', NULL, NULL,
       s.bus_id, s.bus_no, s.total_debit, true,
       'paid', 'approved', now(), s.je_id,
       'Backfill: bulk fuel float drawdown'
FROM surviving s
WHERE NOT EXISTS (
  SELECT 1 FROM ap_payments p WHERE p.journal_entry_id = s.je_id
);
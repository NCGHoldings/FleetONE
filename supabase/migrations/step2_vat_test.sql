-- STEP 2: TEST — One invoice per module (AUTO ROLLBACK — safe)
BEGIN;

-- Show sample SBS entry BEFORE
SELECT 'SBS BEFORE' AS step, je.entry_number, je.total_debit,
  jel.description AS line_desc, jel.debit, jel.credit
FROM journal_entries je
JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
WHERE je.entry_number LIKE 'SBS-JE-%'
  AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines v WHERE v.journal_entry_id = je.id
    AND (v.description ILIKE '%VAT%' OR v.account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' LIMIT 1))
  )
  AND je.total_debit > 0
ORDER BY je.entry_date DESC
LIMIT 5;

-- Show sample SPH-INV entry BEFORE
SELECT 'SPH-INV BEFORE' AS step, je.entry_number, je.total_debit,
  jel.description AS line_desc, jel.debit, jel.credit
FROM journal_entries je
JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
WHERE je.entry_number LIKE 'SPH-INV-%'
  AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines v WHERE v.journal_entry_id = je.id
    AND (v.description ILIKE '%VAT%' OR v.account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' LIMIT 1))
  )
  AND je.total_debit > 0
ORDER BY je.entry_date DESC
LIMIT 5;

-- Show sample YUT entry BEFORE
SELECT 'YUT BEFORE' AS step, je.entry_number, je.total_debit,
  jel.description AS line_desc, jel.debit, jel.credit
FROM journal_entries je
JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
WHERE je.entry_number LIKE 'YUT-INV-%'
  AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines v WHERE v.journal_entry_id = je.id
    AND (v.description ILIKE '%VAT%' OR v.account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' LIMIT 1))
  )
  AND je.total_debit > 0
ORDER BY je.entry_date DESC
LIMIT 5;

-- ═══ APPLY: SBS ═══
-- Step A: Update the credit line
UPDATE journal_entry_lines
SET credit = journal_entry_lines.credit - ROUND(t.total_debit - ROUND(t.total_debit / 1.18, 2), 2),
    description = journal_entry_lines.description || ' (Excl. VAT)'
FROM (
  SELECT je.id AS je_id, je.total_debit
  FROM journal_entries je
  WHERE je.entry_number LIKE 'SBS-JE-%'
    AND NOT EXISTS (
      SELECT 1 FROM journal_entry_lines v WHERE v.journal_entry_id = je.id
      AND (v.description ILIKE '%VAT%' OR v.account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' LIMIT 1))
    )
    AND je.total_debit > 0
  ORDER BY je.entry_date DESC LIMIT 1
) t
WHERE journal_entry_lines.id = (
  SELECT jel2.id FROM journal_entry_lines jel2
  WHERE jel2.journal_entry_id = t.je_id AND jel2.credit > 0 AND jel2.description NOT ILIKE '%VAT%'
  ORDER BY jel2.credit DESC LIMIT 1
);

-- Step B: Insert VAT line for SBS
INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, company_id)
SELECT je.id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' LIMIT 1),
  'VAT Output 18% - ' || je.entry_number || ' [test]',
  0,
  ROUND(je.total_debit - ROUND(je.total_debit / 1.18, 2), 2),
  je.company_id
FROM journal_entries je
WHERE je.entry_number LIKE 'SBS-JE-%'
  AND EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    AND jel.description LIKE '%(Excl. VAT)%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    AND jel.description LIKE '%[test]%'
  )
ORDER BY je.entry_date DESC LIMIT 1;

-- ═══ APPLY: SPH-INV ═══
UPDATE journal_entry_lines
SET credit = journal_entry_lines.credit - ROUND(t.total_debit - ROUND(t.total_debit / 1.18, 2), 2),
    description = journal_entry_lines.description || ' (Excl. VAT)'
FROM (
  SELECT je.id AS je_id, je.total_debit
  FROM journal_entries je
  WHERE je.entry_number LIKE 'SPH-INV-%'
    AND NOT EXISTS (
      SELECT 1 FROM journal_entry_lines v WHERE v.journal_entry_id = je.id
      AND (v.description ILIKE '%VAT%' OR v.account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' LIMIT 1))
    )
    AND je.total_debit > 0
  ORDER BY je.entry_date DESC LIMIT 1
) t
WHERE journal_entry_lines.id = (
  SELECT jel2.id FROM journal_entry_lines jel2
  WHERE jel2.journal_entry_id = t.je_id AND jel2.credit > 0 AND jel2.description NOT ILIKE '%VAT%'
  ORDER BY jel2.credit DESC LIMIT 1
);

INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, company_id)
SELECT je.id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' LIMIT 1),
  'VAT Output 18% - ' || je.entry_number || ' [test]',
  0,
  ROUND(je.total_debit - ROUND(je.total_debit / 1.18, 2), 2),
  je.company_id
FROM journal_entries je
WHERE je.entry_number LIKE 'SPH-INV-%'
  AND EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    AND jel.description LIKE '%(Excl. VAT)%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    AND jel.description LIKE '%[test]%'
  )
ORDER BY je.entry_date DESC LIMIT 1;

-- ═══ APPLY: YUT ═══
UPDATE journal_entry_lines
SET credit = journal_entry_lines.credit - ROUND(t.total_debit - ROUND(t.total_debit / 1.18, 2), 2),
    description = journal_entry_lines.description || ' (Excl. VAT)'
FROM (
  SELECT je.id AS je_id, je.total_debit
  FROM journal_entries je
  WHERE je.entry_number LIKE 'YUT-INV-%'
    AND NOT EXISTS (
      SELECT 1 FROM journal_entry_lines v WHERE v.journal_entry_id = je.id
      AND (v.description ILIKE '%VAT%' OR v.account_id = (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' LIMIT 1))
    )
    AND je.total_debit > 0
  ORDER BY je.entry_date DESC LIMIT 1
) t
WHERE journal_entry_lines.id = (
  SELECT jel2.id FROM journal_entry_lines jel2
  WHERE jel2.journal_entry_id = t.je_id AND jel2.credit > 0 AND jel2.description NOT ILIKE '%VAT%'
  ORDER BY jel2.credit DESC LIMIT 1
);

INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, company_id)
SELECT je.id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' LIMIT 1),
  'VAT Output 18% - ' || je.entry_number || ' [test]',
  0,
  ROUND(je.total_debit - ROUND(je.total_debit / 1.18, 2), 2),
  je.company_id
FROM journal_entries je
WHERE je.entry_number LIKE 'YUT-INV-%'
  AND EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    AND jel.description LIKE '%(Excl. VAT)%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    AND jel.description LIKE '%[test]%'
  )
ORDER BY je.entry_date DESC LIMIT 1;

-- ═══ SHOW AFTER RESULTS ═══
SELECT 'SBS AFTER' AS step, je.entry_number, je.total_debit,
  jel.description AS line_desc, jel.debit, jel.credit,
  ROUND(je.total_debit / 1.18, 2) AS expected_base,
  ROUND(je.total_debit - ROUND(je.total_debit / 1.18, 2), 2) AS expected_vat
FROM journal_entries je
JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
WHERE je.entry_number LIKE 'SBS-JE-%'
  AND (jel.description LIKE '%(Excl. VAT)%' OR jel.description LIKE '%[test]%')
ORDER BY je.entry_date DESC LIMIT 5;

SELECT 'SPH AFTER' AS step, je.entry_number, je.total_debit,
  jel.description AS line_desc, jel.debit, jel.credit,
  ROUND(je.total_debit / 1.18, 2) AS expected_base,
  ROUND(je.total_debit - ROUND(je.total_debit / 1.18, 2), 2) AS expected_vat
FROM journal_entries je
JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
WHERE je.entry_number LIKE 'SPH-INV-%'
  AND (jel.description LIKE '%(Excl. VAT)%' OR jel.description LIKE '%[test]%')
ORDER BY je.entry_date DESC LIMIT 5;

SELECT 'YUT AFTER' AS step, je.entry_number, je.total_debit,
  jel.description AS line_desc, jel.debit, jel.credit,
  ROUND(je.total_debit / 1.18, 2) AS expected_base,
  ROUND(je.total_debit - ROUND(je.total_debit / 1.18, 2), 2) AS expected_vat
FROM journal_entries je
JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
WHERE je.entry_number LIKE 'YUT-INV-%'
  AND (jel.description LIKE '%(Excl. VAT)%' OR jel.description LIKE '%[test]%')
ORDER BY je.entry_date DESC LIMIT 5;

-- SAFETY: AUTO ROLLBACK
ROLLBACK;

-- =============================================================================
-- FULL VAT BACKFILL: 18% Inclusive VAT Split — ALL Modules
-- =============================================================================
-- Applies permanently. SPH-ADJ EXCLUDED (already in SPH-INV total).
-- Idempotent: skips entries that already have VAT lines.
-- TENANT-AWARE: VAT account matched by company_id to avoid isolation breach.
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1/6: SCHOOL BUS (SBS-JE-*)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1A: Reduce revenue credit lines by VAT amount
UPDATE journal_entry_lines
SET credit = journal_entry_lines.credit - ROUND(t.total_debit - ROUND(t.total_debit / 1.18, 2), 2),
    description = journal_entry_lines.description || ' (Excl. VAT)'
FROM (
  SELECT je.id AS je_id, je.total_debit, je.company_id
  FROM journal_entries je
  WHERE je.entry_number LIKE 'SBS-JE-%'
    AND NOT EXISTS (
      SELECT 1 FROM journal_entry_lines v WHERE v.journal_entry_id = je.id
      AND (v.description ILIKE '%VAT%' OR v.account_id IN (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' AND company_id = je.company_id))
    )
    AND je.total_debit > 0
) t
WHERE journal_entry_lines.id = (
  SELECT jel2.id FROM journal_entry_lines jel2
  WHERE jel2.journal_entry_id = t.je_id AND jel2.credit > 0 AND jel2.description NOT ILIKE '%VAT%'
  ORDER BY jel2.credit DESC LIMIT 1
);

-- 1B: Insert VAT Output lines for SBS
INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, company_id)
SELECT je.id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' AND company_id = je.company_id LIMIT 1),
  'VAT Output (18% Inclusive) - ' || COALESCE(je.reference, je.entry_number) || ' [backfill]',
  0,
  ROUND(je.total_debit - ROUND(je.total_debit / 1.18, 2), 2),
  je.company_id
FROM journal_entries je
WHERE je.entry_number LIKE 'SBS-JE-%'
  AND je.total_debit > 0
  AND EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    AND jel.description LIKE '%(Excl. VAT)%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    AND jel.description LIKE '%[backfill]%'
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 2/6: SPECIAL HIRE INVOICES (SPH-INV-* only, NOT SPH-ADJ)
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE journal_entry_lines
SET credit = journal_entry_lines.credit - ROUND(t.total_debit - ROUND(t.total_debit / 1.18, 2), 2),
    description = journal_entry_lines.description || ' (Excl. VAT)'
FROM (
  SELECT je.id AS je_id, je.total_debit, je.company_id
  FROM journal_entries je
  WHERE je.entry_number LIKE 'SPH-INV-%'
    AND NOT EXISTS (
      SELECT 1 FROM journal_entry_lines v WHERE v.journal_entry_id = je.id
      AND (v.description ILIKE '%VAT%' OR v.account_id IN (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' AND company_id = je.company_id))
    )
    AND je.total_debit > 0
) t
WHERE journal_entry_lines.id = (
  SELECT jel2.id FROM journal_entry_lines jel2
  WHERE jel2.journal_entry_id = t.je_id AND jel2.credit > 0 AND jel2.description NOT ILIKE '%VAT%'
  ORDER BY jel2.credit DESC LIMIT 1
);

INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, company_id)
SELECT je.id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' AND company_id = je.company_id LIMIT 1),
  'VAT Output (18% Inclusive) - ' || COALESCE(je.reference, je.entry_number) || ' [backfill]',
  0,
  ROUND(je.total_debit - ROUND(je.total_debit / 1.18, 2), 2),
  je.company_id
FROM journal_entries je
WHERE je.entry_number LIKE 'SPH-INV-%'
  AND je.total_debit > 0
  AND EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    AND jel.description LIKE '%(Excl. VAT)%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    AND jel.description LIKE '%[backfill]%'
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 3/6: YUTONG (YUT-INV-*)
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE journal_entry_lines
SET credit = journal_entry_lines.credit - ROUND(t.total_debit - ROUND(t.total_debit / 1.18, 2), 2),
    description = journal_entry_lines.description || ' (Excl. VAT)'
FROM (
  SELECT je.id AS je_id, je.total_debit, je.company_id
  FROM journal_entries je
  WHERE je.entry_number LIKE 'YUT-INV-%'
    AND NOT EXISTS (
      SELECT 1 FROM journal_entry_lines v WHERE v.journal_entry_id = je.id
      AND (v.description ILIKE '%VAT%' OR v.account_id IN (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' AND company_id = je.company_id))
    )
    AND je.total_debit > 0
) t
WHERE journal_entry_lines.id = (
  SELECT jel2.id FROM journal_entry_lines jel2
  WHERE jel2.journal_entry_id = t.je_id AND jel2.credit > 0 AND jel2.description NOT ILIKE '%VAT%'
  ORDER BY jel2.credit DESC LIMIT 1
);

INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, company_id)
SELECT je.id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' AND company_id = je.company_id LIMIT 1),
  'VAT Output (18% Inclusive) - ' || COALESCE(je.reference, je.entry_number) || ' [backfill]',
  0,
  ROUND(je.total_debit - ROUND(je.total_debit / 1.18, 2), 2),
  je.company_id
FROM journal_entries je
WHERE je.entry_number LIKE 'YUT-INV-%'
  AND je.total_debit > 0
  AND EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    AND jel.description LIKE '%(Excl. VAT)%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    AND jel.description LIKE '%[backfill]%'
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 4/6: SINOTRUK (SNT-INV-*)
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE journal_entry_lines
SET credit = journal_entry_lines.credit - ROUND(t.total_debit - ROUND(t.total_debit / 1.18, 2), 2),
    description = journal_entry_lines.description || ' (Excl. VAT)'
FROM (
  SELECT je.id AS je_id, je.total_debit, je.company_id
  FROM journal_entries je
  WHERE je.entry_number LIKE 'SNT-INV-%'
    AND NOT EXISTS (
      SELECT 1 FROM journal_entry_lines v WHERE v.journal_entry_id = je.id
      AND (v.description ILIKE '%VAT%' OR v.account_id IN (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' AND company_id = je.company_id))
    )
    AND je.total_debit > 0
) t
WHERE journal_entry_lines.id = (
  SELECT jel2.id FROM journal_entry_lines jel2
  WHERE jel2.journal_entry_id = t.je_id AND jel2.credit > 0 AND jel2.description NOT ILIKE '%VAT%'
  ORDER BY jel2.credit DESC LIMIT 1
);

INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, company_id)
SELECT je.id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' AND company_id = je.company_id LIMIT 1),
  'VAT Output (18% Inclusive) - ' || COALESCE(je.reference, je.entry_number) || ' [backfill]',
  0,
  ROUND(je.total_debit - ROUND(je.total_debit / 1.18, 2), 2),
  je.company_id
FROM journal_entries je
WHERE je.entry_number LIKE 'SNT-INV-%'
  AND je.total_debit > 0
  AND EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    AND jel.description LIKE '%(Excl. VAT)%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    AND jel.description LIKE '%[backfill]%'
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 5/6: LIGHT VEHICLE (LTV-INV-*)
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE journal_entry_lines
SET credit = journal_entry_lines.credit - ROUND(t.total_debit - ROUND(t.total_debit / 1.18, 2), 2),
    description = journal_entry_lines.description || ' (Excl. VAT)'
FROM (
  SELECT je.id AS je_id, je.total_debit, je.company_id
  FROM journal_entries je
  WHERE je.entry_number LIKE 'LTV-INV-%'
    AND NOT EXISTS (
      SELECT 1 FROM journal_entry_lines v WHERE v.journal_entry_id = je.id
      AND (v.description ILIKE '%VAT%' OR v.account_id IN (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' AND company_id = je.company_id))
    )
    AND je.total_debit > 0
) t
WHERE journal_entry_lines.id = (
  SELECT jel2.id FROM journal_entry_lines jel2
  WHERE jel2.journal_entry_id = t.je_id AND jel2.credit > 0 AND jel2.description NOT ILIKE '%VAT%'
  ORDER BY jel2.credit DESC LIMIT 1
);

INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, company_id)
SELECT je.id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' AND company_id = je.company_id LIMIT 1),
  'VAT Output (18% Inclusive) - ' || COALESCE(je.reference, je.entry_number) || ' [backfill]',
  0,
  ROUND(je.total_debit - ROUND(je.total_debit / 1.18, 2), 2),
  je.company_id
FROM journal_entries je
WHERE je.entry_number LIKE 'LTV-INV-%'
  AND je.total_debit > 0
  AND EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    AND jel.description LIKE '%(Excl. VAT)%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    AND jel.description LIKE '%[backfill]%'
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 6/6: LEASING (LEASE-GL-*)
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE journal_entry_lines
SET credit = journal_entry_lines.credit - ROUND(t.total_debit - ROUND(t.total_debit / 1.18, 2), 2),
    description = journal_entry_lines.description || ' (Excl. VAT)'
FROM (
  SELECT je.id AS je_id, je.total_debit, je.company_id
  FROM journal_entries je
  WHERE je.entry_number LIKE 'LEASE-GL-%'
    AND NOT EXISTS (
      SELECT 1 FROM journal_entry_lines v WHERE v.journal_entry_id = je.id
      AND (v.description ILIKE '%VAT%' OR v.account_id IN (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' AND company_id = je.company_id))
    )
    AND je.total_debit > 0
) t
WHERE journal_entry_lines.id = (
  SELECT jel2.id FROM journal_entry_lines jel2
  WHERE jel2.journal_entry_id = t.je_id AND jel2.credit > 0 AND jel2.description NOT ILIKE '%VAT%'
  ORDER BY jel2.credit DESC LIMIT 1
);

INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, company_id)
SELECT je.id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '22304000' AND company_id = je.company_id LIMIT 1),
  'VAT Output (18% Inclusive) - ' || COALESCE(je.reference, je.entry_number) || ' [backfill]',
  0,
  ROUND(je.total_debit - ROUND(je.total_debit / 1.18, 2), 2),
  je.company_id
FROM journal_entries je
WHERE je.entry_number LIKE 'LEASE-GL-%'
  AND je.total_debit > 0
  AND EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    AND jel.description LIKE '%(Excl. VAT)%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
    AND jel.description LIKE '%[backfill]%'
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 7: Recalculate COA Balances
-- ═══════════════════════════════════════════════════════════════════════════

-- VAT Control Account balance
UPDATE chart_of_accounts
SET current_balance = COALESCE((
  SELECT SUM(COALESCE(credit, 0) - COALESCE(debit, 0))
  FROM journal_entry_lines WHERE account_id = chart_of_accounts.id
), 0),
updated_at = NOW()
WHERE account_code = '22304000';

-- All revenue accounts that were modified
UPDATE chart_of_accounts
SET current_balance = COALESCE((
  SELECT SUM(COALESCE(credit, 0) - COALESCE(debit, 0))
  FROM journal_entry_lines WHERE account_id = chart_of_accounts.id
), 0),
updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT jel.account_id
  FROM journal_entry_lines jel
  WHERE jel.description LIKE '%(Excl. VAT)%'
    AND jel.account_id IS NOT NULL
);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 8: Update AR Invoice tax metadata
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE ar_invoices
SET
  tax_amount = ROUND(total_amount - ROUND(total_amount / 1.18, 2), 2),
  subtotal = ROUND(total_amount / 1.18, 2)
WHERE journal_entry_id IS NOT NULL
  AND total_amount > 0
  AND (tax_amount IS NULL OR tax_amount = 0)
  AND EXISTS (
    SELECT 1 FROM journal_entry_lines jel
    WHERE jel.journal_entry_id = ar_invoices.journal_entry_id
      AND jel.description LIKE '%[backfill]%'
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 9: Propagate VAT Account to ALL finance settings (tenant-aware)
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE school_bus_finance_settings s
SET vat_output_account_id = (
  SELECT id FROM chart_of_accounts
  WHERE account_code = '22304000' AND company_id = s.company_id
  LIMIT 1
)
WHERE s.vat_output_account_id IS NULL;

UPDATE special_hire_finance_settings s
SET vat_output_account_id = (
  SELECT id FROM chart_of_accounts
  WHERE account_code = '22304000' AND company_id = s.company_id
  LIMIT 1
)
WHERE s.vat_output_account_id IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 10: Verification query
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  CASE
    WHEN jel.description LIKE '%SBS%' OR je.entry_number LIKE 'SBS-%' THEN 'SBS'
    WHEN jel.description LIKE '%SPH%' OR je.entry_number LIKE 'SPH-%' THEN 'SPH'
    WHEN jel.description LIKE '%YUT%' OR je.entry_number LIKE 'YUT-%' THEN 'YUT'
    WHEN jel.description LIKE '%SNT%' OR je.entry_number LIKE 'SNT-%' THEN 'SNT'
    WHEN jel.description LIKE '%LTV%' OR je.entry_number LIKE 'LTV-%' THEN 'LTV'
    WHEN jel.description LIKE '%LEASE%' OR je.entry_number LIKE 'LEASE-%' THEN 'LEASE'
    ELSE 'OTHER'
  END AS module,
  COUNT(*) AS vat_lines_created,
  SUM(jel.credit) AS total_vat_amount
FROM journal_entry_lines jel
JOIN journal_entries je ON je.id = jel.journal_entry_id
WHERE jel.description LIKE '%[backfill]%'
GROUP BY 1
ORDER BY 1;

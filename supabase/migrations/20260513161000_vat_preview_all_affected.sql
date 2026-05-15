-- =============================================================================
-- STEP 1: PREVIEW — List ALL Journal Entries That Will Be VAT-Split
-- =============================================================================
-- 
-- ⚠  THIS IS READ-ONLY — NO DATA IS CHANGED
-- 
-- Run this FIRST to see the full list of affected invoices.
-- Review the list, then proceed to the actual backfill.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PART A: Find the VAT Account
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 
  id AS vat_account_id, 
  account_code, 
  account_name
FROM chart_of_accounts
WHERE account_code = '22304000'
   OR account_name ILIKE '%VAT%Control%'
   OR account_name ILIKE '%VAT%Output%'
LIMIT 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART B: List ALL qualifying entries per module (that DON'T have VAT yet)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 
  CASE
    WHEN je.entry_number LIKE 'SBS-JE-%'   THEN '1. School Bus'
    WHEN je.entry_number LIKE 'SPH-INV-%'  THEN '2. Special Hire'
    WHEN je.entry_number LIKE 'YUT-INV-%'  THEN '3. Yutong'
    WHEN je.entry_number LIKE 'SNT-INV-%'  THEN '4. Sinotruk'
    WHEN je.entry_number LIKE 'LTV-INV-%'  THEN '5. Light Vehicle'
    WHEN je.entry_number LIKE 'LEASE-GL-%' THEN '6. Leasing'
  END AS module,
  je.entry_number,
  je.entry_date,
  je.description,
  je.reference,
  je.total_debit AS total_amount,
  ROUND(je.total_debit / 1.18, 2) AS base_excl_vat,
  ROUND(je.total_debit - ROUND(je.total_debit / 1.18, 2), 2) AS vat_18_pct,
  'WILL BE SPLIT' AS status
FROM journal_entries je
WHERE (
    je.entry_number LIKE 'SBS-JE-%'
    OR je.entry_number LIKE 'SPH-INV-%'
    OR je.entry_number LIKE 'YUT-INV-%'
    OR je.entry_number LIKE 'SNT-INV-%'
    OR je.entry_number LIKE 'LTV-INV-%'
    OR je.entry_number LIKE 'LEASE-GL-%'
  )
  -- Exclude entries that ALREADY have a VAT line
  AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines vel
    WHERE vel.journal_entry_id = je.id
      AND (
        vel.description ILIKE '%VAT%'
        OR vel.account_id = (
          SELECT id FROM chart_of_accounts 
          WHERE account_code = '22304000' 
          LIMIT 1
        )
      )
  )
  AND je.total_debit > 0
ORDER BY 
  CASE
    WHEN je.entry_number LIKE 'SBS-JE-%'   THEN 1
    WHEN je.entry_number LIKE 'SPH-INV-%'  THEN 2
    WHEN je.entry_number LIKE 'YUT-INV-%'  THEN 3
    WHEN je.entry_number LIKE 'SNT-INV-%'  THEN 4
    WHEN je.entry_number LIKE 'LTV-INV-%'  THEN 5
    WHEN je.entry_number LIKE 'LEASE-GL-%' THEN 6
  END,
  je.entry_date ASC;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART C: Summary count per module
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 
  CASE
    WHEN je.entry_number LIKE 'SBS-JE-%'   THEN '1. School Bus (SBS)'
    WHEN je.entry_number LIKE 'SPH-INV-%'  THEN '2. Special Hire (SPH-INV)'
    WHEN je.entry_number LIKE 'YUT-INV-%'  THEN '3. Yutong (YUT)'
    WHEN je.entry_number LIKE 'SNT-INV-%'  THEN '4. Sinotruk (SNT)'
    WHEN je.entry_number LIKE 'LTV-INV-%'  THEN '5. Light Vehicle (LTV)'
    WHEN je.entry_number LIKE 'LEASE-GL-%' THEN '6. Leasing (LEASE)'
  END AS module,
  COUNT(*) AS invoice_count,
  SUM(je.total_debit) AS total_revenue,
  SUM(ROUND(je.total_debit - ROUND(je.total_debit / 1.18, 2), 2)) AS total_vat_to_extract
FROM journal_entries je
WHERE (
    je.entry_number LIKE 'SBS-JE-%'
    OR je.entry_number LIKE 'SPH-INV-%'
    OR je.entry_number LIKE 'YUT-INV-%'
    OR je.entry_number LIKE 'SNT-INV-%'
    OR je.entry_number LIKE 'LTV-INV-%'
    OR je.entry_number LIKE 'LEASE-GL-%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines vel
    WHERE vel.journal_entry_id = je.id
      AND (
        vel.description ILIKE '%VAT%'
        OR vel.account_id = (
          SELECT id FROM chart_of_accounts 
          WHERE account_code = '22304000' 
          LIMIT 1
        )
      )
  )
  AND je.total_debit > 0
GROUP BY 1
ORDER BY 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART D: Already processed entries (have VAT already — will be SKIPPED)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 
  CASE
    WHEN je.entry_number LIKE 'SBS-JE-%'   THEN '1. School Bus (SBS)'
    WHEN je.entry_number LIKE 'SPH-INV-%'  THEN '2. Special Hire (SPH-INV)'
    WHEN je.entry_number LIKE 'YUT-INV-%'  THEN '3. Yutong (YUT)'
    WHEN je.entry_number LIKE 'SNT-INV-%'  THEN '4. Sinotruk (SNT)'
    WHEN je.entry_number LIKE 'LTV-INV-%'  THEN '5. Light Vehicle (LTV)'
    WHEN je.entry_number LIKE 'LEASE-GL-%' THEN '6. Leasing (LEASE)'
  END AS module,
  COUNT(*) AS already_has_vat_count,
  'WILL BE SKIPPED' AS status
FROM journal_entries je
WHERE (
    je.entry_number LIKE 'SBS-JE-%'
    OR je.entry_number LIKE 'SPH-INV-%'
    OR je.entry_number LIKE 'YUT-INV-%'
    OR je.entry_number LIKE 'SNT-INV-%'
    OR je.entry_number LIKE 'LTV-INV-%'
    OR je.entry_number LIKE 'LEASE-GL-%'
  )
  AND EXISTS (
    SELECT 1 FROM journal_entry_lines vel
    WHERE vel.journal_entry_id = je.id
      AND (
        vel.description ILIKE '%VAT%'
        OR vel.account_id = (
          SELECT id FROM chart_of_accounts 
          WHERE account_code = '22304000' 
          LIMIT 1
        )
      )
  )
GROUP BY 1
ORDER BY 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART E: SPH-ADJ entries (EXCLUDED from backfill — shown for reference)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 
  'SPH-ADJ (EXCLUDED)' AS module,
  je.entry_number,
  je.entry_date,
  je.total_debit AS amount,
  je.description,
  '⚠ EXCLUDED — already in SPH-INV total' AS reason
FROM journal_entries je
WHERE je.entry_number LIKE 'SPH-ADJ-%'
ORDER BY je.entry_date DESC;

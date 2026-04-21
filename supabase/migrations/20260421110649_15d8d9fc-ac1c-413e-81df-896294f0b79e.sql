-- Migration: Backfill orphan SBO school AR invoices (LIVE only) + parity view
-- Scope: NCG Holding (a0000000-0000-0000-0000-000000000001), business_unit_code = 'SBO'.
-- TEST companies are NOT touched.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Move/auto-create per-branch SBO customers onto NCG Holding so AR insert
--    isn't blocked by tenant RLS.
-- ─────────────────────────────────────────────────────────────────────────────

-- Move SBS-NUW to NCG Holding (was stuck on NCG Test)
UPDATE public.customers
SET company_id = 'a0000000-0000-0000-0000-000000000001',
    updated_at = now()
WHERE customer_code = 'SBS-NUW'
  AND company_id <> 'a0000000-0000-0000-0000-000000000001';

-- Generic safety net: every SBO customer that has school_ar_invoices linked to
-- a NCG Holding JE must live on NCG Holding too.
UPDATE public.customers c
SET company_id = 'a0000000-0000-0000-0000-000000000001',
    updated_at = now()
WHERE c.business_unit_code = 'SBO'
  AND c.customer_code LIKE 'SBS-%'
  AND c.company_id <> 'a0000000-0000-0000-0000-000000000001'
  AND EXISTS (
    SELECT 1
    FROM public.school_ar_invoices sai
    JOIN public.journal_entries je ON je.id = sai.journal_entry_id
    JOIN public.school_ar_invoice_batches b ON b.id = sai.batch_id
    JOIN public.school_students st ON st.id = sai.student_id
    JOIN public.school_branches sb ON sb.id = st.branch_id
    WHERE je.company_id = 'a0000000-0000-0000-0000-000000000001'
      AND je.business_unit_code = 'SBO'
      AND ('SBS-' || sb.branch_code) = c.customer_code
      AND sai.ar_invoice_id IS NULL
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Backfill ar_invoices for orphan SBO school invoices in NCG Holding.
--    Strict filter: only rows whose JE is on NCG Holding + SBO. No TEST drift.
-- ─────────────────────────────────────────────────────────────────────────────

WITH orphans AS (
  SELECT
    sai.id              AS school_invoice_id,
    sai.invoice_number,
    sai.amount,
    sai.status          AS school_status,
    sai.paid_amount,
    sai.journal_entry_id,
    je.entry_date       AS je_date,
    je.company_id       AS je_company,
    sb.branch_code,
    sb.branch_name,
    st.student_name,
    sai.invoice_month
  FROM public.school_ar_invoices sai
  JOIN public.journal_entries je ON je.id = sai.journal_entry_id
  JOIN public.school_ar_invoice_batches b ON b.id = sai.batch_id
  JOIN public.school_students st ON st.id = sai.student_id
  JOIN public.school_branches sb ON sb.id = st.branch_id
  WHERE sai.ar_invoice_id IS NULL
    AND sai.journal_entry_id IS NOT NULL
    AND je.company_id = 'a0000000-0000-0000-0000-000000000001'
    AND je.business_unit_code = 'SBO'
), inserted AS (
  INSERT INTO public.ar_invoices (
    company_id,
    business_unit_code,
    customer_id,
    invoice_number,
    invoice_date,
    due_date,
    total_amount,
    paid_amount,
    balance,
    status,
    reference,
    notes,
    journal_entry_id
  )
  SELECT
    'a0000000-0000-0000-0000-000000000001'::uuid AS company_id,
    'SBO'                                         AS business_unit_code,
    c.id                                          AS customer_id,
    o.invoice_number,
    COALESCE(o.je_date, o.invoice_month, CURRENT_DATE) AS invoice_date,
    COALESCE(o.je_date, o.invoice_month, CURRENT_DATE) + INTERVAL '30 days' AS due_date,
    o.amount                                       AS total_amount,
    COALESCE(o.paid_amount, 0)                     AS paid_amount,
    o.amount - COALESCE(o.paid_amount, 0)          AS balance,
    CASE
      WHEN COALESCE(o.paid_amount, 0) >= o.amount THEN 'paid'
      WHEN COALESCE(o.paid_amount, 0) > 0          THEN 'partial'
      ELSE 'unpaid'
    END                                            AS status,
    o.student_name || ' - ' || to_char(o.invoice_month, 'Mon YYYY') AS reference,
    'Backfilled from school_ar_invoices on ' || to_char(now(), 'YYYY-MM-DD') AS notes,
    o.journal_entry_id
  FROM orphans o
  JOIN public.customers c
    ON c.customer_code = ('SBS-' || o.branch_code)
   AND c.business_unit_code = 'SBO'
   AND c.company_id = 'a0000000-0000-0000-0000-000000000001'
  RETURNING id, invoice_number, journal_entry_id
)
UPDATE public.school_ar_invoices sai
SET ar_invoice_id = i.id
FROM inserted i
WHERE sai.journal_entry_id = i.journal_entry_id
  AND sai.invoice_number   = i.invoice_number
  AND sai.ar_invoice_id IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Delete true zombie ₨0 SBO JEs (no lines, no school link) on NCG Holding.
--    Safety: must have total_debit = 0 AND zero journal_entry_lines AND no
--    school_ar_invoices reference. TEST untouched.
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM public.journal_entries je
WHERE je.business_unit_code = 'SBO'
  AND je.company_id = 'a0000000-0000-0000-0000-000000000001'
  AND COALESCE(je.total_debit, 0) = 0
  AND COALESCE(je.total_credit, 0) = 0
  AND NOT EXISTS (SELECT 1 FROM public.journal_entry_lines jel WHERE jel.journal_entry_id = je.id)
  AND NOT EXISTS (SELECT 1 FROM public.school_ar_invoices sai WHERE sai.journal_entry_id = je.id)
  AND NOT EXISTS (SELECT 1 FROM public.ar_invoices ai WHERE ai.journal_entry_id = je.id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Parity view: per company / branch / month — school invoices vs AR vs JE.
--    Read-only helper for ops + GL Integrity Guardian.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_sbo_ar_je_parity AS
SELECT
  b.company_id,
  sb.id                                AS branch_id,
  sb.branch_code,
  sb.branch_name,
  date_trunc('month', sai.invoice_month)::date AS invoice_month,
  COUNT(*)                             AS school_invoice_count,
  COUNT(sai.ar_invoice_id)             AS linked_ar_count,
  COUNT(sai.journal_entry_id)          AS linked_je_count,
  COUNT(*) - COUNT(sai.ar_invoice_id)  AS missing_ar_count,
  COUNT(*) - COUNT(sai.journal_entry_id) AS missing_je_count
FROM public.school_ar_invoices sai
JOIN public.school_ar_invoice_batches b ON b.id = sai.batch_id
JOIN public.school_students st ON st.id = sai.student_id
JOIN public.school_branches sb ON sb.id = st.branch_id
GROUP BY b.company_id, sb.id, sb.branch_code, sb.branch_name, date_trunc('month', sai.invoice_month);

GRANT SELECT ON public.v_sbo_ar_je_parity TO authenticated;
-- ============================================================
-- Company-Specific Accounting Renumbering Fix (v3)
-- ============================================================
-- BULLETPROOF VERSION: 
-- This script calculates the EXACT string prefix for each row first
-- and uses THAT prefix as the partition boundary. This mathematically
-- guarantees that no two rows can ever receive the same ID, even if 
-- they have legacy NULL company_ids or overlapping contexts.
-- ============================================================

BEGIN;

-- 1. CUSTOMERS: CUST-[ORG]-YYYY-NNNN
UPDATE public.customers SET customer_code = customer_code || '-CPY-TMP2';
WITH prefixes AS (
  SELECT id,
    'CUST-' || 
    COALESCE((SELECT short_code || '-' FROM public.companies WHERE id = c.company_id AND short_code IS NOT NULL AND short_code != ''), '') ||
    EXTRACT(YEAR FROM c.created_at)::TEXT || '-' AS prefix_str
  FROM public.customers c
),
numbered AS (
  SELECT c.id, p.prefix_str, ROW_NUMBER() OVER (PARTITION BY p.prefix_str ORDER BY c.created_at ASC) AS seq
  FROM public.customers c JOIN prefixes p ON c.id = p.id
)
UPDATE public.customers c SET customer_code = n.prefix_str || LPAD(n.seq::TEXT, 4, '0') FROM numbered n WHERE c.id = n.id;

-- 2. VENDORS: VND-[ORG]-YYYY-NNNN
UPDATE public.vendors SET vendor_code = vendor_code || '-CPY-TMP2';
WITH prefixes AS (
  SELECT id,
    'VND-' || 
    COALESCE((SELECT short_code || '-' FROM public.companies WHERE id = v.company_id AND short_code IS NOT NULL AND short_code != ''), '') ||
    EXTRACT(YEAR FROM v.created_at)::TEXT || '-' AS prefix_str
  FROM public.vendors v
),
numbered AS (
  SELECT v.id, p.prefix_str, ROW_NUMBER() OVER (PARTITION BY p.prefix_str ORDER BY v.created_at ASC) AS seq
  FROM public.vendors v JOIN prefixes p ON v.id = p.id
)
UPDATE public.vendors v SET vendor_code = n.prefix_str || LPAD(n.seq::TEXT, 4, '0') FROM numbered n WHERE v.id = n.id;

-- 3. AR INVOICES: INV-[ORG]-YYYY-NNNNN
UPDATE public.ar_invoices SET invoice_number = invoice_number || '-CPY-TMP2';
WITH prefixes AS (
  SELECT id,
    'INV-' || 
    COALESCE((SELECT short_code || '-' FROM public.companies WHERE id = i.company_id AND short_code IS NOT NULL AND short_code != ''), '') ||
    EXTRACT(YEAR FROM i.created_at)::TEXT || '-' AS prefix_str
  FROM public.ar_invoices i
),
numbered AS (
  SELECT i.id, p.prefix_str, ROW_NUMBER() OVER (PARTITION BY p.prefix_str ORDER BY i.created_at ASC) AS seq
  FROM public.ar_invoices i JOIN prefixes p ON i.id = p.id
)
UPDATE public.ar_invoices i SET invoice_number = n.prefix_str || LPAD(n.seq::TEXT, 5, '0') FROM numbered n WHERE i.id = n.id;

-- 4. AP INVOICES: BILL-[ORG]-YYYY-NNNNN
UPDATE public.ap_invoices SET invoice_number = invoice_number || '-CPY-TMP2';
WITH prefixes AS (
  SELECT id,
    'BILL-' || 
    COALESCE((SELECT short_code || '-' FROM public.companies WHERE id = i.company_id AND short_code IS NOT NULL AND short_code != ''), '') ||
    EXTRACT(YEAR FROM i.created_at)::TEXT || '-' AS prefix_str
  FROM public.ap_invoices i
),
numbered AS (
  SELECT i.id, p.prefix_str, ROW_NUMBER() OVER (PARTITION BY p.prefix_str ORDER BY i.created_at ASC) AS seq
  FROM public.ap_invoices i JOIN prefixes p ON i.id = p.id
)
UPDATE public.ap_invoices i SET invoice_number = n.prefix_str || LPAD(n.seq::TEXT, 5, '0') FROM numbered n WHERE i.id = n.id;

-- 5. AR RECEIPTS: RCP-[ORG]-YYYY-NNNNN
UPDATE public.ar_receipts SET receipt_number = receipt_number || '-CPY-TMP2';
WITH prefixes AS (
  SELECT id,
    'RCP-' || 
    COALESCE((SELECT short_code || '-' FROM public.companies WHERE id = r.company_id AND short_code IS NOT NULL AND short_code != ''), '') ||
    EXTRACT(YEAR FROM r.created_at)::TEXT || '-' AS prefix_str
  FROM public.ar_receipts r
),
numbered AS (
  SELECT r.id, p.prefix_str, ROW_NUMBER() OVER (PARTITION BY p.prefix_str ORDER BY r.created_at ASC) AS seq
  FROM public.ar_receipts r JOIN prefixes p ON r.id = p.id
)
UPDATE public.ar_receipts r SET receipt_number = n.prefix_str || LPAD(n.seq::TEXT, 5, '0') FROM numbered n WHERE r.id = n.id;

-- 6. AP PAYMENTS: PAY-[ORG]-YYYY-NNNNN
UPDATE public.ap_payments SET payment_number = payment_number || '-CPY-TMP2';
WITH prefixes AS (
  SELECT id,
    'PAY-' || 
    COALESCE((SELECT short_code || '-' FROM public.companies WHERE id = p.company_id AND short_code IS NOT NULL AND short_code != ''), '') ||
    EXTRACT(YEAR FROM p.created_at)::TEXT || '-' AS prefix_str
  FROM public.ap_payments p
),
numbered AS (
  SELECT p.id, px.prefix_str, ROW_NUMBER() OVER (PARTITION BY px.prefix_str ORDER BY p.created_at ASC) AS seq
  FROM public.ap_payments p JOIN prefixes px ON p.id = px.id
)
UPDATE public.ap_payments p SET payment_number = n.prefix_str || LPAD(n.seq::TEXT, 5, '0') FROM numbered n WHERE p.id = n.id;

-- 7. JOURNAL ENTRIES: JV-[ORG]-YYYY-NNNNN
UPDATE public.journal_entries SET entry_number = entry_number || '-CPY-TMP2';
WITH prefixes AS (
  SELECT id,
    'JV-' || 
    COALESCE((SELECT short_code || '-' FROM public.companies WHERE id = j.company_id AND short_code IS NOT NULL AND short_code != ''), '') ||
    EXTRACT(YEAR FROM j.created_at)::TEXT || '-' AS prefix_str
  FROM public.journal_entries j
),
numbered AS (
  SELECT j.id, p.prefix_str, ROW_NUMBER() OVER (PARTITION BY p.prefix_str ORDER BY j.created_at ASC) AS seq
  FROM public.journal_entries j JOIN prefixes p ON j.id = p.id
)
UPDATE public.journal_entries j SET entry_number = n.prefix_str || LPAD(n.seq::TEXT, 5, '0') FROM numbered n WHERE j.id = n.id;

-- 8. RESET NUMBERING SEQUENCES ISOLATED BY COMPANY
-- Uses the max string substring casted to integer for bulletproof auto-resync
UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT MAX(SUBSTRING(customer_code FROM '\d+$')::INTEGER) + 1 FROM public.customers c WHERE c.company_id = ns.company_id
), 1)
WHERE ns.entity_type = 'customer';

UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT MAX(SUBSTRING(vendor_code FROM '\d+$')::INTEGER) + 1 FROM public.vendors v WHERE v.company_id = ns.company_id
), 1)
WHERE ns.entity_type = 'vendor';

UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT MAX(SUBSTRING(invoice_number FROM '\d+$')::INTEGER) + 1 FROM public.ar_invoices i WHERE i.company_id = ns.company_id
), 1)
WHERE ns.entity_type = 'ar_invoice';

UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT MAX(SUBSTRING(invoice_number FROM '\d+$')::INTEGER) + 1 FROM public.ap_invoices i WHERE i.company_id = ns.company_id
), 1)
WHERE ns.entity_type = 'ap_invoice';

UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT MAX(SUBSTRING(receipt_number FROM '\d+$')::INTEGER) + 1 FROM public.ar_receipts r WHERE r.company_id = ns.company_id
), 1)
WHERE ns.entity_type = 'receipt';

UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT MAX(SUBSTRING(payment_number FROM '\d+$')::INTEGER) + 1 FROM public.ap_payments p WHERE p.company_id = ns.company_id
), 1)
WHERE ns.entity_type = 'payment';

UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT MAX(SUBSTRING(entry_number FROM '\d+$')::INTEGER) + 1 FROM public.journal_entries j WHERE j.company_id = ns.company_id
), 1)
WHERE ns.entity_type = 'journal';

COMMIT;

-- ============================================================
-- Company-Specific Accounting Renumbering Fix (v2)
-- ============================================================
-- Fixes unique constraint violations by injecting the company's 
-- `short_code` (e.g., YUT) into the document number if it exists.
-- This ensures NCG Holding starts at 0001 and Test Yutong starts 
-- at 0001 in isolation, without database key collisions.
-- ============================================================

BEGIN;

-- 1. CUSTOMERS: CUST-[ORG]-YYYY-NNNN
UPDATE public.customers SET customer_code = customer_code || '-CPY-TMP';
WITH numbered AS (
  SELECT id, company_id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at ASC) AS seq
  FROM public.customers
)
UPDATE public.customers c
SET customer_code = 'CUST-' || 
  COALESCE((SELECT short_code || '-' FROM public.companies WHERE id = c.company_id AND short_code IS NOT NULL AND short_code != ''), '') ||
  EXTRACT(YEAR FROM c.created_at)::TEXT || '-' || 
  LPAD(n.seq::TEXT, 4, '0')
FROM numbered n WHERE c.id = n.id;

-- 2. VENDORS: VND-[ORG]-YYYY-NNNN
UPDATE public.vendors SET vendor_code = vendor_code || '-CPY-TMP';
WITH numbered AS (
  SELECT id, company_id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at ASC) AS seq
  FROM public.vendors
)
UPDATE public.vendors v
SET vendor_code = 'VND-' || 
  COALESCE((SELECT short_code || '-' FROM public.companies WHERE id = v.company_id AND short_code IS NOT NULL AND short_code != ''), '') ||
  EXTRACT(YEAR FROM v.created_at)::TEXT || '-' || 
  LPAD(n.seq::TEXT, 4, '0')
FROM numbered n WHERE v.id = n.id;

-- 3. AR INVOICES: INV-[ORG]-YYYY-NNNNN
UPDATE public.ar_invoices SET invoice_number = invoice_number || '-CPY-TMP';
WITH numbered AS (
  SELECT id, company_id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at ASC) AS seq
  FROM public.ar_invoices
)
UPDATE public.ar_invoices i
SET invoice_number = 'INV-' || 
  COALESCE((SELECT short_code || '-' FROM public.companies WHERE id = i.company_id AND short_code IS NOT NULL AND short_code != ''), '') ||
  EXTRACT(YEAR FROM i.created_at)::TEXT || '-' || 
  LPAD(n.seq::TEXT, 5, '0')
FROM numbered n WHERE i.id = n.id;

-- 4. AP INVOICES: BILL-[ORG]-YYYY-NNNNN
UPDATE public.ap_invoices SET invoice_number = invoice_number || '-CPY-TMP';
WITH numbered AS (
  SELECT id, company_id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at ASC) AS seq
  FROM public.ap_invoices
)
UPDATE public.ap_invoices i
SET invoice_number = 'BILL-' || 
  COALESCE((SELECT short_code || '-' FROM public.companies WHERE id = i.company_id AND short_code IS NOT NULL AND short_code != ''), '') ||
  EXTRACT(YEAR FROM i.created_at)::TEXT || '-' || 
  LPAD(n.seq::TEXT, 5, '0')
FROM numbered n WHERE i.id = n.id;

-- 5. AR RECEIPTS: RCP-[ORG]-YYYY-NNNNN
UPDATE public.ar_receipts SET receipt_number = receipt_number || '-CPY-TMP';
WITH numbered AS (
  SELECT id, company_id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at ASC) AS seq
  FROM public.ar_receipts
)
UPDATE public.ar_receipts r
SET receipt_number = 'RCP-' || 
  COALESCE((SELECT short_code || '-' FROM public.companies WHERE id = r.company_id AND short_code IS NOT NULL AND short_code != ''), '') ||
  EXTRACT(YEAR FROM r.created_at)::TEXT || '-' || 
  LPAD(n.seq::TEXT, 5, '0')
FROM numbered n WHERE r.id = n.id;

-- 6. AP PAYMENTS: PAY-[ORG]-YYYY-NNNNN
UPDATE public.ap_payments SET payment_number = payment_number || '-CPY-TMP';
WITH numbered AS (
  SELECT id, company_id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at ASC) AS seq
  FROM public.ap_payments
)
UPDATE public.ap_payments p
SET payment_number = 'PAY-' || 
  COALESCE((SELECT short_code || '-' FROM public.companies WHERE id = p.company_id AND short_code IS NOT NULL AND short_code != ''), '') ||
  EXTRACT(YEAR FROM p.created_at)::TEXT || '-' || 
  LPAD(n.seq::TEXT, 5, '0')
FROM numbered n WHERE p.id = n.id;

-- 7. JOURNAL ENTRIES: JV-[ORG]-YYYY-NNNNN
UPDATE public.journal_entries SET entry_number = entry_number || '-CPY-TMP';
WITH numbered AS (
  SELECT id, company_id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at ASC) AS seq
  FROM public.journal_entries
)
UPDATE public.journal_entries j
SET entry_number = 'JV-' || 
  COALESCE((SELECT short_code || '-' FROM public.companies WHERE id = j.company_id AND short_code IS NOT NULL AND short_code != ''), '') ||
  EXTRACT(YEAR FROM j.created_at)::TEXT || '-' || 
  LPAD(n.seq::TEXT, 5, '0')
FROM numbered n WHERE j.id = n.id;


-- 8. RESET NUMBERING SEQUENCES ISOLATED BY COMPANY
-- Customers
UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT COUNT(*) + 1 FROM public.customers c WHERE c.company_id = ns.company_id
), 1)
WHERE ns.entity_type = 'customer';

-- Vendors
UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT COUNT(*) + 1 FROM public.vendors v WHERE v.company_id = ns.company_id
), 1)
WHERE ns.entity_type = 'vendor';

-- AR Invoices
UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT COUNT(*) + 1 FROM public.ar_invoices i WHERE i.company_id = ns.company_id
), 1)
WHERE ns.entity_type = 'ar_invoice';

-- AP Invoices
UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT COUNT(*) + 1 FROM public.ap_invoices i WHERE i.company_id = ns.company_id
), 1)
WHERE ns.entity_type = 'ap_invoice';

-- AR Receipts
UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT COUNT(*) + 1 FROM public.ar_receipts r WHERE r.company_id = ns.company_id
), 1)
WHERE ns.entity_type = 'receipt';

-- AP Payments
UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT COUNT(*) + 1 FROM public.ap_payments p WHERE p.company_id = ns.company_id
), 1)
WHERE ns.entity_type = 'payment';

-- Journal Entries
UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT COUNT(*) + 1 FROM public.journal_entries j WHERE j.company_id = ns.company_id
), 1)
WHERE ns.entity_type = 'journal';

COMMIT;

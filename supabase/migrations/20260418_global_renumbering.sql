-- ============================================================
-- Global Accounting Renumbering Engine
-- ============================================================
-- Resets ALL document numbers across the entire accounting section
-- to clean sequential numbering starting from 1.
-- Old numbers are permanently preserved in `legacy_number` for audit trail.
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Add legacy_number columns to preserve old numbers
-- ============================================================
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS legacy_number TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS legacy_number TEXT;
ALTER TABLE public.ar_invoices ADD COLUMN IF NOT EXISTS legacy_number TEXT;
ALTER TABLE public.ap_invoices ADD COLUMN IF NOT EXISTS legacy_number TEXT;
ALTER TABLE public.ar_receipts ADD COLUMN IF NOT EXISTS legacy_number TEXT;
ALTER TABLE public.ap_payments ADD COLUMN IF NOT EXISTS legacy_number TEXT;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS legacy_number TEXT;


-- ============================================================
-- STEP 2: Copy current numbers into legacy_number (only if not already saved)
-- ============================================================
UPDATE public.customers SET legacy_number = customer_code WHERE legacy_number IS NULL;
UPDATE public.vendors SET legacy_number = vendor_code WHERE legacy_number IS NULL;
UPDATE public.ar_invoices SET legacy_number = invoice_number WHERE legacy_number IS NULL;
UPDATE public.ap_invoices SET legacy_number = invoice_number WHERE legacy_number IS NULL;
UPDATE public.ar_receipts SET legacy_number = receipt_number WHERE legacy_number IS NULL;
UPDATE public.ap_payments SET legacy_number = payment_number WHERE legacy_number IS NULL;
UPDATE public.journal_entries SET legacy_number = entry_number WHERE legacy_number IS NULL;


-- ============================================================
-- STEP 3: Renumber ALL tables sequentially from 1
-- Use a global sequence (no partition) since constraints are globally unique
-- Appending a temporary '-TEMP' to avoid in-transit unique collisions
-- ============================================================

-- 3a. CUSTOMERS: CUST-YYYY-NNNN
UPDATE public.customers SET customer_code = customer_code || '-TEMP';
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS seq
  FROM public.customers
)
UPDATE public.customers c
SET customer_code = 'CUST-' || EXTRACT(YEAR FROM c.created_at)::TEXT || '-' || LPAD(n.seq::TEXT, 4, '0')
FROM numbered n WHERE c.id = n.id;

-- 3b. VENDORS: VND-YYYY-NNNN
UPDATE public.vendors SET vendor_code = vendor_code || '-TEMP';
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS seq
  FROM public.vendors
)
UPDATE public.vendors v
SET vendor_code = 'VND-' || EXTRACT(YEAR FROM v.created_at)::TEXT || '-' || LPAD(n.seq::TEXT, 4, '0')
FROM numbered n WHERE v.id = n.id;

-- 3c. AR INVOICES: INV-YYYY-NNNNN
UPDATE public.ar_invoices SET invoice_number = invoice_number || '-TEMP';
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS seq
  FROM public.ar_invoices
)
UPDATE public.ar_invoices i
SET invoice_number = 'INV-' || EXTRACT(YEAR FROM i.created_at)::TEXT || '-' || LPAD(n.seq::TEXT, 5, '0')
FROM numbered n WHERE i.id = n.id;

-- 3d. AP INVOICES: BILL-YYYY-NNNNN
UPDATE public.ap_invoices SET invoice_number = invoice_number || '-TEMP';
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS seq
  FROM public.ap_invoices
)
UPDATE public.ap_invoices i
SET invoice_number = 'BILL-' || EXTRACT(YEAR FROM i.created_at)::TEXT || '-' || LPAD(n.seq::TEXT, 5, '0')
FROM numbered n WHERE i.id = n.id;

-- 3e. AR RECEIPTS: RCP-YYYY-NNNNN
UPDATE public.ar_receipts SET receipt_number = receipt_number || '-TEMP';
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS seq
  FROM public.ar_receipts
)
UPDATE public.ar_receipts r
SET receipt_number = 'RCP-' || EXTRACT(YEAR FROM r.created_at)::TEXT || '-' || LPAD(n.seq::TEXT, 5, '0')
FROM numbered n WHERE r.id = n.id;

-- 3f. AP PAYMENTS: PAY-YYYY-NNNNN
UPDATE public.ap_payments SET payment_number = payment_number || '-TEMP';
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS seq
  FROM public.ap_payments
)
UPDATE public.ap_payments p
SET payment_number = 'PAY-' || EXTRACT(YEAR FROM p.created_at)::TEXT || '-' || LPAD(n.seq::TEXT, 5, '0')
FROM numbered n WHERE p.id = n.id;

-- 3g. JOURNAL ENTRIES: JV-YYYY-NNNNN
UPDATE public.journal_entries SET entry_number = entry_number || '-TEMP';
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS seq
  FROM public.journal_entries
)
UPDATE public.journal_entries j
SET entry_number = 'JV-' || EXTRACT(YEAR FROM j.created_at)::TEXT || '-' || LPAD(n.seq::TEXT, 5, '0')
FROM numbered n WHERE j.id = n.id;


-- ============================================================
-- STEP 4: Reset numbering_sequences.next_number to (count + 1)
-- So the next auto-generated number continues correctly
-- ============================================================

-- Customers
UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT COUNT(*) + 1 FROM public.customers
), 1)
WHERE ns.entity_type = 'customer';

-- Vendors
UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT COUNT(*) + 1 FROM public.vendors
), 1)
WHERE ns.entity_type = 'vendor';

-- AR Invoices
UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT COUNT(*) + 1 FROM public.ar_invoices
), 1)
WHERE ns.entity_type = 'ar_invoice';

-- AP Invoices
UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT COUNT(*) + 1 FROM public.ap_invoices
), 1)
WHERE ns.entity_type = 'ap_invoice';

-- AR Receipts
UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT COUNT(*) + 1 FROM public.ar_receipts
), 1)
WHERE ns.entity_type = 'receipt';

-- AP Payments
UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT COUNT(*) + 1 FROM public.ap_payments
), 1)
WHERE ns.entity_type = 'payment';

-- Journal Entries
UPDATE public.numbering_sequences ns
SET next_number = COALESCE((
  SELECT COUNT(*) + 1 FROM public.journal_entries
), 1)
WHERE ns.entity_type = 'journal';


COMMIT;

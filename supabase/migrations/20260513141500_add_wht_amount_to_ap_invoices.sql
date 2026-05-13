-- ============================================================
-- Migration: Add wht_amount column to ap_invoices
-- Purpose: The AP Invoice form captures WHT data but the column
--          was never added to the table, causing silent data loss.
--          This migration adds the column and backfills from
--          existing wht_certificate_details where possible.
-- ============================================================

-- 1. Add the column (nullable, default 0)
ALTER TABLE public.ap_invoices
  ADD COLUMN IF NOT EXISTS wht_amount DECIMAL(18,2) DEFAULT 0;

-- 2. Add wht_rate for tracking the applied rate per invoice
ALTER TABLE public.ap_invoices
  ADD COLUMN IF NOT EXISTS wht_rate DECIMAL(5,2) DEFAULT 0;

-- 3. Backfill from wht_certificate_details if any certificates exist
-- This links certificate amounts back to their source invoices
DO $$
BEGIN
  -- Only attempt if wht_certificate_details table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wht_certificate_details') THEN
    UPDATE public.ap_invoices inv
    SET wht_amount = cd.wht_amount
    FROM public.wht_certificate_details cd
    WHERE cd.ap_invoice_id = inv.id
      AND (inv.wht_amount IS NULL OR inv.wht_amount = 0)
      AND cd.wht_amount > 0;
    
    RAISE NOTICE 'Backfilled wht_amount from wht_certificate_details';
  END IF;
END $$;

-- 4. Also try to recalculate from invoices where paid_amount was set to wht_amount
-- at creation time (see mutation line: paid_amount: invoice.wht_amount || 0)
-- If paid_amount > 0 but status is 'unpaid', it means WHT was applied at creation
UPDATE public.ap_invoices
SET wht_amount = paid_amount
WHERE (wht_amount IS NULL OR wht_amount = 0)
  AND paid_amount > 0
  AND status = 'unpaid'
  AND balance = total_amount - paid_amount;


-- Done: wht_amount and wht_rate columns added to ap_invoices

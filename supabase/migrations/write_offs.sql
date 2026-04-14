-- ==========================================================
-- FEATURE 2: PAYMENT WRITE-OFFS & SHORT-PAY TOLERANCES
-- ==========================================================

-- 1. Add write_off_amount to Accounts Payable Allocations
ALTER TABLE ap_payment_allocations
ADD COLUMN IF NOT EXISTS write_off_amount numeric(15,2) DEFAULT 0;

-- 2. Add write_off_amount to Accounts Receivable Allocations
ALTER TABLE ar_receipt_allocations
ADD COLUMN IF NOT EXISTS write_off_amount numeric(15,2) DEFAULT 0;

-- Optional Comment for Audit Trail
COMMENT ON COLUMN ap_payment_allocations.write_off_amount IS 'Tracks the amount written off (e.g., bank charges, rounding) to close the invoice.';
COMMENT ON COLUMN ar_receipt_allocations.write_off_amount IS 'Tracks the amount written off (e.g., bank charges, rounding) to close the invoice.';

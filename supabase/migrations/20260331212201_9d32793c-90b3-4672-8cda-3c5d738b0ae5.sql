
-- Repair AR Invoice for order YTO-2026-0020 (L H W K C Yasantha)
-- The invoice has paid_amount=1,000,000 but operations shows total_paid=6,001,000
UPDATE ar_invoices
SET paid_amount = 6001000,
    balance = total_amount - 6001000,
    status = CASE WHEN total_amount - 6001000 <= 0 THEN 'paid' ELSE 'partial' END,
    updated_at = now()
WHERE id = '49406124-472a-47c6-93da-91304b1b559b'
  AND paid_amount = 1000000;

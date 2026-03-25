ALTER TABLE lightvehicle_customer_payments
  ADD COLUMN IF NOT EXISTS payment_slip_url TEXT;
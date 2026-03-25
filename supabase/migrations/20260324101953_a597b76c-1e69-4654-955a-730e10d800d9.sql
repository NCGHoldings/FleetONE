-- Add bank_account_id to all three vehicle payment tables
ALTER TABLE yutong_customer_payments
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id);

ALTER TABLE sinotruck_customer_payments
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id);

ALTER TABLE sinotruck_customer_payments
  ADD COLUMN IF NOT EXISTS payment_slip_url TEXT;

ALTER TABLE lightvehicle_customer_payments
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id);
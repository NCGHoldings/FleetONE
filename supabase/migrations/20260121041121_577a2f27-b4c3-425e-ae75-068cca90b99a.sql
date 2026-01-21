-- FIX PERIOD CLOSING CHECKLIST - Add missing category column
ALTER TABLE period_closing_checklist ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';

-- CREATE REMAINING TABLES

-- CURRENCIES
CREATE TABLE IF NOT EXISTS currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code VARCHAR(3) UNIQUE NOT NULL,
  currency_name TEXT NOT NULL,
  symbol VARCHAR(10),
  is_base_currency BOOLEAN DEFAULT false,
  decimal_places INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- EXCHANGE RATES
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(18,8) NOT NULL,
  effective_date DATE NOT NULL,
  source TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_currency, to_currency, effective_date)
);

-- CASHBOOK ENTRIES
CREATE TABLE IF NOT EXISTS cashbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number TEXT UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('receipt', 'payment')),
  cash_account_id UUID REFERENCES bank_accounts(id),
  amount DECIMAL(18,2) NOT NULL,
  party_type TEXT CHECK (party_type IN ('customer', 'vendor', 'employee', 'other')),
  party_id UUID,
  party_name TEXT,
  description TEXT NOT NULL,
  reference TEXT,
  account_id UUID REFERENCES chart_of_accounts(id),
  cost_center_id UUID REFERENCES cost_centers(id),
  journal_entry_id UUID REFERENCES journal_entries(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'void')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PAYMENT BATCHES
CREATE TABLE IF NOT EXISTS payment_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT UNIQUE NOT NULL,
  batch_date DATE NOT NULL,
  bank_account_id UUID REFERENCES bank_accounts(id) NOT NULL,
  payment_method TEXT NOT NULL,
  total_payments INTEGER DEFAULT 0,
  total_amount DECIMAL(18,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'processing', 'completed', 'cancelled')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES payment_batches(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES ap_payments(id),
  vendor_id UUID REFERENCES vendors(id),
  amount DECIMAL(18,2) NOT NULL,
  reference TEXT,
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- BATCH NUMBERS
CREATE TABLE IF NOT EXISTS batch_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) NOT NULL,
  batch_number TEXT NOT NULL,
  manufacture_date DATE,
  expiry_date DATE,
  quantity_received DECIMAL(18,4) NOT NULL,
  quantity_available DECIMAL(18,4) NOT NULL,
  quantity_reserved DECIMAL(18,4) DEFAULT 0,
  unit_cost DECIMAL(18,4),
  warehouse_id UUID,
  location_code TEXT,
  supplier_batch_ref TEXT,
  grn_id UUID REFERENCES goods_receipt_notes(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'quarantine', 'expired', 'consumed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, batch_number)
);

-- SERIAL NUMBERS
CREATE TABLE IF NOT EXISTS serial_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) NOT NULL,
  serial_number TEXT NOT NULL,
  batch_id UUID REFERENCES batch_numbers(id),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'in_repair', 'scrapped')),
  warehouse_id UUID,
  location_code TEXT,
  received_date DATE,
  grn_id UUID REFERENCES goods_receipt_notes(id),
  sold_date DATE,
  invoice_id UUID,
  warranty_start_date DATE,
  warranty_end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, serial_number)
);

-- WHT CERTIFICATES
CREATE TABLE IF NOT EXISTS wht_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number TEXT UNIQUE NOT NULL,
  certificate_date DATE NOT NULL,
  vendor_id UUID REFERENCES vendors(id) NOT NULL,
  financial_year TEXT NOT NULL,
  quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
  total_gross_amount DECIMAL(18,2) NOT NULL,
  total_wht_amount DECIMAL(18,2) NOT NULL,
  wht_rate DECIMAL(5,2) NOT NULL,
  wht_type TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'cancelled')),
  issued_date DATE,
  issued_by UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wht_certificate_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID REFERENCES wht_certificates(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES ap_payments(id),
  invoice_id UUID REFERENCES ap_invoices(id),
  payment_date DATE NOT NULL,
  gross_amount DECIMAL(18,2) NOT NULL,
  wht_amount DECIMAL(18,2) NOT NULL,
  net_amount DECIMAL(18,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ASSET DISPOSALS
CREATE TABLE IF NOT EXISTS asset_disposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES fixed_assets(id) NOT NULL,
  disposal_date DATE NOT NULL,
  disposal_type TEXT NOT NULL CHECK (disposal_type IN ('sale', 'scrap', 'donation', 'write_off', 'trade_in')),
  disposal_value DECIMAL(18,2) DEFAULT 0,
  accumulated_depreciation DECIMAL(18,2) NOT NULL,
  net_book_value DECIMAL(18,2) NOT NULL,
  gain_loss DECIMAL(18,2) NOT NULL,
  buyer_name TEXT,
  buyer_reference TEXT,
  reason TEXT,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  journal_entry_id UUID REFERENCES journal_entries(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- VENDOR PERFORMANCE
CREATE TABLE IF NOT EXISTS vendor_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_orders INTEGER DEFAULT 0,
  on_time_deliveries INTEGER DEFAULT 0,
  late_deliveries INTEGER DEFAULT 0,
  rejected_deliveries INTEGER DEFAULT 0,
  total_order_value DECIMAL(18,2) DEFAULT 0,
  quality_score DECIMAL(5,2),
  delivery_score DECIMAL(5,2),
  price_competitiveness_score DECIMAL(5,2),
  overall_score DECIMAL(5,2),
  notes TEXT,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vendor_id, period_start, period_end)
);

-- INVENTORY AGEING CONFIG
CREATE TABLE IF NOT EXISTS inventory_ageing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_name TEXT NOT NULL,
  min_days INTEGER NOT NULL,
  max_days INTEGER,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- COGS TRANSACTIONS
CREATE TABLE IF NOT EXISTS cogs_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL,
  item_id UUID REFERENCES items(id) NOT NULL,
  quantity DECIMAL(18,4) NOT NULL,
  unit_cost DECIMAL(18,4) NOT NULL,
  total_cost DECIMAL(18,2) NOT NULL,
  valuation_method TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('sale', 'adjustment', 'transfer', 'write_off')),
  source_id UUID,
  journal_entry_id UUID REFERENCES journal_entries(id),
  warehouse_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SEGMENTS
CREATE TABLE IF NOT EXISTS segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_code TEXT UNIQUE NOT NULL,
  segment_name TEXT NOT NULL,
  segment_type TEXT NOT NULL CHECK (segment_type IN ('business', 'geographic', 'product', 'customer')),
  parent_segment_id UUID REFERENCES segments(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SYSTEM NOTIFICATIONS
CREATE TABLE IF NOT EXISTS system_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success')),
  module TEXT,
  reference_type TEXT,
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- DATA ARCHIVE POLICIES
CREATE TABLE IF NOT EXISTS data_archive_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT UNIQUE NOT NULL,
  retention_days INTEGER NOT NULL,
  archive_after_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  last_archive_run TIMESTAMPTZ,
  archived_records_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- BANK RECONCILIATION ITEMS
CREATE TABLE IF NOT EXISTS bank_reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
  bank_transaction_id UUID REFERENCES bank_transactions(id),
  statement_date DATE,
  statement_reference TEXT,
  statement_description TEXT,
  statement_amount DECIMAL(18,2),
  match_status TEXT DEFAULT 'unmatched' CHECK (match_status IN ('matched', 'unmatched', 'partial', 'disputed')),
  matched_at TIMESTAMPTZ,
  matched_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- BANK STATEMENT IMPORTS
CREATE TABLE IF NOT EXISTS bank_statement_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID REFERENCES bank_accounts(id),
  file_name TEXT NOT NULL,
  import_date TIMESTAMPTZ DEFAULT now(),
  statement_start_date DATE,
  statement_end_date DATE,
  opening_balance DECIMAL(18,2),
  closing_balance DECIMAL(18,2),
  total_credits DECIMAL(18,2),
  total_debits DECIMAL(18,2),
  transaction_count INTEGER,
  matched_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  imported_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add segment_id to journal entry lines if it doesn't exist
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS segment_id UUID REFERENCES segments(id);

-- SEQUENCES AND TRIGGERS
CREATE SEQUENCE IF NOT EXISTS cashbook_entry_seq START 1;
CREATE OR REPLACE FUNCTION generate_cashbook_entry_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entry_number IS NULL THEN
    NEW.entry_number := 'CB-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('cashbook_entry_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_cashbook_entry_number ON cashbook_entries;
CREATE TRIGGER set_cashbook_entry_number
  BEFORE INSERT ON cashbook_entries
  FOR EACH ROW
  EXECUTE FUNCTION generate_cashbook_entry_number();

CREATE SEQUENCE IF NOT EXISTS wht_certificate_seq START 1;
CREATE OR REPLACE FUNCTION generate_wht_certificate_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.certificate_number IS NULL THEN
    NEW.certificate_number := 'WHT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('wht_certificate_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_wht_certificate_number ON wht_certificates;
CREATE TRIGGER set_wht_certificate_number
  BEFORE INSERT ON wht_certificates
  FOR EACH ROW
  EXECUTE FUNCTION generate_wht_certificate_number();

CREATE SEQUENCE IF NOT EXISTS payment_batch_seq START 1;
CREATE OR REPLACE FUNCTION generate_payment_batch_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.batch_number IS NULL THEN
    NEW.batch_number := 'PB-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('payment_batch_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_payment_batch_number ON payment_batches;
CREATE TRIGGER set_payment_batch_number
  BEFORE INSERT ON payment_batches
  FOR EACH ROW
  EXECUTE FUNCTION generate_payment_batch_number();

-- INSERT DEFAULT DATA
INSERT INTO currencies (currency_code, currency_name, symbol, is_base_currency, is_active) VALUES
('LKR', 'Sri Lankan Rupee', 'Rs.', true, true),
('USD', 'US Dollar', '$', false, true),
('EUR', 'Euro', '€', false, true),
('GBP', 'British Pound', '£', false, true),
('INR', 'Indian Rupee', '₹', false, true),
('AED', 'UAE Dirham', 'د.إ', false, true),
('SGD', 'Singapore Dollar', 'S$', false, true),
('AUD', 'Australian Dollar', 'A$', false, true)
ON CONFLICT (currency_code) DO NOTHING;

INSERT INTO exchange_rates (from_currency, to_currency, rate, effective_date, source) VALUES
('USD', 'LKR', 325.00, CURRENT_DATE, 'system'),
('EUR', 'LKR', 355.00, CURRENT_DATE, 'system'),
('GBP', 'LKR', 410.00, CURRENT_DATE, 'system'),
('INR', 'LKR', 3.90, CURRENT_DATE, 'system'),
('AED', 'LKR', 88.50, CURRENT_DATE, 'system'),
('SGD', 'LKR', 240.00, CURRENT_DATE, 'system'),
('AUD', 'LKR', 210.00, CURRENT_DATE, 'system')
ON CONFLICT (from_currency, to_currency, effective_date) DO NOTHING;

INSERT INTO inventory_ageing_config (bucket_name, min_days, max_days, display_order) VALUES
('Current (0-30 days)', 0, 30, 1),
('31-60 days', 31, 60, 2),
('61-90 days', 61, 90, 3),
('91-180 days', 91, 180, 4),
('181-365 days', 181, 365, 5),
('Over 1 year', 366, NULL, 6)
ON CONFLICT DO NOTHING;

-- ENABLE RLS ON ALL NEW TABLES
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_disposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE serial_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wht_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wht_certificate_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ageing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cogs_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_archive_policies ENABLE ROW LEVEL SECURITY;

-- CREATE RLS POLICIES
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'currencies' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON currencies FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exchange_rates' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON exchange_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bank_reconciliation_items' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON bank_reconciliation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bank_statement_imports' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON bank_statement_imports FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'asset_disposals' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON asset_disposals FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cashbook_entries' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON cashbook_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_batches' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON payment_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_batch_items' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON payment_batch_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'batch_numbers' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON batch_numbers FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'serial_numbers' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON serial_numbers FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wht_certificates' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON wht_certificates FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wht_certificate_details' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON wht_certificate_details FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_performance' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON vendor_performance FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_ageing_config' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON inventory_ageing_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cogs_transactions' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON cogs_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'segments' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON segments FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_notifications' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON system_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'data_archive_policies' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON data_archive_policies FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
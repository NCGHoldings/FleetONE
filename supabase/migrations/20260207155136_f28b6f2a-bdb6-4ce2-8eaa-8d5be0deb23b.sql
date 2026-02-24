-- =====================================================
-- Step 1: Fix existing stock_transfers table
-- =====================================================

ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS from_bin_id UUID;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS to_bin_id UUID;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS expected_arrival_date DATE;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS total_items INTEGER DEFAULT 0;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS total_value DECIMAL(15,2) DEFAULT 0;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS completed_by UUID;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add Stripe columns to payment_links
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT;
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS stripe_checkout_url TEXT;
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- Step 2: Create new tables
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_rule_id UUID,
  invoice_id UUID,
  invoice_type TEXT,
  customer_id UUID,
  vendor_id UUID,
  sent_to TEXT NOT NULL,
  channel TEXT DEFAULT 'email',
  email_subject TEXT,
  message_preview TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  company_id UUID REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS recurring_invoice_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_invoice_id UUID,
  generated_invoice_id UUID,
  customer_id UUID,
  invoice_number TEXT,
  amount DECIMAL(15,2),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'success',
  error_message TEXT,
  company_id UUID REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS custom_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL DEFAULT 'table',
  source_table TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  company_id UUID REFERENCES companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES custom_reports(id) ON DELETE CASCADE,
  report_name TEXT,
  schedule_type TEXT NOT NULL,
  schedule_day INTEGER,
  schedule_time TIME DEFAULT '08:00',
  recipients TEXT[] NOT NULL DEFAULT '{}',
  format TEXT DEFAULT 'pdf',
  include_charts BOOLEAN DEFAULT true,
  email_subject TEXT,
  email_body TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_error TEXT,
  company_id UUID REFERENCES companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bin_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  bin_code TEXT NOT NULL,
  bin_name TEXT,
  aisle TEXT,
  rack TEXT,
  level TEXT,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(warehouse_id, bin_code)
);

CREATE TABLE IF NOT EXISTS price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT DEFAULT 'LKR',
  price_type TEXT DEFAULT 'fixed',
  discount_percentage DECIMAL(5,2),
  is_default BOOLEAN DEFAULT false,
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID REFERENCES price_lists(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  price DECIMAL(15,2) NOT NULL,
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER,
  discount_percentage DECIMAL(5,2),
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(price_list_id, item_id, min_quantity)
);

CREATE TABLE IF NOT EXISTS customer_price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  price_list_id UUID REFERENCES price_lists(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, price_list_id)
);

CREATE TABLE IF NOT EXISTS composite_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  component_item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  quantity DECIMAL(15,4) NOT NULL DEFAULT 1,
  unit_cost DECIMAL(15,2),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_item_id, component_item_id)
);

CREATE TABLE IF NOT EXISTS stock_transfer_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID REFERENCES stock_transfers(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id),
  item_name TEXT,
  quantity DECIMAL(15,4) NOT NULL,
  received_quantity DECIMAL(15,4) DEFAULT 0,
  unit_cost DECIMAL(15,2),
  batch_number TEXT,
  serial_number TEXT,
  notes TEXT,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  contact_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, email)
);

CREATE TABLE IF NOT EXISTS vendor_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_access_id UUID REFERENCES vendor_portal_access(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_submitted_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id),
  vendor_name TEXT,
  purchase_order_id UUID REFERENCES purchase_orders(id),
  po_number TEXT,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  subtotal DECIMAL(15,2),
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  status TEXT DEFAULT 'pending',
  ap_invoice_id UUID REFERENCES ap_invoices(id),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  permissions TEXT[] DEFAULT '{}',
  rate_limit INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  request_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  ip_whitelist TEXT[],
  company_id UUID REFERENCES companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID
);

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT NOT NULL,
  headers JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  disabled_reason TEXT,
  company_id UUID REFERENCES companies(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_id TEXT,
  payload JSONB NOT NULL,
  request_headers JSONB,
  response_status INTEGER,
  response_body TEXT,
  response_headers JSONB,
  response_time_ms INTEGER,
  attempt_number INTEGER DEFAULT 1,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN,
  error_message TEXT,
  company_id UUID REFERENCES companies(id)
);
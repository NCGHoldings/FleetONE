-- ============================================================================
-- Vehicle Invoice Infrastructure Migration
-- Creates: RPC functions, storage buckets, and missing tables for
-- Yutong, Sinotruk, and Light Vehicle invoice modules
-- ============================================================================

-- ============================================================================
-- 1. INVOICE NUMBER GENERATION RPC FUNCTIONS
-- ============================================================================

-- Yutong Invoice Number Generator
CREATE OR REPLACE FUNCTION public.generate_yutong_invoice_no()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_seq integer;
  result text;
BEGIN
  -- Get the next sequence number based on existing invoices
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(invoice_no, '[^0-9]', '', 'g'), '') AS integer)
  ), 0) + 1
  INTO next_seq
  FROM yutong_invoice_records;
  
  result := 'NCGH-YT-' || LPAD(next_seq::text, 6, '0');
  RETURN result;
END;
$$;

-- Sinotruk Invoice Number Generator
CREATE OR REPLACE FUNCTION public.generate_sinotruck_invoice_no()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_seq integer;
  result text;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(invoice_no, '[^0-9]', '', 'g'), '') AS integer)
  ), 0) + 1
  INTO next_seq
  FROM sinotruck_invoice_records;
  
  result := 'NCGH-ST-' || LPAD(next_seq::text, 6, '0');
  RETURN result;
END;
$$;

-- Light Vehicle Invoice Number Generator
CREATE OR REPLACE FUNCTION public.generate_lightvehicle_invoice_no()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_seq integer;
  result text;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(invoice_number, '[^0-9]', '', 'g'), '') AS integer)
  ), 0) + 1
  INTO next_seq
  FROM lightvehicle_invoice_records;
  
  result := 'NCGH-LV-' || LPAD(next_seq::text, 6, '0');
  RETURN result;
END;
$$;


-- ============================================================================
-- 2. STORAGE BUCKETS
-- ============================================================================

-- Create storage buckets for each vehicle module (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('yutong-invoices', 'yutong-invoices', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('sinotruck-invoices', 'sinotruck-invoices', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('lightvehicle-invoices', 'lightvehicle-invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: Allow authenticated users to upload, read, update, delete
DO $$ BEGIN
  -- Yutong
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'yutong_invoices_select' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY yutong_invoices_select ON storage.objects FOR SELECT USING (bucket_id = 'yutong-invoices');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'yutong_invoices_insert' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY yutong_invoices_insert ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'yutong-invoices' AND auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'yutong_invoices_update' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY yutong_invoices_update ON storage.objects FOR UPDATE USING (bucket_id = 'yutong-invoices' AND auth.role() = 'authenticated');
  END IF;

  -- Sinotruk
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sinotruck_invoices_select' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY sinotruck_invoices_select ON storage.objects FOR SELECT USING (bucket_id = 'sinotruck-invoices');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sinotruck_invoices_insert' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY sinotruck_invoices_insert ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'sinotruck-invoices' AND auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sinotruck_invoices_update' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY sinotruck_invoices_update ON storage.objects FOR UPDATE USING (bucket_id = 'sinotruck-invoices' AND auth.role() = 'authenticated');
  END IF;

  -- Light Vehicle
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'lightvehicle_invoices_select' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY lightvehicle_invoices_select ON storage.objects FOR SELECT USING (bucket_id = 'lightvehicle-invoices');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'lightvehicle_invoices_insert' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY lightvehicle_invoices_insert ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lightvehicle-invoices' AND auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'lightvehicle_invoices_update' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY lightvehicle_invoices_update ON storage.objects FOR UPDATE USING (bucket_id = 'lightvehicle-invoices' AND auth.role() = 'authenticated');
  END IF;
END $$;


-- ============================================================================
-- 3. MISSING TABLES (IF NOT EXIST)
-- ============================================================================

-- Yutong Invoice Records
CREATE TABLE IF NOT EXISTS public.yutong_invoice_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_no text NOT NULL UNIQUE,
  order_id uuid NOT NULL,
  quotation_id uuid,
  invoice_date text,
  invoice_amount numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  invoice_type text,
  invoice_category text DEFAULT 'direct_invoice',
  proforma_amount_percentage numeric,
  proforma_amount numeric(15,2),
  finance_company_name text,
  finance_company_address text,
  proforma_purpose text,
  approved_by uuid,
  approved_at timestamptz,
  generated_by uuid,
  generated_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Yutong Invoice Documents
CREATE TABLE IF NOT EXISTS public.yutong_invoice_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_record_id uuid NOT NULL REFERENCES yutong_invoice_records(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text,
  file_size integer,
  document_status text DEFAULT 'draft',
  invoice_data jsonb,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Yutong Invoice Signatures
CREATE TABLE IF NOT EXISTS public.yutong_invoice_signatures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_record_id uuid NOT NULL REFERENCES yutong_invoice_records(id) ON DELETE CASCADE,
  signature_role text NOT NULL, -- prepared_by, approved_by, received_by
  signer_name text,
  signature_data text, -- base64 signature image
  signed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Sinotruk Invoice Records
CREATE TABLE IF NOT EXISTS public.sinotruck_invoice_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_no text NOT NULL UNIQUE,
  order_id uuid NOT NULL,
  quotation_id uuid,
  invoice_date text,
  invoice_amount numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  invoice_type text,
  invoice_category text DEFAULT 'direct_invoice',
  proforma_amount_percentage numeric,
  proforma_amount numeric(15,2),
  finance_company_name text,
  finance_company_address text,
  proforma_purpose text,
  approved_by uuid,
  approved_at timestamptz,
  generated_by uuid,
  generated_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sinotruk Invoice Documents
CREATE TABLE IF NOT EXISTS public.sinotruck_invoice_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_record_id uuid NOT NULL REFERENCES sinotruck_invoice_records(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text,
  file_size integer,
  document_status text DEFAULT 'draft',
  invoice_data jsonb,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sinotruk Invoice Signatures
CREATE TABLE IF NOT EXISTS public.sinotruck_invoice_signatures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_record_id uuid NOT NULL REFERENCES sinotruck_invoice_records(id) ON DELETE CASCADE,
  signature_role text NOT NULL,
  signer_name text,
  signature_data text,
  signed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Light Vehicle Invoice Records
CREATE TABLE IF NOT EXISTS public.lightvehicle_invoice_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text NOT NULL UNIQUE,
  order_id uuid NOT NULL,
  quotation_id uuid,
  generated_at timestamptz DEFAULT now(),
  amount numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  invoice_category text DEFAULT 'direct_invoice',
  proforma_amount_percentage numeric,
  proforma_amount numeric(15,2),
  finance_company_name text,
  finance_company_address text,
  proforma_purpose text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Light Vehicle Invoice Documents
CREATE TABLE IF NOT EXISTS public.lightvehicle_invoice_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_record_id uuid NOT NULL REFERENCES lightvehicle_invoice_records(id) ON DELETE CASCADE,
  document_type text DEFAULT 'invoice',
  file_name text NOT NULL,
  file_path text,
  file_size integer,
  document_status text DEFAULT 'draft',
  document_data text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Light Vehicle Invoice Signatures
CREATE TABLE IF NOT EXISTS public.lightvehicle_invoice_signatures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_record_id uuid NOT NULL REFERENCES lightvehicle_invoice_records(id) ON DELETE CASCADE,
  signature_role text NOT NULL,
  signer_name text,
  signature_data text,
  signed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);


-- ============================================================================
-- 4. FINANCE SETTINGS TABLES
-- ============================================================================

-- Sinotruk Finance Settings
CREATE TABLE IF NOT EXISTS public.sinotruck_finance_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  sales_revenue_account_id uuid,
  spare_parts_revenue_account_id uuid,
  trade_receivable_account_id uuid,
  customer_advance_account_id uuid,
  default_bank_account_id uuid,
  lc_bank_account_id uuid,
  discount_expense_account_id uuid,
  commission_expense_account_id uuid,
  vat_output_account_id uuid,
  wht_payable_account_id uuid,
  auto_post_on_verify boolean DEFAULT true,
  auto_create_customer boolean DEFAULT true,
  invoice_prefix text DEFAULT 'SNT-INV',
  receipt_prefix text DEFAULT 'SNT-RCP',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id)
);

-- Light Vehicle Finance Settings
CREATE TABLE IF NOT EXISTS public.lightvehicle_finance_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  sales_revenue_account_id uuid,
  spare_parts_revenue_account_id uuid,
  trade_receivable_account_id uuid,
  customer_advance_account_id uuid,
  default_bank_account_id uuid,
  lc_bank_account_id uuid,
  discount_expense_account_id uuid,
  commission_expense_account_id uuid,
  vat_output_account_id uuid,
  wht_payable_account_id uuid,
  auto_post_on_verify boolean DEFAULT true,
  auto_create_customer boolean DEFAULT true,
  invoice_prefix text DEFAULT 'LTV-INV',
  receipt_prefix text DEFAULT 'LTV-RCP',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id)
);


-- ============================================================================
-- 5. ENABLE RLS ON ALL NEW TABLES
-- ============================================================================

ALTER TABLE IF EXISTS public.yutong_invoice_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.yutong_invoice_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.yutong_invoice_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sinotruck_invoice_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sinotruck_invoice_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sinotruck_invoice_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lightvehicle_invoice_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lightvehicle_invoice_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lightvehicle_invoice_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sinotruck_finance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lightvehicle_finance_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow authenticated users full access
DO $$ 
DECLARE
  tbl text;
  pol_name text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'yutong_invoice_records', 'yutong_invoice_documents', 'yutong_invoice_signatures',
    'sinotruck_invoice_records', 'sinotruck_invoice_documents', 'sinotruck_invoice_signatures',
    'lightvehicle_invoice_records', 'lightvehicle_invoice_documents', 'lightvehicle_invoice_signatures',
    'sinotruck_finance_settings', 'lightvehicle_finance_settings'
  ])
  LOOP
    pol_name := tbl || '_auth_all';
    -- Drop policy if it already exists, then create
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol_name, tbl);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    EXECUTE format('
      CREATE POLICY %I ON public.%I 
      FOR ALL USING (auth.role() = ''authenticated'') 
      WITH CHECK (auth.role() = ''authenticated'')', pol_name, tbl);
  END LOOP;
END $$;

-- Done!
SELECT 'Vehicle Invoice Infrastructure Migration Complete' AS status;

-- Sinotruck Invoice System Tables
-- Migration for invoice records, documents, signatures, and cash receipts

-- =====================================================
-- 1. Invoice Records Table
-- =====================================================
CREATE TABLE public.sinotruck_invoice_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_no TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.sinotruck_orders(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES public.sinotruck_quotations(id) ON DELETE SET NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_amount NUMERIC(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'cancelled')),
  invoice_type TEXT DEFAULT 'invoice',
  -- Invoice category for direct vs proforma
  invoice_category TEXT DEFAULT 'direct_invoice' CHECK (invoice_category IN ('direct_invoice', 'proforma_invoice')),
  -- Proforma invoice specific fields
  proforma_amount_percentage NUMERIC(5,2),
  proforma_amount NUMERIC(15,2),
  finance_company_name TEXT,
  finance_company_address TEXT,
  proforma_purpose TEXT,
  -- Approval tracking
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2. Invoice Documents Table
-- =====================================================
CREATE TABLE public.sinotruck_invoice_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_record_id UUID NOT NULL REFERENCES public.sinotruck_invoice_records(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  document_status TEXT NOT NULL DEFAULT 'draft' CHECK (document_status IN ('draft', 'approved', 'archived')),
  invoice_data JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 3. Invoice Signatures Table
-- =====================================================
CREATE TABLE public.sinotruck_invoice_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_record_id UUID NOT NULL REFERENCES public.sinotruck_invoice_records(id) ON DELETE CASCADE,
  signature_role TEXT NOT NULL CHECK (signature_role IN ('prepared_by', 'approved_by', 'received_by')),
  signer_name TEXT NOT NULL,
  signature_data TEXT NOT NULL,
  signature_type TEXT NOT NULL DEFAULT 'drawing' CHECK (signature_type IN ('drawing', 'text', 'image')),
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(invoice_record_id, signature_role)
);

-- =====================================================
-- 4. Cash Receipts Table
-- =====================================================
CREATE TABLE public.sinotruck_cash_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.sinotruck_orders(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.sinotruck_customer_payments(id) ON DELETE CASCADE,
  receipt_no TEXT NOT NULL UNIQUE,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15,2) NOT NULL,
  amount_in_words TEXT,
  payment_method TEXT,
  product_description TEXT,
  quotation_no TEXT,
  customer_name TEXT,
  customer_address TEXT,
  customer_contact TEXT,
  -- Customer signature
  customer_signature_data TEXT,
  customer_signature_type TEXT CHECK (customer_signature_type IN ('drawing', 'text', 'image')),
  customer_signed_at TIMESTAMPTZ,
  customer_signer_name TEXT,
  -- Finance signature
  finance_signature_data TEXT,
  finance_signature_type TEXT CHECK (finance_signature_type IN ('drawing', 'text', 'image')),
  finance_signed_at TIMESTAMPTZ,
  finance_signer_name TEXT,
  -- PDF and status
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'signed', 'completed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 5. Sequence for Invoice Numbers
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS sinotruck_invoice_seq START WITH 1001;

-- =====================================================
-- 6. Function to Generate Invoice Numbers
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_sinotruck_invoice_no()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_val INTEGER;
  invoice_no TEXT;
BEGIN
  next_val := nextval('sinotruck_invoice_seq');
  invoice_no := 'SNT-INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(next_val::TEXT, 4, '0');
  RETURN invoice_no;
END;
$$;

-- =====================================================
-- 7. Sequence for Receipt Numbers
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS sinotruck_receipt_seq START WITH 1001;

-- =====================================================
-- 8. Function to Generate Receipt Numbers
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_sinotruck_receipt_no()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_val INTEGER;
  receipt_no TEXT;
BEGIN
  next_val := nextval('sinotruck_receipt_seq');
  receipt_no := 'SNT-RCP-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(next_val::TEXT, 4, '0');
  RETURN receipt_no;
END;
$$;

-- =====================================================
-- 9. Enable RLS on all tables
-- =====================================================
ALTER TABLE public.sinotruck_invoice_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sinotruck_invoice_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sinotruck_invoice_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sinotruck_cash_receipts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 10. RLS Policies
-- =====================================================

-- Invoice Records Policies
CREATE POLICY "Authenticated users can view sinotruck invoice records"
ON public.sinotruck_invoice_records FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert sinotruck invoice records"
ON public.sinotruck_invoice_records FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update sinotruck invoice records"
ON public.sinotruck_invoice_records FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete sinotruck invoice records"
ON public.sinotruck_invoice_records FOR DELETE
TO authenticated
USING (true);

-- Invoice Documents Policies
CREATE POLICY "Authenticated users can view sinotruck invoice documents"
ON public.sinotruck_invoice_documents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert sinotruck invoice documents"
ON public.sinotruck_invoice_documents FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update sinotruck invoice documents"
ON public.sinotruck_invoice_documents FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete sinotruck invoice documents"
ON public.sinotruck_invoice_documents FOR DELETE
TO authenticated
USING (true);

-- Invoice Signatures Policies
CREATE POLICY "Authenticated users can view sinotruck invoice signatures"
ON public.sinotruck_invoice_signatures FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert sinotruck invoice signatures"
ON public.sinotruck_invoice_signatures FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update sinotruck invoice signatures"
ON public.sinotruck_invoice_signatures FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete sinotruck invoice signatures"
ON public.sinotruck_invoice_signatures FOR DELETE
TO authenticated
USING (true);

-- Cash Receipts Policies
CREATE POLICY "Authenticated users can view sinotruck cash receipts"
ON public.sinotruck_cash_receipts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert sinotruck cash receipts"
ON public.sinotruck_cash_receipts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update sinotruck cash receipts"
ON public.sinotruck_cash_receipts FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete sinotruck cash receipts"
ON public.sinotruck_cash_receipts FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- 11. Performance Indexes
-- =====================================================
CREATE INDEX idx_sinotruck_invoice_records_order_id ON public.sinotruck_invoice_records(order_id);
CREATE INDEX idx_sinotruck_invoice_records_quotation_id ON public.sinotruck_invoice_records(quotation_id);
CREATE INDEX idx_sinotruck_invoice_records_status ON public.sinotruck_invoice_records(status);
CREATE INDEX idx_sinotruck_invoice_documents_record_id ON public.sinotruck_invoice_documents(invoice_record_id);
CREATE INDEX idx_sinotruck_invoice_signatures_record_id ON public.sinotruck_invoice_signatures(invoice_record_id);
CREATE INDEX idx_sinotruck_cash_receipts_order_id ON public.sinotruck_cash_receipts(order_id);
CREATE INDEX idx_sinotruck_cash_receipts_payment_id ON public.sinotruck_cash_receipts(payment_id);

-- =====================================================
-- 12. Triggers for updated_at
-- =====================================================
CREATE OR REPLACE TRIGGER update_sinotruck_invoice_records_updated_at
  BEFORE UPDATE ON public.sinotruck_invoice_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_sinotruck_invoice_documents_updated_at
  BEFORE UPDATE ON public.sinotruck_invoice_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_sinotruck_cash_receipts_updated_at
  BEFORE UPDATE ON public.sinotruck_cash_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 13. Create Storage Bucket for Sinotruck Invoices
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('sinotruck-invoices', 'sinotruck-invoices', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for sinotruck-invoices bucket
CREATE POLICY "Public can view sinotruck invoices"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'sinotruck-invoices');

CREATE POLICY "Authenticated users can upload sinotruck invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sinotruck-invoices');

CREATE POLICY "Authenticated users can update sinotruck invoices"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'sinotruck-invoices');

CREATE POLICY "Authenticated users can delete sinotruck invoices"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'sinotruck-invoices');
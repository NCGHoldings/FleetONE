-- =============================================
-- Light Vehicle Invoice System Enhancement
-- =============================================

-- 1. Create Cash Receipts Table
CREATE TABLE IF NOT EXISTS public.lightvehicle_cash_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.lightvehicle_orders(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.lightvehicle_customer_payments(id) ON DELETE SET NULL,
    receipt_no TEXT NOT NULL UNIQUE,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15,2) NOT NULL,
    amount_in_words TEXT,
    payment_method TEXT,
    product_description TEXT,
    quotation_no TEXT,
    customer_name TEXT,
    customer_address TEXT,
    customer_contact TEXT,
    customer_signature_data TEXT,
    customer_signature_type TEXT,
    customer_signed_at TIMESTAMP WITH TIME ZONE,
    customer_signer_name TEXT,
    finance_signature_data TEXT,
    finance_signature_type TEXT,
    finance_signed_at TIMESTAMP WITH TIME ZONE,
    finance_signer_name TEXT,
    pdf_url TEXT,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Add missing columns to lightvehicle_invoice_records
ALTER TABLE public.lightvehicle_invoice_records 
ADD COLUMN IF NOT EXISTS invoice_category TEXT DEFAULT 'direct_invoice',
ADD COLUMN IF NOT EXISTS proforma_amount_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS proforma_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS finance_company_name TEXT,
ADD COLUMN IF NOT EXISTS finance_company_address TEXT,
ADD COLUMN IF NOT EXISTS proforma_purpose TEXT,
ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES public.lightvehicle_quotations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- 3. Add missing columns to lightvehicle_invoice_documents
ALTER TABLE public.lightvehicle_invoice_documents
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS document_status TEXT DEFAULT 'draft';

-- 4. Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS lightvehicle_invoice_no_seq START 1;

-- 5. Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_lightvehicle_invoice_no()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_no TEXT;
    year_prefix TEXT;
BEGIN
    year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
    new_no := 'LTV-INV-' || year_prefix || '-' || LPAD(nextval('lightvehicle_invoice_no_seq')::TEXT, 5, '0');
    RETURN new_no;
END;
$$;

-- 6. Create sequence for receipt numbers
CREATE SEQUENCE IF NOT EXISTS lightvehicle_receipt_no_seq START 1;

-- 7. Create function to generate receipt numbers
CREATE OR REPLACE FUNCTION public.generate_lightvehicle_receipt_no()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_no TEXT;
    year_prefix TEXT;
BEGIN
    year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
    new_no := 'LTV-RCT-' || year_prefix || '-' || LPAD(nextval('lightvehicle_receipt_no_seq')::TEXT, 5, '0');
    RETURN new_no;
END;
$$;

-- 8. Enable RLS on cash receipts
ALTER TABLE public.lightvehicle_cash_receipts ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for cash receipts
CREATE POLICY "Users can view all light vehicle cash receipts"
ON public.lightvehicle_cash_receipts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert light vehicle cash receipts"
ON public.lightvehicle_cash_receipts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update light vehicle cash receipts"
ON public.lightvehicle_cash_receipts FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can delete light vehicle cash receipts"
ON public.lightvehicle_cash_receipts FOR DELETE
TO authenticated
USING (true);

-- 10. Create storage bucket for light vehicle invoices
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'lightvehicle-invoices',
    'lightvehicle-invoices',
    true,
    52428800,
    ARRAY['application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- 11. Create storage policies for the bucket
CREATE POLICY "Allow authenticated users to upload light vehicle invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lightvehicle-invoices');

CREATE POLICY "Allow authenticated users to read light vehicle invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'lightvehicle-invoices');

CREATE POLICY "Allow authenticated users to update light vehicle invoices"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lightvehicle-invoices')
WITH CHECK (bucket_id = 'lightvehicle-invoices');

CREATE POLICY "Allow authenticated users to delete light vehicle invoices"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lightvehicle-invoices');

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lightvehicle_cash_receipts_order_id ON public.lightvehicle_cash_receipts(order_id);
CREATE INDEX IF NOT EXISTS idx_lightvehicle_cash_receipts_payment_id ON public.lightvehicle_cash_receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_lightvehicle_cash_receipts_receipt_no ON public.lightvehicle_cash_receipts(receipt_no);
CREATE INDEX IF NOT EXISTS idx_lightvehicle_invoice_records_quotation_id ON public.lightvehicle_invoice_records(quotation_id);
CREATE INDEX IF NOT EXISTS idx_lightvehicle_invoice_records_invoice_category ON public.lightvehicle_invoice_records(invoice_category);

-- 13. Create trigger for updated_at on cash receipts
CREATE OR REPLACE FUNCTION public.update_lightvehicle_cash_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lightvehicle_cash_receipts_updated_at
    BEFORE UPDATE ON public.lightvehicle_cash_receipts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_lightvehicle_cash_receipts_updated_at();
-- Create yutong-invoices storage bucket for invoice PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('yutong-invoices', 'yutong-invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Add storage RLS policies for yutong-invoices bucket
CREATE POLICY "yutong_invoices_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'yutong-invoices' AND auth.role() = 'authenticated');

CREATE POLICY "yutong_invoices_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'yutong-invoices' AND auth.role() = 'authenticated');

CREATE POLICY "yutong_invoices_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'yutong-invoices' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'yutong-invoices' AND auth.role() = 'authenticated');

CREATE POLICY "yutong_invoices_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'yutong-invoices' AND auth.role() = 'authenticated');

-- Add proforma invoice columns to yutong_invoice_records
ALTER TABLE yutong_invoice_records
  ADD COLUMN IF NOT EXISTS invoice_category TEXT DEFAULT 'direct_invoice' CHECK (invoice_category IN ('direct_invoice', 'proforma_invoice')),
  ADD COLUMN IF NOT EXISTS proforma_amount_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS proforma_amount NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS finance_company_name TEXT,
  ADD COLUMN IF NOT EXISTS finance_company_address TEXT,
  ADD COLUMN IF NOT EXISTS proforma_purpose TEXT;
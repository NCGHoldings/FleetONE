-- Complete the missing parts - storage bucket and policies
-- Create storage bucket for document headers/logos (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'document-headers',
  'document-headers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Drop and recreate storage policies (in case they exist partially)
DROP POLICY IF EXISTS "Finance users can upload document headers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view document headers" ON storage.objects;
DROP POLICY IF EXISTS "Finance users can update document headers" ON storage.objects;
DROP POLICY IF EXISTS "Finance users can delete document headers" ON storage.objects;

-- Storage policies for document-headers bucket
CREATE POLICY "Finance users can upload document headers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'document-headers' AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('finance', 'admin', 'super_admin')
  )
);

CREATE POLICY "Anyone can view document headers"
ON storage.objects FOR SELECT
USING (bucket_id = 'document-headers');

CREATE POLICY "Finance users can update document headers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'document-headers' AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('finance', 'admin', 'super_admin')
  )
);

CREATE POLICY "Finance users can delete document headers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'document-headers' AND
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('finance', 'admin', 'super_admin')
  )
);

-- Create or replace update trigger for document_templates
DROP TRIGGER IF EXISTS document_templates_update_trigger ON document_templates;

CREATE OR REPLACE FUNCTION update_document_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_templates_update_trigger
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_document_template_timestamp();

-- Seed template types if not exist
INSERT INTO document_template_types (type_code, type_name, module, description, available_placeholders, display_order) VALUES
  ('ar_invoice', 'AR Invoice / Sales Invoice', 'ar', 'Customer invoices for sales and services', 
   '["{{invoice_number}}", "{{invoice_date}}", "{{due_date}}", "{{customer_name}}", "{{customer_code}}", "{{customer_address}}", "{{customer_phone}}", "{{customer_email}}", "{{line_items}}", "{{subtotal}}", "{{tax_amount}}", "{{discount_amount}}", "{{total_amount}}", "{{balance}}", "{{notes}}", "{{prepared_by}}", "{{company_name}}", "{{company_address}}", "{{company_phone}}", "{{company_email}}", "{{company_logo}}"]'::jsonb, 1),
  ('ar_receipt', 'AR Receipt / Sales Receipt', 'ar', 'Receipt for customer payments received',
   '["{{receipt_number}}", "{{receipt_date}}", "{{customer_name}}", "{{customer_code}}", "{{payment_method}}", "{{cheque_number}}", "{{bank_name}}", "{{amount}}", "{{amount_words}}", "{{reference}}", "{{notes}}", "{{prepared_by}}", "{{company_name}}", "{{company_logo}}"]'::jsonb, 2),
  ('ar_credit_note', 'AR Credit Note', 'ar', 'Credit notes issued to customers',
   '["{{credit_note_number}}", "{{credit_date}}", "{{customer_name}}", "{{original_invoice_number}}", "{{amount}}", "{{reason}}", "{{notes}}", "{{prepared_by}}", "{{company_name}}", "{{company_logo}}"]'::jsonb, 3),
  ('ap_invoice', 'AP Invoice / Purchase Invoice', 'ap', 'Vendor invoices for purchases and services',
   '["{{invoice_number}}", "{{invoice_date}}", "{{due_date}}", "{{vendor_name}}", "{{vendor_code}}", "{{vendor_address}}", "{{line_items}}", "{{subtotal}}", "{{tax_amount}}", "{{wht_amount}}", "{{total_amount}}", "{{balance}}", "{{notes}}", "{{approved_by}}", "{{company_name}}", "{{company_logo}}"]'::jsonb, 4),
  ('ap_payment_voucher', 'AP Payment Voucher', 'ap', 'Payment vouchers for vendor payments',
   '["{{voucher_number}}", "{{payment_date}}", "{{vendor_name}}", "{{vendor_code}}", "{{payment_method}}", "{{cheque_number}}", "{{cheque_date}}", "{{bank_name}}", "{{bank_account}}", "{{amount}}", "{{amount_words}}", "{{wht_amount}}", "{{net_amount}}", "{{invoice_references}}", "{{description}}", "{{prepared_by}}", "{{approved_by}}", "{{company_name}}", "{{company_logo}}"]'::jsonb, 5),
  ('ap_debit_note', 'AP Debit Note', 'ap', 'Debit notes issued to vendors',
   '["{{debit_note_number}}", "{{debit_date}}", "{{vendor_name}}", "{{original_invoice_number}}", "{{amount}}", "{{reason}}", "{{notes}}", "{{prepared_by}}", "{{company_name}}", "{{company_logo}}"]'::jsonb, 6),
  ('advance_receipt', 'Advance Payment Receipt', 'ar', 'Receipt for advance payments from customers',
   '["{{receipt_number}}", "{{receipt_date}}", "{{customer_name}}", "{{amount}}", "{{amount_words}}", "{{purpose}}", "{{reference}}", "{{notes}}", "{{prepared_by}}", "{{company_name}}", "{{company_logo}}"]'::jsonb, 7),
  ('advance_payment', 'Advance Payment Voucher', 'ap', 'Voucher for advance payments to vendors',
   '["{{voucher_number}}", "{{payment_date}}", "{{vendor_name}}", "{{amount}}", "{{amount_words}}", "{{purpose}}", "{{reference}}", "{{notes}}", "{{prepared_by}}", "{{approved_by}}", "{{company_name}}", "{{company_logo}}"]'::jsonb, 8),
  ('journal_voucher', 'General Journal Voucher', 'gl', 'General journal entry vouchers',
   '["{{voucher_number}}", "{{entry_date}}", "{{description}}", "{{journal_lines}}", "{{total_debit}}", "{{total_credit}}", "{{narration}}", "{{prepared_by}}", "{{approved_by}}", "{{company_name}}", "{{company_logo}}"]'::jsonb, 9),
  ('cheque_voucher', 'Cheque Payment Voucher', 'banking', 'Cheque payment documentation',
   '["{{voucher_number}}", "{{cheque_number}}", "{{cheque_date}}", "{{payee_name}}", "{{bank_name}}", "{{bank_account}}", "{{amount}}", "{{amount_words}}", "{{description}}", "{{prepared_by}}", "{{approved_by}}", "{{company_name}}", "{{company_logo}}"]'::jsonb, 10),
  ('wht_certificate', 'WHT Certificate', 'tax', 'Withholding tax certificate for vendors',
   '["{{certificate_number}}", "{{certificate_date}}", "{{vendor_name}}", "{{vendor_tin}}", "{{vendor_address}}", "{{gross_amount}}", "{{wht_rate}}", "{{wht_amount}}", "{{net_amount}}", "{{financial_year}}", "{{quarter}}", "{{prepared_by}}", "{{company_name}}", "{{company_tin}}", "{{company_logo}}"]'::jsonb, 11),
  ('grn', 'Goods Receipt Note', 'inventory', 'Goods receipt documentation',
   '["{{grn_number}}", "{{receipt_date}}", "{{vendor_name}}", "{{po_number}}", "{{line_items}}", "{{total_quantity}}", "{{warehouse}}", "{{received_by}}", "{{notes}}", "{{company_name}}", "{{company_logo}}"]'::jsonb, 12)
ON CONFLICT (type_code) DO UPDATE SET
  type_name = EXCLUDED.type_name,
  module = EXCLUDED.module,
  description = EXCLUDED.description,
  available_placeholders = EXCLUDED.available_placeholders,
  display_order = EXCLUDED.display_order;
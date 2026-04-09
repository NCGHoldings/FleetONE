
-- Use a safe function to extract trailing digits and cast to integer
CREATE OR REPLACE FUNCTION pg_temp.safe_trailing_int(val text) RETURNS integer AS $$
BEGIN
  RETURN CAST(substring(val from '(\d+)$') AS integer);
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- customers: CUST-YYYY-NNNN
UPDATE numbering_sequences SET next_number = GREATEST(next_number, COALESCE((
  SELECT MAX(pg_temp.safe_trailing_int(customer_code)) + 1
  FROM customers WHERE customer_code LIKE 'CUST-%'
), next_number)), updated_at = now()
WHERE entity_type = 'customer' AND is_active = true;

-- vendors: VND-YYYY-NNNN
UPDATE numbering_sequences SET next_number = GREATEST(next_number, COALESCE((
  SELECT MAX(pg_temp.safe_trailing_int(vendor_code)) + 1
  FROM vendors WHERE vendor_code LIKE 'VND-%'
), next_number)), updated_at = now()
WHERE entity_type = 'vendor' AND is_active = true;

-- ar_invoices: INV-YYYY-NNNNN
UPDATE numbering_sequences SET next_number = GREATEST(next_number, COALESCE((
  SELECT MAX(pg_temp.safe_trailing_int(invoice_number)) + 1
  FROM ar_invoices WHERE invoice_number LIKE 'INV-%'
), next_number)), updated_at = now()
WHERE entity_type = 'ar_invoice' AND is_active = true;

-- ap_invoices: BILL-YYYY-NNNNN
UPDATE numbering_sequences SET next_number = GREATEST(next_number, COALESCE((
  SELECT MAX(pg_temp.safe_trailing_int(invoice_number)) + 1
  FROM ap_invoices WHERE invoice_number LIKE 'BILL-%'
), next_number)), updated_at = now()
WHERE entity_type = 'ap_invoice' AND is_active = true;

-- journal: JV-YYYY-NNNNN
UPDATE numbering_sequences SET next_number = GREATEST(next_number, COALESCE((
  SELECT MAX(pg_temp.safe_trailing_int(entry_number)) + 1
  FROM journal_entries WHERE entry_number LIKE 'JV-%'
), next_number)), updated_at = now()
WHERE entity_type = 'journal' AND is_active = true;

-- payment: PAY-YYYY-NNNNN
UPDATE numbering_sequences SET next_number = GREATEST(next_number, COALESCE((
  SELECT MAX(pg_temp.safe_trailing_int(payment_number)) + 1
  FROM ap_payments WHERE payment_number LIKE 'PAY-%'
), next_number)), updated_at = now()
WHERE entity_type = 'payment' AND is_active = true;

-- receipt: RCP-YYYY-NNNNN
UPDATE numbering_sequences SET next_number = GREATEST(next_number, COALESCE((
  SELECT MAX(pg_temp.safe_trailing_int(receipt_number)) + 1
  FROM ar_receipts WHERE receipt_number LIKE 'RCP-%'
), next_number)), updated_at = now()
WHERE entity_type = 'receipt' AND is_active = true;

-- item: ITM-YYYY-NNNNN
UPDATE numbering_sequences SET next_number = GREATEST(next_number, COALESCE((
  SELECT MAX(pg_temp.safe_trailing_int(item_code)) + 1
  FROM items WHERE item_code LIKE 'ITM-%'
), next_number)), updated_at = now()
WHERE entity_type = 'item' AND is_active = true;

-- credit_note: CN-YYYY-NNNNN
UPDATE numbering_sequences SET next_number = GREATEST(next_number, COALESCE((
  SELECT MAX(pg_temp.safe_trailing_int(credit_note_number)) + 1
  FROM ar_credit_notes WHERE credit_note_number LIKE 'CN-%'
), next_number)), updated_at = now()
WHERE entity_type = 'credit_note' AND is_active = true;

-- debit_note: DN-YYYY-NNNNN
UPDATE numbering_sequences SET next_number = GREATEST(next_number, COALESCE((
  SELECT MAX(pg_temp.safe_trailing_int(debit_note_number)) + 1
  FROM ap_debit_notes WHERE debit_note_number LIKE 'DN-%'
), next_number)), updated_at = now()
WHERE entity_type = 'debit_note' AND is_active = true;

-- po: PO-YYYY-NNNNN
UPDATE numbering_sequences SET next_number = GREATEST(next_number, COALESCE((
  SELECT MAX(pg_temp.safe_trailing_int(po_number)) + 1
  FROM purchase_orders WHERE po_number LIKE 'PO-%'
), next_number)), updated_at = now()
WHERE entity_type = 'po' AND is_active = true;

-- so: SO-YYYY-NNNNN
UPDATE numbering_sequences SET next_number = GREATEST(next_number, COALESCE((
  SELECT MAX(pg_temp.safe_trailing_int(so_number)) + 1
  FROM sales_orders WHERE so_number LIKE 'SO-%'
), next_number)), updated_at = now()
WHERE entity_type = 'so' AND is_active = true;

-- grn: GRN-YYYY-NNNNN
UPDATE numbering_sequences SET next_number = GREATEST(next_number, COALESCE((
  SELECT MAX(pg_temp.safe_trailing_int(grn_number)) + 1
  FROM goods_receipt_notes WHERE grn_number LIKE 'GRN-%'
), next_number)), updated_at = now()
WHERE entity_type = 'grn' AND is_active = true;

-- rfq: RFQ-YYYY-NNNNN
UPDATE numbering_sequences SET next_number = GREATEST(next_number, COALESCE((
  SELECT MAX(pg_temp.safe_trailing_int(rfq_number)) + 1
  FROM request_for_quotations WHERE rfq_number LIKE 'RFQ-%'
), next_number)), updated_at = now()
WHERE entity_type = 'rfq' AND is_active = true;

-- Add 4 new banking numbering sequences
INSERT INTO numbering_sequences (company_id, entity_type, prefix, include_year, include_month, separator, padding_length, next_number, is_active)
VALUES 
  (NULL, 'bank_transaction', 'BT', true, false, '-', 5, 1, true),
  (NULL, 'bank_fee', 'BF', true, false, '-', 5, 1, true),
  (NULL, 'inter_bank_transfer', 'IBT', true, false, '-', 5, 1, true),
  (NULL, 'fund_transfer', 'FT', true, false, '-', 5, 1, true)
ON CONFLICT DO NOTHING;

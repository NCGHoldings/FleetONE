-- ===============================================================
-- Database Resync: Align Sequence Numbers with Actual Table Max
-- ===============================================================

DO $$
DECLARE
    seq_record RECORD;
    max_num_val INT;
    prefix_val TEXT;
    seq_name TEXT;
    table_name_val TEXT;
    column_name_val TEXT;
BEGIN
    FOR seq_record IN SELECT id, entity_type, prefix, separator FROM numbering_sequences WHERE is_active = true
    LOOP
        -- Determine table based on entity_type
        CASE seq_record.entity_type
            WHEN 'payment' THEN 
                table_name_val := 'ap_payments';
                column_name_val := 'payment_number';
            WHEN 'receipt' THEN 
                table_name_val := 'ar_receipts';
                column_name_val := 'receipt_number';
            WHEN 'ap_invoice' THEN 
                table_name_val := 'ap_invoices';
                column_name_val := 'invoice_number';
            WHEN 'ar_invoice' THEN 
                table_name_val := 'ar_invoices';
                column_name_val := 'invoice_number';
            WHEN 'customer' THEN 
                table_name_val := 'customers';
                column_name_val := 'customer_code';
            WHEN 'vendor' THEN 
                table_name_val := 'vendors';
                column_name_val := 'vendor_code';
            WHEN 'journal' THEN 
                table_name_val := 'journal_entries';
                column_name_val := 'entry_number';
            ELSE
                table_name_val := NULL;
        END CASE;

        IF table_name_val IS NOT NULL THEN
            prefix_val := seq_record.prefix || seq_record.separator;

            EXECUTE format('
                SELECT COALESCE(MAX(SUBSTRING(%I FROM ''[0-9]+$'')::INT), 0)
                FROM %I
                WHERE %I LIKE %L
            ', column_name_val, table_name_val, column_name_val, prefix_val || '%') INTO max_num_val;

            IF max_num_val > 0 THEN
                UPDATE numbering_sequences 
                SET next_number = max_num_val + 1,
                    updated_at = NOW()
                WHERE id = seq_record.id AND next_number <= max_num_val;
            END IF;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'All active sequence generators have been synchronized with the tables.';
END;
$$ LANGUAGE plpgsql;

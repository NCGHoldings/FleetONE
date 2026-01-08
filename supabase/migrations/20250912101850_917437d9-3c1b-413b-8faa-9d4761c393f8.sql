-- Remove all special hire quotation data and reset sequences
-- Handle foreign key dependencies properly

-- Delete document storage records that reference payments
DELETE FROM document_storage WHERE payment_id IN (SELECT id FROM special_hire_payments);

-- Delete document approvals that might reference quotations
DELETE FROM document_approvals WHERE document_id IN (
  SELECT id FROM documents WHERE linked_table = 'special_hire_quotations'
);

-- Delete all related records in proper order
DELETE FROM trip_expenses;
DELETE FROM trip_invoices;
DELETE FROM trip_payments;
DELETE FROM trip_confirmations;
DELETE FROM special_hire_invoices;
DELETE FROM special_hire_payments;
DELETE FROM quotation_bus_details;

-- Delete documents linked to special hire quotations
DELETE FROM documents WHERE linked_table = 'special_hire_quotations';

-- Finally delete all special hire quotations
DELETE FROM special_hire_quotations;

-- Reset the quotation sequence to start from 1 (next quotation will be QUO-2025-0001)
ALTER SEQUENCE quotation_seq RESTART WITH 1;
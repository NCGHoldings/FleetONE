-- Remove all special hire quotation data and reset sequences

-- Delete all related records first (to avoid foreign key issues)
DELETE FROM special_hire_payments;
DELETE FROM special_hire_invoices;
DELETE FROM quotation_bus_details;

-- Delete all special hire quotations
DELETE FROM special_hire_quotations;

-- Reset the quotation sequence to start from 1 (next value will be 1)
ALTER SEQUENCE quotation_seq RESTART WITH 1;

-- Also clean up any related documents
DELETE FROM documents WHERE linked_table = 'special_hire_quotations';

-- Clean up trip confirmations if any exist
DELETE FROM trip_confirmations;
DELETE FROM trip_payments;
DELETE FROM trip_invoices;
DELETE FROM trip_expenses;
-- Clear FK reference first, then delete duplicate docs
UPDATE special_hire_trip_adjustments 
SET balance_invoice_document_id = '5933a220-5b70-4264-83af-73673cd497c6'
WHERE balance_invoice_document_id IN ('32c14a42-340a-48a4-97d9-da20ff327458', 'ea20defb-36ca-4160-b6dc-1fd54eb8570a');

-- Delete duplicate draft balance invoices
DELETE FROM document_storage 
WHERE id IN ('32c14a42-340a-48a4-97d9-da20ff327458', 'ea20defb-36ca-4160-b6dc-1fd54eb8570a');

-- Fix AR Invoice paid_amount for QUO-2025-0035
UPDATE ar_invoices 
SET paid_amount = 115704, balance = 0, status = 'paid'
WHERE id = '6a48681c-0dad-44f9-aea5-c1a7bc584812';
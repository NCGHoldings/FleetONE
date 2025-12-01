-- Drop the incorrect foreign key constraint that was preventing signature inserts
-- The document_id in document_approvals references quotation IDs, not document_storage IDs
ALTER TABLE document_approvals 
DROP CONSTRAINT IF EXISTS document_approvals_document_id_fkey;
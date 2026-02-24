-- Drop the existing check constraint on approval_type
ALTER TABLE document_approvals 
DROP CONSTRAINT IF EXISTS document_approvals_approval_type_check;

-- Add updated check constraint with all approval types including 'checked_by'
ALTER TABLE document_approvals 
ADD CONSTRAINT document_approvals_approval_type_check 
CHECK (approval_type IN ('prepared_by', 'checked_by', 'approved_by', 'received_by'));
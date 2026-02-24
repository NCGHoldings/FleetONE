-- First, clean up orphaned document_approvals that reference non-existent documents
DELETE FROM public.document_approvals 
WHERE document_id IS NOT NULL 
  AND document_id NOT IN (SELECT id FROM public.document_storage);

-- Now add the foreign key constraint
ALTER TABLE public.document_approvals
ADD CONSTRAINT document_approvals_document_id_fkey
FOREIGN KEY (document_id) REFERENCES public.document_storage(id) ON DELETE CASCADE;
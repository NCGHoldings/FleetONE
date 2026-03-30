

# Fix Document Preview: Load PDF from Storage When document_data is Empty

## Problem

Documents are now stored in Supabase Storage (bucket `generated-documents`) with a `storage_path` reference in the `document_storage` table. However, the `DocumentViewer` component only checks `document.document_data` (the old base64 column) — which is now empty for new documents. This causes "Document data not available" even though the PDF exists in storage.

The console confirms: storage upload succeeds, document record is inserted with `storage_path`, but `document_data` is null.

## Root Cause

1. **DocumentViewer.tsx line 81**: `if (!document.document_data)` returns the "not available" message — never attempts to fetch from storage
2. **ConfirmedTripsTable.tsx queries** select `document_data` but NOT `storage_path` — so even if the viewer tried, it wouldn't have the path
3. **FinanceApprovalModal.tsx** same issue — queries don't include `storage_path`

## Fix

### File 1: `src/components/special-hire/DocumentViewer.tsx`

- Add `storage_path?: string | null` to the document interface
- In the `MemoizedPreviewContent` component, when `document_data` is empty but `storage_path` exists, fetch the PDF from storage using `getDocumentAsBase64()` and use that
- Add a loading state while fetching from storage
- Remove the early "not available" return when `storage_path` is present

### File 2: `src/components/special-hire/ConfirmedTripsTable.tsx`

- Add `storage_path` to both document queries (lines 519-538 and 577-597) so the field is available when opening the viewer

### File 3: `src/components/special-hire/FinanceApprovalModal.tsx`

- Add `storage_path` to the document query so finance approval document viewing also works

## Technical Detail

The viewer will use this logic:
```
if document_data exists → use it directly (legacy)
else if storage_path exists → fetch from storage via getDocumentAsBase64()
else → show "not available"
```

This is the same pattern already used in `useDocumentManagement.ts` line 538-542 for email sending.


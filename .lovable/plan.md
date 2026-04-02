

# Fix: Document List Takes Too Long to Load in Confirmed Trips

## Root Cause
The batch document query (line 591) and per-quotation query (line 532) both select `document_data` — the **full base64 PDF content** — for every document. With 105 confirmed trips, this downloads potentially hundreds of megabytes of PDF binary data just to render small status badges ("Invoice", "Sales Receipt", signature indicators).

The `document_data` field is only needed when a user clicks to **view** a specific document, not for the list view.

## Fix

### File: `src/components/special-hire/ConfirmedTripsTable.tsx`

**1. Remove `document_data` from the batch query (line 593-614)**
Remove `document_data` from the select list. Keep everything else: `id, quotation_id, document_type, payment_type, document_status, storage_path, file_name, generated_at, email_status, ready_to_send, email_sent_at, document_approvals(...)`.

**2. Remove `document_data` from the per-quotation query (line 534-554)**
Same change — remove `document_data` from `fetchDocumentSignatureStatus`.

**3. Remove `document_data` from the realtime subscription handler**
The realtime handler on line 654 calls `loadDocumentStatus` which also fetches full data — already fixed by step 2.

These are 2 simple select statement edits. The `document_data` is already loaded separately when the user clicks "View Document" via `handleViewDocument`, so removing it from list queries has no impact on viewing.

## Expected Result
- Document status badges (Invoice, Sales Receipt, signatures) appear almost instantly
- Page load reduced from potentially 100MB+ to a few KB of metadata
- No change to document viewing — PDFs still load on demand when clicked
- No change to any other functionality


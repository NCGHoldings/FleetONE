

# Add Document Upload to AP Payments + Fix Journal Entry Related Documents

## Problems

### 1. AP Payment form has no document upload option
When recording an AP Payment, there is no way to attach a supporting document (e.g., payment proof, bank slip, vendor receipt). The `ap_payments` table also lacks a column for storing the uploaded file path.

### 2. Journal Entry "Related Documents" shows wrong/incomplete links
The `JournalEntryDetailDialog` finds related documents by querying `journal_entry_id` on finance tables (ar_invoices, ap_invoices, etc.), but:
- It only shows finance-side records, not operation-side generated documents (e.g., Special Hire invoices/receipts stored in `document_storage`)
- When clicking the eye icon, `FinanceDocumentPreviewModal` regenerates HTML from template — it does NOT show the actual stored PDF/document from operations
- Special Hire payments link to `document_storage` records that have actual generated PDFs (`storage_path`), but these are never surfaced

## Implementation

### Step 1: Add `document_url` column to `ap_payments`
Migration to add a nullable `text` column for storing the Supabase Storage path of uploaded supporting documents.

### Step 2: Add file upload to `APPaymentForm.tsx`
- Add a file input field (after Notes) for uploading a supporting document (PDF, image)
- Upload to Supabase Storage bucket `documents` under path `ap_payments/{payment_id}/{filename}`
- Save the storage path to `ap_payments.document_url` after payment creation
- Show file preview/name after selection

### Step 3: Show uploaded document in AP Payments list
In `APPaymentsView.tsx`, add a paperclip icon or document badge on payments that have a `document_url`, with click-to-view functionality.

### Step 4: Fix Journal Entry Related Documents to show operational documents
Update `JournalEntryDetailDialog.tsx` query to also fetch:
- `document_storage` records linked via `special_hire_payments` → `payment_id` → `document_storage.payment_id`
- When a related doc has a `storage_path` (actual PDF), show a "View PDF" button that opens the Supabase Storage URL directly, instead of trying to regenerate from template
- For finance-side documents (AR/AP invoices etc.), keep current template-based preview

### Step 5: Add AP Payment document preview in JE Related Docs
When a related document is an `ap_payment` with a `document_url`, show both:
- The template-based Payment Voucher preview (existing)
- A "View Attachment" button to open the uploaded supporting document

## Files to Change
- New migration: add `document_url` column to `ap_payments`
- `src/components/accounting/APPaymentForm.tsx` — add file upload field + upload logic
- `src/components/accounting/APPaymentsView.tsx` — show attachment indicator
- `src/components/accounting/JournalEntryDetailDialog.tsx` — expand related docs query to include `document_storage` records and show actual stored PDFs

## Result
- AP Payment form supports document upload (bank slips, receipts)
- Journal Entry detail shows both finance-side and operation-side documents
- Stored PDFs from operations (Special Hire etc.) open directly instead of regenerating from template



# Fix: Apply Signature Page Toggle to ALL Document Generation Points

## Problem

The "Hide Signature Page" toggle only works for **new draft documents** generated from `ConfirmedTripsTable.tsx`. But there are other generation paths that bypass it:

1. **`useFinanceApproval.ts` → `generateApprovedInvoice()`** (line 570-593): Builds `InvoiceData` without `hideSignaturePage` — so re-generated approved receipts always include the signature page.
2. **Stored PDFs**: The document preview modal shows the already-stored PDF file. Even after toggling the setting, old documents keep showing signatures until re-generated.

## Plan

### 1. Pass `hideSignaturePage` into `generateApprovedInvoice`
In `useFinanceApproval.ts`:
- Before building `invoiceData`, fetch the `signature_page` setting from `special_hire_signature_settings`
- Add `hideSignaturePage: true/false` to the `invoiceData` object (line ~593)

This ensures re-generated approved receipts respect the toggle.

### 2. Auto-apply to existing stored documents
Two options — the simplest: when the document preview modal opens a stored PDF, check the current setting. If `hideSignaturePage` is enabled, show a banner: "Signature page is now disabled. Re-generate this document to apply."

Or better: make the preview modal re-render the document live from data (not the stored PDF) when viewing, so the toggle takes effect immediately on preview. The stored PDF only updates when explicitly re-generated.

**Recommended**: Apply the setting at re-generation time (option 1) — it's safer and consistent. Add the fetch to `generateApprovedInvoice` so clicking "Re-generate Sales Receipt" produces a clean single-page PDF.

## Files
- **Modify**: `src/hooks/useFinanceApproval.ts` — fetch `signature_page` setting and pass `hideSignaturePage` to `InvoiceData` in `generateApprovedInvoice()`

## Result
After this fix, clicking "Re-generate Sales Receipt" will produce a PDF without the signature page (when the toggle is off). All new and re-generated documents will respect the setting consistently.

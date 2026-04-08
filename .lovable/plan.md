

# Fix: Respect "Show Signature Page" Toggle Across All Document Generation Paths

## Problem

The "Show Signature Page on Documents" toggle in Settings only works in two places:
1. `ConfirmedTripsTable.tsx` — initial draft generation
2. `useFinanceApproval.ts` — approval regeneration

But it is **NOT checked** in:
- `useDocumentRegeneration.ts` — when regenerating documents with updated signatures
- `useDocumentManagement.ts` — when generating and storing draft documents

This means if the toggle is OFF, regenerated documents still include the signature page (Page 2).

## Fix

### File 1: `src/hooks/useDocumentRegeneration.ts`
- After fetching quotation and payment data (~line 72), add a query to check the `signature_page` setting from `special_hire_signature_settings`
- Set `hideSignaturePage = sigPageSetting?.is_enabled === false`
- Include `hideSignaturePage` in the `invoiceData` object (~line 132)

### File 2: `src/hooks/useDocumentManagement.ts`
- In `generateAndStoreDraftDocument`, before building the invoice data, query `special_hire_signature_settings` for the `signature_page` row
- Pass `hideSignaturePage` into the `draftInvoiceData` object

Both changes are small — each adds ~8 lines to fetch the setting and 1 line to pass it into InvoiceData.

## Result
- Toggle OFF → no signature page (Page 2) appears on any generated or regenerated document
- Toggle ON → signature page renders as normal
- Consistent behavior across all document generation paths




# Fix Intermediate Stops Display + Hire Type on Invoices

## Issue 1: Intermediate Stops Not Showing

**Problem**: Quotations store intermediate stops (e.g., Galle → Cholaw → Jaffna → Kandy → Galle) but they don't appear in:
- The Trips page table (only shows pickup and drop)
- The invoice Item Detail column (only shows pickup → drop)

**Root cause**:
- `ConfirmedTripsTable.tsx` Trip Information cell (lines 1162-1187) only renders pickup and drop locations
- Invoice data construction in `ConfirmedTripsTable.tsx` (line 420-445) and `useDocumentRegeneration.ts` (line 141-190) never passes `intermediateStops` to `InvoiceData`
- `invoice-generator.ts` line 232 explicitly says "no intermediate stops on invoice" and only shows pickup → drop

**Fix**:

### `src/components/special-hire/ConfirmedTripsTable.tsx`
- In the Trip Information table cell (line 1164-1187): Parse and display intermediate stops between pickup and drop markers (orange dots)
- In the draft invoice data construction (line 420-445): Add `intermediateStops` parsed from `tripForDoc.intermediate_stops`
- Add `hireType` field (see Issue 2)

### `src/lib/invoice-generator.ts`
- Add `hireType` field to `InvoiceData` interface
- Line 232: Change `itemDetail` to include intermediate stops when available (e.g., "Galle → Cholaw → Jaffna → Kandy → Galle")
- Lines 320, 328: Replace hardcoded `- External` with the actual `hireType` value

### `src/hooks/useDocumentRegeneration.ts`
- Line 141-190: Add `intermediateStops` (parsed from quotation's `intermediate_stops`) and `hireType` (from `quotation.hire_type`) to the regenerated `InvoiceData`

### `src/components/special-hire/GenerateBalanceInvoiceModal.tsx`
- Pass `intermediateStops` and `hireType` through to invoice data

---

## Issue 2: All Invoices Show "External" Instead of Actual Hire Type

**Problem**: The invoice Description column hardcodes `- External` for every invoice (lines 320, 328 in `invoice-generator.ts`). Quotations have `hire_type` values like "Outside", "Internal", or "Lyceum" but this is never passed to the invoice generator.

**Fix** (covered in changes above):
- Add `hireType?: string` to `InvoiceData` interface
- Replace `- External` with `- ${data.hireType || 'External'}` in lines 320 and 328
- Pass `hire_type` from quotation data in all invoice creation paths

## Files to Modify
1. `src/lib/invoice-generator.ts` — Add `hireType` field, include intermediate stops in item detail, use hire type in description
2. `src/components/special-hire/ConfirmedTripsTable.tsx` — Show intermediate stops in trip info cell, pass `intermediateStops` and `hireType` to invoice data
3. `src/hooks/useDocumentRegeneration.ts` — Pass `intermediateStops` and `hireType` when regenerating documents
4. `src/components/special-hire/GenerateBalanceInvoiceModal.tsx` — Pass through intermediate stops and hire type


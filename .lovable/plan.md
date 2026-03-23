

# Fix Cash Receipts Panel in Spreadsheet — Add Create & View

## Problem
The CR (Cash Receipts) column in the Yutong Orders Spreadsheet is read-only: it lists existing receipts but has no way to **create** a new cash receipt or **view** a receipt's full details (preview/download/sign). The DO and Payment panels both support creation; CR should match.

## Changes

### 1. Add "Create Cash Receipt" to SpreadsheetCRPanel
**File:** `src/components/yutong/spreadsheet/SpreadsheetQuickActions.tsx`

- Add a `+ New CR` button in the CR popover header (matching the DO panel's `+ New DO` pattern)
- Add an inline form with fields: Amount, Payment Method (cash/cheque/bank_transfer), Date, and optional Reference
- Wire it to a new `createCR` prop that calls `useYutongCashReceipts().createCashReceipt()`
- After creation, refetch the CR list to show the new receipt

### 2. Add "View" button on each CR row
**File:** `src/components/yutong/spreadsheet/SpreadsheetQuickActions.tsx`

- Add a small "View" button on each receipt card in the CR popover
- Clicking it opens `YutongCashReceiptModal` (the existing modal with preview, signatures, PDF download)
- Need to fetch full receipt data (via `getCashReceiptByPaymentId` or direct query) since the CRRecord only has summary fields

### 3. Wire createCR through the hook
**File:** `src/hooks/useSpreadsheetQuickActions.ts`

- Expose `createCashReceipt` from the existing `useYutongCashReceipts` hook (already imported)
- Add a `createCR` wrapper function that accepts `(orderId, amount, method, date)`, calls `createCashReceipt` with a placeholder paymentId or null, and returns success/failure
- Add to the returned object

### 4. Update CRPanel props and wiring
**File:** `src/components/yutong/spreadsheet/YutongSpreadsheetCore.tsx`

- Pass `createCR` and `onViewReceipt` props to `SpreadsheetCRPanel`
- Add state for the receipt view modal (`YutongCashReceiptModal`)
- Import and render `YutongCashReceiptModal` at the bottom of the component

## Files touched
- `src/components/yutong/spreadsheet/SpreadsheetQuickActions.tsx` — Add create form + view button to CRPanel
- `src/hooks/useSpreadsheetQuickActions.ts` — Expose createCR wrapper
- `src/components/yutong/spreadsheet/YutongSpreadsheetCore.tsx` — Wire new props + add receipt view modal


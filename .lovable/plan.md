# Fix AR/AP Invoice GL Posting — COMPLETED

## Changes Made

### 1. AP Invoice Auto GL Posting at Creation (`useAccountingMutations.ts`)
- `useCreateAPInvoice` now calls `resolveVendorAPAccounts()` after insert
- Posts DR Expense / CR Trade Payable via `postAPInvoiceToGL()`
- Links `journal_entry_id` back to `ap_invoices` record
- Uses 3-tier resolution: Line account → Vendor Category → Global GL Settings

### 2. Double-Posting Guard on Approval (`useAccountingMutations.ts`)
- `useApproveAPInvoice` checks `journal_entry_id` before GL posting
- If already posted at creation → skips (no duplicate JE)
- If legacy invoice (NULL) → posts using vendor category resolution
- Replaced global-only GL lookup with `resolveVendorAPAccounts()`

### 3. GL Flow Diagram (`InvoiceGLFlowDiagram.tsx`)
- Visual diagram showing AR/AP invoice creation → GL posting flow
- Shows 3-tier resolution hierarchy
- Shows double-posting guard logic
- Status table confirming all flows are correct

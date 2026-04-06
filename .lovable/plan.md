

# Force Delete for AP/AR Invoices, Payments & Receipts (Testing Mode)

## Problem
Currently, AP/AR invoices can only be deleted when in "draft" or "cancelled" status. AP Payments and AR Receipts have **no delete option at all**. When deleting, the system does NOT reverse the linked Journal Entries or COA balance changes, leaving the books corrupted.

During testing, you need to delete **any** record regardless of status, with full financial cleanup.

## Solution

### 1. Create a shared `reverseAndDeleteJournalEntry` utility
**File**: `src/lib/gl-posting-utils.ts`

Add a new exported function that:
- Fetches the JE and its lines by `journal_entry_id`
- Reverses each COA balance change (undo debits/credits based on account normal type)
- Deletes the `journal_entry_lines` rows
- Deletes the `journal_entries` row
- Returns success/failure

This will be reused by all 4 delete mutations.

### 2. Upgrade `useDeleteAPInvoice` — full cascade delete
**File**: `src/hooks/useAccountingMutations.ts`

- Fetch the invoice to get `journal_entry_id`
- Delete any `ap_payment_allocations` linked to this invoice
- Call `reverseAndDeleteJournalEntry` if JE exists
- Delete `ap_invoice_lines`, then `ap_invoices`
- Invalidate queries for invoices, payments, journal entries, COA

### 3. Upgrade `useDeleteARInvoice` — full cascade delete
**File**: `src/hooks/useAccountingMutations.ts`

- Same pattern: fetch invoice → delete `ar_receipt_allocations` → reverse JE → delete lines → delete invoice
- Invalidate AR queries

### 4. Create `useDeleteAPPayment` (new)
**File**: `src/hooks/useAccountingMutations.ts`

- Fetch payment to get `journal_entry_id` and `bank_account_id`
- Delete `ap_payment_allocations` for this payment
- Delete linked `bank_transactions`
- Reverse bank account balance (add back the payment amount)
- Reverse and delete JE
- Delete `ap_payment_lines` (for direct payments)
- Delete `ap_payments` row
- Invalidate payment, invoice, bank, JE queries

### 5. Create `useDeleteARReceipt` (new)
**File**: `src/hooks/useAccountingMutations.ts`

- Same pattern as AP Payment: fetch receipt → delete allocations → delete bank transactions → reverse bank balance → reverse JE → delete receipt
- Invalidate receipt, invoice, bank queries

### 6. Remove status restriction on delete buttons
**Files**: `src/components/accounting/AccountsPayableView.tsx`, `src/components/accounting/AccountsReceivableView.tsx`

- Change `canDelete` to always return `true` (all statuses)
- Update delete confirmation dialog text to warn about JE reversal

### 7. Add delete buttons to AP Payments & AR Receipts views
**Files**: `src/components/accounting/APPaymentsView.tsx`, `src/components/accounting/ARReceiptsView.tsx`

- Import `Trash2` icon, `AlertDialog` components, and the new delete mutations
- Add delete button per row with confirmation dialog
- Wire up the delete mutation with proper query invalidation

### Safety
- Only financial/accounting data is touched — no operational tables (trips, special hires, school data)
- Each delete reverses COA balances line-by-line to keep the books balanced
- Bank account balances are restored when payments/receipts are deleted
- Bank transactions linked to the payment/receipt are removed
- All query caches are invalidated so UI reflects changes immediately

## Technical Details
- `reverseAndDeleteJournalEntry(journalEntryId)`: For each JE line, if the line has a debit, subtract that from COA balance; if credit, add it back (opposite of what posting did)
- Bank balance reversal: for AP payment delete, add amount back to bank; for AR receipt delete, subtract amount from bank
- `ap_payment_allocations` / `ar_receipt_allocations` are deleted first to avoid FK violations

## Files
- **Modify**: `src/lib/gl-posting-utils.ts` — add `reverseAndDeleteJournalEntry`
- **Modify**: `src/hooks/useAccountingMutations.ts` — upgrade AR/AP invoice delete, add payment/receipt delete
- **Modify**: `src/components/accounting/AccountsPayableView.tsx` — allow delete for all statuses
- **Modify**: `src/components/accounting/AccountsReceivableView.tsx` — allow delete for all statuses
- **Modify**: `src/components/accounting/APPaymentsView.tsx` — add delete button + confirmation
- **Modify**: `src/components/accounting/ARReceiptsView.tsx` — add delete button + confirmation


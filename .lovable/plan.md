

# Add Edit Functionality for AR/AP Receipts & Payments with Auto GL Reversal

## What We're Building

Currently, AR Receipts, AP Payments, AR Invoices, and AP Invoices only support "Delete" (force delete with reversal). There is no **Edit** option. We need to add an "Edit" button that:

1. Opens the existing form pre-filled with current data
2. On save: **auto-reverses** the old GL journal entry, creates a **new GL posting** with updated values
3. Maintains a full **edit history/audit trail** so every change is traceable

## How the Edit-with-Reversal Mechanism Works

```text
Original Record (PAY-2026-25583, LKR 123,344)
  └── JE-001 (DR Expense / CR Bank) ← Posted

User clicks "Edit" → Changes amount to LKR 130,000

System does:
  1. Auto-reverse JE-001 → creates REV-JE-001 (DR Bank / CR Expense)
  2. Create new JE-002 (DR Expense / CR Bank) with LKR 130,000
  3. Update AP Payment record with new values
  4. Log edit in edit_history JSONB: { old_amount: 123344, new_amount: 130000, edited_by, edited_at, reversal_je, new_je }
```

This reuses the existing `useReverseJournalEntry` logic already in `useAccountingMutations.ts`.

## Implementation Plan

### 1. Add `edit_history` JSONB Column (SQL Migration)

Add a `edit_history` JSONB array column to 4 tables:
- `ap_payments` 
- `ar_receipts`
- `ap_invoices`
- `ar_invoices`

Each edit appends: `{ edited_at, edited_by, old_values, new_values, reversed_je_id, new_je_id, reason }`

### 2. Create Edit Mutations in `useAccountingMutations.ts`

Add 4 new hooks:
- `useEditAPPayment` — reverses old JE, updates payment record, creates new JE, appends to edit_history
- `useEditARReceipt` — same pattern for receipts
- `useEditAPInvoice` — reverses old JE, updates invoice, creates new JE
- `useEditARInvoice` — same pattern

Each mutation follows this sequence:
1. Fetch the existing record + its `journal_entry_id`
2. Call the existing reversal logic to reverse that JE
3. Update the record fields (amount, date, vendor/customer, method, etc.)
4. Re-run the GL posting logic (reuse existing create mutation's posting code)
5. Append edit history entry to the JSONB array
6. Invalidate all relevant query keys

### 3. Update Form Components to Support Edit Mode

**`APPaymentForm.tsx`**: Add optional `editingPayment` prop. When provided:
- Pre-fill all fields from existing payment data
- Show "Update Payment" instead of "Record Payment"
- On submit: call `useEditAPPayment` instead of `useCreateAPPayment`

**`ARReceiptForm.tsx`**: Same pattern with `editingReceipt` prop

**`APInvoiceForm.tsx`**: Same with `editingInvoice` prop

**`ARInvoiceForm.tsx`**: Same with `editingInvoice` prop

### 4. Add Edit Buttons to List Views

**`APPaymentsView.tsx`**: Add Edit (pencil) icon button in Actions column → opens `APPaymentForm` with `editingPayment={selectedPayment}`

**`ARReceiptsView.tsx`**: Same for receipts

**`AccountsPayableView.tsx`** (invoices tab): Add Edit button

**`AccountsReceivableView.tsx`** (invoices tab): Add Edit button

### 5. Edit History Viewer

Add a small "History" button (clock icon) on each record that opens a dialog showing the edit trail:
- Timestamp, who edited, what changed (old → new values), linked reversal JE number

## Files to Change

- **New SQL migration** — add `edit_history jsonb default '[]'` to `ap_payments`, `ar_receipts`, `ap_invoices`, `ar_invoices`
- **`src/hooks/useAccountingMutations.ts`** — add `useEditAPPayment`, `useEditARReceipt`, `useEditAPInvoice`, `useEditARInvoice` hooks
- **`src/components/accounting/APPaymentForm.tsx`** — accept `editingPayment` prop, pre-fill form, call edit mutation
- **`src/components/accounting/ARReceiptForm.tsx`** — accept `editingReceipt` prop, pre-fill form, call edit mutation
- **`src/components/accounting/APInvoiceForm.tsx`** — accept `editingInvoice` prop
- **`src/components/accounting/ARInvoiceForm.tsx`** — accept `editingInvoice` prop
- **`src/components/accounting/APPaymentsView.tsx`** — add Edit button in actions
- **`src/components/accounting/ARReceiptsView.tsx`** — add Edit button in actions
- **`src/components/accounting/AccountsPayableView.tsx`** — add Edit button for invoices
- **`src/components/accounting/AccountsReceivableView.tsx`** — add Edit button for invoices
- **`src/components/accounting/shared/EditHistoryDialog.tsx`** — new component showing edit trail

## Result

- All 4 transaction types (AR Receipt, AP Payment, AR Invoice, AP Invoice) have Edit buttons
- Editing auto-reverses the old GL posting and creates a new one — no manual journal correction needed
- Full audit trail preserved in `edit_history` JSONB — who changed what, when, and which JEs were reversed/created
- Original records are never deleted — only updated with linked reversal entries


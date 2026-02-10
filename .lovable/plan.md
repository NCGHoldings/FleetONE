
# Bank Fees, Cheque Management & AP/AR Linking - Full Implementation Plan

## Overview

This plan adds three interconnected capabilities to the Finance ERP:

1. **Post-Transaction Bank Fees** - Add bank charges to any completed AP payment or AR receipt after the fact, linked to the original transaction
2. **Full Cheque Lifecycle for AR and AP** - Cheques start as "draft", support print for AP, and can be marked completed when cleared
3. **GL Mapping and Bank Reconciliation Integration** - All bank fees and cheque movements post to GL and appear in bank reconciliation

---

## Part 1: Post-Transaction Bank Fees/Charges

### Problem
Currently there is no way to add bank fees after a payment is made. Bank charges can only be added as standalone bank transactions with no link to the AP payment or AR receipt that incurred them.

### Solution

#### 1A. New Database Table: `bank_fee_charges`

Create a new table to store bank fees linked to their source transaction:

```sql
CREATE TABLE bank_fee_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  bank_account_id UUID REFERENCES bank_accounts(id),
  fee_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15,2) NOT NULL,
  fee_type TEXT NOT NULL DEFAULT 'bank_charge', -- bank_charge, stamp_duty, swift_fee, etc.
  description TEXT,
  -- Linkage: one of these will be set
  ap_payment_id UUID REFERENCES ap_payments(id),
  ar_receipt_id UUID REFERENCES ar_receipts(id),
  -- GL tracking
  journal_entry_id UUID REFERENCES journal_entries(id),
  bank_transaction_id UUID REFERENCES bank_transactions(id),
  status TEXT DEFAULT 'draft', -- draft, posted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bank_fee_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON bank_fee_charges FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

#### 1B. New Component: `BankFeeForm.tsx`

A dialog form that can be opened from:
- AP Payments list (action button "Add Bank Fee")
- AR Receipts list (action button "Add Bank Fee")
- Banking Transactions tab (standalone)

Fields:
- Bank Account (auto-filled from parent payment)
- Fee Date
- Amount
- Fee Type dropdown: Bank Charge, Stamp Duty, SWIFT Fee, Commission, Other
- Description
- Status: Draft (default) or Post immediately

On submit:
1. Insert into `bank_fee_charges` with the linked `ap_payment_id` or `ar_receipt_id`
2. Create a `bank_transactions` record (debit = fee amount, type = "bank_charge")
3. If "Post immediately": Create GL entry (DR Bank Charges Expense / CR Bank Account)

#### 1C. Update `APPaymentsView.tsx`

- Add "Add Bank Fee" button in the actions column for each payment
- Show a "Fees" badge next to payments that have linked bank fees
- Add a summary card showing "Total Bank Fees This Month"

#### 1D. Update `ARReceiptsView.tsx`

- Same "Add Bank Fee" button for receipts
- Show linked fees indicator

#### 1E. New Hook: `useBankFees.ts`

```typescript
// Queries
useBankFees(companyId) - fetch all bank fees
useBankFeesByPayment(paymentId) - fees for specific AP payment
useBankFeesByReceipt(receiptId) - fees for specific AR receipt

// Mutations
useCreateBankFee() - insert fee + bank transaction + optional GL
usePostBankFee() - post a draft fee to GL
```

---

## Part 2: Full Cheque Lifecycle (AR + AP)

### Problem
- Cheque register only supports AP (outgoing) cheques via `payment_id` FK
- No AR (incoming) cheque tracking
- No "draft" status - cheques are immediately "issued" or "post_dated"
- No print option for AP cheques
- No link between AP Payment cheque fields and the cheque register

### Solution

#### 2A. Database Migration: Add AR Support + Draft Status to `cheque_register`

```sql
-- Add cheque_type and ar_receipt_id columns
ALTER TABLE cheque_register 
  ADD COLUMN IF NOT EXISTS cheque_type TEXT DEFAULT 'outgoing', -- 'outgoing' (AP) or 'incoming' (AR)
  ADD COLUMN IF NOT EXISTS ar_receipt_id UUID REFERENCES ar_receipts(id),
  ADD COLUMN IF NOT EXISTS reference TEXT,
  ADD COLUMN IF NOT EXISTS memo TEXT;

-- Update status default to 'draft' for new cheques
-- Existing statuses: issued, presented, cleared, bounced, cancelled, post_dated
-- Add: draft, completed
```

#### 2B. Update `ChequeIssueForm.tsx`

- Add "Cheque Type" toggle: Outgoing (AP) / Incoming (AR)
- For Outgoing: show Vendor selector (existing) + link to AP payment
- For Incoming: show Customer selector + link to AR receipt
- Default status = "draft" instead of "issued"
- Add "Save as Draft" and "Issue Now" buttons

#### 2C. Update `ChequeRegisterView.tsx`

- Add tabs for "Outgoing (AP)" and "Incoming (AR)" filtering
- Add "Draft" tab and count
- Add "Print" button for outgoing cheques (generates cheque print layout)
- Add "Mark as Completed" action for cleared cheques
- Add "Type" column showing Outgoing/Incoming badge
- Update summary cards: add Draft count, separate Outgoing/Incoming totals

#### 2D. New Component: `ChequePrintPreview.tsx`

A print-optimized cheque layout with:
- Date (formatted)
- Payee name
- Amount in words and numbers
- Bank account details
- Cheque number
- Uses `window.print()` with print-specific CSS

#### 2E. Auto-Link AP Payments to Cheque Register

When an AP payment is created with `payment_method = "cheque"`:
- Automatically create a cheque_register entry in "draft" status
- Link via `payment_id`
- Pre-fill cheque_number, amount, payee from the payment

When an AR receipt is created with `payment_method = "cheque"`:
- Automatically create a cheque_register entry as "incoming" in "draft" status
- Link via `ar_receipt_id`

#### 2F. Update `useAccountingMutations.ts`

- In `useCreateAPPayment`: After payment insert, if method is "cheque", also insert into `cheque_register` with `cheque_type: 'outgoing'`, `status: 'draft'`
- In `useCreateARReceipt`: After receipt insert, if method is "cheque", also insert into `cheque_register` with `cheque_type: 'incoming'`, `status: 'draft'`

---

## Part 3: GL Mapping & Bank Reconciliation Integration

### 3A. Bank Fee GL Mapping

When a bank fee is posted:
- **DR**: Bank Charges / Bank Fees Expense account (mapped in settings or auto-resolved from COA by searching for "Bank Charge" expense type)
- **CR**: Bank Account (the source bank)

This creates both a `journal_entries` + `journal_entry_lines` record and a `bank_transactions` record, ensuring it appears in:
- Journal Entries view
- Bank Transactions list
- Bank Reconciliation worksheet (as an unreconciled debit)

### 3B. Cheque Clearing GL Impact

When a cheque status changes to "cleared":
- For **Outgoing (AP)**: The bank balance is already reduced when the payment was posted. The cheque clearing just updates the reconciliation status of the linked bank transaction.
- For **Incoming (AR)**: Similarly updates the bank transaction reconciliation status.
- For **Bounced**: Reverse the original GL entry (DR Bank / CR Expense or Receivable) and mark the linked invoice as unpaid again.

### 3C. Bank Reconciliation Worksheet Updates

The existing `BankReconciliationWorksheet.tsx` already calculates "Outstanding Cheques" from unmatched withdrawals. With the new cheque_type field:
- Outstanding Outgoing Cheques = uncleared outgoing cheques (issued/presented but not cleared)
- Deposits in Transit = uncleared incoming cheques

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/accounting/BankFeeForm.tsx` | Dialog form for adding bank fees |
| `src/components/accounting/BankFeesList.tsx` | Table showing fees linked to a payment/receipt |
| `src/components/accounting/ChequePrintPreview.tsx` | Print-optimized cheque layout |
| `src/hooks/useBankFees.ts` | Queries and mutations for bank fees |
| `supabase/migrations/xxx_bank_fees_cheque_enhancements.sql` | DB migration |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/accounting/APPaymentsView.tsx` | Add "Bank Fee" action button, fees indicator |
| `src/components/accounting/ARReceiptsView.tsx` | Add "Bank Fee" action button |
| `src/components/accounting/ChequeRegisterView.tsx` | Add AR/AP tabs, draft status, print button, completed action |
| `src/components/accounting/ChequeIssueForm.tsx` | Add cheque type toggle, customer selector, draft default |
| `src/components/accounting/BankingView.tsx` | Add "Bank Fees" sub-tab |
| `src/hooks/useAccountingMutations.ts` | Auto-create cheque_register on cheque payments |
| `src/hooks/useAccountingData.ts` | Add useBankFees query |
| `src/integrations/supabase/types.ts` | Will auto-update after migration |

---

## Testing Checklist

| # | Test | Expected |
|---|------|----------|
| 1 | Create AP payment via cheque | Cheque register entry auto-created as "draft" |
| 2 | Create AR receipt via cheque | Incoming cheque auto-created as "draft" |
| 3 | Mark draft cheque as "issued" | Status updates, appears in issued tab |
| 4 | Print AP cheque | Print preview opens with cheque layout |
| 5 | Mark cheque as "cleared" | Status updates, bank transaction marked reconciled |
| 6 | Add bank fee to AP payment | Fee record created, bank transaction recorded |
| 7 | Post bank fee to GL | Journal entry created (DR Expense / CR Bank) |
| 8 | View bank reconciliation | Outstanding cheques and bank fees visible |
| 9 | Switch company sections | Only that section's cheques and fees visible |

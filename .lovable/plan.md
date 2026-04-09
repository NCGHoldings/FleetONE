

# Bank Charge System — How It Works & Current Gaps

## How Bank Fees Are Currently Mapped and Connected

Here's the complete flow when you toggle "Include Bank Fee" on an AP Payment:

```text
AP Payment (PAY-2026-25648, LKR 100,000 + Fee LKR 500)
  │
  ├── 1. AP Payment Record
  │     └── Stores: bank_fee_amount=500, bank_fee_type="bank_charge"
  │
  ├── 2. Bank Transaction (auto-created)
  │     └── Debit: LKR 100,500 (payment + fee combined)
  │     └── Description: "AP Payment... (Payment: 100,000, Bank Fee: 500)"
  │     └── Shows in Banking > Transactions tab
  │
  ├── 3. Bank Fee Charge Record (auto-created)
  │     └── Table: bank_fee_charges
  │     └── Links: ap_payment_id → this payment
  │     └── Links: bank_account_id → source bank
  │     └── Status: "draft" (NOT auto-posted to GL)
  │     └── Shows in Banking > Bank Fees tab
  │
  ├── 4. Bank Balance Updated
  │     └── Deducted: LKR 100,500 (payment + fee)
  │
  └── 5. GL Journal Entry
        └── Only posts the PAYMENT amount (LKR 100,000)
        └── The fee's GL posting happens separately when you
            manually "Post" the fee from Banking > Bank Fees tab
```

## Current Bridges That Work

| From | To | Status |
|---|---|---|
| AP Payment → bank_fee_charges | Links via `ap_payment_id` | Working |
| AR Receipt → bank_fee_charges | Links via `ar_receipt_id` | Working |
| bank_fee_charges → bank_transactions | Links via `bank_transaction_id` | Working (standalone fees only) |
| bank_fee_charges → journal_entries | Links via `journal_entry_id` | Working (when posted) |
| Bank Fees tab → view/post fees | BankFeesList component | Working |
| AP Payment list → shows fee column | APPaymentsView | Working |

## Current Gaps

1. **Inline fee NOT auto-posted to GL** — When you add a bank fee inside an AP payment, the fee record is created as "draft". The GL entry (DR Bank Charges Expense / CR Bank) is NOT created automatically. You must go to Banking > Bank Fees tab and click "Post" manually.

2. **No fee GL in the payment's journal entry** — The payment JE only has the vendor payment lines (DR Payable / CR Bank). The fee should add extra lines (DR Bank Charges / CR Bank) in the same JE or a linked JE.

3. **Bank reconciliation** — The bank transaction shows the combined amount (payment + fee), but the fee's own bank_transaction is not created when it comes from an inline AP payment. Only standalone fees from the Bank Fee form get their own bank_transaction.

4. **No fee display on AR Receipts** — AR Receipt form doesn't have the "Include Bank Fee" toggle at all.

5. **Payment detail/invoice view** — When viewing a payment's details, the linked bank fees aren't shown inline.

## Recommended Fix Plan

### 1. Auto-Post Bank Fee GL When Included in AP Payment

**File: `src/hooks/useAccountingMutations.ts`** (line ~1287)

When `bank_fee_amount > 0` in an AP payment, after inserting the `bank_fee_charges` record:
- Find the "Bank Charges" expense account (already have this logic in `useBankFees.ts`)
- Add 2 extra lines to the SAME journal entry: DR Bank Charges Expense / CR Bank GL
- Set the fee record status to "posted" with `journal_entry_id` linked
- This ensures the fee hits the GL immediately, not as a separate manual step

### 2. Add "Include Bank Fee" Toggle to AR Receipt Form

**File: `src/components/accounting/ARReceiptForm.tsx`**

- Add the same bank fee section that AP Payment has (toggle, amount, fee type)
- On submit, create `bank_fee_charges` record with `ar_receipt_id`
- Auto-post fee GL lines in the receipt's journal entry

### 3. Show Linked Bank Fees in Payment/Receipt Detail Views

**Files: `APPaymentsView.tsx`, `ARReceiptsView.tsx`**

- When expanding or viewing a payment that has `bank_fee_amount > 0`, show a "Bank Fee" badge/row with the fee details
- Link to the fee record in Banking > Bank Fees for drill-down

### 4. Fix Bank Transaction for Inline Fees

**File: `src/hooks/useAccountingMutations.ts`**

- When creating an inline bank fee, also create a separate `bank_transaction` for the fee amount (source_type: "bank_fee") and link it to the fee record via `bank_transaction_id`
- This ensures bank reconciliation can match the fee separately from the payment

## Files to Change

- `src/hooks/useAccountingMutations.ts` — auto-post fee GL lines in AP payment JE, create fee bank_transaction, same for AR receipt
- `src/components/accounting/ARReceiptForm.tsx` — add bank fee toggle/amount/type fields
- `src/components/accounting/APPaymentsView.tsx` — show fee details in expanded view
- `src/components/accounting/ARReceiptsView.tsx` — show fee details in expanded view

## Result

- Bank fees included in payments auto-post to GL immediately (no manual "Post" step)
- AR Receipts support bank fees just like AP Payments
- Fee GL entries are part of the same journal entry as the payment
- Bank reconciliation can match fees as separate tagged transactions
- Full audit trail: Payment → Fee → Bank Transaction → Journal Entry


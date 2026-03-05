

# Add Bank Fee to AP Payment Form with Breakdown Display

## Problem
Currently, bank fees can only be added **after** a payment is recorded (via a separate button). The user wants to add the bank fee **at the time of recording the payment**, and see a clear breakdown: **Payment Amount + Bank Fee = Total Deducted from Bank**. This breakdown should also appear in the payments table, bank transactions, and reconciliation views.

## Database Changes

### Add columns to `ap_payments`
```sql
ALTER TABLE ap_payments ADD COLUMN bank_fee_amount NUMERIC DEFAULT 0;
ALTER TABLE ap_payments ADD COLUMN bank_fee_type TEXT;
ALTER TABLE ap_payments ADD COLUMN total_with_fees NUMERIC GENERATED ALWAYS AS (amount + COALESCE(bank_fee_amount, 0)) STORED;
```
- `bank_fee_amount`: the fee charged by the bank for this payment
- `bank_fee_type`: type of fee (bank_charge, swift_fee, stamp_duty, etc.)
- `total_with_fees`: computed column showing the full amount deducted from the bank

## Code Changes

### 1. `src/components/accounting/APPaymentForm.tsx`
Add a **Bank Fee section** below the payment method fields:
- Toggle: "Include Bank Fee" switch
- When enabled, show: Fee Amount input, Fee Type dropdown
- Update the **Totals section** to show a 3-line breakdown:
  - Payment Amount: LKR X
  - Bank Fee: LKR Y
  - **Total (Bank Deduction): LKR X+Y**
- On submit, pass `bank_fee_amount` and `bank_fee_type` to the mutation

### 2. `src/hooks/useAccountingMutations.ts` — `useCreateAPPayment`
- Save `bank_fee_amount` and `bank_fee_type` to the `ap_payments` record
- When `bank_fee_amount > 0`: automatically create a `bank_fee_charges` record linked to this payment (reusing existing bank fee logic)
- The bank transaction should record the **total_with_fees** as the actual bank deduction amount
- GL posting: add a separate debit line for bank charges expense

### 3. `src/components/accounting/APPaymentsView.tsx` — Table
- Add a "Bank Fee" column between Amount and Status
- Show `total_with_fees` as the main Amount column, with a tooltip/subtitle showing the breakdown
- Or show two columns: "Amount" and "Fee" side by side

### 4. Bank Transaction & Reconciliation
- The bank transaction amount will reflect `total_with_fees` (payment + fee) so reconciliation matches the actual bank statement deduction
- Transaction description includes the fee breakdown

## Result
When recording a payment, the user can optionally add a bank fee inline. The system stores the fee, creates the GL entries, and shows a clear breakdown everywhere: payment tables, voucher preview, bank transactions, and reconciliation.


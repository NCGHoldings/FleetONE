

# Add Optional "Pay Now" to AP Invoice Creation Form

## Problem
Currently, after creating an AP Invoice, users must navigate to the Payments tab to record a payment separately. This is extra steps for invoices that are paid immediately (e.g., cash purchases, same-day bank transfers).

## Solution
Add a collapsible **"Pay Now (Optional)"** section at the bottom of the AP Invoice form (between Notes and the action buttons). When toggled on, it shows bank account, payment method, reference, and cheque fields. On submit, the system:

1. Creates the AP Invoice (existing flow — triggers JE-1: DR Expense / CR Trade Payable)
2. Then creates an AP Payment allocated to that invoice (triggers JE-2: DR Trade Payable / CR Bank)
3. Uses the existing `useCreateAPPayment` mutation which already handles GL posting, bank balance updates, and double-posting guards

This keeps the two JEs separate and correct — no risk of double-posting since invoice creation and payment creation are sequential with distinct mutations.

## Changes

### Modify: `src/components/accounting/APInvoiceForm.tsx`

1. **New state variables**:
   - `payNow: boolean` (toggle)
   - `paymentMethod: string` (bank_transfer, cheque, cash)
   - `paymentBankAccountId: string`
   - `paymentChequeNumber: string`
   - `paymentReference: string`

2. **Import additions**: `useBankAccounts` from hooks, `useCreateAPPayment` from mutations, `Switch` from UI, bank account icons

3. **New UI section** (after Notes, before buttons): A `Switch` labeled "Pay Now (Optional)" that expands to show:
   - Payment Method selector (Bank Transfer / Cheque / Cash)
   - Bank Account selector (from `useBankAccounts`)
   - Cheque Number (if cheque selected)
   - Reference field
   
4. **Modified `onSubmit`**: After successful invoice creation (non-edit mode only), if `payNow` is true:
   - Generate a payment number (e.g., `PAY-{timestamp}`)
   - Call `createPayment.mutateAsync()` with the invoice ID in allocations
   - The payment amount = `netPayable`
   - Show success toast mentioning both invoice and payment were created

5. **Guard**: The "Pay Now" section only appears for new invoices (not when editing)

6. **Button text**: Changes to "Record Invoice & Pay" when pay-now is toggled on

## Technical Safety
- Invoice JE (DR Expense / CR Trade Payable) fires first via `useCreateAPInvoice`
- Payment JE (DR Trade Payable / CR Bank) fires second via `useCreateAPPayment`
- Both mutations have independent double-posting guards
- If payment fails after invoice succeeds, user gets a toast error and can still pay manually from the Payments tab
- The payment allocation links to the specific invoice, so invoice status updates to "paid"

## Files
- **Modify**: `src/components/accounting/APInvoiceForm.tsx` — add optional pay-now section and sequential payment creation


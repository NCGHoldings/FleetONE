

# Fix AP Payment Bank Account Issues

## Problems Identified

1. **Vendor Pay-To account not saved**: The form has a "Pay To Account" selector (`selectedBankAccountId`) but never passes it to the mutation. The `ap_payments` table has a `vendor_bank_account_id` column (with FK to `vendor_bank_accounts`) that is never populated.

2. **Source bank account not joined in query**: `useAPPayments` fetches `ap_payments` with only `vendors(...)` joined. It does NOT join `bank_accounts` (source) or `vendor_bank_accounts` (pay-to), so the Payment Voucher preview cannot display bank details.

3. **Payment Voucher document shows empty bank fields**: `mapDocumentToPlaceholders` references `documentData?.bank_accounts?.account_name` and `documentData?.vendor_bank_accounts?.bank_name` but these are always empty because the data is never fetched.

## Changes

### 1. `src/components/accounting/APPaymentForm.tsx`
- Pass `vendor_bank_account_id: selectedBankAccountId` in the `createPayment.mutateAsync()` call

### 2. `src/hooks/useAccountingMutations.ts` (useCreateAPPayment)
- Accept `vendor_bank_account_id` in the mutation input
- Save it to the `ap_payments` insert: `vendor_bank_account_id: payment.vendor_bank_account_id`

### 3. `src/hooks/useAccountingData.ts` (useAPPayments)
- Join `bank_accounts(id, account_name, bank_name, account_number)` via `bank_account_id`
- Join `vendor_bank_accounts(id, bank_name, bank_branch, account_number, account_holder_name, account_label)` via `vendor_bank_account_id`

### 4. `src/lib/document-template-utils.ts`
- Already has placeholders for `{{source_account}}`, `{{source_bank}}`, `{{vendor_bank_name}}` etc. — these will now populate correctly once the joins are in place. No changes needed here.

## Result
- Vendor pay-to bank account selection is persisted in `ap_payments.vendor_bank_account_id`
- Payment Voucher preview shows source bank name/number and vendor pay-to bank details
- All existing placeholders like `{{source_account}}`, `{{vendor_bank_name}}`, `{{vendor_account_number}}` render correctly


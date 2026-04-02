

# Fix: Show Vendor Bank Details in AP Payment Voucher

## Problem
The Payment Voucher "BENEFICIARY BANK DETAILS" section shows empty because:
1. The `vendor_bank_accounts` join on `ap_payments` only works via FK (`vendor_bank_account_id`) — if null, no bank data comes through
2. Many payments were created before vendor bank accounts were added, so `vendor_bank_account_id` is null
3. Even though the vendor has bank accounts (e.g., Peoples Bank for Chairman Sri Lanka Handi Craft Board), the voucher shows blank

## Fix

### 1. Enrich payment data in preview modal
**File: `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx`**

When `documentType === 'ap_payment_voucher'` and `documentData.vendor_bank_accounts` is null/empty but `documentData.vendor_id` exists:
- Fetch the vendor's default bank account from `vendor_bank_accounts` table (where `is_default = true` or first account)
- Merge it into `documentData.vendor_bank_accounts` before passing to the template resolver

### 2. Also add account holder name to template
**File: `src/lib/document-template-seeder.ts`**

Add `{{vendor_account_holder}}` below the A/C No line so the voucher shows who the account belongs to.

### Result
- Payment vouchers show the vendor's bank name, branch, account number, and holder name
- Works for both old payments (fallback to vendor's default bank) and new payments (uses selected bank account)
- No changes to existing payment data needed


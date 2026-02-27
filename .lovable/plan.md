

# Fix AP Payment Voucher & Vendor Bank Accounts

## Problems Identified (from the printed voucher photo)

1. **Company name** shows "NCG Holding" but should be "NCG Holding (Pvt) Ltd"
2. **Payment number** has random hash suffix (e.g., PAY-20260227-FZKU) -- the `-FZKU` part should be removed
3. **No vendor bank details** on the voucher -- need to show vendor's bank name, branch, and account number
4. **Vendors only support one bank account** -- need support for multiple bank accounts per vendor
5. **No AP invoice description** on the voucher -- the reason/description from the AP invoice should appear in allocations
6. **Notes & Terms** footer line "All transactions are subject to audit and verification" should be removed

---

## Changes

### 1. Update Company Name in Database
- Update `companies` table: "NCG Holding" to "NCG Holding (Pvt) Ltd"
- Single SQL migration

### 2. Fix Payment Number Format
- **File:** `src/components/accounting/APPaymentForm.tsx` (line 70)
- Change from: `PAY-${format(new Date(), "yyyyMMdd")}-${Math.random()...FZKU}`
- Change to: `PAY-${format(new Date(), "yyyyMMdd")}-${sequential_number}` (use `useGenerateNumber('ap_payment')` hook, same pattern as vendor codes)

### 3. Create `vendor_bank_accounts` Table
- New migration to create a table supporting multiple bank accounts per vendor:
  - `id`, `vendor_id` (FK), `account_label` (e.g., "Primary", "USD Account"), `bank_name`, `bank_branch`, `account_number`, `account_holder_name`, `is_default`, `created_at`
- Keep existing single `bank_name/bank_branch/bank_account` fields on `vendors` table for backward compatibility

### 4. Update Vendor Form -- Multiple Bank Accounts
- **File:** `src/components/accounting/VendorForm.tsx`
- Replace the single "Banking Details" section with a dynamic list
- Add/Remove bank account rows with fields: Label, Bank Name, Branch, Account Number
- One account can be marked as default
- Save to new `vendor_bank_accounts` table

### 5. Update AP Payment Form -- Vendor Bank Account Selector
- **File:** `src/components/accounting/APPaymentForm.tsx`
- After vendor is selected, fetch that vendor's bank accounts from `vendor_bank_accounts`
- Show a "Pay To Account" dropdown listing the vendor's accounts (bank name + account number)
- Store selected `vendor_bank_account_id` on the payment record (new column on `ap_payments`)

### 6. Update Payment Voucher Template
- **File:** `src/lib/document-template-seeder.ts` (AP Payment Voucher section)
- Add a new "Vendor Bank Details" card showing:
  - Bank Name, Branch, Account Number, Account Holder
- These use new placeholders: `{{vendor_bank_name}}`, `{{vendor_bank_branch}}`, `{{vendor_account_number}}`

### 7. Update Allocations Table -- Add Invoice Description
- **File:** `src/lib/document-template-utils.ts` (`generateAllocationsTable`)
- Add a "Description" column pulling from `ap_invoices.notes` (the invoice description/reason)
- Update the data query to join and include invoice notes

### 8. Update Document Footer -- Remove Audit Line
- **File:** `src/lib/document-template-seeder.ts` (`buildFooter` function)
- Remove line: "1. All transactions are subject to audit and verification."
- Keep only: "This document is electronically generated and remains valid with the associated digital logs."

### 9. Update Placeholder Mapping
- **File:** `src/lib/document-template-utils.ts` (ap_payment_voucher case)
- Add new placeholders for vendor bank details from the selected vendor bank account
- Add invoice description/notes to allocation data

---

## Technical Details

### New Database Migration
```text
-- vendor_bank_accounts table
CREATE TABLE vendor_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  account_label TEXT DEFAULT 'Primary',
  bank_name TEXT NOT NULL,
  bank_branch TEXT,
  account_number TEXT NOT NULL,
  account_holder_name TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add vendor_bank_account_id to ap_payments
ALTER TABLE ap_payments ADD COLUMN vendor_bank_account_id UUID REFERENCES vendor_bank_accounts(id);

-- Update company name
UPDATE companies SET name = 'NCG Holding (Pvt) Ltd' WHERE name = 'NCG Holding';
```

### Files to Create
- `src/hooks/useVendorBankAccounts.ts` -- CRUD hook for vendor bank accounts

### Files to Modify (7)
- `src/components/accounting/VendorForm.tsx` -- Multi-bank account management UI
- `src/components/accounting/APPaymentForm.tsx` -- Vendor bank account selector + fix payment number
- `src/lib/document-template-seeder.ts` -- Update payment voucher template + footer
- `src/lib/document-template-utils.ts` -- Add vendor bank placeholders + allocation description column
- `src/integrations/supabase/types.ts` -- Add vendor_bank_accounts type
- Migration file for schema changes


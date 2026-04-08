

# Add Vendor Bill Number Field to AP Payment Form

## Problem
When recording an AP Payment, there's no field to capture the vendor's own bill/invoice number (the number on the vendor's document). This makes it hard to cross-reference payments with vendor bills later.

## Fix

### 1. Database Migration
Add a `vendor_bill_number` column to `ap_payments`:
```sql
ALTER TABLE ap_payments ADD COLUMN vendor_bill_number TEXT;
```

### 2. AP Payment Form (`src/components/accounting/APPaymentForm.tsx`)
- Add `vendor_bill_number` state field
- Add a "Vendor Bill #" input field in the form layout — place it in the row with Payment #, Vendor, and Payment Date (making it a 4-column grid or adding below)
- Include `vendor_bill_number` in the payment submission payload

### 3. AP Payments List (`src/components/accounting/APPaymentsView.tsx`)
- Add "Vendor Bill #" column to the payments table so it's visible in the list view

## Files to Change
- New SQL migration — add `vendor_bill_number` column to `ap_payments`
- `src/components/accounting/APPaymentForm.tsx` — add vendor bill number input field and include in submission
- `src/components/accounting/APPaymentsView.tsx` — show vendor bill # in the payments table
- `src/hooks/useAccountingMutations.ts` — include `vendor_bill_number` in the create payment mutation (if needed)

## Result
- Users can record the vendor's bill number when making payments
- Bill number shows in the payments list for easy cross-referencing
- Helps match payments to vendor invoices/bills


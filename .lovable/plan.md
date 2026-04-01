

# Update Special Hire Quotation Bank Account (Future Only)

## Current State
- Bank details on the quotation PDF are **hardcoded** in `QuotationPreview.tsx`:
  - Account No: 1934 1401 7578
  - Account Name: NCG EXPRESS (PVT) LTD
  - Bank Name: Sampath Bank, Nugegoda
- No database table stores quotation-display bank details
- Past quotations already generated as PDFs are safe — but the live preview of old quotations would also show the new bank if we just change the hardcode

## What Needs to Happen

### 1. Add bank detail columns to `special_hire_quotations` table
Add three columns to store the bank details **at the time of quotation creation** (point-in-time capture, same principle as fuel price):
- `payment_bank_name` (text)
- `payment_account_name` (text)  
- `payment_account_no` (text)

This ensures past quotations keep their original bank details and future ones use the new bank.

### 2. Add a "Quotation Bank Details" section to Special Hire Finance Settings
Add three new columns to `special_hire_finance_settings`:
- `quotation_bank_name`
- `quotation_account_name`
- `quotation_account_no`

Set default values:
- Bank: **Commercial Bank**
- Branch: **Nugegoda**
- Account No: **1001077213**
- Account Name: **NCG EXPRESS (PVT) LTD**

Add a UI section in `SpecialHireFinanceSettings.tsx` to manage these.

### 3. Capture bank details when creating a quotation
When a new Special Hire quotation is created, read the current bank details from `special_hire_finance_settings` and store them on the quotation record (point-in-time snapshot).

### 4. Update QuotationPreview to use stored bank details
In `QuotationPreview.tsx`, replace the hardcoded bank info with the quotation's stored `payment_bank_name`, `payment_account_name`, `payment_account_no`. Fall back to old Sampath details for existing quotations that don't have the new fields.

### 5. Backfill existing quotations
Set all existing quotations' bank fields to the old Sampath Bank details so they display correctly.

## Files to modify
- **SQL migration** — Add columns to `special_hire_quotations` and `special_hire_finance_settings`, backfill existing data, set new defaults
- **`src/components/special-hire/SpecialHireFinanceSettings.tsx`** — Add "Quotation Bank Details" section with 3 text fields
- **`src/components/special-hire/QuotationPreview.tsx`** — Read bank details from quotation props instead of hardcode, with fallback
- **`src/components/special-hire/SpecialHireForm.tsx`** (or wherever quotation creation happens) — Fetch current bank settings and include in quotation data

## Result
- All **existing** quotations show: Sampath Bank, 1934 1401 7578 (unchanged)
- All **future** quotations show: Commercial Bank Nugegoda, 1001077213
- Bank details are configurable from Settings — no code change needed for future bank changes
- Point-in-time capture ensures each quotation permanently records its bank details at creation


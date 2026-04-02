

# Fix: Update Bank Account Name + Replace Logo in Special Hire Documents

## Two Changes

### 1. Bank Account Name: "NCG EXPRESS (PVT) LTD" → "NCG Holding (Pvt) Ltd"
Update all **default/fallback** values only — old quotations with snapshot data keep their original values.

**Files with hardcoded fallback "NCG EXPRESS (PVT) LTD":**
- `src/components/special-hire/SpecialHireFinanceSettings.tsx` — default value and placeholder
- `src/components/special-hire/SpecialHireForm.tsx` — fallback in bank snapshot creation
- `src/components/special-hire/SpecialHireQuotationRepeatModal.tsx` — fallback in repeat flow
- `src/components/special-hire/QuotationPreview.tsx` — fallback when snapshot is empty (old quotations keep Sampath Bank fallback as-is for historical accuracy)

**Files with hardcoded bank details in invoice/receipt HTML:**
- `src/lib/invoice-generator.ts` — hardcoded "NCG Express (Pvt) Limited" and "Sampath Bank" in payment info section → update to "NCG Holding (Pvt) Ltd" and "Commercial Bank - Nugegoda" with account "1001077213"

### 2. Logo: Replace old NCG Express logo with NCG Holdings logo
Copy `user-uploads://images-2.png` to `public/lovable-uploads/` as the replacement, then update all references from the old logo path to the NCG Holdings logo.

**Files referencing old logo (`52e834c4-cfda-4ea3-9da7-aac1f23e1162.png`):**
- `src/components/special-hire/QuotationPreview.tsx` (2 places)
- `src/components/special-hire/BalanceInvoicePreview.tsx`
- `src/components/special-hire/AdvanceReceiptPreview.tsx`
- `src/components/special-hire/PostTripAdjustmentPreview.tsx`
- `src/components/special-hire/GenerateBalanceInvoiceModal.tsx`
- `src/components/special-hire/AdvanceDetailsPreview.tsx`
- `src/lib/invoice-generator.ts` (fallback)
- `src/lib/advance-details-generator.ts`

All logo references updated to use the new NCG Holdings logo at **same size, same position** — only the image file changes.

### 3. Company name text in HTML generators
Update "NCG EXPRESS (PRIVATE) LIMITED" text references to "NCG Holding (Pvt) Ltd" in:
- `src/lib/invoice-generator.ts`
- `src/lib/advance-details-generator.ts`

### What stays unchanged
- Old quotations with existing `payment_account_name` snapshot → rendered as stored
- Old quotations with null snapshot → keep Sampath Bank fallback (historical accuracy)
- Logo size, position, and layout — identical, just different image
- No flow changes, no structural changes


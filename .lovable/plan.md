

# Fix: Bank Name Still Shows "NCG EXPRESS (PVT) LTD" in Quotation Preview

## Problem
The previous update missed the fallback values in `QuotationPreview.tsx` lines 1018-1022. These are the values shown when a quotation has no stored bank snapshot (`payment_account_name`, `payment_bank_name`, etc. are null).

The old Sampath Bank fallback is intentionally kept for **historical** quotations (pre-transition). But the screenshot shows a **new** quotation (QUO-2026-1765) still displaying "NCG EXPRESS (PVT) LTD" — meaning the bank snapshot wasn't saved during creation, or the fallback is being used.

## Root Cause
Two possibilities:
1. The fallback on line 1020 still says "NCG EXPRESS (PVT) LTD" — needs updating to "NCG Holding (Pvt) Ltd"
2. The quotation was created before the SpecialHireForm snapshot fix was applied, so it has null bank fields

## Fix

**File: `src/components/special-hire/QuotationPreview.tsx`** (lines 1018-1022)

Update the 3 fallback values:
- `"1934 1401 7578"` → `"1001077213"`
- `"NCG EXPRESS (PVT) LTD"` → `"NCG Holding (Pvt) Ltd"`
- `"Sampath Bank, Nugegoda"` → `"Commercial Bank - Nugegoda"`

Also update the footer on line 1029:
- `"NCG Express"` → `"NCG Holding (Pvt) Ltd"`

**Note**: Old quotations that already have snapshot data stored will continue showing their original bank details — this only affects the fallback for quotations with null snapshot fields.




# Fix: Professional Logo in Document Previews

## Problem
1. The Payment Voucher and other document previews show "NCG Holding (Pvt) Ltd" as plain text instead of using the professional logo
2. The `{{ncg_master_logo}}` placeholder points to `/ncg-holdings-logo.png` which may be low quality or rendering too small (120px, max-height 40px)
3. Sub-companies don't inherit the parent company's logo when their own `logo_url` is empty
4. The user uploaded a cleaner NCG Holdings logo that should be used

## Changes

### 1. Copy uploaded logo to project
- Copy `user-uploads://images-2.png` to `public/ncg-holdings-logo.png` (replace the existing file with the professional version)

### 2. Fix logo size in AP Payment Voucher template
**File: `src/lib/document-template-seeder.ts`**
- Change logo styling from `width: 120px; max-height: 40px` to `width: 180px; max-height: 60px` so the logo is clearly visible and professional

### 3. Sub-company logo inheritance
**File: `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx`**
- When resolving the company for the preview, if the resolved company has no `logo_url`, look up its parent company and use the parent's `logo_url`
- This ensures all sub-companies (Yutong, Sinotruck, Special Hire, etc.) show the NCG Holdings logo

### 4. Fallback logo in placeholder mapping
**File: `src/lib/document-template-utils.ts`**
- Update `{{ncg_master_logo}}` to also check `companyData?.logo_url` before falling back to `/ncg-holdings-logo.png`
- This way if a company has a custom logo uploaded via settings, it takes priority

## Result
- All document previews show the professional NCG Holdings logo
- Sub-companies inherit parent logo automatically
- Logo renders at a visible, professional size
- Past documents unaffected (templates re-render on view)


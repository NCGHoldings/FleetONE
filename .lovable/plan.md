

# Reduce PDF File Sizes Across All Modules

## Problem
All document PDFs (special hire quotations, invoices, receipts, advance details) are excessively large because:

1. **PNG format used everywhere** -- 12 files use `toDataURL('image/png')` + `addImage(..., 'PNG')`. PNG is lossless and produces files 5-10x larger than JPEG for document screenshots
2. **High canvas scale (2x-2.5x)** -- every `html2canvas` call uses `scale: 2` or `scale: 2.5`, generating 4-6x more pixels than needed for A4 print quality
3. **Base64 stored in database** -- the `document_storage` table holds PDFs as base64 text, adding 33% overhead. Current total: ~172MB base64 across 130 documents. Yutong invoices average 14MB each

## Solution

### 1. Switch all PDF generation from PNG to JPEG with compression
Change every `toDataURL('image/png')` + `addImage(..., 'PNG')` to `toDataURL('image/jpeg', 0.85)` + `addImage(..., 'JPEG')` across all 12 files. This alone typically reduces file size by 70-80%.

### 2. Reduce html2canvas scale from 2/2.5 to 1.5
Scale 1.5 still produces 150 DPI effective resolution on A4 -- perfectly sharp for print. Reduces pixel count by ~55% vs scale 2.

### 3. Migrate document storage from database to Supabase Storage
- Store PDFs in a `generated-documents` storage bucket instead of the `document_data` TEXT column
- Keep metadata (file_name, file_size, quotation_id, etc.) in `document_storage` table
- Add a `storage_path` column to reference the file in storage
- Update all read/write operations to use storage instead of the TEXT column
- This eliminates the 33% base64 overhead and moves large blobs out of the database

### 4. Compress and migrate existing documents
- Run a data migration to re-encode existing base64 documents into the storage bucket
- Set `document_data` to NULL after migration to reclaim DB space

## Files to Change

**PDF generation (PNG→JPEG + scale reduction):**
- `src/lib/pdf-multi-page.ts` -- core multi-page generator
- `src/lib/yutong-invoice-generator.ts`
- `src/lib/yutong-order-invoice-generator.ts`
- `src/lib/sinotruck-order-invoice-generator.ts`
- `src/lib/lightvehicle-order-invoice-generator.ts`
- `src/lib/invoice-generator.ts`
- `src/lib/advance-details-generator.ts`
- `src/components/yutong/YutongQuotationViewModal.tsx`
- `src/components/yutong/YutongCashReceiptModal.tsx`
- `src/components/sinotruck/SinotruckQuotationViewModal.tsx`
- `src/components/sinotruck/SinotruckInvoiceGenerator.tsx`
- `src/components/sinotruck/SinotruckCashReceiptModal.tsx`
- `src/components/lightvehicle/LightVehicleQuotationViewModal.tsx`
- `src/components/lightvehicle/LightVehicleCashReceiptModal.tsx`
- `src/components/accounting/shared/FinanceDocumentPreviewModal.tsx`
- `src/components/shared/UnifiedDocumentPreview.tsx`
- `src/components/special-hire/EnhancedPDFViewer.tsx`
- `src/lib/yutong-quotation-regenerator.ts`

**Storage migration:**
- New Supabase migration (add `storage_path` column, create `generated-documents` bucket)
- `src/hooks/useDocumentManagement.ts` -- upload to storage instead of inserting base64
- `src/hooks/useYutongInvoiceManagement.ts` -- same
- `src/hooks/useDocumentRegeneration.ts` -- same
- `src/hooks/useFinanceApproval.ts` -- same
- `src/components/special-hire/DocumentViewer.tsx` -- read from storage
- `src/components/special-hire/EnhancedDocumentViewer.tsx` -- read from storage
- `src/components/special-hire/GenerateBalanceInvoiceModal.tsx` -- upload to storage

## Expected Impact
- Individual PDF size: ~10MB → ~500KB-1MB (90% reduction)
- Database size: ~172MB base64 → metadata only (~1MB)
- Total storage: moved to Supabase Storage bucket with efficient binary storage


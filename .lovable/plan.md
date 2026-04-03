
# Add Proforma Invoice Toggle to Special Hire Quotation Preview

## What to build
A toggle switch in the QuotationModal header that lets users switch between "Quotation" and "Proforma Invoice" view. When toggled, the document title, labels, and PDF filename change accordingly.

## Changes

### 1. `src/components/special-hire/QuotationPreview.tsx`
- Add new optional prop: `documentMode?: 'quotation' | 'proforma_invoice'` (default: `'quotation'`)
- Replace 4 hardcoded "Quotation" text instances with dynamic labels:
  - Line 257: `"Quotation Special Hire"` → `"Proforma Invoice Special Hire"` or `"Quotation Special Hire"`
  - Line 269: `"Quotation Generated on"` → `"Proforma Invoice Generated on"` or `"Quotation Generated on"`
  - Line 271: `"Quotation No:"` → `"Proforma Invoice No:"` or `"Quotation No:"`
  - Line 1060: Page 2 header `"Quotation No:"` → same dynamic label

### 2. `src/components/special-hire/QuotationModal.tsx`
- Add state: `const [documentMode, setDocumentMode] = useState<'quotation' | 'proforma_invoice'>('quotation')`
- Add a toggle switch (using existing Switch or segmented button) in the dialog header next to the action buttons
- Pass `documentMode` prop to `<QuotationPreview>`
- Update PDF filename: `Quotation_...` vs `Proforma_Invoice_...` based on mode
- Update email subject line to match the selected mode
- Update dialog title: "Quotation Preview" vs "Proforma Invoice Preview"

## Files to modify
- `src/components/special-hire/QuotationPreview.tsx` — accept `documentMode` prop, swap labels
- `src/components/special-hire/QuotationModal.tsx` — add toggle state, pass prop, update filename/subject



# Move Terms & Conditions to Page 2 in Special Hire Quotation

## Problem
The special hire quotation preview (`QuotationPreview.tsx`) renders everything in a single continuous `div`. When exported to PDF, the terms and conditions section often gets cut by page breaks. The Yutong and Light Vehicle quotations already solve this by using explicit page 1 / page 2 `div` elements.

## Solution
Split the special hire quotation into two explicit pages, following the same pattern used by Yutong and Light Vehicle quotations.

### File: `src/components/special-hire/QuotationPreview.tsx`

1. **Add page styles** — Add `<style>` block with `.page` CSS (A4 dimensions, page-break rules) matching the Yutong/Light Vehicle pattern.

2. **Wrap existing content (lines 205–1040) as Page 1** — Everything from header through the cost breakdown table and additional charges stays on page 1. Close the page div after the additional charges / cost breakdown section (around line 1028).

3. **Create Page 2** — New `<div className="page">` containing:
   - Repeated header (logo + quotation number + "Terms & Conditions" subtitle)
   - Payment Information section (moved from page 1)
   - Terms & Conditions section (moved from page 1)
   - Footer
   - Customer acceptance/signature area (if applicable)

4. **Page break CSS** — Ensure `page-break-after: always` on page 1 and `page-break-before: always` on page 2, so `sectionBasedPDF` captures them as separate pages cleanly.

### Technical Details
- The outer wrapper will contain two `.page` divs instead of one continuous div
- Each page will be `width: 210mm; min-height: 297mm` with proper padding
- Page 2 gets a mini header (logo + quotation number) for context, same as Yutong pattern
- The `data-pdf-section` attributes will be preserved for the smart page-break system


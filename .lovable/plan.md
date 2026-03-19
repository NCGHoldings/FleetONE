

# Fix PDF Page Break Cutting Through Terms & Conditions

## Problem
The `sectionBasedPDF` function captures the entire quotation container (both Page 1 and Page 2 divs) as one continuous canvas image, then slices it with a "smart break" algorithm. The explicit `pageBreakBefore: "always"` CSS on Page 2 is ignored by html2canvas since it only applies to print media. This causes the T&C section to be split mid-content as shown in the screenshot.

## Solution
Modify `sectionBasedPDF` in `src/lib/pdf-multi-page.ts` to detect explicit page boundaries. Instead of capturing the entire container as one canvas, it will:

1. Look for direct child elements that have `pageBreakBefore: "always"` or a specific data attribute (e.g., `data-pdf-page`)
2. If found, capture each page-div independently as its own canvas
3. Each captured canvas gets the existing smart-break treatment for its own content (in case a single page's content overflows A4)
4. If no page boundaries are found, fall back to the current single-canvas behavior

### File: `src/lib/pdf-multi-page.ts`

**Update `sectionBasedPDF`**:
- Before capturing, query for child divs with inline `pageBreakBefore` style or add a `data-pdf-page` marker
- Iterate each page element: capture with `html2canvas`, apply smart-break slicing, add to PDF
- This ensures Page 1 and Page 2 are cleanly separated without content being cut

### File: `src/components/special-hire/QuotationPreview.tsx`

**Add `data-pdf-page` attribute** to both page divs (Page 1 at ~line 205 and Page 2 at ~line 1050) so the PDF generator can reliably detect them as separate pages.

## Technical Detail
```text
Current flow:
  Container → html2canvas (one big image) → slice into pages → cuts T&C

New flow:
  Container → find [data-pdf-page] children
    → Page 1 div → html2canvas → smart-slice → PDF pages
    → Page 2 div → html2canvas → smart-slice → PDF pages
```


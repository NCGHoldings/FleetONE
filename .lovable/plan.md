

# Fix PDF Section Clipping Issue

## Problem
The `sectionBasedPDF` approach captures each `data-pdf-section` element individually with `html2canvas`, but `html2canvas` doesn't always capture the full visual height of each section — CSS grid gaps, margins between child elements, and `pre-wrap` whitespace cause the rendered bounding box to be slightly smaller than the visible content, resulting in text being cut at the bottom of each section.

## Root Cause
When `html2canvas` captures an individual DOM element, it uses the element's computed bounding box. With CSS `grid` layout, `gap`, and `whiteSpace: pre-wrap`, the actual visual content can extend slightly beyond the element's box. Each section loses a few pixels at the bottom, causing visible text clipping in the PDF.

## Solution: Whole-Canvas Capture with Smart Page Breaks

Instead of capturing each section individually (fragile), capture the **entire container as one canvas**, then find safe page-break points by scanning for horizontal white-space gaps between sections. This avoids the per-section clipping issue entirely.

### Changes

#### 1. `src/lib/pdf-multi-page.ts` — Replace `sectionBasedPDF`
Rewrite to:
1. Capture the entire container as a single canvas (preserving all content perfectly)
2. Calculate where each A4 page boundary would fall
3. At each boundary, scan upward from the cut line to find a fully-white pixel row (a gap between sections)
4. Slice at that safe row instead of the exact page boundary
5. This ensures text is never cut — breaks only happen in whitespace gaps

```text
Algorithm:
  1. html2canvas(entire container) → one big canvas
  2. targetSliceY = pageHeightInPx
  3. Scan from targetSliceY upward (up to 150px) for a row where all pixels are white
  4. If found, slice there. If not found, slice at targetSliceY (fallback)
  5. Create page canvas from slice, add to PDF
  6. Repeat from the slice point for next page
```

Key constants: A4 ratio, 10mm margins, scale factor 2, JPEG 92% quality.

#### 2. `src/components/special-hire/QuotationPreview.tsx` — Remove workarounds
- Remove `whiteSpace: "pre-wrap"`, `wordSpacing: "1px"`, `letterSpacing: "0.01em"` from the container — these were workarounds that caused layout changes
- Keep the `data-pdf-section` attributes (harmless, useful for future reference)
- Ensure adequate `margin-bottom` or `padding-bottom` on sections to create clear white-space gaps between them for the smart break detection

#### 3. No changes needed to call sites
`QuotationModal.tsx`, `QuotationsList.tsx`, `DocumentPreviewModal.tsx` all call `sectionBasedPDF(element)` — the function signature stays the same, just the internal implementation changes.

## Expected Result
- Full content captured perfectly (no per-section clipping)
- Page breaks happen at natural whitespace gaps between sections
- Text is never cut across pages
- All words properly spaced (no merging)


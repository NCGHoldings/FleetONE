

# Fix PDF Content Stretching

## Problem
The content is horizontally compressed, causing it to appear stretched/distorted. The container is captured at 210mm width (with 15mm internal padding already baked in), but is then placed into a 190mm-wide area (`CONTENT_WIDTH_MM`) with 10mm margins. This squeezes 210mm of content into 190mm horizontally while the vertical scale remains based on 210mm — breaking the aspect ratio.

## Fix — `src/lib/pdf-multi-page.ts`

Since the `QuotationPreview` container already has 15mm internal padding (via `box-sizing: border-box`), the captured canvas includes its own whitespace margins. The PDF should place the image at the **full A4 width** with no additional margins.

Changes to `sectionBasedPDF`:
- Remove `MARGIN_MM` and `CONTENT_WIDTH_MM` / `CONTENT_HEIGHT_MM` calculations
- Set `pxPerMM = imgWidth / A4_WIDTH_MM` (already correct)
- Use `pageContentHeightPx = A4_HEIGHT_MM * pxPerMM` (full page height, no margin subtracted)
- Place image at `pdf.addImage(..., 0, 0, A4_WIDTH_MM, destHeightMM)` — full width, no offset
- `destHeightMM = sliceHeight / pxPerMM` (already correct)

This ensures the aspect ratio is perfectly preserved since both width and height use the same `pxPerMM` scale factor, and the container's built-in 15mm padding provides the visual margins.

## Files
- `src/lib/pdf-multi-page.ts` — single file change


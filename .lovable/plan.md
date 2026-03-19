

# Image-Based PDF: Pixel-Perfect Page Capture for Special Hire Quotes

## Problem
The current PDF generation uses `html2canvas` with smart page-break slicing, which can distort layout, introduce blank pages, and not match the preview exactly. The user wants each page to render as a pixel-perfect image in the PDF, exactly as seen in the preview.

## Solution
Replace the smart page-break slicing approach with a simpler **one image per PDF page** strategy. Each `data-pdf-page` section is captured via `html2canvas` as a single high-resolution image and placed on its own PDF page, sized to fit A4 width with proportional height.

### File: `src/lib/pdf-multi-page.ts`

**Rewrite `sectionBasedPDF`** to use a straightforward approach:
1. Find all `[data-pdf-page]` elements (or fall back to the whole container)
2. Capture each element with `html2canvas` at scale 2
3. Add each canvas as a full-width JPEG image on its own PDF page — no slicing, no smart breaks
4. If the captured image is taller than A4, scale it to fit the page width and let the height extend naturally (single tall page) OR scale to fit within A4 bounds

```text
Current flow:
  html2canvas(section) → smart-slice into A4 chunks → add slices as pages
  → blank pages, text cutting, layout drift

New flow:
  html2canvas(section) → add as ONE image per PDF page (scaled to A4 width)
  → pixel-perfect, no slicing artifacts
```

### Key changes:
- Each `data-pdf-page` div becomes exactly one PDF page
- Image is scaled to fill A4 width (210mm), height is proportional
- No smart-break scanning, no slice skipping — eliminates blank page bugs entirely
- Keep `letterRendering: true` and `useCORS: true` for text fidelity

### File: `src/components/special-hire/QuotationModal.tsx`
- No changes needed — it already calls `sectionBasedPDF`




# Fix PDF Page Break Text Cutting

## Problem
The current multi-page PDF approach slices the canvas at fixed pixel intervals (A4 page height), which cuts through text lines at page boundaries. The screenshot shows "Damage Policy" text being split across two pages.

## Solution
Switch from fixed-interval canvas slicing to **section-based PDF generation**. Each logical section of the quotation is captured individually as its own canvas, then placed on PDF pages with intelligent overflow handling — if a section won't fit on the current page, it starts on a new page.

## Changes

### 1. `src/components/special-hire/QuotationPreview.tsx`
Add `data-pdf-section` attributes to each logical block:
- Header (logo + title + company info)
- Customer Details
- Pickup/Dropoff table
- Vehicle Details table
- Route Information (if present)
- Extra Charges
- Payment Information
- Terms and Conditions
- Footer

### 2. `src/lib/pdf-multi-page.ts`
Replace the fixed-interval slicing with a new section-based approach:

```typescript
export const sectionBasedPDF = async (container: HTMLElement): jsPDF => {
  const sections = container.querySelectorAll('[data-pdf-section]');
  // If no sections found, fall back to capturing the whole container
  
  for (each section):
    1. Capture section with html2canvas
    2. Calculate scaled height in mm
    3. If it won't fit on current page → add new page
    4. Add image at current Y position with margins
    5. Advance Y position
}
```

Key details:
- A4 margins: 15mm on each side (matching the preview's padding)
- Content width: 180mm (210 - 2×15)
- Section gap: 2mm between sections
- If a single section is taller than a page, fall back to fixed-interval slicing for that section only

### 3. Update all 3 PDF generation call sites
- `QuotationModal.tsx` — `handleDownload` and `generatePDFBase64`
- `QuotationsList.tsx` — `generatePDFBase64`
- `DocumentPreviewModal.tsx` — `handleGeneratePDF`

Change from: capture whole element → `canvasToMultiPagePDF(canvas)`
Change to: pass the element directly → `sectionBasedPDF(element)`

### 4. `src/lib/yutong-quotation-regenerator.ts`
Keep using `canvasToMultiPagePDF` as fallback (Yutong quotations have different structure).

## Result
- Text never gets cut at page boundaries
- Each section starts cleanly on the page
- Long sections (like T&C) that exceed one page still get sliced but only within that section


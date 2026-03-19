

# Fix Special Hire Quotation PDF Format

## Problem
The quotation PDF is badly formatted because:
1. The entire quotation preview (which can be 2+ pages of content) is captured as a single canvas image and scaled down to fit one A4 page, making text tiny and unreadable
2. No multi-page support -- content beyond one page is either cut off or compressed
3. In offscreen rendering (QuotationsList bulk operations), Tailwind CSS classes don't apply correctly, causing the header/layout to break

## Solution
Implement multi-page PDF generation across all 3 quotation PDF generation points. Instead of scaling the entire canvas to fit one page, slice the canvas into A4-height segments and place each segment on a separate PDF page.

## Files to modify

### 1. `src/components/special-hire/QuotationModal.tsx`
- **`handleDownload` (line 294-336)**: Replace single-page logic with multi-page canvas slicing
- **`generatePDFBase64` (line 339-363)**: Same multi-page fix for email/WhatsApp PDF generation
- Core change: After capturing the canvas, calculate how many A4 pages are needed based on the content height-to-width ratio, then loop through pages slicing the canvas accordingly

### 2. `src/components/special-hire/QuotationsList.tsx`
- **`generatePDFBase64` (line 430-487)**: Same multi-page fix for bulk email/WhatsApp from the list view
- Also increase the offscreen container width precision and add inline styles fallback

### 3. `src/components/special-hire/DocumentPreviewModal.tsx`
- **`handleGeneratePDF` (line 200-249)**: Same multi-page fix for the document preview modal download

## Multi-page PDF logic (applied to all 3 files)

```typescript
// After html2canvas generates the canvas:
const pdfWidth = pdf.internal.pageSize.getWidth();
const pdfHeight = pdf.internal.pageSize.getHeight();
const imgWidth = canvas.width;
const imgHeight = canvas.height;

// Scale canvas width to fit A4 width
const scaledWidth = pdfWidth;
const scaledHeight = (imgHeight * pdfWidth) / imgWidth;

// If content fits one page, use single page
if (scaledHeight <= pdfHeight) {
  pdf.addImage(imgData, 'JPEG', 0, 0, scaledWidth, scaledHeight);
} else {
  // Multi-page: slice canvas into page-height segments
  const pageCanvasHeight = (imgWidth * pdfHeight) / pdfWidth; // canvas pixels per page
  const totalPages = Math.ceil(imgHeight / pageCanvasHeight);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();

    const srcY = page * pageCanvasHeight;
    const srcH = Math.min(pageCanvasHeight, imgHeight - srcY);
    const destH = (srcH * pdfWidth) / imgWidth;

    // Create a temporary canvas for this page slice
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = imgWidth;
    pageCanvas.height = srcH;
    const ctx = pageCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, srcY, imgWidth, srcH, 0, 0, imgWidth, srcH);

    const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(pageImgData, 'JPEG', 0, 0, pdfWidth, destH);
  }
}
```

## Expected result
- PDF content spans multiple pages when needed (terms & conditions flow to page 2)
- Text remains full-size and readable (no compression/squeezing)
- Header with logo and blue "Quotation Special Hire" banner renders correctly
- All 3 PDF generation paths (modal download, email/WhatsApp, document preview) produce consistent output


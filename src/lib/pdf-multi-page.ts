import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Renders a canvas into a multi-page A4 PDF by slicing the canvas into page-height segments.
 * Returns the jsPDF instance for further use (save, base64 export, etc.).
 */
export const canvasToMultiPagePDF = (canvas: HTMLCanvasElement): jsPDF => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // Scale canvas width to fit A4 width
  const scaledHeight = (imgHeight * pdfWidth) / imgWidth;

  if (scaledHeight <= pdfHeight) {
    // Content fits on a single page
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, scaledHeight);
  } else {
    // Multi-page: slice canvas into page-height segments
    const pageCanvasHeight = (imgWidth * pdfHeight) / pdfWidth; // canvas pixels per A4 page
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
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, imgWidth, srcH);
        ctx.drawImage(canvas, 0, srcY, imgWidth, srcH, 0, 0, imgWidth, srcH);
      }

      const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(pageImgData, 'JPEG', 0, 0, pdfWidth, destH);
    }
  }

  return pdf;
};

/**
 * Section-based PDF generation that avoids cutting text at page boundaries.
 * Captures each [data-pdf-section] element individually and places them on pages
 * with intelligent overflow — if a section won't fit, it starts on a new page.
 * Falls back to canvasToMultiPagePDF if no sections are found.
 */
export const sectionBasedPDF = async (container: HTMLElement): Promise<jsPDF> => {
  const sections = Array.from(
    container.querySelectorAll('[data-pdf-section]')
  ) as HTMLElement[];

  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const MARGIN_MM = 10;
  const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2;
  const MAX_CONTENT_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_MM * 2;
  const SECTION_GAP_MM = 2;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let currentY = MARGIN_MM;

  // Fallback: no sections found, use whole-container canvas slicing
  if (sections.length === 0) {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    return canvasToMultiPagePDF(canvas);
  }

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    const canvas = await html2canvas(section, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const scaleFactor = CONTENT_WIDTH_MM / (canvas.width / 2);
    const sectionHeightMM = (canvas.height / 2) * scaleFactor;

    const remainingSpace = A4_HEIGHT_MM - MARGIN_MM - currentY;

    // If section won't fit and we're not at the top of a page, start new page
    if (sectionHeightMM > remainingSpace && currentY > MARGIN_MM) {
      pdf.addPage();
      currentY = MARGIN_MM;
    }

    // If section is taller than a full page, slice it
    if (sectionHeightMM > MAX_CONTENT_HEIGHT_MM) {
      // Slice this oversized section into page-height segments
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pxPerMM = (imgWidth / 2) / CONTENT_WIDTH_MM;
      const pageSliceHeightPx = MAX_CONTENT_HEIGHT_MM * pxPerMM * 2; // *2 because scale=2

      let srcY = 0;
      while (srcY < imgHeight) {
        if (currentY > MARGIN_MM) {
          pdf.addPage();
          currentY = MARGIN_MM;
        }

        const srcH = Math.min(pageSliceHeightPx, imgHeight - srcY);
        const destH = (srcH / 2) * scaleFactor;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgWidth;
        sliceCanvas.height = srcH;
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, imgWidth, srcH);
          ctx.drawImage(canvas, 0, srcY, imgWidth, srcH, 0, 0, imgWidth, srcH);
        }

        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
        pdf.addImage(sliceData, 'JPEG', MARGIN_MM, currentY, CONTENT_WIDTH_MM, destH);

        currentY += destH + SECTION_GAP_MM;
        srcY += srcH;
      }
    } else {
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(imgData, 'JPEG', MARGIN_MM, currentY, CONTENT_WIDTH_MM, sectionHeightMM);
      currentY += sectionHeightMM + SECTION_GAP_MM;
    }
  }

  return pdf;
};

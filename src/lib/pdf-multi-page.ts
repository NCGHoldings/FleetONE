import { jsPDF } from 'jspdf';

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

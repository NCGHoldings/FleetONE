import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Checks if a row of pixels is safe to break on — i.e. contains no dark pixels (text).
 * Light backgrounds, borders, and colored headers are considered safe break points.
 */
const isRowSafeToBreak = (imageData: Uint8ClampedArray, width: number): boolean => {
  for (let x = 0; x < width * 4; x += 4) {
    const r = imageData[x];
    const g = imageData[x + 1];
    const b = imageData[x + 2];
    // If any pixel is "dark" (likely text), this row is NOT safe to break
    if (r < 180 && g < 180 && b < 180) return false;
  }
  return true;
};

/**
 * Finds a safe Y position to slice the canvas at, scanning upward from targetY
 * to find a fully white row (gap between sections). Returns the best Y to cut at.
 */
const findSafeBreakY = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  targetY: number,
  maxSearchUp: number
): number => {
  const minY = Math.max(0, targetY - maxSearchUp);
  for (let y = targetY; y >= minY; y--) {
    const rowData = ctx.getImageData(0, y, canvasWidth, 1).data;
    if (isRowSafeToBreak(rowData, canvasWidth)) {
      return y;
    }
  }
  // No white row found within search range — fall back to target
  return targetY;
};

/**
 * Whole-canvas capture with smart page breaks.
 * Captures the entire container as one canvas, then slices into A4 pages
 * at whitespace gaps between sections so text is never cut.
 */
export const sectionBasedPDF = async (container: HTMLElement): Promise<jsPDF> => {
  const SCALE = 2;
  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  // Max pixels to scan upward looking for a safe break (at scale=2)
  const MAX_SEARCH_PX = 250 * SCALE;

  // 1. Capture entire container as one high-res canvas
  const canvas = await html2canvas(container, {
    scale: SCALE,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    letterRendering: true,
  } as any);

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // Pixels per mm at this scale
  const pxPerMM = imgWidth / A4_WIDTH_MM;
  const pageContentHeightPx = A4_HEIGHT_MM * pxPerMM;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas 2d context');
  }

  let currentY = 0;
  let pageIndex = 0;

  while (currentY < imgHeight) {
    if (pageIndex > 0) pdf.addPage();

    const remainingHeight = imgHeight - currentY;
    let sliceHeight: number;

    if (remainingHeight <= pageContentHeightPx) {
      // Last page — take everything remaining
      sliceHeight = remainingHeight;
    } else {
      // Find a safe break point by scanning upward from the ideal cut line
      const idealCutY = currentY + pageContentHeightPx;
      const safeCutY = findSafeBreakY(ctx, imgWidth, Math.floor(idealCutY), MAX_SEARCH_PX);
      sliceHeight = safeCutY - currentY;

      // Safety: ensure we always advance at least half a page to avoid infinite loops
      if (sliceHeight < pageContentHeightPx * 0.3) {
        sliceHeight = pageContentHeightPx;
      }
    }

    // Create page slice canvas
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = imgWidth;
    pageCanvas.height = sliceHeight;
    const pageCtx = pageCanvas.getContext('2d');
    if (pageCtx) {
      pageCtx.fillStyle = '#ffffff';
      pageCtx.fillRect(0, 0, imgWidth, sliceHeight);
      pageCtx.drawImage(canvas, 0, currentY, imgWidth, sliceHeight, 0, 0, imgWidth, sliceHeight);
    }

    // Convert to image and add to PDF
    const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.92);
    const destHeightMM = sliceHeight / pxPerMM;
    pdf.addImage(pageImgData, 'JPEG', 0, 0, A4_WIDTH_MM, destHeightMM);

    currentY += sliceHeight;
    pageIndex++;

    // Safety: prevent infinite loop
    if (pageIndex > 50) break;
  }

  return pdf;
};

/**
 * Legacy helper — kept for backward compatibility.
 */
export const canvasToMultiPagePDF = (canvas: HTMLCanvasElement): jsPDF => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const scaledHeight = (imgHeight * pdfWidth) / imgWidth;

  if (scaledHeight <= pdfHeight) {
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, scaledHeight);
  } else {
    const pageCanvasHeight = (imgWidth * pdfHeight) / pdfWidth;
    const totalPages = Math.ceil(imgHeight / pageCanvasHeight);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();
      const srcY = page * pageCanvasHeight;
      const srcH = Math.min(pageCanvasHeight, imgHeight - srcY);
      const destH = (srcH * pdfWidth) / imgWidth;

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

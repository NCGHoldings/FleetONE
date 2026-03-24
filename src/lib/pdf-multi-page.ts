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
/**
 * Adds a single canvas to the PDF, slicing with smart breaks if it exceeds one A4 page.
 */
const addCanvasToPDF = (
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  pageIndex: { value: number },
  a4WidthMM: number,
  a4HeightMM: number,
  maxSearchPx: number
) => {
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const pxPerMM = imgWidth / a4WidthMM;
  const pageContentHeightPx = a4HeightMM * pxPerMM;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let currentY = 0;

  while (currentY < imgHeight) {
    if (pageIndex.value > 0) pdf.addPage();

    const remainingHeight = imgHeight - currentY;
    let sliceHeight: number;

    if (remainingHeight <= pageContentHeightPx) {
      sliceHeight = remainingHeight;
    } else {
      const idealCutY = currentY + pageContentHeightPx;
      const safeCutY = findSafeBreakY(ctx, imgWidth, Math.floor(idealCutY), maxSearchPx);
      sliceHeight = safeCutY - currentY;

      if (sliceHeight < pageContentHeightPx * 0.3) {
        sliceHeight = pageContentHeightPx;
      }
    }

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = imgWidth;
    pageCanvas.height = sliceHeight;
    const pageCtx = pageCanvas.getContext('2d');
    if (pageCtx) {
      pageCtx.fillStyle = '#ffffff';
      pageCtx.fillRect(0, 0, imgWidth, sliceHeight);
      pageCtx.drawImage(canvas, 0, currentY, imgWidth, sliceHeight, 0, 0, imgWidth, sliceHeight);
    }

    const destHeightMM = sliceHeight / pxPerMM;

    // Skip near-empty slices (less than 10mm of content) to avoid blank pages
    if (destHeightMM < 10) {
      currentY += sliceHeight;
      continue;
    }

    const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(pageImgData, 'JPEG', 0, 0, a4WidthMM, destHeightMM);

    currentY += sliceHeight;
    pageIndex.value++;

    if (pageIndex.value > 50) break;
  }
};

/**
 * Whole-canvas capture with smart page breaks.
 * If the container has children marked with data-pdf-page, each is captured
 * independently to respect explicit page boundaries. Otherwise falls back
 * to capturing the entire container as one canvas.
 */
export const sectionBasedPDF = async (container: HTMLElement): Promise<jsPDF> => {
  const SCALE = 1.5;
  const A4_WIDTH_MM = 210;

  // Wait for fonts to be fully loaded before capturing
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const html2canvasOpts = {
    scale: SCALE,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    letterRendering: false,
    foreignObjectRendering: false,
    removeContainer: true,
    scrollX: 0,
    scrollY: 0,
    onclone: (clonedDoc: Document) => {
      const style = clonedDoc.createElement('style');
      style.textContent = `
        * {
          letter-spacing: normal !important;
          word-spacing: normal !important;
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: antialiased;
        }
      `;
      clonedDoc.head.appendChild(style);
    },
  } as any;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Check for explicit page boundary markers
  const pageElements = container.querySelectorAll<HTMLElement>('[data-pdf-page]');
  const elements = pageElements.length > 0
    ? Array.from(pageElements)
    : [container];

  for (let i = 0; i < elements.length; i++) {
    // Ensure all images in this section are loaded before capture
    const images = Array.from(elements[i].querySelectorAll('img'));
    await Promise.all(
      images.map((img) =>
        img.decode
          ? img.decode().catch(() => {})
          : new Promise<void>((resolve) => {
              if (img.complete) return resolve();
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
      )
    );

    const canvas = await html2canvas(elements[i], html2canvasOpts);
    const imgData = canvas.toDataURL('image/png');

    // Scale image to fill A4 width, height is proportional
    const imgHeightMM = (canvas.height * A4_WIDTH_MM) / canvas.width;

    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, imgHeightMM);
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

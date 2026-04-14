/**
 * Cell Layout → HTML Converter
 * 
 * Converts the cell-based JSON layout into clean HTML
 * that can be rendered in previews and exported to PDF.
 * Uses CSS Flexbox for layout to ensure stable alignment.
 * 
 * Respects fontWeight and indentLevel from cellDocumentTypes
 * to match the LGH Document Formatting Guidelines.
 */

import type { CellLayout, CellRow, CellItem, CellAlignH, CellAlignV } from '@/types/cellDocumentTypes';
import { INDENT_PX_PER_LEVEL } from '@/types/cellDocumentTypes';

/** Map horizontal alignment to CSS justify-content */
function alignHToCSS(align: CellAlignH): string {
  switch (align) {
    case 'left': return 'flex-start';
    case 'center': return 'center';
    case 'right': return 'flex-end';
    case 'justify': return 'flex-start';
  }
}

/** Map vertical alignment to CSS align-items */
function alignVToCSS(align: CellAlignV): string {
  switch (align) {
    case 'top': return 'flex-start';
    case 'middle': return 'center';
    case 'bottom': return 'flex-end';
  }
}

/** Map horizontal alignment to CSS text-align */
function alignHToTextAlign(align: CellAlignH): string {
  return align; // 'left', 'center', 'right', 'justify' map directly
}

/** Convert a single cell to HTML */
function cellItemToHtml(cell: CellItem): string {
  const styles = [
    `width: ${cell.width}`,
    `display: flex`,
    `justify-content: ${alignHToCSS(cell.alignH)}`,
    `align-items: ${alignVToCSS(cell.alignV)}`,
    `text-align: ${alignHToTextAlign(cell.alignH)}`,
    `box-sizing: border-box`,
    `padding: ${cell.padding ?? 2}px ${cell.padding ?? 4}px`,
    `word-wrap: break-word`,
    `overflow-wrap: break-word`,
    `font-size: inherit`,
    `font-family: inherit`,
    `line-height: inherit`,
    `font-weight: ${cell.fontWeight || 'normal'}`,
  ];

  if (cell.minHeight) {
    styles.push(`min-height: ${cell.minHeight}px`);
  }

  // Ensure content is wrapped in a block element for proper rendering
  let content = cell.content || '';
  // If content is just plain text (no HTML tags), wrap in <p>
  if (content && !content.trim().startsWith('<')) {
    content = `<p style="margin: 0; font-weight: ${cell.fontWeight || 'normal'};">${content}</p>`;
  }
  
  const contentWrapper = `<div style="width: 100%; text-align: ${alignHToTextAlign(cell.alignH)}; margin: 0;">${content || '&nbsp;'}</div>`;

  return `<div class="cell-item cell-type-${cell.type}" data-cell-id="${cell.id}" style="${styles.join('; ')};">${contentWrapper}</div>`;
}

/** Convert a row to HTML — applies indentLevel as padding-left */
function rowToHtml(row: CellRow): string {
  const indentPx = (row.indentLevel || 0) * INDENT_PX_PER_LEVEL;
  
  const styles = [
    'display: flex',
    'flex-wrap: nowrap',
    'width: 100%',
  ];

  if (indentPx > 0) {
    styles.push(`padding-left: ${indentPx}px`);
  }

  if (row.minHeight) {
    styles.push(`min-height: ${row.minHeight}px`);
  }

  if (row.borderBottom) {
    styles.push('border-bottom: 1px solid #e5e7eb');
    styles.push('padding-bottom: 4px');
    styles.push('margin-bottom: 4px');
  }

  const cellsHtml = row.cells.map(cellItemToHtml).join('\n    ');

  return `<div class="cell-row cell-preset-${row.preset || 'custom'}" data-row-id="${row.id}" data-indent="${row.indentLevel || 0}" style="${styles.join('; ')};">
    ${cellsHtml}
  </div>`;
}

/**
 * Convert a CellLayout to HTML string.
 * This is the main export used to generate preview/PDF-compatible HTML.
 */
export function cellLayoutToHtml(layout: CellLayout): string {
  if (!layout || !layout.rows || layout.rows.length === 0) {
    return '<p>&nbsp;</p>';
  }

  const rowsHtml = layout.rows.map(rowToHtml).join('\n  ');

  return `<div class="cell-layout" style="width: 100%;">
  ${rowsHtml}
</div>`;
}

/**
 * Generate CSS for cell-based layouts.
 * This CSS is injected into the preview/PDF rendering.
 */
export function generateCellLayoutCSS(): string {
  return `
    .cell-layout {
      width: 100%;
    }

    .cell-row {
      display: flex !important;
      flex-wrap: nowrap !important;
      width: 100% !important;
      page-break-inside: avoid;
    }

    .cell-item {
      display: flex !important;
      box-sizing: border-box !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
    }

    .cell-item > div {
      width: 100%;
    }

    /* Numeral cells: fixed width, no shrink */
    .cell-type-numeral {
      flex-shrink: 0 !important;
    }

    /* Heading cells: bold */
    .cell-type-heading {
      font-weight: bold;
    }

    /* Section heading preset: match PDF Size 11 Bold */
    .cell-preset-section-heading .cell-item {
      font-weight: bold;
    }

    /* Sub-heading presets: bold */
    .cell-preset-sub-heading-l1 .cell-item,
    .cell-preset-sub-heading-l2 .cell-item,
    .cell-preset-sub-heading-l3 .cell-item {
      font-weight: bold;
    }

    /* Roman numeral & alphabetical presets: normal weight */
    .cell-preset-roman-numeral .cell-type-numeral,
    .cell-preset-alphabetical .cell-type-numeral {
      font-weight: normal;
    }

    /* Body text preset */
    .cell-preset-body-text .cell-item {
      font-weight: normal;
    }

    /* Print/PDF: ensure rows don't break */
    @media print {
      .cell-row {
        page-break-inside: avoid !important;
      }
    }
  `;
}

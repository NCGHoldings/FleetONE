/**
 * Cell-Based Document Builder Types
 * 
 * These types define the JSON structure for the cell/grid-based
 * document editor. Each section stores its layout as CellLayout JSON,
 * which is converted to HTML for preview and PDF rendering.
 * 
 * Presets follow the LGH Document Formatting Guidelines V3.0:
 * - Section Headings: "1.0  Purpose" (bold, Size 11)
 * - Sub-Headings L1: "3.1  Title" (bold, indented)
 * - Sub-Headings L2: "3.1.1  Title" (bold, deeper indent)
 * - Roman Numerals: "i.  Point text" (normal weight)
 * - Alphabetical: "a.  Sub-point text" (normal weight)
 * - Body Text: Full-width paragraph (normal weight)
 */

/** Horizontal alignment for cell content */
export type CellAlignH = 'left' | 'center' | 'right' | 'justify';

/** Vertical alignment for cell content */
export type CellAlignV = 'top' | 'middle' | 'bottom';

/** Content type within a cell */
export type CellContentType = 'text' | 'numeral' | 'heading' | 'image' | 'table';

/** Font weight for cell content */
export type CellFontWeight = 'normal' | 'bold';

/** Row preset type — tracks which template was used */
export type RowPreset = 
  | 'section-heading'    // 1.0  Purpose
  | 'sub-heading-l1'     // 3.1  Title
  | 'sub-heading-l2'     // 3.1.1  Title
  | 'sub-heading-l3'     // 3.1.1.1  Title
  | 'roman-numeral'      // i.  Point text
  | 'alphabetical'       // a.  Sub-point text
  | 'body-text'          // Full-width paragraph
  | 'table-row'          // Flexible columns
  | 'full-width'         // Single cell, 100%
  | 'custom';            // User-defined

/** Editor mode for a section */
export type EditorMode = 'hierarchical' | 'cell-grid';

/** A single cell within a row */
export interface CellItem {
  id: string;
  /** Width as percentage (e.g., "50%") or "auto" */
  width: string;
  /** HTML content of the cell */
  content: string;
  /** Horizontal alignment */
  alignH: CellAlignH;
  /** Vertical alignment */
  alignV: CellAlignV;
  /** Content type hint for styling */
  type: CellContentType;
  /** Font weight: bold for headings, normal for body */
  fontWeight: CellFontWeight;
  /** Optional min-height in px */
  minHeight?: number;
  /** Optional padding in px */
  padding?: number;
}

/** A row containing one or more cells */
export interface CellRow {
  id: string;
  cells: CellItem[];
  /** Which preset template this row was created from */
  preset: RowPreset;
  /** Indentation level (0-3), maps to padding-left */
  indentLevel: number;
  /** Optional row minimum height in px */
  minHeight?: number;
  /** Optional bottom border */
  borderBottom?: boolean;
}

/** The complete cell layout for a section */
export interface CellLayout {
  editorMode: 'cell-grid';
  rows: CellRow[];
}

/** Per-section editor mode mapping */
export type SectionEditorModes = Record<string, EditorMode>;

/** Per-section cell data mapping */
export type SectionCellData = Record<string, CellLayout>;

// ─── Helpers ─────────────────────────────────────────────

/** Generate a unique ID for rows/cells */
export function generateCellId(prefix: 'r' | 'c' = 'c'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Create a cell with explicit font weight */
function createCell(
  width: string,
  type: CellContentType,
  fontWeight: CellFontWeight,
  content = '',
  alignH: CellAlignH = 'left'
): CellItem {
  return {
    id: generateCellId('c'),
    width,
    content,
    alignH,
    alignV: 'top',
    type,
    fontWeight,
  };
}

/** Create a default empty cell */
export function createEmptyCell(width = '100%'): CellItem {
  return createCell(width, 'text', 'normal');
}

// ─── PDF-Compliant Row Presets ───────────────────────────

/**
 * Section Heading Row: "1.0  Purpose"
 * - Two cells: narrow numeral (left) + wide heading (right)
 * - Both bold, indent level 0
 * - Per PDF Slide 15: Arabic numerals 1.0, 2.0, 3.0
 */
export function createSectionHeadingRow(sectionNum = ''): CellRow {
  return {
    id: generateCellId('r'),
    preset: 'section-heading',
    indentLevel: 0,
    cells: [
      createCell('10%', 'numeral', 'bold', sectionNum, 'left'),
      createCell('90%', 'heading', 'bold'),
    ],
  };
}

/**
 * Sub-Heading Level 1 Row: "3.1  Title"
 * - Two cells: numeral + heading, both bold
 * - Indent level 1
 * - Per PDF Slide 15: e.g. 3.1, 3.2
 */
export function createSubHeadingL1Row(subNum = ''): CellRow {
  return {
    id: generateCellId('r'),
    preset: 'sub-heading-l1',
    indentLevel: 1,
    cells: [
      createCell('10%', 'numeral', 'bold', subNum, 'left'),
      createCell('90%', 'heading', 'bold'),
    ],
  };
}

/**
 * Sub-Heading Level 2 Row: "3.1.1  Title"
 * - Two cells: numeral + heading, both bold
 * - Indent level 2
 * - Per PDF Slide 15: e.g. 3.1.1, 3.2.1
 */
export function createSubHeadingL2Row(subNum = ''): CellRow {
  return {
    id: generateCellId('r'),
    preset: 'sub-heading-l2',
    indentLevel: 2,
    cells: [
      createCell('12%', 'numeral', 'bold', subNum, 'left'),
      createCell('88%', 'heading', 'bold'),
    ],
  };
}

/**
 * Sub-Heading Level 3 Row: "3.1.1.1  Title"
 * - Two cells: numeral + heading, both bold
 * - Indent level 3
 * - Per PDF Slide 15: e.g. 3.2.2.1
 */
export function createSubHeadingL3Row(subNum = ''): CellRow {
  return {
    id: generateCellId('r'),
    preset: 'sub-heading-l3',
    indentLevel: 3,
    cells: [
      createCell('14%', 'numeral', 'bold', subNum, 'left'),
      createCell('86%', 'heading', 'bold'),
    ],
  };
}

/**
 * Roman Numeral Point Row: "i.  Point text"
 * - Two cells: narrow roman numeral + wide content
 * - Normal weight (not bold)
 * - Per PDF Slide 16: Roman numerals i, ii, iii for bullet points
 */
export function createRomanNumeralRow(numeral = ''): CellRow {
  return {
    id: generateCellId('r'),
    preset: 'roman-numeral',
    indentLevel: 2,
    cells: [
      createCell('8%', 'numeral', 'normal', numeral, 'right'),
      createCell('92%', 'text', 'normal'),
    ],
  };
}

/**
 * Alphabetical Sub-Point Row: "a.  Sub-point text"
 * - Two cells: letter + content
 * - Normal weight
 * - Per PDF Slide 16: alphabetical a, b, c for sub-points under Roman
 */
export function createAlphabeticalRow(letter = ''): CellRow {
  return {
    id: generateCellId('r'),
    preset: 'alphabetical',
    indentLevel: 3,
    cells: [
      createCell('6%', 'numeral', 'normal', letter, 'right'),
      createCell('94%', 'text', 'normal'),
    ],
  };
}

/**
 * Body Text Row: Full-width paragraph
 * - Single cell, normal weight, indent level 1
 * - Per PDF Slide 18: single spacing
 */
export function createBodyTextRow(): CellRow {
  return {
    id: generateCellId('r'),
    preset: 'body-text',
    indentLevel: 1,
    cells: [createCell('100%', 'text', 'normal')],
  };
}

/**
 * Table Row: Flexible multi-column layout
 * - Three equal cells, no indent
 */
export function createTableRow(columns = 3): CellRow {
  const width = `${Math.floor(100 / columns)}%`;
  return {
    id: generateCellId('r'),
    preset: 'table-row',
    indentLevel: 0,
    cells: Array.from({ length: columns }, () => createCell(width, 'text', 'normal')),
  };
}

/** Create a default row with one full-width cell */
export function createEmptyRow(): CellRow {
  return {
    id: generateCellId('r'),
    preset: 'full-width',
    indentLevel: 0,
    cells: [createEmptyCell('100%')],
  };
}

/** Create an empty cell layout */
export function createEmptyCellLayout(): CellLayout {
  return {
    editorMode: 'cell-grid',
    rows: [createEmptyRow()],
  };
}

/** Create a two-column row (e.g., for numeral + content) */
export function createTwoColumnRow(
  leftWidth = '15%',
  rightWidth = '85%'
): CellRow {
  return {
    id: generateCellId('r'),
    preset: 'custom',
    indentLevel: 0,
    cells: [
      createCell(leftWidth, 'numeral', 'normal', '', 'right'),
      createCell(rightWidth, 'text', 'normal'),
    ],
  };
}

/** Indent pixel values per level (matches hierarchical editor) */
export const INDENT_PX_PER_LEVEL = 30;

/** Get padding-left in px for a given indent level */
export function getIndentPx(level: number): number {
  return level * INDENT_PX_PER_LEVEL;
}

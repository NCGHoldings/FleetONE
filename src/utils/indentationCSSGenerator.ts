/**
 * Centralized Indentation CSS Generator
 * 
 * This is the SINGLE SOURCE OF TRUTH for generating CSS from indentation settings.
 * All components (PaginatedPreview, documentPreviewGenerator, usePDFGeneration, etc.)
 * should use this generator to ensure 100% consistency between preview and PDF output.
 */

export interface RomanNumeralSettings {
  numberWidth: number;           // Width for roman number (i., ii., iii., etc.)
  itemSpacing: number;           // Vertical spacing between items
  additionalOffset: number;      // Additional offset from parent level's content alignment
  paragraphResetToLevel: number; // 0 = reset to Level 0 (1.0), 1 = Level 1, etc.
}

export interface LetterListSettings {
  numberWidth: number;           // Width for letter (a., b., c., etc.)
  itemSpacing: number;           // Vertical spacing between items
  additionalOffset: number;      // Additional offset from parent Roman content
  paragraphResetToLevel: number; // 0 = reset to Level 0 (1.0), 1 = Level 1, etc.
}

export interface IndentationSettings {
  level0: { container: number; numberWidth: number; titleStart: number; contentStart: number };
  level1: { container: number; numberWidth: number; titleStart: number; contentStart: number };
  level2: { container: number; numberWidth: number; titleStart: number; contentStart: number };
  level3: { container: number; numberWidth: number; titleStart: number; contentStart: number };
  romanNumerals?: RomanNumeralSettings;
  letterList?: LetterListSettings;
}

export const DEFAULT_ROMAN_NUMERALS: RomanNumeralSettings = {
  numberWidth: 30,
  itemSpacing: 6,
  additionalOffset: 0,
  paragraphResetToLevel: 0, // Default: reset to Level 0 (main section alignment)
};

export const DEFAULT_LETTER_LIST: LetterListSettings = {
  numberWidth: 25,
  itemSpacing: 4,
  additionalOffset: 0,
  paragraphResetToLevel: 0, // Default: reset to Level 0 (main section alignment)
};

export const DEFAULT_INDENTATION: IndentationSettings = {
  level0: { container: 0, numberWidth: 40, titleStart: 40, contentStart: 40 },
  level1: { container: 40, numberWidth: 40, titleStart: 80, contentStart: 80 },
  level2: { container: 80, numberWidth: 50, titleStart: 130, contentStart: 130 },
  level3: { container: 130, numberWidth: 60, titleStart: 190, contentStart: 190 },
  romanNumerals: DEFAULT_ROMAN_NUMERALS,
  letterList: DEFAULT_LETTER_LIST,
};

/**
 * Calculate additional left offset for title alignment
 */
function titleOffset(container: number, numberWidth: number, titleStart: number): number {
  return Math.max(0, Math.round(titleStart - (container + numberWidth)));
}

/**
 * Calculate content offset relative to container (for nested content)
 */
function nestedContentOffset(container: number, contentStart: number): number {
  return Math.max(0, contentStart - container);
}

/**
 * Generate comprehensive CSS for hierarchical indentation settings.
 * This CSS covers ALL content patterns:
 * - Sibling content (content element after level container)
 * - Nested content (content element inside level container)
 * - Direct paragraph content (unwrapped paragraphs)
 * - Direct list content (ul, ol inside sections)
 * - Table content alignment
 * - Roman numeral lists
 * 
 * Uses !important flags to ensure backend settings override any conflicting styles.
 */
export function generateIndentationCSS(settings: IndentationSettings = DEFAULT_INDENTATION): string {
  return `
    /* ========================================================================== */
    /* CENTRALIZED INDENTATION CSS - Generated from Backend Settings              */
    /* This CSS is the single source of truth for all document rendering contexts */
    /* ========================================================================== */

    /* ========== LEVEL 0 ========== */
    .level-0, [data-level="0"] { 
      margin-left: ${settings.level0.container}px !important; 
      padding: 10px 0;
    }
    .level-0 .number, [data-level="0"] .number { 
      display: inline-block;
      width: ${settings.level0.numberWidth}px !important; 
      font-weight: bold;
      text-align: left;
    }
    .level-0 h3, [data-level="0"] h3 { 
      display: flex; 
      align-items: baseline; 
      margin: 0 0 10px 0;
      font-weight: bold;
    }
    .level-0 .title-text, [data-level="0"] .title-text { 
      margin-left: ${titleOffset(settings.level0.container, settings.level0.numberWidth, settings.level0.titleStart)}px !important; 
    }
    
    /* Nested or Tagged Sibling Content */
    .level-0 + p, .level-0 + ul, .level-0 + ol, .level-0 + table, .level-0 + div:not([class*="level-"]),
    [data-level="0"] + p, [data-level="0"] + ul, [data-level="0"] + ol, [data-level="0"] + table, [data-level="0"] + div:not([data-level]),
    p[data-parent-level="0"], ul[data-parent-level="0"], ol[data-parent-level="0"], table[data-parent-level="0"], div[data-parent-level="0"] { 
      margin-left: ${settings.level0.contentStart}px !important; 
    }
    
    /* Nested content wrapper */
    .level-0 .content, .level-0 > .content, [data-level="0"] .content, [data-level="0"] > .content {
      margin-left: ${nestedContentOffset(settings.level0.container, settings.level0.contentStart)}px !important;
    }
    
    /* Nested content elements (inside .content wrapper) */
    .level-0 .content p, .level-0 .content ul, .level-0 .content ol, .level-0 .content table,
    [data-level="0"] .content p, [data-level="0"] .content ul, [data-level="0"] .content ol, [data-level="0"] .content table {
      margin-left: 0 !important;
    }
    
    /* Direct paragraph content (unwrapped - when p is direct child of level) */
    .level-0 > p:not(.content p), [data-level="0"] > p:not(.content p) {
      margin-left: ${nestedContentOffset(settings.level0.container, settings.level0.contentStart)}px !important;
    }
    
    /* Direct list content */
    .level-0 > ul, .level-0 > ol, [data-level="0"] > ul, [data-level="0"] > ol {
      margin-left: ${nestedContentOffset(settings.level0.container, settings.level0.contentStart)}px !important;
    }
    
    /* Direct table content */
    .level-0 > table, [data-level="0"] > table {
      margin-left: ${nestedContentOffset(settings.level0.container, settings.level0.contentStart)}px !important;
    }

    /* ========== LEVEL 1 ========== */
    .level-1, [data-level="1"] { 
      margin-left: ${settings.level1.container}px !important; 
      padding: 10px 0;
      position: relative;
    }
    .level-1 .number, [data-level="1"] .number { 
      display: inline-block;
      width: ${settings.level1.numberWidth}px !important; 
      font-weight: bold;
      text-align: left;
    }
    .level-1 h3, [data-level="1"] h3 { 
      display: flex; 
      align-items: baseline;
      margin: 0 0 10px 0;
      font-weight: bold;
    }
    .level-1 .title-text, [data-level="1"] .title-text { 
      margin-left: ${titleOffset(settings.level1.container, settings.level1.numberWidth, settings.level1.titleStart)}px !important; 
    }
    
    /* Sibling content */
    .level-1 + p, .level-1 + ul, .level-1 + ol, .level-1 + table, .level-1 + div:not([class*="level-"]),
    [data-level="1"] + p, [data-level="1"] + ul, [data-level="1"] + ol, [data-level="1"] + table, [data-level="1"] + div:not([data-level]),
    p[data-parent-level="1"], ul[data-parent-level="1"], ol[data-parent-level="1"], table[data-parent-level="1"], div[data-parent-level="1"] { 
      margin-left: ${settings.level1.contentStart}px !important; 
    }
    
    /* Nested content wrapper */
    .level-1 .content, .level-1 > .content, [data-level="1"] .content, [data-level="1"] > .content {
      margin-left: ${nestedContentOffset(settings.level1.container, settings.level1.contentStart)}px !important;
    }
    
    /* Nested content elements */
    .level-1 .content p, .level-1 .content ul, .level-1 .content ol, .level-1 .content table,
    [data-level="1"] .content p, [data-level="1"] .content ul, [data-level="1"] .content ol, [data-level="1"] .content table {
      margin-left: 0 !important;
    }
    
    /* Direct paragraph content */
    .level-1 > p:not(.content p), [data-level="1"] > p:not(.content p) {
      margin-left: ${nestedContentOffset(settings.level1.container, settings.level1.contentStart)}px !important;
    }
    
    /* Direct list content */
    .level-1 > ul, .level-1 > ol, [data-level="1"] > ul, [data-level="1"] > ol {
      margin-left: ${nestedContentOffset(settings.level1.container, settings.level1.contentStart)}px !important;
    }
    
    /* Direct table content */
    .level-1 > table, [data-level="1"] > table {
      margin-left: ${nestedContentOffset(settings.level1.container, settings.level1.contentStart)}px !important;
    }

    /* ========== LEVEL 2 ========== */
    .level-2, [data-level="2"] { 
      margin-left: ${settings.level2.container}px !important; 
      padding: 8px 0;
      position: relative;
    }
    .level-2 .number, [data-level="2"] .number { 
      display: inline-block;
      width: ${settings.level2.numberWidth}px !important; 
      font-weight: 600;
      text-align: left;
    }
    .level-2 h3, [data-level="2"] h3 { 
      display: flex; 
      align-items: baseline;
      margin: 0 0 8px 0;
      font-weight: 600;
    }
    .level-2 .title-text, [data-level="2"] .title-text { 
      margin-left: ${titleOffset(settings.level2.container, settings.level2.numberWidth, settings.level2.titleStart)}px !important; 
    }
    
    /* Sibling content */
    .level-2 + p, .level-2 + ul, .level-2 + ol, .level-2 + table, .level-2 + div:not([class*="level-"]),
    [data-level="2"] + p, [data-level="2"] + ul, [data-level="2"] + ol, [data-level="2"] + table, [data-level="2"] + div:not([data-level]),
    p[data-parent-level="2"], ul[data-parent-level="2"], ol[data-parent-level="2"], table[data-parent-level="2"], div[data-parent-level="2"] { 
      margin-left: ${settings.level2.contentStart}px !important; 
    }
    
    /* Nested content wrapper */
    .level-2 .content, .level-2 > .content, [data-level="2"] .content, [data-level="2"] > .content {
      margin-left: ${nestedContentOffset(settings.level2.container, settings.level2.contentStart)}px !important;
    }
    
    /* Nested content elements */
    .level-2 .content p, .level-2 .content ul, .level-2 .content ol, .level-2 .content table,
    [data-level="2"] .content p, [data-level="2"] .content ul, [data-level="2"] .content ol, [data-level="2"] .content table {
      margin-left: 0 !important;
    }
    
    /* Direct paragraph content */
    .level-2 > p:not(.content p), [data-level="2"] > p:not(.content p) {
      margin-left: ${nestedContentOffset(settings.level2.container, settings.level2.contentStart)}px !important;
    }
    
    /* Direct list content */
    .level-2 > ul, .level-2 > ol, [data-level="2"] > ul, [data-level="2"] > ol {
      margin-left: ${nestedContentOffset(settings.level2.container, settings.level2.contentStart)}px !important;
    }
    
    /* Direct table content */
    .level-2 > table, [data-level="2"] > table {
      margin-left: ${nestedContentOffset(settings.level2.container, settings.level2.contentStart)}px !important;
    }

    /* ========== LEVEL 3 ========== */
    .level-3, [data-level="3"] { 
      margin-left: ${settings.level3.container}px !important; 
      padding: 6px 0;
      position: relative;
    }
    .level-3 .number, [data-level="3"] .number { 
      display: inline-block;
      width: ${settings.level3.numberWidth}px !important; 
      font-weight: 500;
      text-align: left;
    }
    .level-3 h3, [data-level="3"] h3 { 
      display: flex; 
      align-items: baseline;
      margin: 0 0 6px 0;
      font-weight: 500;
    }
    .level-3 .title-text, [data-level="3"] .title-text { 
      margin-left: ${titleOffset(settings.level3.container, settings.level3.numberWidth, settings.level3.titleStart)}px !important; 
    }
    
    /* Sibling content */
    .level-3 + p, .level-3 + ul, .level-3 + ol, .level-3 + table, .level-3 + div:not([class*="level-"]),
    [data-level="3"] + p, [data-level="3"] + ul, [data-level="3"] + ol, [data-level="3"] + table, [data-level="3"] + div:not([data-level]),
    p[data-parent-level="3"], ul[data-parent-level="3"], ol[data-parent-level="3"], table[data-parent-level="3"], div[data-parent-level="3"] { 
      margin-left: ${settings.level3.contentStart}px !important; 
    }
    
    /* Nested content wrapper */
    .level-3 .content, .level-3 > .content, [data-level="3"] .content, [data-level="3"] > .content {
      margin-left: ${nestedContentOffset(settings.level3.container, settings.level3.contentStart)}px !important;
    }
    
    /* Nested content elements */
    .level-3 .content p, .level-3 .content ul, .level-3 .content ol, .level-3 .content table,
    [data-level="3"] .content p, [data-level="3"] .content ul, [data-level="3"] .content ol, [data-level="3"] .content table {
      margin-left: 0 !important;
    }
    
    /* Direct paragraph content */
    .level-3 > p:not(.content p), [data-level="3"] > p:not(.content p) {
      margin-left: ${nestedContentOffset(settings.level3.container, settings.level3.contentStart)}px !important;
    }
    
    /* Direct list content */
    .level-3 > ul, .level-3 > ol, [data-level="3"] > ul, [data-level="3"] > ol {
      margin-left: ${nestedContentOffset(settings.level3.container, settings.level3.contentStart)}px !important;
    }
    
    /* Direct table content */
    .level-3 > table, [data-level="3"] > table {
      margin-left: ${nestedContentOffset(settings.level3.container, settings.level3.contentStart)}px !important;
    }

    /* ========== ROMAN NUMERAL LISTS - BASE STYLES ========== */
    /* Dynamic settings from backend controls */
    /* BACKEND SETTINGS: width=${settings.romanNumerals?.numberWidth ?? 30}px, spacing=${settings.romanNumerals?.itemSpacing ?? 6}px, offset=${settings.romanNumerals?.additionalOffset ?? 0}px */
    .level-1-roman,
    div.level-1-roman {
      display: block !important;
      margin: 8px 0 !important;
      padding: 0 !important;
    }
    
    .roman-item,
    p.roman-item,
    div.roman-item {
      display: flex !important;
      align-items: baseline !important;
      margin: 0 0 ${settings.romanNumerals?.itemSpacing ?? 6}px 0 !important;
      padding: 0 !important;
      page-break-inside: avoid !important;
    }
    
    .roman-number {
      flex-shrink: 0;
      margin-right: 10px;
      min-width: ${settings.romanNumerals?.numberWidth ?? 30}px !important;
      font-weight: normal;
    }
    
    .roman-content {
      display: block !important;
      flex: 1;
    }
    
    .roman-content p {
      display: inline !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    /* ========== ROMAN NUMERAL LISTS - PARENT LEVEL ALIGNMENT ========== */
    /* Roman numerals inherit alignment from their parent hierarchical level */
    
    /* Roman under Level 0 - align to Level 0 content position + additional offset */
    .roman-under-level-0,
    .level-1-roman[data-parent-level="0"],
    .level-0 .level-1-roman,
    .level-0 .content .level-1-roman,
    .level-0 > .level-1-roman,
    [data-level="0"] .level-1-roman,
    [data-level="0"] .content .level-1-roman,
    [data-level="0"] > .level-1-roman {
      margin-left: ${settings.romanNumerals?.additionalOffset ?? 0}px !important;
      padding-left: 0 !important;
    }
    
    .roman-under-level-0 .roman-item,
    .level-1-roman[data-parent-level="0"] .roman-item,
    .level-0 .level-1-roman .roman-item,
    .level-0 .content .level-1-roman .roman-item,
    [data-level="0"] .level-1-roman .roman-item,
    [data-level="0"] .content .level-1-roman .roman-item {
      padding-left: 0 !important;
    }
    
    /* Roman under Level 1 - align to Level 1 content position + additional offset */
    .roman-under-level-1,
    .level-1-roman[data-parent-level="1"],
    .level-1 .level-1-roman,
    .level-1 .content .level-1-roman,
    .level-1 > .level-1-roman,
    [data-level="1"] .level-1-roman,
    [data-level="1"] .content .level-1-roman,
    [data-level="1"] > .level-1-roman {
      margin-left: ${settings.romanNumerals?.additionalOffset ?? 0}px !important;
      padding-left: 0 !important;
    }
    
    .roman-under-level-1 .roman-item,
    .level-1-roman[data-parent-level="1"] .roman-item,
    .level-1 .level-1-roman .roman-item,
    .level-1 .content .level-1-roman .roman-item,
    [data-level="1"] .level-1-roman .roman-item,
    [data-level="1"] .content .level-1-roman .roman-item {
      padding-left: 0 !important;
    }
    
    /* Roman under Level 2 - align to Level 2 content position + additional offset */
    .roman-under-level-2,
    .level-1-roman[data-parent-level="2"],
    .level-2 .level-1-roman,
    .level-2 .content .level-1-roman,
    .level-2 > .level-1-roman,
    [data-level="2"] .level-1-roman,
    [data-level="2"] .content .level-1-roman,
    [data-level="2"] > .level-1-roman {
      margin-left: ${settings.romanNumerals?.additionalOffset ?? 0}px !important;
      padding-left: 0 !important;
    }
    
    .roman-under-level-2 .roman-item,
    .level-1-roman[data-parent-level="2"] .roman-item,
    .level-2 .level-1-roman .roman-item,
    .level-2 .content .level-1-roman .roman-item,
    [data-level="2"] .level-1-roman .roman-item,
    [data-level="2"] .content .level-1-roman .roman-item {
      padding-left: 0 !important;
    }
    
    /* Roman under Level 3 - align to Level 3 content position + additional offset */
    .roman-under-level-3,
    .level-1-roman[data-parent-level="3"],
    .level-3 .level-1-roman,
    .level-3 .content .level-1-roman,
    .level-3 > .level-1-roman,
    [data-level="3"] .level-1-roman,
    [data-level="3"] .content .level-1-roman,
    [data-level="3"] > .level-1-roman {
      margin-left: ${settings.romanNumerals?.additionalOffset ?? 0}px !important;
      padding-left: 0 !important;
    }
    
    .roman-under-level-3 .roman-item,
    .level-1-roman[data-parent-level="3"] .roman-item,
    .level-3 .level-1-roman .roman-item,
    .level-3 .content .level-1-roman .roman-item,
    [data-level="3"] .level-1-roman .roman-item,
    [data-level="3"] .content .level-1-roman .roman-item {
      padding-left: 0 !important;
    }
    
    /* Top-level Roman numerals (no parent) - use Level 0 content alignment */
    .level-1-roman:not([data-parent-level]),
    .level-1-roman[data-parent-level="-1"] {
      margin-left: ${settings.level0.contentStart + (settings.romanNumerals?.additionalOffset ?? 0)}px !important;
    }

    /* ========== SECTION WRAPPER CONTENT ALIGNMENT ========== */
    /* When sections have direct text content without .content wrapper */
    .section > p:first-of-type,
    .section > ul:first-of-type,
    .section > ol:first-of-type {
      margin-left: ${settings.level0.contentStart}px !important;
    }
    
    /* Document content base alignment */
    .doc-content > p,
    .doc-content > ul,
    .doc-content > ol {
      margin-left: ${settings.level0.contentStart}px !important;
    }

    /* ========== A4 PAGE CONTEXT (Preview & PDF) ========== */
    .a4-page .level-0, .a4-page [data-level="0"] { 
      margin-left: ${settings.level0.container}px !important; 
    }
    .a4-page .level-1, .a4-page [data-level="1"] { 
      margin-left: ${settings.level1.container}px !important; 
    }
    .a4-page .level-2, .a4-page [data-level="2"] { 
      margin-left: ${settings.level2.container}px !important; 
    }
    .a4-page .level-3, .a4-page [data-level="3"] { 
      margin-left: ${settings.level3.container}px !important; 
    }
    
    /* A4 sibling content */
    .a4-page .level-0 + p, .a4-page .level-0 + ul, .a4-page .level-0 + ol,
    .a4-page [data-level="0"] + p, .a4-page [data-level="0"] + ul, .a4-page [data-level="0"] + ol {
      margin-left: ${settings.level0.contentStart}px !important;
    }
    .a4-page .level-1 + p, .a4-page .level-1 + ul, .a4-page .level-1 + ol,
    .a4-page [data-level="1"] + p, .a4-page [data-level="1"] + ul, .a4-page [data-level="1"] + ol {
      margin-left: ${settings.level1.contentStart}px !important;
    }
    .a4-page .level-2 + p, .a4-page .level-2 + ul, .a4-page .level-2 + ol,
    .a4-page [data-level="2"] + p, .a4-page [data-level="2"] + ul, .a4-page [data-level="2"] + ol {
      margin-left: ${settings.level2.contentStart}px !important;
    }
    .a4-page .level-3 + p, .a4-page .level-3 + ul, .a4-page .level-3 + ol,
    .a4-page [data-level="3"] + p, .a4-page [data-level="3"] + ul, .a4-page [data-level="3"] + ol {
      margin-left: ${settings.level3.contentStart}px !important;
    }
    
    /* A4 nested content */
    .a4-page .level-0 .content, .a4-page [data-level="0"] .content {
      margin-left: ${nestedContentOffset(settings.level0.container, settings.level0.contentStart)}px !important;
    }
    .a4-page .level-1 .content, .a4-page [data-level="1"] .content {
      margin-left: ${nestedContentOffset(settings.level1.container, settings.level1.contentStart)}px !important;
    }
    .a4-page .level-2 .content, .a4-page [data-level="2"] .content {
      margin-left: ${nestedContentOffset(settings.level2.container, settings.level2.contentStart)}px !important;
    }
    .a4-page .level-3 .content, .a4-page [data-level="3"] .content {
      margin-left: ${nestedContentOffset(settings.level3.container, settings.level3.contentStart)}px !important;
    }
    
    /* A4 title text alignment */
    .a4-page .level-0 .title-text, .a4-page [data-level="0"] .title-text { 
      margin-left: ${titleOffset(settings.level0.container, settings.level0.numberWidth, settings.level0.titleStart)}px !important; 
    }
    .a4-page .level-1 .title-text, .a4-page [data-level="1"] .title-text { 
      margin-left: ${titleOffset(settings.level1.container, settings.level1.numberWidth, settings.level1.titleStart)}px !important; 
    }
    .a4-page .level-2 .title-text, .a4-page [data-level="2"] .title-text { 
      margin-left: ${titleOffset(settings.level2.container, settings.level2.numberWidth, settings.level2.titleStart)}px !important; 
    }
    .a4-page .level-3 .title-text, .a4-page [data-level="3"] .title-text { 
      margin-left: ${titleOffset(settings.level3.container, settings.level3.numberWidth, settings.level3.titleStart)}px !important; 
    }
    
    /* A4 number width */
    .a4-page .level-0 .number, .a4-page [data-level="0"] .number { 
      width: ${settings.level0.numberWidth}px !important; 
    }
    .a4-page .level-1 .number, .a4-page [data-level="1"] .number { 
      width: ${settings.level1.numberWidth}px !important; 
    }
    .a4-page .level-2 .number, .a4-page [data-level="2"] .number { 
      width: ${settings.level2.numberWidth}px !important; 
    }
    .a4-page .level-3 .number, .a4-page [data-level="3"] .number { 
      width: ${settings.level3.numberWidth}px !important; 
    }
    
    /* A4 Roman numeral parent level alignment - using backend settings */
    .a4-page .roman-under-level-0,
    .a4-page .level-1-roman[data-parent-level="0"],
    .a4-page .level-0 .level-1-roman,
    .a4-page [data-level="0"] .level-1-roman {
      margin-left: ${settings.romanNumerals?.additionalOffset ?? 0}px !important;
    }
    
    .a4-page .roman-under-level-1,
    .a4-page .level-1-roman[data-parent-level="1"],
    .a4-page .level-1 .level-1-roman,
    .a4-page [data-level="1"] .level-1-roman {
      margin-left: ${settings.romanNumerals?.additionalOffset ?? 0}px !important;
    }
    
    .a4-page .roman-under-level-2,
    .a4-page .level-1-roman[data-parent-level="2"],
    .a4-page .level-2 .level-1-roman,
    .a4-page [data-level="2"] .level-1-roman {
      margin-left: ${settings.romanNumerals?.additionalOffset ?? 0}px !important;
    }
    
    .a4-page .roman-under-level-3,
    .a4-page .level-1-roman[data-parent-level="3"],
    .a4-page .level-3 .level-1-roman,
    .a4-page [data-level="3"] .level-1-roman {
      margin-left: ${settings.romanNumerals?.additionalOffset ?? 0}px !important;
    }

    /* A4 paragraphs following Roman lists - align to parent content position */
    .a4-page .level-1-roman + p,
    .a4-page .level-1-roman + div:not([class*="level-"]):not(.letter-list) {
      margin-left: ${settings.romanNumerals?.additionalOffset ?? 0}px !important;
    }
    
    .a4-page .roman-content > p,
    .a4-page .roman-content > div:not(.letter-list) {
      margin-left: 0 !important;
    }

    /* ========== CSS CUSTOM PROPERTIES FOR DEBUGGING ========== */
    /* These can be inspected in browser dev tools to verify backend values */
    :root {
      --roman-number-width: ${settings.romanNumerals?.numberWidth ?? 30}px;
      --roman-item-spacing: ${settings.romanNumerals?.itemSpacing ?? 6}px;
      --roman-additional-offset: ${settings.romanNumerals?.additionalOffset ?? 0}px;
      --letter-number-width: ${settings.letterList?.numberWidth ?? 25}px;
      --letter-item-spacing: ${settings.letterList?.itemSpacing ?? 4}px;
      --letter-additional-offset: ${settings.letterList?.additionalOffset ?? 0}px;
    }

    /* ========== ALPHABETIC LETTER LISTS (a, b, c...) - BASE STYLES ========== */
    /* Letter lists appear under Roman numerals and can contain nested Roman numerals */
    /* BACKEND SETTINGS: width=${settings.letterList?.numberWidth ?? 25}px, spacing=${settings.letterList?.itemSpacing ?? 4}px, offset=${settings.letterList?.additionalOffset ?? 0}px */
    .letter-list {
      display: block !important;
      margin: 6px 0 !important;
      padding: 0 !important;
    }
    
    .letter-item,
    p.letter-item,
    div.letter-item {
      display: flex !important;
      align-items: baseline !important;
      margin: 0 0 ${settings.letterList?.itemSpacing ?? 4}px 0 !important;
      padding: 0 !important;
      page-break-inside: avoid !important;
    }
    
    .letter-number {
      flex-shrink: 0;
      margin-right: 8px;
      min-width: ${settings.letterList?.numberWidth ?? 25}px !important;
      font-weight: normal !important;
      font-style: normal !important;
    }
    
    .letter-content {
      display: block !important;
      flex: 1;
    }
    
    .letter-content p {
      display: inline !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    /* ========== LETTER LISTS - ALIGNMENT UNDER ROMAN NUMERALS ========== */
    /* Letter lists (a, b, c) must appear under Roman numerals (i, ii, iii) */
    /* They align to the Roman content position + optional offset from backend */
    
    .roman-content .letter-list,
    .roman-item .letter-list {
      margin-left: ${settings.letterList?.additionalOffset ?? 0}px !important;
    }

    /* ========== LETTER LISTS - PARENT LEVEL ALIGNMENT ========== */
    /* Letter lists inherit alignment from their parent hierarchical level via roman numeral context */
    
    /* Letter lists under Level 0 Roman content */
    .letter-under-level-0,
    .letter-list[data-parent-level="0"],
    .level-0 .roman-content .letter-list,
    .level-0 .roman-item .letter-list,
    .level-0 .content .roman-content .letter-list,
    [data-level="0"] .roman-content .letter-list,
    [data-level="0"] .roman-item .letter-list,
    [data-level="0"] .content .roman-content .letter-list {
      margin-left: ${settings.letterList?.additionalOffset ?? 0}px !important;
    }
    
    /* Letter lists under Level 1 Roman content */
    .letter-under-level-1,
    .letter-list[data-parent-level="1"],
    .level-1 .roman-content .letter-list,
    .level-1 .roman-item .letter-list,
    .level-1 .content .roman-content .letter-list,
    [data-level="1"] .roman-content .letter-list,
    [data-level="1"] .roman-item .letter-list,
    [data-level="1"] .content .roman-content .letter-list {
      margin-left: ${settings.letterList?.additionalOffset ?? 0}px !important;
    }
    
    /* Letter lists under Level 2 Roman content */
    .letter-under-level-2,
    .letter-list[data-parent-level="2"],
    .level-2 .roman-content .letter-list,
    .level-2 .roman-item .letter-list,
    .level-2 .content .roman-content .letter-list,
    [data-level="2"] .roman-content .letter-list,
    [data-level="2"] .roman-item .letter-list,
    [data-level="2"] .content .roman-content .letter-list {
      margin-left: ${settings.letterList?.additionalOffset ?? 0}px !important;
    }
    
    /* Letter lists under Level 3 Roman content */
    .letter-under-level-3,
    .letter-list[data-parent-level="3"],
    .level-3 .roman-content .letter-list,
    .level-3 .roman-item .letter-list,
    .level-3 .content .roman-content .letter-list,
    [data-level="3"] .roman-content .letter-list,
    [data-level="3"] .roman-item .letter-list,
    [data-level="3"] .content .roman-content .letter-list {
      margin-left: ${settings.letterList?.additionalOffset ?? 0}px !important;
    }
    
    /* Nested Roman numerals under letter items */
    .letter-content .level-1-roman {
      margin-left: ${settings.romanNumerals?.additionalOffset ?? 0}px !important;
    }
    
    .letter-content .roman-item {
      padding-left: 0 !important;
    }

    /* Content following letter lists should maintain alignment */
    .letter-list + p,
    .letter-list + div:not([class*="letter-"]):not([class*="roman"]) {
      margin-left: 0 !important;
    }

    /* ========== A4 PAGE LETTER LIST STYLES ========== */
    .a4-page .letter-list {
      display: block !important;
      margin: 6px 0 !important;
    }
    
    .a4-page .letter-item {
      display: flex !important;
      align-items: baseline !important;
      margin: 0 0 ${settings.letterList?.itemSpacing ?? 4}px 0 !important;
    }
    
    .a4-page .letter-number {
      min-width: ${settings.letterList?.numberWidth ?? 25}px !important;
    }
    
    /* A4 - Letter lists under Roman content (generic) */
    .a4-page .roman-content .letter-list,
    .a4-page .roman-item .letter-list {
      margin-left: ${settings.letterList?.additionalOffset ?? 0}px !important;
    }
    
    /* A4 - Letter lists under Level 0 Roman content */
    .a4-page .letter-under-level-0,
    .a4-page .letter-list[data-parent-level="0"],
    .a4-page .level-0 .roman-content .letter-list,
    .a4-page .level-0 .roman-item .letter-list,
    .a4-page [data-level="0"] .roman-content .letter-list,
    .a4-page [data-level="0"] .roman-item .letter-list {
      margin-left: ${settings.letterList?.additionalOffset ?? 0}px !important;
    }
    
    /* A4 - Letter lists under Level 1 Roman content */
    .a4-page .letter-under-level-1,
    .a4-page .letter-list[data-parent-level="1"],
    .a4-page .level-1 .roman-content .letter-list,
    .a4-page .level-1 .roman-item .letter-list,
    .a4-page [data-level="1"] .roman-content .letter-list,
    .a4-page [data-level="1"] .roman-item .letter-list {
      margin-left: ${settings.letterList?.additionalOffset ?? 0}px !important;
    }
    
    /* A4 - Letter lists under Level 2 Roman content */
    .a4-page .letter-under-level-2,
    .a4-page .letter-list[data-parent-level="2"],
    .a4-page .level-2 .roman-content .letter-list,
    .a4-page .level-2 .roman-item .letter-list,
    .a4-page [data-level="2"] .roman-content .letter-list,
    .a4-page [data-level="2"] .roman-item .letter-list {
      margin-left: ${settings.letterList?.additionalOffset ?? 0}px !important;
    }
    
    /* A4 - Letter lists under Level 3 Roman content */
    .a4-page .letter-under-level-3,
    .a4-page .letter-list[data-parent-level="3"],
    .a4-page .level-3 .roman-content .letter-list,
    .a4-page .level-3 .roman-item .letter-list,
    .a4-page [data-level="3"] .roman-content .letter-list,
    .a4-page [data-level="3"] .roman-item .letter-list {
      margin-left: ${settings.letterList?.additionalOffset ?? 0}px !important;
    }
    
    /* A4 - Nested Roman numerals under letter content */
    .a4-page .letter-content .level-1-roman {
      margin-left: ${settings.romanNumerals?.additionalOffset ?? 0}px !important;
    }
    
    .a4-page .letter-content .roman-item {
      padding-left: 0 !important;
    }

    /* ========== ULTRA-HIGH SPECIFICITY OVERRIDES ========== */
    /* These selectors ensure backend settings ALWAYS apply regardless of conflicting CSS */
    
    /* Roman number width - backend controlled */
    .a4-page .roman-item .roman-number,
    .doc-content .roman-item .roman-number,
    .level-1-roman .roman-item .roman-number,
    div.level-1-roman > .roman-item > .roman-number,
    div.level-1-roman > p.roman-item > .roman-number,
    div.level-1-roman > div.roman-item > .roman-number {
      min-width: ${settings.romanNumerals?.numberWidth ?? 30}px !important;
      flex-shrink: 0 !important;
      margin-right: 10px !important;
      font-weight: normal !important;
      font-style: normal !important;
    }
    
    /* Roman item spacing - backend controlled */
    .a4-page .roman-item,
    .doc-content .roman-item,
    .level-1-roman > .roman-item,
    div.level-1-roman > .roman-item,
    div.level-1-roman > p.roman-item,
    div.level-1-roman > div.roman-item {
      margin-bottom: ${settings.romanNumerals?.itemSpacing ?? 6}px !important;
      display: flex !important;
      align-items: baseline !important;
    }
    
    /* Letter number width - backend controlled */
    .a4-page .letter-item .letter-number,
    .doc-content .letter-item .letter-number,
    .letter-list .letter-item .letter-number,
    div.letter-list > .letter-item > .letter-number,
    div.letter-list > p.letter-item > .letter-number,
    div.letter-list > div.letter-item > .letter-number {
      min-width: ${settings.letterList?.numberWidth ?? 25}px !important;
      flex-shrink: 0 !important;
      margin-right: 8px !important;
      font-weight: normal !important;
      font-style: normal !important;
    }
    
    /* Letter item spacing - backend controlled */
    .a4-page .letter-item,
    .doc-content .letter-item,
    .letter-list > .letter-item,
    div.letter-list > .letter-item,
    div.letter-list > p.letter-item,
    div.letter-list > div.letter-item {
      margin-bottom: ${settings.letterList?.itemSpacing ?? 4}px !important;
      display: flex !important;
      align-items: baseline !important;
    }

    /* ========== SIBLING LETTER LISTS (adjacent to roman lists) ========== */
    /* When letter list follows roman list as sibling (not nested) - common document structure */
    .level-1-roman + .letter-list,
    .a4-page .level-1-roman + .letter-list,
    .doc-content .level-1-roman + .letter-list,
    div.level-1-roman + div.letter-list {
      margin-left: ${(settings.romanNumerals?.numberWidth ?? 20) + 10 + (settings.letterList?.additionalOffset ?? 0)}px !important;
      padding-left: 0 !important;
    }

    .level-1-roman + .letter-list .letter-item,
    .a4-page .level-1-roman + .letter-list .letter-item,
    .doc-content .level-1-roman + .letter-list .letter-item,
    div.level-1-roman + div.letter-list .letter-item {
      margin-bottom: ${settings.letterList?.itemSpacing ?? 4}px !important;
      display: flex !important;
      align-items: baseline !important;
    }

    .level-1-roman + .letter-list .letter-number,
    .a4-page .level-1-roman + .letter-list .letter-number,
    .doc-content .level-1-roman + .letter-list .letter-number,
    div.level-1-roman + div.letter-list .letter-number {
      min-width: ${settings.letterList?.numberWidth ?? 25}px !important;
      flex-shrink: 0 !important;
      margin-right: 8px !important;
    }

    /* ========== GENERAL ADJACENT SIBLING PATTERNS ========== */
    /* Letter list following any hierarchical content */
    .content + .letter-list,
    .roman-content + .letter-list,
    .a4-page .content + .letter-list {
      margin-left: ${(settings.romanNumerals?.numberWidth ?? 20) + (settings.letterList?.additionalOffset ?? 0)}px !important;
    }

    /* ========== PARAGRAPH RESET AFTER ROMAN NUMERAL CONTENT ========== */
    /* Backend-controlled paragraph alignment after Roman numeral lists */
    /* romanNumerals.paragraphResetToLevel: ${settings.romanNumerals?.paragraphResetToLevel ?? 0} */
    ${(() => {
      const romanResetLevel = settings.romanNumerals?.paragraphResetToLevel ?? 0;
      const romanResetTarget = romanResetLevel === 0 ? settings.level0.contentStart
        : romanResetLevel === 1 ? settings.level1.contentStart
          : romanResetLevel === 2 ? settings.level2.contentStart
            : settings.level3.contentStart;
      const romanListTotalOffset = (settings.romanNumerals?.numberWidth ?? 30) + 10 + (settings.romanNumerals?.additionalOffset ?? 0);

      return `
    /* CSS Custom Properties for Roman numeral paragraph reset */
    :root {
      --roman-list-total-offset: ${romanListTotalOffset}px;
      --roman-paragraph-reset-target: ${romanResetTarget}px;
      --roman-paragraph-reset-level: ${romanResetLevel};
    }

    /* Paragraphs after roman list should reset to configured level alignment */
    /* These are paragraphs that follow roman-list/level-1-roman as siblings */
    .level-1-roman + p,
    .level-1-roman + div:not(.level-1-roman):not(.letter-list),
    .roman-list + p,
    .roman-list + div:not(.roman-list):not(.letter-list),
    .a4-page .level-1-roman + p,
    .a4-page .level-1-roman + div:not(.level-1-roman):not(.letter-list),
    .a4-page .roman-list + p,
    .doc-content .level-1-roman + p,
    .doc-content .roman-list + p,
    .level-0 .level-1-roman + p,
    .level-1 .level-1-roman + p,
    .level-2 .level-1-roman + p,
    .content .level-1-roman + p,
    .content > .level-1-roman + p {
      margin-left: 0 !important;
      padding-left: ${romanResetTarget}px !important;
      text-indent: 0 !important;
    }

    /* General sibling paragraphs after roman list */
    .level-1-roman ~ p:not(.roman-item):not(.letter-item),
    .roman-list ~ p:not(.roman-item):not(.letter-item),
    .a4-page .level-1-roman ~ p:not(.roman-item):not(.letter-item),
    .a4-page .roman-list ~ p:not(.roman-item):not(.letter-item),
    .doc-content .level-1-roman ~ p:not(.roman-item):not(.letter-item),
    .doc-content .roman-list ~ p:not(.roman-item):not(.letter-item),
    .level-0 .level-1-roman ~ p:not(.roman-item):not(.letter-item),
    .level-1 .level-1-roman ~ p:not(.roman-item):not(.letter-item),
    .level-2 .level-1-roman ~ p:not(.roman-item):not(.letter-item) {
      margin-left: 0 !important;
      padding-left: ${romanResetTarget}px !important;
      text-indent: 0 !important;
    }

    /* Paragraphs after the first one inside roman-content should reset to configured level */
    .roman-content > p:not(:first-child),
    .roman-content > div:not(:first-child):not(.letter-list):not(.level-1-roman),
    .a4-page .roman-content > p:not(:first-child),
    .a4-page .roman-content > div:not(:first-child):not(.letter-list):not(.level-1-roman) {
      display: block !important;
      position: relative !important;
      left: -${romanListTotalOffset}px !important;
      margin-left: 0 !important;
      margin-top: 10px !important;
      width: calc(100% + ${romanListTotalOffset}px) !important;
      padding-left: ${romanResetTarget}px !important;
      text-indent: 0 !important;
    }

    /* Reset for paragraphs following roman items using sibling selector */
    .roman-content p + p,
    .roman-content p ~ p:not(:first-child),
    .a4-page .roman-content p + p,
    .a4-page .roman-content p ~ p:not(:first-child) {
      position: relative !important;
      left: -${romanListTotalOffset}px !important;
      margin-left: 0 !important;
      padding-left: ${romanResetTarget}px !important;
      text-indent: 0 !important;
    }

    .roman-content {
      position: relative !important;
    }

    /* Direct paragraphs inserted after exiting roman list via keyboard */
    .ProseMirror .level-1-roman + p,
    .tiptap .level-1-roman + p,
    [data-node-view-wrapper] .level-1-roman + p,
    .ProseMirror .roman-list + p,
    .tiptap .roman-list + p {
      margin-left: 0 !important;
      padding-left: ${romanResetTarget}px !important;
      text-indent: 0 !important;
    }`;
    })()}

    /* ========== PARAGRAPH RESET AFTER LETTER CONTENT ========== */
    /* Backend-controlled paragraph alignment after letter lists */
    /* paragraphResetToLevel: ${settings.letterList?.paragraphResetToLevel ?? 0} */
    ${(() => {
      const resetLevel = settings.letterList?.paragraphResetToLevel ?? 0;
      const resetTarget = resetLevel === 0 ? settings.level0.contentStart
        : resetLevel === 1 ? settings.level1.contentStart
          : resetLevel === 2 ? settings.level2.contentStart
            : settings.level3.contentStart;
      const letterListTotalOffset = (settings.romanNumerals?.numberWidth ?? 20) + 10 + (settings.letterList?.additionalOffset ?? 0) + (settings.letterList?.numberWidth ?? 25);

      return `
    /* CSS Custom Properties for calculated offsets */
    :root {
      --letter-list-total-offset: ${letterListTotalOffset}px;
      --paragraph-reset-target: ${resetTarget}px;
      --paragraph-reset-level: ${resetLevel};
    }

    /* Paragraphs after letter list should reset to configured level alignment */
    /* These are paragraphs that follow letter-list as siblings */
    .letter-list + p,
    .letter-list + div:not(.letter-list):not(.level-1-roman),
    .a4-page .letter-list + p,
    .a4-page .letter-list + div:not(.letter-list):not(.level-1-roman),
    .doc-content .letter-list + p,
    .doc-content .letter-list + div:not(.letter-list):not(.level-1-roman),
    .level-0 .letter-list + p,
    .level-1 .letter-list + p,
    .level-2 .letter-list + p,
    .roman-content .letter-list + p,
    .roman-content > .letter-list + p {
      margin-left: 0 !important;
      padding-left: ${resetTarget}px !important;
      text-indent: 0 !important;
    }

    /* General sibling paragraphs after letter-list */
    .letter-list ~ p:not(.letter-item):not(.roman-item),
    .a4-page .letter-list ~ p:not(.letter-item):not(.roman-item),
    .doc-content .letter-list ~ p:not(.letter-item):not(.roman-item),
    .level-0 .letter-list ~ p:not(.letter-item):not(.roman-item),
    .level-1 .letter-list ~ p:not(.letter-item):not(.roman-item),
    .level-2 .letter-list ~ p:not(.letter-item):not(.roman-item) {
      margin-left: 0 !important;
      padding-left: ${resetTarget}px !important;
      text-indent: 0 !important;
    }

    /* Paragraphs after the first one inside letter-content should reset to configured level */
    .letter-content > p:not(:first-child),
    .letter-content > div:not(:first-child):not(.letter-list):not(.level-1-roman),
    .a4-page .letter-content > p:not(:first-child),
    .a4-page .letter-content > div:not(:first-child):not(.letter-list):not(.level-1-roman) {
      display: block !important;
      position: relative !important;
      left: -${letterListTotalOffset}px !important;
      margin-left: 0 !important;
      margin-top: 10px !important;
      width: calc(100% + ${letterListTotalOffset}px) !important;
      padding-left: ${resetTarget}px !important;
      text-indent: 0 !important;
    }

    /* Reset for paragraphs following letter items using sibling selector */
    .letter-content p + p,
    .letter-content p ~ p:not(:first-child),
    .a4-page .letter-content p + p,
    .a4-page .letter-content p ~ p:not(:first-child) {
      position: relative !important;
      left: -${letterListTotalOffset}px !important;
      margin-left: 0 !important;
      padding-left: ${resetTarget}px !important;
      text-indent: 0 !important;
    }

    /* Handle BR-separated content inside letter-content */
    .letter-content br + br {
      display: block !important;
      margin-bottom: 10px !important;
    }

    .letter-content {
      position: relative !important;
    }

    /* Direct paragraphs inserted after exiting letter list via keyboard */
    .ProseMirror .letter-list + p,
    .tiptap .letter-list + p,
    [data-node-view-wrapper] .letter-list + p {
      margin-left: 0 !important;
      padding-left: ${resetTarget}px !important;
      text-indent: 0 !important;
    }

    /* ========== BACKEND SETTINGS VERIFICATION COMMENT ========== */
    /* BACKEND SETTINGS APPLIED:
     * Roman Numerals: width=${settings.romanNumerals?.numberWidth ?? 30}px, 
     *                 spacing=${settings.romanNumerals?.itemSpacing ?? 6}px, 
     *                 offset=${settings.romanNumerals?.additionalOffset ?? 0}px,
     *                 paragraphResetToLevel=${settings.romanNumerals?.paragraphResetToLevel ?? 0}
     * Letter List:    width=${settings.letterList?.numberWidth ?? 25}px, 
     *                 spacing=${settings.letterList?.itemSpacing ?? 4}px, 
     *                 offset=${settings.letterList?.additionalOffset ?? 0}px,
     *                 paragraphResetToLevel=${resetLevel}
     * Roman Reset Target: ${settings.romanNumerals?.paragraphResetToLevel ?? 0} -> ${resetLevel === 0 ? settings.level0.contentStart : resetLevel === 1 ? settings.level1.contentStart : settings.level2.contentStart}px
     * Letter Reset Target: ${resetTarget}px (Level ${resetLevel})
     * Calculated letter list total offset: ${letterListTotalOffset}px
     */`;
    })()}
  `;
}

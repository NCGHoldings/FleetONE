/**
 * Hierarchical section styling constants
 * Used by both the main app CSS and PDF generation
 * This provides base styling - dynamic values come from useSystemSettings.generateCSS()
 */

export const HIERARCHICAL_CSS = `
  /* ========== LEVEL 0: Main section, starts at left margin ========== */
  .level-0, [data-level="0"] {
    margin-left: 0 !important;
    padding: 10px 0;
  }

  .level-0 h3, [data-level="0"] h3 {
    margin: 0 0 10px 0;
    font-size: 18px;
    font-weight: bold;
    padding-left: 0;
    display: flex;
    align-items: baseline;
  }

  .level-0 .number, [data-level="0"] .number {
    display: inline-block;
    width: 40px;
    margin-right: 0;
    font-weight: bold;
    text-align: left;
  }

  .level-0 .title-text, [data-level="0"] .title-text {
    display: inline;
  }

  /* Content after Level 0: sibling elements */
  .level-0 + p,
  .level-0 + ul,
  .level-0 + ol,
  .level-0 + table,
  .level-0 + figure,
  [data-level="0"] + p,
  [data-level="0"] + ul,
  [data-level="0"] + ol,
  [data-level="0"] + table,
  [data-level="0"] + figure {
    margin-left: 40px !important;
  }

  /* Content inside Level 0: nested .content div */
  .level-0 .content,
  .level-0 > .content,
  [data-level="0"] .content,
  [data-level="0"] > .content {
    margin-left: 40px !important;
    text-align: justify;
  }

  .level-0 .content p,
  .level-0 .content ul,
  .level-0 .content ol,
  .level-0 .content table,
  .level-0 .content figure,
  [data-level="0"] .content p,
  [data-level="0"] .content ul,
  [data-level="0"] .content ol,
  [data-level="0"] .content table,
  [data-level="0"] .content figure {
    margin-left: 0 !important;
  }

  /* ========== LEVEL 1: Sub-section ========== */
  .level-1, [data-level="1"] {
    margin-left: 40px !important;
    padding: 10px 0;
  }

  .level-1 h3, [data-level="1"] h3 {
    margin: 0 0 10px 0;
    font-size: 17px;
    font-weight: bold;
    padding-left: 0;
    margin-left: 0;
    display: flex;
    align-items: baseline;
  }

  .level-1 .number, [data-level="1"] .number {
    display: inline-block;
    width: 40px;
    margin-right: 0;
    margin-left: 0;
    font-weight: bold;
    text-align: left;
  }

  .level-1 .title-text, [data-level="1"] .title-text {
    display: inline;
  }

  /* Content after Level 1: sibling elements */
  .level-1 + p,
  .level-1 + ul,
  .level-1 + ol,
  .level-1 + table,
  .level-1 + figure,
  [data-level="1"] + p,
  [data-level="1"] + ul,
  [data-level="1"] + ol,
  [data-level="1"] + table,
  [data-level="1"] + figure {
    margin-left: 80px !important;
  }

  /* Content inside Level 1: nested .content div */
  .level-1 .content,
  .level-1 > .content,
  [data-level="1"] .content,
  [data-level="1"] > .content {
    margin-left: 40px !important;
    text-align: justify;
  }

  .level-1 .content p,
  .level-1 .content ul,
  .level-1 .content ol,
  .level-1 .content table,
  .level-1 .content figure,
  [data-level="1"] .content p,
  [data-level="1"] .content ul,
  [data-level="1"] .content ol,
  [data-level="1"] .content table,
  [data-level="1"] .content figure {
    margin-left: 0 !important;
  }

  /* ========== LEVEL 2: Sub-sub-section ========== */
  .level-2, [data-level="2"] {
    margin-left: 80px !important;
    padding: 8px 0;
  }

  .level-2 h3, [data-level="2"] h3 {
    margin: 0 0 8px 0;
    font-size: 17px !important;
    font-weight: bold !important;
    padding-left: 0;
    margin-left: 0;
    display: flex;
    align-items: baseline;
  }

  .level-2 .number, [data-level="2"] .number {
    display: inline-block;
    width: 50px;
    margin-right: 0;
    margin-left: 0;
    font-weight: bold !important;
    text-align: left;
  }

  .level-2 .title-text, [data-level="2"] .title-text {
    display: inline;
  }

  /* Content after Level 2: sibling elements */
  .level-2 + p,
  .level-2 + ul,
  .level-2 + ol,
  .level-2 + table,
  .level-2 + figure,
  [data-level="2"] + p,
  [data-level="2"] + ul,
  [data-level="2"] + ol,
  [data-level="2"] + table,
  [data-level="2"] + figure {
    margin-left: 130px !important;
  }

  /* Content inside Level 2: nested .content div */
  .level-2 .content,
  .level-2 > .content,
  [data-level="2"] .content,
  [data-level="2"] > .content {
    margin-left: 50px !important;
    text-align: justify;
  }

  .level-2 .content p,
  .level-2 .content ul,
  .level-2 .content ol,
  .level-2 .content table,
  .level-2 .content figure,
  [data-level="2"] .content p,
  [data-level="2"] .content ul,
  [data-level="2"] .content ol,
  [data-level="2"] .content table,
  [data-level="2"] .content figure {
    margin-left: 0 !important;
  }

  /* ========== LEVEL 3: Deepest section ========== */
  .level-3, [data-level="3"] {
    margin-left: 130px !important;
    padding: 6px 0;
  }

  .level-3 h3, [data-level="3"] h3 {
    margin: 0 0 6px 0;
    font-size: 17px !important;
    font-weight: bold !important;
    padding-left: 0;
    margin-left: 0;
    display: flex;
    align-items: baseline;
  }

  .level-3 .number, [data-level="3"] .number {
    display: inline-block;
    width: 60px;
    margin-right: 0;
    margin-left: 0;
    font-weight: bold !important;
    text-align: left;
  }

  .level-3 .title-text, [data-level="3"] .title-text {
    display: inline;
  }

  /* Content after Level 3: sibling elements */
  .level-3 + p,
  .level-3 + ul,
  .level-3 + ol,
  .level-3 + table,
  .level-3 + figure,
  [data-level="3"] + p,
  [data-level="3"] + ul,
  [data-level="3"] + ol,
  [data-level="3"] + table,
  [data-level="3"] + figure {
    margin-left: 190px !important;
  }

  /* Content inside Level 3: nested .content div */
  .level-3 .content,
  .level-3 > .content,
  [data-level="3"] .content,
  [data-level="3"] > .content {
    margin-left: 60px !important;
    text-align: justify;
  }

  .level-3 .content p,
  .level-3 .content ul,
  .level-3 .content ol,
  .level-3 .content table,
  .level-3 .content figure,
  [data-level="3"] .content p,
  [data-level="3"] .content ul,
  [data-level="3"] .content ol,
  [data-level="3"] .content table,
  [data-level="3"] .content figure {
    margin-left: 0 !important;
  }

  /* ========== HEADER/FOOTER TABLE CELL CENTERING ========== */
  .header-table td,
  .header-table th {
    text-align: center !important;
    vertical-align: middle !important;
  }

  .footer-table td,
  .footer-table th {
    text-align: center !important;
    vertical-align: middle !important;
  }

  /* Keep first column left-aligned for labels like "Reviewed by" */
  .footer-table td:first-child,
  .footer-table th:first-child {
    text-align: left !important;
  }

  /* ========== Roman Numeral List Container ========== */
  .level-1-roman,
  div.level-1-roman {
    display: block !important;
    margin: 8px 0 !important;
    padding: 0 !important;
  }

  /* ========== Roman Numeral List Styling ========== */
  /* NOTE: Dimension values (min-width, margin, spacing) are controlled by
     generateIndentationCSS() from backend settings. Only structural display rules here. */
  .roman-item,
  p.roman-item,
  div.roman-item {
    display: flex !important;
    align-items: baseline !important;
    padding: 0 !important;
    page-break-inside: avoid !important;
  }

  .roman-number {
    flex-shrink: 0;
    font-weight: normal !important;
    font-style: normal !important;
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

  /* ========== Roman Numerals Parent Level Alignment ========== */
  /* Roman numerals inherit alignment from their parent hierarchical level */
  
  /* Roman under Level 0 */
  .roman-under-level-0,
  .level-1-roman[data-parent-level="0"],
  .level-0 .level-1-roman,
  .level-0 .content .level-1-roman,
  [data-level="0"] .level-1-roman,
  [data-level="0"] .content .level-1-roman {
    margin-left: 0 !important;
  }

  /* Roman under Level 1 */
  .roman-under-level-1,
  .level-1-roman[data-parent-level="1"],
  .level-1 .level-1-roman,
  .level-1 .content .level-1-roman,
  [data-level="1"] .level-1-roman,
  [data-level="1"] .content .level-1-roman {
    margin-left: 0 !important;
  }

  /* Roman under Level 2 */
  .roman-under-level-2,
  .level-1-roman[data-parent-level="2"],
  .level-2 .level-1-roman,
  .level-2 .content .level-1-roman,
  [data-level="2"] .level-1-roman,
  [data-level="2"] .content .level-1-roman {
    margin-left: 0 !important;
  }

  /* Roman under Level 3 */
  .roman-under-level-3,
  .level-1-roman[data-parent-level="3"],
  .level-3 .level-1-roman,
  .level-3 .content .level-1-roman,
  [data-level="3"] .level-1-roman,
  [data-level="3"] .content .level-1-roman {
    margin-left: 0 !important;
  }

  /* Higher specificity for A4 page preview context */
  .a4-page .level-1-roman,
  .a4-page div.level-1-roman {
    display: block !important;
    margin: 8px 0 !important;
  }

  .a4-page .roman-item,
  .a4-page p.roman-item,
  .a4-page div.roman-item {
    display: flex !important;
    align-items: baseline !important;
    page-break-inside: avoid !important;
  }

  .a4-page .roman-number {
    flex-shrink: 0 !important;
  }

  .a4-page .roman-content {
    display: block !important;
  }
  .a4-page .roman-content p {
    display: inline !important;
  }

  /* A4 Roman parent level alignment */
  .a4-page .roman-under-level-0,
  .a4-page .level-1-roman[data-parent-level="0"],
  .a4-page .level-0 .level-1-roman,
  .a4-page [data-level="0"] .level-1-roman {
    margin-left: 0 !important;
  }

  .a4-page .roman-under-level-1,
  .a4-page .level-1-roman[data-parent-level="1"],
  .a4-page .level-1 .level-1-roman,
  .a4-page [data-level="1"] .level-1-roman {
    margin-left: 0 !important;
  }

  .a4-page .roman-under-level-2,
  .a4-page .level-1-roman[data-parent-level="2"],
  .a4-page .level-2 .level-1-roman,
  .a4-page [data-level="2"] .level-1-roman {
    margin-left: 0 !important;
  }

  .a4-page .roman-under-level-3,
  .a4-page .level-1-roman[data-parent-level="3"],
  .a4-page .level-3 .level-1-roman,
  .a4-page [data-level="3"] .level-1-roman {
    margin-left: 0 !important;
  }

  /* PDF context - ensure Roman numerals render properly */
  .pdf-page .level-1-roman,
  .pdf-page div.level-1-roman {
    display: block !important;
    margin: 8px 0 !important;
  }

  .pdf-page .roman-item {
    display: flex !important;
    align-items: baseline !important;
  }

  .pdf-page .roman-number {
    flex-shrink: 0 !important;
  }

  .pdf-page .roman-content {
    display: block !important;
    flex: 1 !important;
  }

  /* PDF Roman parent level alignment */
  .pdf-page .roman-under-level-0,
  .pdf-page .level-1-roman[data-parent-level="0"],
  .pdf-page .level-0 .level-1-roman,
  .pdf-page [data-level="0"] .level-1-roman {
    margin-left: 0 !important;
  }

  .pdf-page .roman-under-level-1,
  .pdf-page .level-1-roman[data-parent-level="1"],
  .pdf-page .level-1 .level-1-roman,
  .pdf-page [data-level="1"] .level-1-roman {
    margin-left: 0 !important;
  }

  .pdf-page .roman-under-level-2,
  .pdf-page .level-1-roman[data-parent-level="2"],
  .pdf-page .level-2 .level-1-roman,
  .pdf-page [data-level="2"] .level-1-roman {
    margin-left: 0 !important;
  }

  .pdf-page .roman-under-level-3,
  .pdf-page .level-1-roman[data-parent-level="3"],
  .pdf-page .level-3 .level-1-roman,
  .pdf-page [data-level="3"] .level-1-roman {
    margin-left: 0 !important;
  }

  /* ========== Document Image Styling ========== */
  .document-image-container,
  figure[data-type="resizable-image"] {
    display: block !important;
    margin: 16px 0 !important;
  }

  .document-image-container.align-left,
  figure[data-align="left"] {
    text-align: left !important;
  }

  .document-image-container.align-center,
  figure[data-align="center"] {
    text-align: center !important;
  }

  .document-image-container.align-right,
  figure[data-align="right"] {
    text-align: right !important;
  }

  .document-image-container img,
  figure[data-type="resizable-image"] img {
    max-width: 100% !important;
    height: auto !important;
    display: inline-block !important;
  }

  .document-image-container figcaption,
  figure[data-type="resizable-image"] figcaption {
    margin-top: 8px !important;
    font-size: 0.875rem !important;
    color: #666 !important;
    font-style: italic !important;
  }

  /* ========== Content Table Styling ========== */
  .doc-content table:not(.header-table):not(.footer-table),
  .section table:not(.header-table):not(.footer-table) {
    width: 100% !important;
    border-collapse: collapse !important;
    border: 1px solid #000 !important;
    margin: 16px 0 !important;
  }

  .doc-content table:not(.header-table):not(.footer-table) td,
  .doc-content table:not(.header-table):not(.footer-table) th,
  .section table:not(.header-table):not(.footer-table) td,
  .section table:not(.header-table):not(.footer-table) th {
    border: 1px solid #000 !important;
    padding: 8px 12px !important;
    text-align: left !important;
    vertical-align: top !important;
  }

  .doc-content table:not(.header-table):not(.footer-table) th,
  .section table:not(.header-table):not(.footer-table) th {
    background-color: #f0f0f0 !important;
    font-weight: bold !important;
  }
`;

/**
 * Generate hierarchical CSS with custom settings
 * This function creates CSS that overrides the base HIERARCHICAL_CSS
 * with values from the backend settings
 */
export function generateHierarchicalCSS(settings: {
  level0: { container: number; numberWidth: number; titleStart: number; contentStart: number };
  level1: { container: number; numberWidth: number; titleStart: number; contentStart: number };
  level2: { container: number; numberWidth: number; titleStart: number; contentStart: number };
  level3: { container: number; numberWidth: number; titleStart: number; contentStart: number };
}): string {
  const titleOffset = (container: number, numberWidth: number, titleStart: number) =>
    Math.max(0, Math.round(titleStart - (container + numberWidth)));

  const nestedContentOffset = (container: number, contentStart: number) =>
    Math.max(0, contentStart - container);

  return `
    /* Dynamic Level 0 */
    .level-0, [data-level="0"] { margin-left: ${settings.level0.container}px !important; }
    .level-0 .number, [data-level="0"] .number { width: ${settings.level0.numberWidth}px !important; }
    .level-0 .title-text, [data-level="0"] .title-text { margin-left: ${titleOffset(settings.level0.container, settings.level0.numberWidth, settings.level0.titleStart)}px !important; }
    .level-0 + p, .level-0 + ul, .level-0 + ol, .level-0 + table,
    [data-level="0"] + p, [data-level="0"] + ul, [data-level="0"] + ol, [data-level="0"] + table { margin-left: ${settings.level0.contentStart}px !important; }
    .level-0 .content, .level-0 > .content, [data-level="0"] .content, [data-level="0"] > .content { margin-left: ${nestedContentOffset(settings.level0.container, settings.level0.contentStart)}px !important; }

    /* Dynamic Level 1 */
    .level-1, [data-level="1"] { margin-left: ${settings.level1.container}px !important; }
    .level-1 .number, [data-level="1"] .number { width: ${settings.level1.numberWidth}px !important; }
    .level-1 .title-text, [data-level="1"] .title-text { margin-left: ${titleOffset(settings.level1.container, settings.level1.numberWidth, settings.level1.titleStart)}px !important; }
    .level-1 + p, .level-1 + ul, .level-1 + ol, .level-1 + table,
    [data-level="1"] + p, [data-level="1"] + ul, [data-level="1"] + ol, [data-level="1"] + table { margin-left: ${settings.level1.contentStart}px !important; }
    .level-1 .content, .level-1 > .content, [data-level="1"] .content, [data-level="1"] > .content { margin-left: ${nestedContentOffset(settings.level1.container, settings.level1.contentStart)}px !important; }

    /* Dynamic Level 2 */
    .level-2, [data-level="2"] { margin-left: ${settings.level2.container}px !important; }
    .level-2 .number, [data-level="2"] .number { width: ${settings.level2.numberWidth}px !important; }
    .level-2 .title-text, [data-level="2"] .title-text { margin-left: ${titleOffset(settings.level2.container, settings.level2.numberWidth, settings.level2.titleStart)}px !important; }
    .level-2 + p, .level-2 + ul, .level-2 + ol, .level-2 + table,
    [data-level="2"] + p, [data-level="2"] + ul, [data-level="2"] + ol, [data-level="2"] + table { margin-left: ${settings.level2.contentStart}px !important; }
    .level-2 .content, .level-2 > .content, [data-level="2"] .content, [data-level="2"] > .content { margin-left: ${nestedContentOffset(settings.level2.container, settings.level2.contentStart)}px !important; }

    /* Dynamic Level 3 */
    .level-3, [data-level="3"] { margin-left: ${settings.level3.container}px !important; }
    .level-3 .number, [data-level="3"] .number { width: ${settings.level3.numberWidth}px !important; }
    .level-3 .title-text, [data-level="3"] .title-text { margin-left: ${titleOffset(settings.level3.container, settings.level3.numberWidth, settings.level3.titleStart)}px !important; }
    .level-3 + p, .level-3 + ul, .level-3 + ol, .level-3 + table,
    [data-level="3"] + p, [data-level="3"] + ul, [data-level="3"] + ol, [data-level="3"] + table { margin-left: ${settings.level3.contentStart}px !important; }
    .level-3 .content, .level-3 > .content, [data-level="3"] .content, [data-level="3"] > .content { margin-left: ${nestedContentOffset(settings.level3.container, settings.level3.contentStart)}px !important; }
  `;
}

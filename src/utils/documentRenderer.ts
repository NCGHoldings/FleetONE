import { getFontDetails } from './fontRules';
import { HIERARCHICAL_CSS } from './hierarchicalStyles';
import { generateCellLayoutCSS } from './cellToHtml';

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  section_number?: string;
  topic_number?: string;
  order: number;
}

export interface DocumentRenderOptions {
  document: {
    id?: string;
    title: string;
    document_number: string;
    version: string;
    language: string;
    status: string;
    created_at?: string;
    revision_number?: number;
  };
  sections: DocumentSection[];
  company?: {
    company_name: string;
    company_logo_url?: string;
    company_code?: string;
    registered_address?: string;
  };
  indentationCSS: string;
  /** The document type name (e.g., 'Standard Operating Procedure', 'Memorandum', 'Policy') */
  documentTypeName?: string;
  processName?: string;
  revisionDate?: string;
  includeHeader?: boolean;
  includeBorder?: boolean;
  includeTableOfContents?: boolean;
  pagedPreview?: boolean;
}

/**
 * Unified Document HTML Generator
 * 
 * This function generates consistent HTML for all document views:
 * - Preview during document creation
 * - Document viewer page
 * - PDF download
 * 
 * It preserves hierarchical subsection structure and applies dynamic indentation CSS
 */
export function generateUnifiedDocumentHTML(options: DocumentRenderOptions): string {
  const {
    document,
    sections,
    company,
    indentationCSS,
    includeHeader = true,
    includeBorder = true,
    includeTableOfContents = false
  } = options;

  const fontStyle = getFontDetails(document.language, 'bodyText');
  const headingStyle = getFontDetails(document.language, 'headings');

  // Generate sections HTML with proper hierarchical structure preservation
  let sectionsHTML = '';
  sections.forEach((section, index) => {
    const sectionNumber = section.section_number || section.topic_number || `${index + 1}.0`;
    const sectionTitle = section.title;
    let sectionContent = section.content || '';

    // Decode if hash-like content
    if (typeof sectionContent === 'string' && sectionContent.match(/^[a-f0-9]{32,}$/)) {
      try {
        sectionContent = atob(sectionContent);
      } catch (e) {
        sectionContent = '<p class="text-muted-foreground italic">Content is being processed...</p>';
      }
    }

    // Check if content already contains hierarchical structure
    const hasHierarchicalStructure = sectionContent.includes('class="level-') ||
      sectionContent.includes('data-level=');

    if (hasHierarchicalStructure) {
      // Content already has hierarchical structure - inject it directly
      sectionsHTML += sectionContent;
    } else {
      // Simple content - wrap it with standard section structure
      sectionsHTML += `
        <div class="section">
          <h3>${sectionNumber} ${sectionTitle}</h3>
          ${sectionContent || '<p>&lt;Content to be added&gt;</p>'}
        </div>
      `;
    }
  });

  // Apply hierarchical tagging to block elements (p, ul, ol, table) so they indent correctly
  sectionsHTML = applyHierarchicalClasses(sectionsHTML);

  // Generate table of contents if requested
  let tocHTML = '';
  if (includeTableOfContents && sections.length > 0) {
    tocHTML = `
      <div class="table-of-contents">
        <h2>Table of Contents</h2>
        <ul>
          ${sections.map((section, index) => {
      const sectionNumber = section.section_number || section.topic_number || `${index + 1}.0`;
      return `<li>${sectionNumber} ${section.title}</li>`;
    }).join('')}
        </ul>
      </div>
    `;
  }

  // Generate header HTML — use dynamic document type name instead of hardcoded value
  const headerTitle = (options.documentTypeName || 'STANDARD OPERATING PROCEDURE').toUpperCase();
  const processName = options.processName || '';
  const documentTitle = document.title || '';

  const headerHTML = includeHeader ? `
    <table class="header-table" style="width: 100%; border-collapse: collapse; table-layout: fixed;">
      <colgroup>
        <col style="width: 15%;">
        <col style="width: 50%;">
        <col style="width: 35%;">
      </colgroup>
      <tr>
        <td rowspan="3" style="text-align: center; vertical-align: middle; border: 1px solid black; padding: 8px;">
          ${company?.company_logo_url ? `<img src="${company.company_logo_url}" alt="Company Logo" style="max-width: 120px; max-height: 80px; object-fit: contain;">` : '<div style="font-size: 12px; color: #666;">LOGO</div>'}
        </td>
        <td style="background: #000; color: #fff; text-align: center; font-weight: bold; border: 1px solid black; padding: 10px 8px; font-size: 20px; letter-spacing: 2px; text-transform: uppercase;">
          ${headerTitle}
        </td>
        <td rowspan="3" style="border: 1px solid black; padding: 0; vertical-align: top;">
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tr>
              <td style="border: 1px solid black; padding: 4px 8px; font-size: 11px; white-space: nowrap; width: 50%;"><strong>Document No.</strong></td>
              <td style="border: 1px solid black; padding: 4px 8px; font-size: 11px; text-align: center; width: 50%;">${document.document_number || 'N/A'}</td>
            </tr>
            <tr>
              <td style="border: 1px solid black; padding: 4px 8px; font-size: 11px; white-space: nowrap;"><strong>Issue</strong></td>
              <td style="border: 1px solid black; padding: 4px 8px; font-size: 11px; text-align: center;">${document.version || '1.0'}</td>
            </tr>
            <tr>
              <td style="border: 1px solid black; padding: 4px 8px; font-size: 11px; white-space: nowrap;"><strong>Date of Revision</strong></td>
              <td style="border: 1px solid black; padding: 4px 8px; font-size: 11px; text-align: center;">${options.revisionDate || new Date().toISOString().split('T')[0]}</td>
            </tr>
            <tr>
              <td style="border: 1px solid black; padding: 4px 8px; font-size: 11px; white-space: nowrap;"><strong>Revision No.</strong></td>
              <td style="border: 1px solid black; padding: 4px 8px; font-size: 11px; text-align: center;">${document.revision_number || '1'}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid black; padding: 0;">
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tr>
              <td style="background: #222; color: #fff; font-weight: bold; font-size: 12px; padding: 5px 10px; text-align: center; text-transform: uppercase; letter-spacing: 1px; width: 40%; border-right: 1px solid #555;">${processName ? 'PROCESS' : ''}</td>
              <td style="background: #222; color: #fff; font-size: 12px; padding: 5px 10px; text-align: center; width: 60%;">${processName}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid black; padding: 8px 10px; font-size: 13px; text-align: center; font-weight: 600;">
          ${documentTitle}
        </td>
      </tr>
    </table>
  ` : '';

  // Generate footer HTML matching review/approval table format with signature placeholders
  const footerHTML = `
    <table class="footer-table" width="100%" border="1" cellspacing="0" cellpadding="8" 
           style="border-collapse: collapse; font-family: Calibri, Arial, sans-serif;">
      
      <tr style="text-align:center; font-weight:bold;">
        <td style="width:15%;"></td>
        <td style="width:25%;">Name</td>
        <td style="width:25%;">Designation</td>
        <td style="width:20%;">Signature</td>
        <td style="width:15%;">Date (YYYY/MM/DD)</td>
      </tr>

      <tr>
        <td style="font-weight:bold;">Reviewed by</td>
        <td>{{step_1_name}}</td>
        <td>{{step_1_designation}}</td>
        <td>{{step_1_signature}}</td>
        <td>{{step_1_date}}</td>
      </tr>

      <tr>
        <td style="font-weight:bold;">Approved by</td>
        <td>{{step_2_name}}</td>
        <td>{{step_2_designation}}</td>
        <td>{{step_2_signature}}</td>
        <td>{{step_2_date}}</td>
      </tr>

    </table>
  `;

  // Generate complete HTML document with border-container wrapper
  return `
    <!DOCTYPE html>
    <html lang="${document.language || 'en'}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${document.title}</title>
      <style>
        /* Page setup for A4 with intelligent pagination */
        @page {
          size: A4;
          margin: 15mm;
        }
        
        :root {
          --page-width-mm: 210;
          --page-height-mm: 297;
          --margin-mm: 15;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: ${fontStyle.fontFamily}, Arial, sans-serif;
          font-size: ${fontStyle.fontSize};
          line-height: 1.6;
          text-align: justify;
          color: #000;
          background: ${options.pagedPreview ? '#f5f5f5' : '#fff'};
        }
        
        ${options.pagedPreview ? `
        .page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          background: white;
          margin: 0 auto 10mm;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          page-break-after: always;
        }
        
        @media print {
          .page {
            margin: 0;
            box-shadow: none;
            page-break-after: always;
          }
        }
        ` : ''}
        
        #doc-wrapper {
          max-width: 210mm;
          margin: 0 auto;
          background: white;
        }
        
        .document-wrapper {
          padding: ${options.pagedPreview ? '0' : '20mm'};
        }
        
        ${includeBorder ? `
        .border-container {
          border: 2px solid #000 !important;
          padding: 20px !important;
          margin: 20px !important;
          min-height: calc(100vh - 40px);
        }
        
        /* Only remove borders from section containers, NOT from header/footer tables */
        .border-container > .section,
        .border-container > .doc-content {
          border: none !important;
        }
        
        /* Ensure header and footer tables ALWAYS keep borders */
        .header-table,
        .header-table td,
        .header-table th,
        table.header-table,
        table.header-table td,
        table.header-table th {
          border: 1px solid #000 !important;
        }
        
        .footer-table,
        .footer-table td,
        .footer-table th,
        table.footer-table,
        table.footer-table td,
        table.footer-table th {
          border: 1px solid #000 !important;
        }
        
        /* Tables with border attribute preserve borders */
        table[border="1"],
        table[border="1"] td,
        table[border="1"] th {
          border: 1px solid #000 !important;
        }
        ` : `
        .border-container {
          padding: 20px;
          margin: 20px;
        }
        `}
        
        /* Ensure doc-content NEVER has borders - only outer frame */
        .doc-content,
        #doc-content {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          -webkit-box-shadow: none !important;
        }
        
        /* Keep content clean by removing borders from section wrappers only
           (do NOT touch real content tables like Policy tables) */
        .doc-content .section {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
        
        .doc-content .section *:not(table):not(td):not(th) {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
        
        /* Intelligent page-break rules for proper A4 pagination */
        .header-table {
          width: 100%;
          border: 2px solid black;
          border-collapse: collapse;
          margin-bottom: 20px;
          page-break-inside: avoid;
          break-inside: avoid;
          page-break-after: avoid;
          break-after: avoid;
        }
        
        .header-table td {
          border: 1px solid black;
          padding: 5px;
          font-size: 11pt;
        }
        
        .footer-table {
          width: 100%;
          border: 2px solid black;
          border-collapse: collapse;
          margin-top: 20px;
          page-break-inside: avoid;
          break-inside: avoid;
          page-break-before: auto;
          break-before: auto;
          font-size: 11px;
        }
        
        .footer-table td {
          border: 1px solid black;
          padding: 5px;
        }
        
        .table-of-contents {
          margin: 20px 0;
          padding: 15px;
          background: #f9f9f9;
          page-break-after: always;
        }
        
        .table-of-contents h2 {
          font-size: 18pt;
          margin-bottom: 10px;
          font-family: ${headingStyle.fontFamily}, Arial, sans-serif;
        }
        
        .table-of-contents ul {
          list-style: none;
          padding-left: 0;
        }
        
        .table-of-contents li {
          padding: 5px 0;
          border-bottom: 1px dotted #ccc;
        }
        
        /* Section styling with intelligent page breaks */
        .section {
          margin-bottom: 20px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .section h3 {
          font-family: ${headingStyle.fontFamily}, Arial, sans-serif;
          font-size: ${headingStyle.fontSize};
          font-weight: bold;
          margin-bottom: 10px;
          color: #000;
          page-break-after: avoid;
          break-after: avoid;
        }
        
        .section p {
          margin-bottom: 10px;
          text-align: justify;
        }
        
        .section ul, .section ol {
          margin-left: 20px;
          margin-bottom: 10px;
        }
        
        /* Table page-break rules */
        .section table, table:not(.header-table):not(.footer-table) {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        /* Repeat table headers on each page */
        .section table thead, table thead {
          display: table-header-group;
        }
        
        .section table tbody, table tbody {
          display: table-row-group;
        }
        
        .section table td, .section table th {
          border: none;
          padding: 8px;
          text-align: left;
        }
        
        /* Opt-in borders for data tables */
        .section table[data-keep-borders="true"] td,
        .section table[data-keep-borders="true"] th {
          border: 1px solid #000;
        }
        
        .section table th {
          background: #f0f0f0;
          font-weight: bold;
        }
        
        /* Image page-break rules */
        .section img, .doc-content img, img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 10px 0;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        /* Dynamic hierarchical indentation styles */
        ${indentationCSS}
        
        /* Complete hierarchical section styling */
        ${HIERARCHICAL_CSS}
        
        /* Cell-based layout styling */
        ${generateCellLayoutCSS()}
        
        /* Hierarchical sections with intelligent page breaks */
        .level-0, .level-1, .level-2, .level-3 {
          margin-bottom: 10px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .level-0 h3, .level-1 h3, .level-2 h3, .level-3 h3 {
          font-family: ${headingStyle.fontFamily}, Arial, sans-serif;
          font-size: ${headingStyle.fontSize};
          font-weight: bold;
          margin-bottom: 5px;
          page-break-after: avoid;
          break-after: avoid;
          display: flex;
          align-items: baseline;
        }
        
        /* Data-level sections with page breaks */
        [data-level] {
          margin-bottom: 10px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        [data-level] h3 {
          display: flex;
          align-items: baseline;
          margin: 0;
          padding: 0;
          font-family: ${headingStyle.fontFamily}, Arial, sans-serif;
          font-size: ${headingStyle.fontSize};
          font-weight: bold;
          page-break-after: avoid;
          break-after: avoid;
        }
        
        [data-level] .number {
          font-weight: bold;
        }
        
        [data-level] .title-text {
          font-weight: bold;
        }
        
        [data-level] .content {
          text-align: justify;
        }
        
        /* General heading rules to prevent orphaned headings */
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid;
          break-after: avoid;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        /* Paragraph and list rules */
        p {
          orphans: 3;
          widows: 3;
        }
        
        ul, ol {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        li {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        /* Print styles with enhanced page-break control */
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          
          .border-container {
            border: none;
            margin: 0;
            padding: 10mm;
          }
          
          .section, .level-0, .level-1, .level-2, .level-3, [data-level] {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .header-table {
            page-break-after: avoid;
            break-after: avoid;
          }
          
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
            break-after: avoid;
          }
          
          table {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          table thead {
            display: table-header-group;
          }
          
          img {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div id="doc-wrapper" data-page-size="a4">
        <div class="document-wrapper">
          <div class="border-container">
            <div id="doc-header" class="doc-header">
              ${headerHTML}
            </div>
            
            <div id="doc-content" class="doc-content" style="border: none !important; box-shadow: none !important; outline: none !important;">
              ${tocHTML}
              ${sectionsHTML}
            </div>
            
            <div id="doc-footer" class="doc-footer">
              ${footerHTML}
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Parses flat HTML string from Tiptap and injects \`data-parent-level\` into
 * block elements (p, ul, ol, table) that follow a hierarchical heading.
 * This solves the CSS adjacent sibling selector limitation.
 */
function applyHierarchicalClasses(html: string): string {
  let currentLevel: string | null = null;

  // Match level divs OR specific block tags
  return html.replace(
    /(<div[^>]*class="[^"]*level-([0-3])[^"]*"[^>]*>|<div[^>]*data-level="([0-3])"[^>]*>)|(<(p|ul|ol|table)(?:\s+[^>]*?)?>)/gi,
    (match, levelMatch, classLevel, dataLevel, blockMatch, tag) => {
      // If we matched a heading level div, update the tracker
      if (levelMatch) {
        currentLevel = classLevel || dataLevel;
        return match;
      }

      // If we matched a block tag and we have an active level
      if (blockMatch && tag && currentLevel !== null) {
        const lowerMatch = match.toLowerCase();
        // Skip specialized lists that handle their own alignment
        if (lowerMatch.includes('letter-list') || lowerMatch.includes('roman-item') || lowerMatch.includes('roman-content')) {
          return match;
        }

        // Skip if already tagged
        if (lowerMatch.includes('data-parent-level=')) {
          return match;
        }

        // Inject the attribute right after the tag name
        return `<${tag} data-parent-level="${currentLevel}"${match.substring(tag.length + 1)}`;
      }

      return match;
    }
  );
}

/**
 * Extract sections from document content
 * Handles various document structures from different creation flows
 */
export function extractSectionsFromDocument(document: any, topics?: any[]): DocumentSection[] {
  const sections: DocumentSection[] = [];

  // Priority 1: Check if document already has processed sections array (from preview)
  if (document.content?.sections && Array.isArray(document.content.sections) && document.content.sections.length > 0) {
    return document.content.sections.map((section: any, index: number) => {
      let sectionContent = '';
      if (typeof section.content === 'string') {
        sectionContent = section.content;
      } else if (section.content && typeof section.content === 'object') {
        sectionContent = section.content.content || section.content.text || JSON.stringify(section.content);
      }

      return {
        id: section.id || `section - ${index} `,
        title: section.title || `Section ${index + 1} `,
        content: sectionContent,
        section_number: section.section_number || section.topic_number || `${index + 1} .0`,
        order: section.order || index + 1
      };
    });
  }

  // Priority 2: Handle SOP sections structure
  if (document.content?.sopSections && Array.isArray(document.content.sopSections)) {
    return document.content.sopSections
      .filter((section: any) => !section.isSkipped)
      .map((section: any, index: number) => ({
        id: section.id || `sop - section - ${index} `,
        title: section.title || `Section ${section.number || index + 1} `,
        content: section.content || '',
        section_number: section.number || `${index + 1} .0`,
        order: section.order || index + 1
      }));
  }

  // Priority 3: Process from topics if available
  if (topics && topics.length > 0) {
    return topics.map((topic, index) => {
      let topicContent = document.content?.[topic.id] || '';

      if (typeof topicContent === 'object' && topicContent) {
        const contentObj = topicContent as any;
        topicContent = contentObj.content || contentObj.text || JSON.stringify(topicContent);
      }

      return {
        id: topic.id,
        title: topic.topic_title || topic.name,
        content: topicContent || '',
        section_number: topic.topic_number || `${index + 1} .0`,
        order: topic.display_order || (index + 1)
      };
    });
  }

  // Fallback: Process from document content object
  if (document.content && typeof document.content === 'object') {
    Object.entries(document.content).forEach(([key, value], index) => {
      let content = '';
      if (typeof value === 'string') {
        content = value;
      } else if (typeof value === 'object' && value) {
        const obj = value as any;
        content = obj.content || obj.text || JSON.stringify(value);
      }

      sections.push({
        id: key,
        title: `Section ${index + 1} `,
        content,
        section_number: `${index + 1} .0`,
        order: index + 1
      });
    });
  }

  return sections;
}

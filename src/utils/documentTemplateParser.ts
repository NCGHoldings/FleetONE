export interface ParsedDocumentSection {
  sectionId: string;          // from data-section attribute (e.g., "purpose")
  sectionNumber: string;      // e.g., "1.0", "7.0"
  sectionTitle: string;       // e.g., "Purpose", "Procedure"
  isRequired: boolean;        // default false, user can change
  contentPlaceholder: string; // HTML of content area
  allowedContentTypes: string[]; // ["text", "table", "image", "list", "roman"]
  order: number;              // 1, 2, 3...
  supportsSubSections: boolean; // true for sections like Procedure
}

export interface ParsedDocumentTemplate {
  documentTypeCode: string;   // SOP, POL, MEM, etc.
  templateName: string;       // Will be set by user
  htmlTemplate: string;       // Full HTML
  sections: ParsedDocumentSection[];
  systemPlaceholders: string[]; // {{company_logo}}, etc.
  headerStructure: string;    // Fixed header HTML
  footerStructure: string;    // Fixed footer HTML
  hasHierarchicalNumbering: boolean;
}

/**
 * Extract all sections with data-section attributes from HTML template
 */
function extractDocumentSections(htmlTemplate: string): ParsedDocumentSection[] {
  const sections: ParsedDocumentSection[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlTemplate, 'text/html');
  
  // Find all elements with data-section attribute (excluding example-box)
  const sectionElements = doc.querySelectorAll('[data-section]:not(.example-box)');
  
  sectionElements.forEach((element, index) => {
    const sectionId = element.getAttribute('data-section') || '';
    
    // Extract section number from <span class="number">
    const numberSpan = element.querySelector('.number');
    const sectionNumber = numberSpan?.textContent?.trim() || '';
    
    // Extract section title from <span class="title-text">
    const titleSpan = element.querySelector('.title-text');
    const sectionTitle = titleSpan?.textContent?.trim() || '';
    
    // Extract content area
    const contentDiv = element.querySelector('.content');
    const contentPlaceholder = contentDiv?.innerHTML || '';
    
    // Check if section supports sub-sections (has level-1, level-2, etc. in content)
    const supportsSubSections = true; // All sections support hierarchical sub-sections by default
    
    sections.push({
      sectionId,
      sectionNumber,
      sectionTitle,
      isRequired: false, // All optional by default
      contentPlaceholder,
      allowedContentTypes: ['text', 'table', 'image', 'list', 'roman'],
      order: index + 1,
      supportsSubSections
    });
  });
  
  return sections;
}

/**
 * Extract system placeholders like {{company_logo}}, {{document_number}}
 */
function extractSystemPlaceholders(htmlTemplate: string): string[] {
  const placeholderRegex = /\{\{([a-zA-Z_]+)\}\}/g;
  const placeholders = new Set<string>();
  
  let match;
  while ((match = placeholderRegex.exec(htmlTemplate)) !== null) {
    placeholders.add(match[0]); // Store with {{ }}
  }
  
  return Array.from(placeholders);
}

/**
 * Extract header structure (everything before first section)
 */
function extractHeaderStructure(htmlTemplate: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlTemplate, 'text/html');
  
  // Find first section element
  const firstSection = doc.querySelector('[data-section]');
  if (!firstSection) return '';
  
  // Get all elements before first section
  const headerElements: Element[] = [];
  let currentElement = doc.body.firstElementChild;
  
  while (currentElement && currentElement !== firstSection) {
    headerElements.push(currentElement);
    currentElement = currentElement.nextElementSibling;
  }
  
  return headerElements.map(el => el.outerHTML).join('\n');
}

/**
 * Extract footer structure (everything after last section)
 */
function extractFooterStructure(htmlTemplate: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlTemplate, 'text/html');
  
  // Find last section element
  const sections = doc.querySelectorAll('[data-section]');
  const lastSection = sections[sections.length - 1];
  if (!lastSection) return '';
  
  // Get all elements after last section
  const footerElements: Element[] = [];
  let currentElement = lastSection.nextElementSibling;
  
  while (currentElement) {
    footerElements.push(currentElement);
    currentElement = currentElement.nextElementSibling;
  }
  
  return footerElements.map(el => el.outerHTML).join('\n');
}

/**
 * Main parser - extracts all information from HTML template
 */
export function parseDocumentTemplate(htmlTemplate: string): ParsedDocumentTemplate {
  const sections = extractDocumentSections(htmlTemplate);
  const systemPlaceholders = extractSystemPlaceholders(htmlTemplate);
  const headerStructure = extractHeaderStructure(htmlTemplate);
  const footerStructure = extractFooterStructure(htmlTemplate);
  
  // Detect if template has hierarchical numbering support
  const hasHierarchicalNumbering = htmlTemplate.includes('level-1') || 
                                   htmlTemplate.includes('level-2') || 
                                   htmlTemplate.includes('level-3');
  
  return {
    documentTypeCode: '', // Will be set by user
    templateName: '', // Will be set by user
    htmlTemplate,
    sections,
    systemPlaceholders,
    headerStructure,
    footerStructure,
    hasHierarchicalNumbering
  };
}

/**
 * Convert parsed template to section_mappings JSONB format
 */
export function templateToSectionMappings(parsed: ParsedDocumentTemplate) {
  return {
    sections: parsed.sections,
    systemPlaceholders: parsed.systemPlaceholders,
    hasHierarchicalNumbering: parsed.hasHierarchicalNumbering
  };
}

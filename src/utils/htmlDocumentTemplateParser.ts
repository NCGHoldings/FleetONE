/**
 * HTML Document Template Parser
 * Parses HTML templates to extract section structure, sub-section support, and content types
 * Similar to formTemplateParser but for document templates
 */

export interface ParsedDocumentSection {
  sectionId: string;          // from marker: {{SECTION:1.0:Purpose:required}}
  sectionNumber: string;      // e.g., "1.0", "2.0"
  sectionTitle: string;       // e.g., "Purpose", "Procedure"
  isRequired: boolean;        // from marker: required/optional
  contentPlaceholder: string; // HTML of content area
  allowedContentTypes: string[]; // from <!-- CONTENT_TYPES: text,table,image -->
  order: number;              // 1, 2, 3...
  supportsSubSections: boolean; // from <!-- ALLOW_SUB_SECTIONS -->
}

export interface ParsedDocumentTemplate {
  documentTypeCode: string;
  templateName: string;
  htmlTemplate: string;
  sections: ParsedDocumentSection[];
  systemPlaceholders: string[];
  hasHierarchicalNumbering: boolean;
}

/**
 * Extract sections from HTML using {{SECTION:...}} markers
 * Format: {{SECTION:number:title:required|optional}}
 * Example: {{SECTION:1.0:Purpose:required}}
 */
function extractSectionsFromMarkers(htmlTemplate: string): ParsedDocumentSection[] {
  const sections: ParsedDocumentSection[] = [];
  const sectionRegex = /\{\{SECTION:([^:]+):([^:]+):(required|optional)\}\}/g;
  
  let match;
  let order = 1;
  
  while ((match = sectionRegex.exec(htmlTemplate)) !== null) {
    const [fullMatch, sectionNumber, sectionTitle, requiredFlag] = match;
    const sectionId = sectionTitle.toLowerCase().replace(/\s+/g, '_');
    
    // Find the content area after this marker
    const markerIndex = match.index + fullMatch.length;
    const nextMarkerMatch = htmlTemplate.slice(markerIndex).match(/\{\{SECTION:/);
    const nextMarkerIndex = nextMarkerMatch ? markerIndex + nextMarkerMatch.index : htmlTemplate.length;
    const contentArea = htmlTemplate.slice(markerIndex, nextMarkerIndex);
    
    // Check for ALLOW_SUB_SECTIONS comment in this section
    const supportsSubSections = contentArea.includes('<!-- ALLOW_SUB_SECTIONS -->');
    
    // Check for CONTENT_TYPES comment
    const contentTypesMatch = contentArea.match(/<!--\s*CONTENT_TYPES:\s*([^-]+)\s*-->/);
    const allowedContentTypes = contentTypesMatch 
      ? contentTypesMatch[1].split(',').map(t => t.trim())
      : ['text', 'table', 'image', 'list'];
    
    sections.push({
      sectionId,
      sectionNumber: sectionNumber.trim(),
      sectionTitle: sectionTitle.trim(),
      isRequired: requiredFlag === 'required',
      contentPlaceholder: contentArea.trim(),
      allowedContentTypes,
      order: order++,
      supportsSubSections
    });
  }
  
  return sections;
}

/**
 * Fallback: Extract sections from data-section attributes (legacy templates)
 */
function extractSectionsFromDataAttributes(htmlTemplate: string): ParsedDocumentSection[] {
  const sections: ParsedDocumentSection[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlTemplate, 'text/html');
  
  const sectionElements = doc.querySelectorAll('[data-section]:not(.example-box)');
  
  sectionElements.forEach((element, index) => {
    const sectionId = element.getAttribute('data-section') || '';
    const numberSpan = element.querySelector('.number');
    const sectionNumber = numberSpan?.textContent?.trim() || '';
    const titleSpan = element.querySelector('.title-text');
    const sectionTitle = titleSpan?.textContent?.trim() || '';
    const contentDiv = element.querySelector('.content');
    const contentPlaceholder = contentDiv?.innerHTML || '';
    
    // Check for sub-section support
    const supportsSubSections = htmlTemplate.includes('level-1') && 
                                (sectionId === 'procedure' || sectionNumber.startsWith('7'));
    
    sections.push({
      sectionId,
      sectionNumber,
      sectionTitle,
      isRequired: false,
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
    // Skip SECTION markers
    if (!match[0].startsWith('{{SECTION:')) {
      placeholders.add(match[0]);
    }
  }
  
  return Array.from(placeholders);
}

/**
 * Detect if template has hierarchical numbering support
 */
function hasHierarchicalNumbering(htmlTemplate: string): boolean {
  return htmlTemplate.includes('<!-- HIERARCHICAL_NUMBERING -->') ||
         htmlTemplate.includes('level-1') || 
         htmlTemplate.includes('level-2') || 
         htmlTemplate.includes('level-3') ||
         htmlTemplate.includes('ALLOW_SUB_SECTIONS');
}

/**
 * Main parser - extracts all information from HTML template
 */
export function parseHTMLDocumentTemplate(htmlTemplate: string): ParsedDocumentTemplate {
  // Try marker-based extraction first (new format)
  let sections = extractSectionsFromMarkers(htmlTemplate);
  
  // Fallback to data-attribute extraction (legacy format)
  if (sections.length === 0) {
    sections = extractSectionsFromDataAttributes(htmlTemplate);
  }
  
  const systemPlaceholders = extractSystemPlaceholders(htmlTemplate);
  const hasHierarchical = hasHierarchicalNumbering(htmlTemplate);
  
  return {
    documentTypeCode: '', // Will be set from database
    templateName: '', // Will be set from database
    htmlTemplate,
    sections,
    systemPlaceholders,
    hasHierarchicalNumbering: hasHierarchical
  };
}

/**
 * Convert parsed template to topics format (compatible with ContentCreation component)
 */
export function parsedSectionsToTopics(sections: ParsedDocumentSection[], documentTypeCode: string) {
  return sections.map(section => ({
    id: `${documentTypeCode}_${section.sectionId}`,
    document_type_code: documentTypeCode,
    topic_number: section.sectionNumber,
    topic_title: section.sectionTitle,
    topic_description: null,
    is_required: section.isRequired,
    allowed_content_types: section.allowedContentTypes,
    allow_sub_sections: section.supportsSubSections,
    display_order: section.order,
    created_at: new Date().toISOString()
  }));
}

/**
 * Generate example HTML template with markers
 */
export function generateExampleTemplate(documentTypeCode: string): string {
  return `<!-- HTML Document Template -->
<!-- Use {{SECTION:number:title:required|optional}} markers to define sections -->
<!-- Add <!-- ALLOW_SUB_SECTIONS --> to enable hierarchical numbering -->
<!-- Add <!-- CONTENT_TYPES: text,table,image,list --> to specify allowed content -->

<div class="document-template">
  <header>
    <img src="{{company_logo}}" alt="Company Logo" />
    <h1>{{document_title}}</h1>
    <div>Document Number: {{document_number}}</div>
  </header>

  {{SECTION:1.0:Purpose:required}}
  <!-- CONTENT_TYPES: text -->
  <h2>1.0 Purpose</h2>
  <div class="content">
    <p>{{purpose_content}}</p>
  </div>

  {{SECTION:2.0:Scope:required}}
  <!-- CONTENT_TYPES: text,list -->
  <h2>2.0 Scope</h2>
  <div class="content">
    <p>{{scope_content}}</p>
  </div>

  {{SECTION:3.0:Responsibilities:optional}}
  <!-- CONTENT_TYPES: text,table -->
  <!-- ALLOW_SUB_SECTIONS -->
  <h2>3.0 Responsibilities</h2>
  <div class="content">
    {{responsibilities_content}}
  </div>

  {{SECTION:4.0:Procedure:required}}
  <!-- CONTENT_TYPES: text,table,image,list -->
  <!-- ALLOW_SUB_SECTIONS -->
  <!-- HIERARCHICAL_NUMBERING -->
  <h2>4.0 Procedure</h2>
  <div class="content">
    {{procedure_content}}
  </div>

  <footer>
    <div>Created: {{created_at}}</div>
    <div>Version: {{version}}</div>
  </footer>
</div>`;
}

/**
 * Content Structure Transformer
 * 
 * Transforms raw document HTML content to add proper hierarchical level classes
 * that match the CSS selectors from backend indentation settings.
 * 
 * This ensures consistent rendering between:
 * - DocumentViewer preview
 * - ReviewGenerate preview  
 * - PDF download
 * - IndentationSettings preview
 */

/**
 * Determines the hierarchy level based on section number pattern
 * Examples:
 * - "1.0" or "1" → Level 0 (main section)
 * - "1.1" → Level 1 (sub-section)
 * - "1.1.1" → Level 2 (sub-sub-section)
 * - "1.1.1.1" → Level 3 (deepest level)
 */
function getHierarchyLevel(sectionNumber: string): number {
  if (!sectionNumber) return 0;
  
  // Count dots to determine level
  const parts = sectionNumber.split('.').filter(p => p.trim() !== '');
  
  // X.0 pattern is level 0, X.Y is level 1, X.Y.Z is level 2, etc.
  if (parts.length <= 1) return 0;
  if (parts.length === 2 && parts[1] === '0') return 0;
  if (parts.length === 2) return 1;
  if (parts.length === 3) return 2;
  return 3; // 4+ parts all become level 3
}

/**
 * Clean up any duplicated numbering in roman/letter items.
 * This handles cases where the prefix was accidentally included in the content.
 * 
 * Fixes patterns like:
 * - "i.i.i.content" → "content"
 * - "a.a.a.content" → "content"
 */
function cleanupDuplicatedNumbering(doc: Document): void {
  // Clean roman items - remove any leading roman numeral prefix from content
  // This prevents double-numbering like "ii. i. The issuance..."
  doc.querySelectorAll('.roman-item').forEach((item) => {
    const numberEl = item.querySelector('.roman-number');
    const contentEl = item.querySelector('.roman-content');
    
    if (numberEl && contentEl) {
      // Get the expected numeral from the number element
      const numeral = numberEl.textContent?.trim().replace(/\.\s*$/, '') || '';
      
      if (numeral) {
        // Pattern 1: Remove duplicates of the SAME numeral (e.g., "i.i.i." at start)
        const escapedNumeral = numeral.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const dupePattern = new RegExp(`^(${escapedNumeral}\\.\\s*)+`, 'i');
        
        // Pattern 2: Remove ANY leading roman numeral prefix (i., ii., iii., iv., v., vi., vii., etc.)
        // This catches cases where content starts with a manual "i." regardless of item number
        const anyRomanPrefix = /^([ivxlcdm]+)\.\s*/i;
        
        // Process text nodes and first child elements
        const walker = doc.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, null);
        const firstTextNode = walker.nextNode();
        
        if (firstTextNode && firstTextNode.textContent) {
          // First remove same-numeral duplicates
          firstTextNode.textContent = firstTextNode.textContent.replace(dupePattern, '');
          // Then remove any leading roman numeral prefix
          firstTextNode.textContent = firstTextNode.textContent.replace(anyRomanPrefix, '');
        }
      }
    }
  });
  
  // Clean letter items
  doc.querySelectorAll('.letter-item').forEach((item) => {
    const numberEl = item.querySelector('.letter-number');
    const contentEl = item.querySelector('.letter-content');
    
    if (numberEl && contentEl) {
      const letter = numberEl.textContent?.trim().replace(/\.\s*$/, '') || '';
      
      if (letter) {
        const escapedLetter = letter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const dupePattern = new RegExp(`^(${escapedLetter}\\.\\s*)+`, 'i');
        
        const walker = doc.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, null);
        const firstTextNode = walker.nextNode();
        
        if (firstTextNode && firstTextNode.textContent) {
          firstTextNode.textContent = firstTextNode.textContent.replace(dupePattern, '');
        }
      }
    }
  });
}

/**
 * Collects sibling content elements after each sub-section and wraps them
 * inside the sub-section container. This is needed because TipTap creates
 * sub-sections as heading-only divs with content as siblings.
 * 
 * Before:
 * <div class="sub-section-wrapper"><h3>1.1 Title</h3></div>
 * <p>Content paragraph 1</p>
 * <p>Content paragraph 2</p>
 * 
 * After:
 * <div class="sub-section-wrapper level-1" data-level="1">
 *   <h3>1.1 Title</h3>
 *   <div class="content">
 *     <p>Content paragraph 1</p>
 *     <p>Content paragraph 2</p>
 *   </div>
 * </div>
 */
function collectAndWrapSiblingContent(doc: Document): void {
  // Find all sub-section wrappers (TipTap output format) - excluding Roman numeral lists (handled separately)
  const subSections = doc.querySelectorAll('.sub-section-wrapper, [data-sub-section="true"], .hierarchical-section');
  
  subSections.forEach((section) => {
    // Get section number from the heading
    const numberSpan = section.querySelector('.number, .section-number');
    const sectionNumber = numberSpan?.textContent?.trim() || '';
    const level = getHierarchyLevel(sectionNumber);
    
    // Add level class and data attribute
    section.classList.add(`level-${level}`);
    section.setAttribute('data-level', String(level));
    
    // Check if content wrapper already exists
    if (section.querySelector(':scope > .content')) {
      return; // Already has content wrapper
    }
    
    // Collect all sibling elements until the next section boundary
    const contentElements: Element[] = [];
    let sibling = section.nextElementSibling;
    
    // Stop conditions: next sub-section, main section, or section with level class
    const stopSelectors = '.sub-section-wrapper, [data-sub-section], [data-section], [data-section-number], .level-0, .level-1, .level-2, .level-3, .hierarchical-section';
    
    while (sibling && !sibling.matches(stopSelectors)) {
      // Only collect content elements (paragraphs, lists, tables, images, Roman items, etc.)
      if (sibling.matches('p, ul, ol, table, figure, img, .roman-item, .level-1-roman, div:not(.sub-section-wrapper):not([data-section]):not(.level-1-roman)')) {
        contentElements.push(sibling);
      }
      sibling = sibling.nextElementSibling;
    }
    
    // If we have content elements, wrap them and move into the section
    if (contentElements.length > 0) {
      const contentWrapper = doc.createElement('div');
      contentWrapper.className = 'content';
      
      // Remove elements from their current position and add to wrapper
      contentElements.forEach(el => {
        el.parentNode?.removeChild(el);
        contentWrapper.appendChild(el);
      });
      
      // Append the content wrapper to the section
      section.appendChild(contentWrapper);
    }
  });
  
  // Handle Roman numeral lists - add parent level class based on DOM context
  const romanLists = doc.querySelectorAll('.level-1-roman');
  romanLists.forEach((romanList) => {
    // Detect parent level from DOM context
    let parentLevel = -1;
    let parent = romanList.parentElement;
    
    while (parent) {
      // Check for level classes
      for (let level = 3; level >= 0; level--) {
        if (parent.classList.contains(`level-${level}`) || 
            parent.getAttribute('data-level') === String(level)) {
          parentLevel = level;
          break;
        }
      }
      if (parentLevel >= 0) break;
      
      // Check for content wrapper inside level
      if (parent.classList.contains('content')) {
        const levelParent = parent.parentElement;
        if (levelParent) {
          for (let level = 3; level >= 0; level--) {
            if (levelParent.classList.contains(`level-${level}`) || 
                levelParent.getAttribute('data-level') === String(level)) {
              parentLevel = level;
              break;
            }
          }
        }
        if (parentLevel >= 0) break;
      }
      parent = parent.parentElement;
    }
    
    // Add parent level class and data attribute
    if (parentLevel >= 0) {
      romanList.classList.add(`roman-under-level-${parentLevel}`);
      romanList.setAttribute('data-parent-level', String(parentLevel));
    }
  });
}

/**
 * Transforms document content HTML to add proper level classes and structure
 * 
 * @param html - Raw HTML content from document template or editor
 * @returns Transformed HTML with proper level classes for CSS to apply
 */
export function transformContentWithLevelClasses(html: string): string {
  if (!html) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Find all section elements with data-section-number attribute
  const sections = doc.querySelectorAll('[data-section-number], [data-section]');
  
  sections.forEach((section) => {
    const sectionId = section.getAttribute('data-section') || '';
    const sectionNumber = section.getAttribute('data-section-number') || '';

    // Skip memo-specific structural sections that should not be transformed
    // These are metadata tables (Subject/To/From/CC, approval signatures) not content
    const memoStructuralSections = ['memo_info', 'signatures'];
    if (memoStructuralSections.includes(sectionId) || sectionNumber.startsWith('0.')) {
      return;
    }

    const level = getHierarchyLevel(sectionNumber);
    
    // Add level class and data attribute
    section.classList.add(`level-${level}`);
    section.setAttribute('data-level', String(level));
    
    // Find or create proper structure: heading + content wrapper
    const existingHeading = section.querySelector('h1, h2, h3, h4, h5, h6, .title, .section-title');
    const existingContent = section.querySelector('.content');
    
    // If content wrapper doesn't exist, wrap non-heading content
    if (!existingContent) {
      const contentWrapper = doc.createElement('div');
      contentWrapper.className = 'content';
      
      // Move all child nodes except heading into content wrapper
      const childNodes = Array.from(section.childNodes);
      let foundHeading = false;
      
      childNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          if (!foundHeading && (el.matches('h1, h2, h3, h4, h5, h6, .title, .section-title') || el.classList.contains('number'))) {
            foundHeading = true;
            return; // Keep heading in place
          }
        }
        // Move to content wrapper if it's after the heading
        if (foundHeading && node.parentNode === section) {
          contentWrapper.appendChild(node);
        }
      });
      
      // Only append content wrapper if it has children
      if (contentWrapper.childNodes.length > 0) {
        section.appendChild(contentWrapper);
      }
    }
    
    // Ensure heading has proper structure with number and title-text spans
    if (existingHeading) {
      const headingText = existingHeading.textContent || '';
      const numberMatch = headingText.match(/^([0-9]+(?:\.[0-9]+)*)\s*(.*)/);
      
      if (numberMatch && !existingHeading.querySelector('.number')) {
        const [, numberPart, titlePart] = numberMatch;
        existingHeading.innerHTML = `<span class="number">${numberPart}</span> <span class="title-text">${titlePart}</span>`;
      }
    }
  });

  // Process TipTap hierarchical sub-sections - collect and wrap sibling content
  collectAndWrapSiblingContent(doc);

  // Clean up any duplicated numbering (fallback for residual duplication)
  cleanupDuplicatedNumbering(doc);

  return doc.body.innerHTML;
}

/**
 * Applies level transformation to the entire document HTML
 * Identifies content sections and wraps them appropriately
 * 
 * @param html - Complete document HTML (including header/footer)
 * @returns Transformed HTML with proper level classes in content area
 */
export function transformDocumentHTML(html: string): string {
  if (!html) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Find doc-content or border-container to transform
  // Also check for parent containers of [data-section] elements as fallback
  let contentArea = doc.querySelector('.doc-content, #doc-content, .border-container');
  
  // Fallback: if no standard content area, find the closest common ancestor of data-section elements
  if (!contentArea) {
    const firstSection = doc.querySelector('[data-section]');
    if (firstSection?.parentElement) {
      contentArea = firstSection.parentElement;
    }
  }
  
  if (contentArea) {
    // Apply transformation to content area only
    const transformedContent = transformContentWithLevelClasses(contentArea.innerHTML);
    contentArea.innerHTML = transformedContent;
  } else {
    // Transform the entire body if no specific content area found
    const transformedContent = transformContentWithLevelClasses(doc.body.innerHTML);
    doc.body.innerHTML = transformedContent;
  }

  return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
}

/**
 * Validates that the transformed content has proper level classes
 * Returns compliance information for the monitoring system
 */
export interface TransformationValidation {
  hasLevelClasses: boolean;
  hasContentWrappers: boolean;
  levelCounts: Record<number, number>;
  issues: string[];
}

export function validateTransformedContent(html: string): TransformationValidation {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const issues: string[] = [];
  const levelCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  
  // Count level classes
  for (let level = 0; level <= 3; level++) {
    const elements = doc.querySelectorAll(`.level-${level}, [data-level="${level}"]`);
    levelCounts[level] = elements.length;
  }
  
  const hasLevelClasses = Object.values(levelCounts).some(count => count > 0);
  
  // Check for content wrappers
  const contentWrappers = doc.querySelectorAll('.content');
  const hasContentWrappers = contentWrappers.length > 0;
  
  // Check for potential issues
  if (!hasLevelClasses) {
    issues.push('No level classes found - indentation CSS will not apply');
  }
  
  if (!hasContentWrappers && hasLevelClasses) {
    issues.push('Level classes present but no .content wrappers - content may not indent correctly');
  }
  
  // Check for sections without level classes
  const sectionsWithoutLevel = doc.querySelectorAll('[data-section]:not([data-level])');
  if (sectionsWithoutLevel.length > 0) {
    issues.push(`${sectionsWithoutLevel.length} sections missing level classes`);
  }

  return {
    hasLevelClasses,
    hasContentWrappers,
    levelCounts,
    issues
  };
}

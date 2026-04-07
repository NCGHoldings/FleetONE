/*
  Smart DOM paginator for A4 PDFs
  - Splits #doc-content into A4-sized pages at 793px width (content width)
  - Repeats header/footer per page
  - Handles tables (repeat thead, no mid-row breaks) and lists (split by li)
*/

export interface PaginatorOptions {
  pageWidthMM?: number;
  pageHeightMM?: number;
  marginTopMM?: number;
  marginRightMM?: number;
  marginBottomMM?: number;
  marginLeftMM?: number;
  marginMM?: number; // Deprecated: use specific margins
  windowWidthPx?: number;
  headerEl?: HTMLElement | null;
  footerEl?: HTMLElement | null;
  borderEnabled?: boolean;
  borderThickness?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  paddingTopPx?: number;
  paddingRightPx?: number;
  paddingBottomPx?: number;
  paddingLeftPx?: number;
}

interface PageParts {
  pageDiv: HTMLDivElement;
  header: HTMLElement | null;
  content: HTMLDivElement;
  footer: HTMLElement | null;
}

export function paginateToA4Pages(root: HTMLElement, opts: PaginatorOptions = {}) {
  // Validate root element
  if (!root || !(root instanceof HTMLElement)) {
    throw new Error('smartPaginator: Invalid root element provided');
  }
  
  console.log('Smart paginator starting with root:', root.id || root.className);
  
  const pageWidthMM = opts.pageWidthMM ?? 210;
  const pageHeightMM = opts.pageHeightMM ?? 297;
  
  // Support both old marginMM and new specific margins
  const marginTopMM = opts.marginTopMM ?? opts.marginMM ?? 15;
  const marginRightMM = opts.marginRightMM ?? opts.marginMM ?? 15;
  const marginBottomMM = opts.marginBottomMM ?? opts.marginMM ?? 15;
  const marginLeftMM = opts.marginLeftMM ?? opts.marginMM ?? 15;
  
  const borderEnabled = opts.borderEnabled ?? true;
  const borderThickness = opts.borderThickness ?? 2;
  const borderColor = opts.borderColor ?? '#000000';
  const borderStyle = opts.borderStyle ?? 'solid';
  
  const paddingTopPx = opts.paddingTopPx ?? 20;
  const paddingRightPx = opts.paddingRightPx ?? 20;
  const paddingBottomPx = opts.paddingBottomPx ?? 20;
  const paddingLeftPx = opts.paddingLeftPx ?? 20;
  
  const widthPx = opts.windowWidthPx ?? 1122;
  const contentWidthMM = pageWidthMM - marginLeftMM - marginRightMM;
  const pxPerMM = widthPx / contentWidthMM;
  const contentHeightPx = Math.round((pageHeightMM - marginTopMM - marginBottomMM) * pxPerMM);

  const headerSrc = opts.headerEl ?? (root.querySelector('#doc-header') as HTMLElement | null);
  const contentSrc = root.querySelector('#doc-content') as HTMLElement | null;
  const footerSrc = opts.footerEl ?? (root.querySelector('#doc-footer') as HTMLElement | null);

  if (!contentSrc) {
    console.error('Available IDs in root:', Array.from(root.querySelectorAll('[id]')).map(el => el.id));
    console.error('Root structure:', root.innerHTML.substring(0, 300));
    throw new Error('smartPaginator: #doc-content not found in provided root element');
  }

  // Staging container (hidden offscreen) - create BEFORE measuring so we can measure properly
  const staging = document.createElement('div');
  staging.style.position = 'absolute';
  staging.style.left = '-9999px';
  staging.style.top = '0';
  staging.style.width = `${widthPx}px`;
  staging.style.background = '#fff';
  staging.setAttribute('data-paginator-staging', 'true');
  document.body.appendChild(staging);

  // CRITICAL: Measure header/footer heights BEFORE removing them from DOM
  // Clone them into staging area first for accurate measurement
  let headerHeightPx = 0;
  let footerHeightPx = 0;

  if (headerSrc) {
    const headerMeasure = headerSrc.cloneNode(true) as HTMLElement;
    headerMeasure.style.width = `${widthPx}px`;
    headerMeasure.style.position = 'static';
    headerMeasure.style.visibility = 'hidden';
    staging.appendChild(headerMeasure);
    headerHeightPx = headerMeasure.offsetHeight;
    staging.removeChild(headerMeasure);
  }

  if (footerSrc) {
    const footerMeasure = footerSrc.cloneNode(true) as HTMLElement;
    footerMeasure.style.width = `${widthPx}px`;
    footerMeasure.style.position = 'static';
    footerMeasure.style.visibility = 'hidden';
    staging.appendChild(footerMeasure);
    footerHeightPx = footerMeasure.offsetHeight;
    staging.removeChild(footerMeasure);
  }

  const totalVerticalPadding = paddingTopPx + paddingBottomPx;
  // Available content per page WITHOUT footer (footer only on last page)
  const availableContentPxNoFooter = Math.max(0, contentHeightPx - headerHeightPx - totalVerticalPadding);
  // Available content on the last page (with footer)
  const availableContentPxWithFooter = Math.max(0, contentHeightPx - headerHeightPx - footerHeightPx - totalVerticalPadding);
  // Default: use no-footer space for most pages
  const availableContentPx = availableContentPxNoFooter;

  console.log('Smart paginator initialized:', {
    contentHeightPx,
    headerHeightPx,
    footerHeightPx,
    availableContentPx,
    pageWidthMM,
    pageHeightMM
  });

  // Now remove header and footer from source to prevent duplication
  // (they will be cloned and added to each page)
  if (headerSrc && headerSrc.parentElement) {
    headerSrc.remove();
  }
  if (footerSrc && footerSrc.parentElement) {
    footerSrc.remove();
  }

  const pages: HTMLElement[] = [];
  const pagesParts: PageParts[] = [];

  function cloneNodeClean<T extends HTMLElement>(node: T): T {
    const cloned = node.cloneNode(true) as T;
    return cloned;
  }

  function isGenericContainer(el: HTMLElement): boolean {
    const t = el.tagName.toLowerCase();
    return t === 'div' || t === 'section' || t === 'article' || t === 'main';
  }

  function createPage(): PageParts {
    const pageDiv = document.createElement('div');
    pageDiv.style.width = `${widthPx}px`;
    pageDiv.style.minHeight = `${contentHeightPx}px`;
    pageDiv.style.background = '#ffffff';
    pageDiv.style.display = 'block';
    pageDiv.style.pageBreakAfter = 'always';
    pageDiv.style.boxSizing = 'border-box';
    
    // Configurable page border
    if (borderEnabled) {
      pageDiv.style.border = `${borderThickness}px ${borderStyle} ${borderColor}`;
    } else {
      pageDiv.style.border = 'none';
    }
    
    pageDiv.style.padding = `${paddingTopPx}px ${paddingRightPx}px ${paddingBottomPx}px ${paddingLeftPx}px`;
    pageDiv.style.margin = '20px auto';

    // Create border container for layout structure with flexbox for footer positioning
    const borderContainer = document.createElement('div');
    borderContainer.className = 'border-container';
    borderContainer.style.padding = '0';
    borderContainer.style.margin = '0';
    borderContainer.style.minHeight = `${contentHeightPx - 40}px`; // Subtract padding (40px)
    borderContainer.style.boxSizing = 'border-box';
    borderContainer.style.display = 'flex';
    borderContainer.style.flexDirection = 'column';

    const header = headerSrc ? cloneNodeClean(headerSrc) : null;
    // Footer is NOT added to intermediate pages — only to the last page
    const content = document.createElement('div');
    content.className = 'doc-content';
    content.style.display = 'block';
    content.style.overflow = 'hidden';
    content.style.boxSizing = 'border-box';
    content.style.margin = '0';
    content.style.padding = '0';
    content.style.width = '100%';
    content.style.border = 'none';
    content.style.outline = 'none';
    content.style.boxShadow = 'none';
    content.style.flexGrow = '1'; // Content grows to push footer down

    // Normalize header alignment
    if (header) {
      (header as HTMLElement).style.margin = '0';
      (header as HTMLElement).style.padding = '0';
      const t = header.querySelector('table') as HTMLTableElement | null;
      if (t) {
        t.style.width = '100%';
        t.style.marginLeft = '0';
        t.style.marginRight = '0';
        t.style.borderCollapse = 'collapse';
        t.style.borderSpacing = '0';
        
        // Center all header cells for consistent alignment
        const headerCells = t.querySelectorAll<HTMLElement>('td, th');
        headerCells.forEach(cell => {
          cell.style.textAlign = 'center';
          cell.style.verticalAlign = 'middle';
        });
      }
      borderContainer.appendChild(header);
    }

    borderContainer.appendChild(content);
    
    // Add border container to page
    pageDiv.appendChild(borderContainer);
    staging.appendChild(pageDiv);

    return { pageDiv, header, content, footer: null };
  }

  function currentTotalHeight(parts: PageParts): number {
    const h = parts.header?.offsetHeight ?? 0;
    const c = parts.content.scrollHeight;
    const f = parts.footer?.offsetHeight ?? 0;
    return h + c + f;
  }

  function remainingSpace(parts: PageParts): number {
    return contentHeightPx - currentTotalHeight(parts);
  }

  function wouldOverflow(parts: PageParts): boolean {
    const total = currentTotalHeight(parts);
    // Safety margin: trigger page break 15px BEFORE the page edge to prevent text clipping
    return total > (contentHeightPx - 15);
  }

  function startNewPage(): PageParts {
    const page = createPage();
    pages.push(page.pageDiv);
    pagesParts.push(page);
    return page;
  }

  function splitTableIntoPages(table: HTMLTableElement, parts: PageParts) {
    // Normalize table widths before processing
    normalizeTableWidths(table);
    
    let thead = table.tHead ? table.tHead.cloneNode(true) as HTMLTableSectionElement : null;
    const bodyRows: HTMLTableRowElement[] = [];

    // Extract all body rows
    const bodies = table.tBodies && table.tBodies.length > 0 ? Array.from(table.tBodies) : [];
    if (bodies.length > 0) {
      bodies.forEach(tb => bodyRows.push(...Array.from(tb.rows)));
    } else {
      // Fallback: get rows directly, skipping thead rows
      const allRows = Array.from(table.rows);
      const theadRowCount = table.tHead ? table.tHead.rows.length : 0;
      bodyRows.push(...allRows.slice(theadRowCount) as HTMLTableRowElement[]);
    }

    // If no <thead> exists but there are body rows, treat the first row as a header
    // This handles rich text editor tables that use <tr> for headers (no <thead>)
    if (!thead && bodyRows.length > 1) {
      const firstRow = bodyRows[0];
      // Check if first row looks like a header (has <th> or bold text)
      const cells = firstRow.querySelectorAll('td, th');
      const looksLikeHeader = firstRow.querySelector('th') !== null ||
        Array.from(cells).some(cell => {
          const style = (cell as HTMLElement).style;
          return style.fontWeight === 'bold' || style.fontWeight === '700' ||
                 cell.querySelector('strong, b') !== null;
        });
      
      if (looksLikeHeader) {
        // Create a synthetic thead from the first row
        thead = document.createElement('thead');
        thead.appendChild(firstRow.cloneNode(true));
        bodyRows.shift(); // Remove first row from body rows
      }
    }

    if (bodyRows.length === 0 && !thead) {
      // Empty table, just append it
      const clonedTable = table.cloneNode(true) as HTMLTableElement;
      normalizeTableWidths(clonedTable);
      parts.content.appendChild(clonedTable);
      return parts;
    }

    let page = parts;
    let workingTable = document.createElement('table');
    copyTableAttrs(table, workingTable);
    
    // Add thead to first page
    if (thead) {
      const theadClone = thead.cloneNode(true) as HTMLTableSectionElement;
      workingTable.appendChild(theadClone);
    }
    
    const workingBody = document.createElement('tbody');
    workingTable.appendChild(workingBody);
    page.content.appendChild(workingTable);

    // Check if just the table header already overflows
    if (wouldOverflow(page)) {
      // Start fresh on new page
      page.content.removeChild(workingTable);
      page = startNewPage();
      workingTable = document.createElement('table');
      copyTableAttrs(table, workingTable);
      if (thead) {
        const theadClone = thead.cloneNode(true) as HTMLTableSectionElement;
        workingTable.appendChild(theadClone);
      }
      const newBody = document.createElement('tbody');
      workingTable.appendChild(newBody);
      page.content.appendChild(workingTable);
    }

    // Split rows across pages
    const currentBody = workingTable.querySelector('tbody') as HTMLTableSectionElement;
    
    for (let i = 0; i < bodyRows.length; i++) {
      const rowClone = bodyRows[i].cloneNode(true) as HTMLTableRowElement;
      // Normalize cell widths in cloned row
      rowClone.querySelectorAll<HTMLElement>('td, th').forEach(cell => {
        cell.style.overflowWrap = 'break-word';
        cell.style.wordBreak = 'break-word';
      });
      currentBody.appendChild(rowClone);

      // Check if adding this row causes overflow
      if (wouldOverflow(page)) {
        // Remove the row that caused overflow
        currentBody.removeChild(rowClone);
        
        // Start a new page with table header
        page = startNewPage();
        workingTable = document.createElement('table');
        copyTableAttrs(table, workingTable);
        
        // Repeat thead on new page
        if (thead) {
          const theadClone = thead.cloneNode(true) as HTMLTableSectionElement;
          workingTable.appendChild(theadClone);
        }
        
        const newBody = document.createElement('tbody');
        workingTable.appendChild(newBody);
        page.content.appendChild(workingTable);
        
        // Add the row to new page
        newBody.appendChild(rowClone);

        // Edge case: single row taller than available space
        if (wouldOverflow(page)) {
          // Allow it but mark as non-breakable
          rowClone.style.pageBreakInside = 'avoid';
          rowClone.style.breakInside = 'avoid';
        }
      }
    }
    
    return page; // Return the current page so callers know where to continue
  }

  function copyTableAttrs(from: HTMLTableElement, to: HTMLTableElement) {
    // Copy inline styles
    to.style.cssText = from.style.cssText;
    // Force table to fit within page bounds
    to.style.width = '100%';
    to.style.maxWidth = '100%';
    to.style.tableLayout = 'fixed';
    to.style.borderCollapse = 'collapse';
    to.style.overflow = 'hidden';
    
    // Copy class
    to.className = from.className;
    
    // Copy relevant attributes
    ['border', 'cellpadding', 'cellspacing'].forEach(attr => {
      const val = from.getAttribute(attr);
      if (val) to.setAttribute(attr, val);
    });
  }

  // Normalize table widths to prevent overflow — convert px to % to preserve proportions
  function normalizeTableWidths(table: HTMLTableElement) {
    // Skip structural tables
    if (table.classList.contains('header-table') || table.classList.contains('footer-table') ||
        table.classList.contains('meta-table') || table.classList.contains('info-table') ||
        table.classList.contains('sign-table')) {
      return;
    }
    
    // Force table to 100% width with fixed layout
    table.style.width = '100%';
    table.style.maxWidth = '100%';
    table.style.tableLayout = 'fixed';
    table.style.borderCollapse = 'collapse';
    table.style.overflow = 'hidden';
    
    // Convert pixel widths to percentage widths
    const firstRow = table.querySelector('tr');
    if (firstRow) {
      const cells = Array.from(firstRow.querySelectorAll<HTMLElement>('td, th'));
      const pixelWidths: number[] = [];
      let totalPxWidth = 0;
      let hasAnyWidth = false;
      
      cells.forEach(cell => {
        let w = 0;
        if (cell.style.width && cell.style.width.includes('px')) {
          w = parseFloat(cell.style.width);
          hasAnyWidth = true;
        } else if (cell.getAttribute('width')) {
          const attrW = cell.getAttribute('width')!;
          if (attrW.includes('px') || /^\d+$/.test(attrW)) {
            w = parseFloat(attrW);
            hasAnyWidth = true;
          }
        } else if (cell.getAttribute('colwidth')) {
          w = parseFloat(cell.getAttribute('colwidth')!);
          hasAnyWidth = true;
        }
        pixelWidths.push(w);
        totalPxWidth += w;
      });
      
      if (hasAnyWidth && totalPxWidth > 0) {
        // Apply percentage widths to ALL rows
        const allRows = table.querySelectorAll('tr');
        allRows.forEach(row => {
          const rowCells = Array.from(row.querySelectorAll<HTMLElement>('td, th'));
          rowCells.forEach((cell, colIdx) => {
            if (colIdx < pixelWidths.length && pixelWidths[colIdx] > 0) {
              const pct = Math.round((pixelWidths[colIdx] / totalPxWidth) * 100);
              cell.style.width = `${pct}%`;
            }
            cell.removeAttribute('width');
            cell.removeAttribute('colwidth');
            if (cell.style.width && cell.style.width.includes('px')) {
              cell.style.width = '';
            }
          });
        });
      } else {
        // No pixel widths — distribute equally
        const equalPct = Math.floor(100 / cells.length);
        table.querySelectorAll<HTMLElement>('td, th').forEach(cell => {
          cell.style.width = `${equalPct}%`;
          cell.removeAttribute('width');
          cell.removeAttribute('colwidth');
        });
      }
    }
    
    // Ensure text wraps in all cells
    table.querySelectorAll<HTMLElement>('td, th').forEach(cell => {
      cell.style.overflowWrap = 'break-word';
      cell.style.wordWrap = 'break-word';
    });
  }

  function splitListIntoPages(list: HTMLOListElement | HTMLUListElement, parts: PageParts) {
    let page = parts;
    let workingList = document.createElement(list.tagName.toLowerCase());
    (workingList as HTMLElement).className = (list as HTMLElement).className;
    page.content.appendChild(workingList);

    const items = Array.from(list.children) as HTMLElement[];
    for (let i = 0; i < items.length; i++) {
      const liClone = items[i].cloneNode(true) as HTMLElement;
      workingList.appendChild(liClone);

      if (wouldOverflow(page)) {
        // Move item to next page
        workingList.removeChild(liClone);
        page = startNewPage();
        workingList = document.createElement(list.tagName.toLowerCase());
        (workingList as HTMLElement).className = (list as HTMLElement).className;
        page.content.appendChild(workingList);

        workingList.appendChild(liClone);

        if (wouldOverflow(page)) {
          // Rare: single li taller than a page; allow overflow
          liClone.style.pageBreakInside = 'avoid';
          liClone.style.breakInside = 'avoid';
        }
      }
    }
    return page; // Return the current page so callers know where to continue
  }

  // Helper to measure fragment height
  function measureFragment(nodes: HTMLElement[]): number {
    const probe = document.createElement('div');
    probe.style.width = `${widthPx}px`;
    probe.style.visibility = 'hidden';
    probe.style.position = 'absolute';
    nodes.forEach(n => probe.appendChild(n.cloneNode(true)));
    staging.appendChild(probe);
    const height = probe.scrollHeight;
    staging.removeChild(probe);
    return height;
  }

  // Helper to check if element is a heading
  function isHeadingElement(el: HTMLElement): boolean {
    return /^h[1-6]$/i.test(el.tagName) || 
           el.classList.contains('heading') || 
           el.hasAttribute('data-heading');
  }

  // Helper to get heading level (1-6)
  function getHeadingLevel(el: HTMLElement): number {
    const match = el.tagName.match(/^h([1-6])$/i);
    return match ? parseInt(match[1]) : 3;
  }

  // Process a single node with recursive container splitting
  function processNode(node: HTMLElement, currentPage: PageParts, target?: HTMLElement): PageParts {
    const appendTarget = target ?? currentPage.content;
    const tag = node.tagName.toLowerCase();

    // Tables: use split logic — MUST capture returned page
    if (tag === 'table') {
      return splitTableIntoPages(node as HTMLTableElement, currentPage);
    }

    // Lists: use split logic — MUST capture returned page
    if (tag === 'ul' || tag === 'ol') {
      currentPage = splitListIntoPages(node as HTMLOListElement | HTMLUListElement, currentPage);
      if (remainingSpace(currentPage) < 60) {
        currentPage = startNewPage();
      }
      return currentPage;
    }

    // Headings: use existing section grouping logic (handled in main loop)
    
    // Generic containers: recursively split children
    if (isGenericContainer(node)) {
      return flowContainer(node, currentPage, appendTarget);
    }

    // Default block handling
    const clone = node.cloneNode(true) as HTMLElement;
    
    // Images: cap height if needed
    if (tag === 'img') {
      const maxH = Math.max(availableContentPx - 20, 100);
      clone.style.maxHeight = `${maxH}px`;
      clone.style.height = 'auto';
      clone.style.width = 'auto';
      clone.style.objectFit = 'contain';
    }

    appendTarget.appendChild(clone);

    if (wouldOverflow(currentPage)) {
      appendTarget.removeChild(clone);
      currentPage = startNewPage();
      currentPage.content.appendChild(clone);

      if (wouldOverflow(currentPage)) {
        clone.style.pageBreakInside = 'avoid';
        clone.style.breakInside = 'avoid';
        clone.style.maxHeight = `${availableContentPx - 20}px`;
        clone.style.overflow = 'hidden';
      }
    }

    return currentPage;
  }

  // Flow container children across pages while preserving wrapper
  function flowContainer(container: HTMLElement, currentPage: PageParts, target: HTMLElement): PageParts {
    let page = currentPage;
    let wrapper = container.cloneNode(false) as HTMLElement;
    let currentTarget = page.content;
    currentTarget.appendChild(wrapper);

    const kids = Array.from(container.children) as HTMLElement[];
    
    for (const child of kids) {
      const childTag = child.tagName.toLowerCase();
      
      // Handle tables/lists directly on page content (not inside wrapper)
      if (childTag === 'table' || childTag === 'ul' || childTag === 'ol') {
        // Clean up empty wrapper
        if (wrapper.children.length === 0 && wrapper.parentElement) {
          wrapper.parentElement.removeChild(wrapper);
        }
        
        if (childTag === 'table') {
          page = splitTableIntoPages(child as HTMLTableElement, page);
        } else {
          page = splitListIntoPages(child as HTMLOListElement | HTMLUListElement, page);
          if (remainingSpace(page) < 60) {
            page = startNewPage();
          }
        }
        
        // Create new wrapper on the current page for subsequent children
        currentTarget = page.content;
        wrapper = container.cloneNode(false) as HTMLElement;
        currentTarget.appendChild(wrapper);
        continue;
      }

      // Handle nested generic containers: recursively flow their children
      if (isGenericContainer(child)) {
        // Recursively flow the child container inside the current wrapper
        page = flowContainer(child, page, wrapper);
        
        // After recursive flow, the page might have changed
        // We need to get the current wrapper on the new page
        if (wrapper.parentElement !== page.content && 
            !page.content.contains(wrapper)) {
          // Wrapper is on an old page; create new wrapper on current page
          // Clean up empty old wrapper
          if (wrapper.children.length === 0 && wrapper.parentElement) {
            wrapper.parentElement.removeChild(wrapper);
          }
          currentTarget = page.content;
          wrapper = container.cloneNode(false) as HTMLElement;
          currentTarget.appendChild(wrapper);
        }
        continue;
      }

      // Default: clone and append to wrapper
      const childClone = child.cloneNode(true) as HTMLElement;
      wrapper.appendChild(childClone);


      if (wouldOverflow(page)) {
        // Remove the child that caused overflow
        wrapper.removeChild(childClone);
        
        // Clean up empty wrapper
        if (wrapper.children.length === 0 && wrapper.parentElement) {
          wrapper.parentElement.removeChild(wrapper);
        }
        
        // Start new page with fresh wrapper
        page = startNewPage();
        currentTarget = page.content;
        wrapper = container.cloneNode(false) as HTMLElement;
        currentTarget.appendChild(wrapper);
        
        // Add child to new wrapper
        wrapper.appendChild(childClone);
        
        // If still overflows, apply constraints
        if (wouldOverflow(page)) {
          childClone.style.pageBreakInside = 'avoid';
          childClone.style.breakInside = 'avoid';
          childClone.style.maxHeight = `${availableContentPx - 20}px`;
          childClone.style.overflow = 'hidden';
        }
      }
    }

    // Clean up trailing empty wrapper
    if (wrapper.children.length === 0 && wrapper.parentElement) {
      wrapper.parentElement.removeChild(wrapper);
    }

    return page;
  }

  // Begin pagination
  let page = startNewPage();
  const children = Array.from(contentSrc.children) as HTMLElement[];

  for (let idx = 0; idx < children.length; idx++) {
    const node = children[idx];
    const tag = node.tagName.toLowerCase();

    // Section grouping: heading + its content (keep-with-next)
    if (isHeadingElement(node)) {
      const sectionNodes: HTMLElement[] = [node];
      const headingLevel = getHeadingLevel(node);
      
      let nextIdx = idx + 1;
      while (nextIdx < children.length) {
        const sibling = children[nextIdx];
        if (!sibling) break;
        
        if (isHeadingElement(sibling) && getHeadingLevel(sibling) <= headingLevel) break;
        if (sibling.classList?.contains('page-break') || 
            sibling.hasAttribute?.('data-page-break') ||
            sibling.tagName.toLowerCase() === 'hr') break;
        
        const sibTag = sibling.tagName.toLowerCase();
        if (sibTag === 'table' || sibTag === 'ul' || sibTag === 'ol') break;
        
        sectionNodes.push(sibling);
        nextIdx++;
      }
      
      const sectionHeight = measureFragment(sectionNodes);
      const available = remainingSpace(page);
      
      if (sectionHeight <= available) {
        sectionNodes.forEach(n => {
          page = processNode(n, page);
        });
        idx = nextIdx - 1;
        continue;
      }
      
      if (sectionHeight <= availableContentPx && page.content.children.length > 0) {
        page = startNewPage();
        sectionNodes.forEach(n => {
          page = processNode(n, page);
        });
        idx = nextIdx - 1;
        continue;
      }
      
      if (page.content.children.length > 0 && available < 100) {
        page = startNewPage();
      }
      
      page = processNode(node, page);
      continue;
    }

    // Orphan/widow guard for paragraphs
    if (tag === 'p' && remainingSpace(page) < 48 && page.content.children.length > 0) {
      page = startNewPage();
    }

    // Process the node (handles tables, lists, containers, blocks)
    page = processNode(node, page);
  }

  // Helper: check if element has any real visible content
  function hasRealContent(el: HTMLElement): boolean {
    // Has text content?
    if (el.textContent && el.textContent.trim().length > 0) return true;
    // Has images?
    if (el.querySelector('img, svg, canvas')) return true;
    // Has tables with rows?
    const tables = el.querySelectorAll('table');
    for (const t of Array.from(tables)) {
      if (t.rows.length > 0) return true;
    }
    return false;
  }

  // Drop empty pages (header only, no real content)
  for (let i = pagesParts.length - 1; i >= 0; i--) {
    if (!hasRealContent(pagesParts[i].content)) {
      console.log(`Removing empty page ${i + 1}`);
      pagesParts[i].pageDiv.remove();
      const pIdx = pages.indexOf(pagesParts[i].pageDiv);
      if (pIdx !== -1) pages.splice(pIdx, 1);
      pagesParts.splice(i, 1);
    }
  }

  // Add footer ONLY to the last page
  if (footerSrc && pagesParts.length > 0) {
    const lastPage = pagesParts[pagesParts.length - 1];
    const footer = cloneNodeClean(footerSrc);
    (footer as HTMLElement).style.margin = '0';
    (footer as HTMLElement).style.padding = '0';
    (footer as HTMLElement).style.marginTop = 'auto'; // Push footer to bottom
    (footer as HTMLElement).style.flexShrink = '0'; // Don't shrink footer
    const t = footer.querySelector('table') as HTMLTableElement | null;
    if (t) {
      t.style.width = '100%';
      t.style.marginLeft = '0';
      t.style.marginRight = '0';
      t.style.borderCollapse = 'collapse';
      t.style.borderSpacing = '0';
      
      // Center footer cells and keep first column left-aligned for labels
      const footerRows = t.querySelectorAll<HTMLTableRowElement>('tr');
      footerRows.forEach(row => {
        const cells = row.querySelectorAll<HTMLElement>('td, th');
        cells.forEach((cell, index) => {
          cell.style.verticalAlign = 'middle';
          cell.style.textAlign = index === 0 ? 'left' : 'center';
        });
      });
    }
    
    // Append footer to the last page's border-container
    const borderContainer = lastPage.pageDiv.querySelector('.border-container');
    if (borderContainer) {
      borderContainer.appendChild(footer);
    } else {
      lastPage.pageDiv.appendChild(footer);
    }
    lastPage.footer = footer;
    
    // Check if adding the footer caused the last page to overflow
    // If so, move some content to a new page
    if (wouldOverflow(lastPage)) {
      // Remove footer temporarily
      footer.remove();
      lastPage.footer = null;
      
      // Start a new page for the footer
      const footerPage = startNewPage();
      const footerBorder = footerPage.pageDiv.querySelector('.border-container');
      if (footerBorder) {
        footerBorder.appendChild(footer);
      } else {
        footerPage.pageDiv.appendChild(footer);
      }
      footerPage.footer = footer;
    }
  }

  const cleanup = () => {
    staging.remove();
  };

  console.log(`Smart paginator created ${pages.length} pages`);

  return { pages, cleanup, headerHeightPx, footerHeightPx, contentHeightPx };
}

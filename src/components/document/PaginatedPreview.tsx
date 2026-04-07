import { useEffect, useRef, useState } from 'react';
import { paginateToA4Pages } from '@/utils/smartPaginator';
import { Loader2 } from 'lucide-react';
import { useDocumentPreviewSettings } from '@/hooks/useDocumentPreviewSettings';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { HIERARCHICAL_CSS } from '@/utils/hierarchicalStyles';
import { generateIndentationCSS } from '@/utils/indentationCSSGenerator';
import { injectCanvasRenderingCSS, generatePDFMatchingCSS } from '@/utils/pdfStyleInjector';
import { generateCellLayoutCSS } from '@/utils/cellToHtml';

interface PaginatedPreviewProps {
  html: string;
}

export function PaginatedPreview({ html }: PaginatedPreviewProps) {
  const [pages, setPages] = useState<HTMLElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dynamicCSS, setDynamicCSS] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const { settings, generateCSS } = useDocumentPreviewSettings();
  const { indentationSettings } = useSystemSettings();

  useEffect(() => {
    if (!html) {
      setIsLoading(false);
      return;
    }

    const generatePages = async () => {
      setIsLoading(true);
      
      // Generate combined CSS from settings (same as PDF generation)
      // CRITICAL: Order matters - indentation CSS comes LAST for highest priority
      const previewCSS = generateCSS(settings);
      const pdfMatchingCSS = generatePDFMatchingCSS(settings);
      const indentCSS = generateIndentationCSS(indentationSettings);
      // indentationCSS MUST be last to override pdfMatchingCSS hardcoded values
      const combinedCSS = `${previewCSS}\n${pdfMatchingCSS}\n${indentCSS}`;
      
      // Store the dynamic CSS so it can be applied to the rendered pages
      // (pagination strips embedded <style> tags, so we inject them via component's <style>)
      setDynamicCSS(combinedCSS);
      
      // Inject the same CSS used by PDF generation into the HTML
      const processedHtml = injectCanvasRenderingCSS(html, combinedCSS);
      
      // Create off-screen container for processing
      const offscreen = document.createElement('div');
      offscreen.style.position = 'absolute';
      offscreen.style.left = '-9999px';
      offscreen.style.top = '0';
      offscreen.style.width = '1122px'; // A4 width at ~150DPI
      document.body.appendChild(offscreen);

      // Insert processed HTML with injected CSS
      offscreen.innerHTML = processedHtml;

      // Wait for images to load
      const images = offscreen.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      // Find or normalize structure
      let docWrapper = offscreen.querySelector('#doc-wrapper') as HTMLElement;
      let headerEl: HTMLElement | null = null;
      let footerEl: HTMLElement | null = null;
      let contentEl: HTMLElement | null = null;

      if (!docWrapper) {
        // CRITICAL: Find actual content container - handle both raw HTML and wrapped HTML
        let actualContentRoot: Element = offscreen;
        const bodyEl = offscreen.querySelector('body');
        if (bodyEl) {
          actualContentRoot = bodyEl;
        }
        const innerBorderContainer = actualContentRoot.querySelector('.border-container');
        if (innerBorderContainer) {
          actualContentRoot = innerBorderContainer;
        }

        // Check if template already has proper ID-based structure (#doc-header, #doc-content, #doc-footer)
        const existingHeader = actualContentRoot.querySelector('#doc-header') as HTMLElement | null;
        const existingContent = actualContentRoot.querySelector('#doc-content, .doc-content') as HTMLElement | null;
        const existingFooter = actualContentRoot.querySelector('#doc-footer') as HTMLElement | null;

        if (existingContent) {
          // Template already has proper structure - use it directly
          console.log('PaginatedPreview: Using existing #doc-header/#doc-content/#doc-footer structure');
          
          docWrapper = document.createElement('div');
          docWrapper.id = 'doc-wrapper';
          docWrapper.setAttribute('data-page-size', 'a4');

          const borderContainer = document.createElement('div');
          borderContainer.className = 'border-container';
          borderContainer.style.display = 'flex';
          borderContainer.style.flexDirection = 'column';
          borderContainer.style.minHeight = 'calc(297mm * 3.78 - 80px)';

          if (existingHeader) {
            headerEl = existingHeader.cloneNode(true) as HTMLElement;
            borderContainer.appendChild(headerEl);
          }

          contentEl = existingContent.cloneNode(true) as HTMLElement;
          contentEl.id = 'doc-content';
          contentEl.className = 'doc-content';
          contentEl.style.flexGrow = '1';
          borderContainer.appendChild(contentEl);

          // Footer detection: try #doc-footer first, then fallback to .footer-table inside content
          let resolvedFooter = existingFooter;
          if (!resolvedFooter) {
            // Fallback: look for .footer-table anywhere in the content root
            const footerTable = actualContentRoot.querySelector('.footer-table, .sop-footer, [data-role="footer"]') as HTMLElement | null;
            if (footerTable) {
              console.log('PaginatedPreview: Footer found via class fallback (.footer-table)');
              resolvedFooter = document.createElement('div');
              resolvedFooter.id = 'doc-footer';
              resolvedFooter.className = 'doc-footer';
              resolvedFooter.appendChild(footerTable.cloneNode(true));
              // Also remove from contentEl to avoid duplication
              const dupInContent = contentEl.querySelector('.footer-table, .sop-footer, [data-role="footer"]');
              if (dupInContent) dupInContent.remove();
            }
          }

          if (resolvedFooter) {
            footerEl = resolvedFooter.cloneNode(true) as HTMLElement;
            footerEl.style.marginTop = 'auto';
            footerEl.style.flexShrink = '0';
            borderContainer.appendChild(footerEl);
          }

          docWrapper.appendChild(borderContainer);
          offscreen.innerHTML = '';
          offscreen.appendChild(docWrapper);
        } else {
          // Fallback: Create normalized structure from class-based detection
          console.log('PaginatedPreview: Normalizing structure from class-based detection');
          
          docWrapper = document.createElement('div');
          docWrapper.id = 'doc-wrapper';
          docWrapper.setAttribute('data-page-size', 'a4');

          const borderContainer = document.createElement('div');
          borderContainer.className = 'border-container';

          // Detect header - only use explicit header markers
          const headerCandidates = actualContentRoot.querySelectorAll('.header-table, .sop-header, [data-role="header"]');
          if (headerCandidates.length > 0) {
            headerEl = document.createElement('div');
            headerEl.id = 'doc-header';
            headerEl.className = 'doc-header';
            headerCandidates.forEach(node => headerEl!.appendChild(node.cloneNode(true)));
          }

          // Detect footer - only use explicit footer markers
          const footerCandidates = actualContentRoot.querySelectorAll('.footer-table, .sop-footer, [data-role="footer"]');
          if (footerCandidates.length > 0) {
            footerEl = document.createElement('div');
            footerEl.id = 'doc-footer';
            footerEl.className = 'doc-footer';
            footerCandidates.forEach(node => footerEl!.appendChild(node.cloneNode(true)));
          }

          // Create content with remaining nodes
          contentEl = document.createElement('div');
          contentEl.id = 'doc-content';
          contentEl.className = 'doc-content';

          const allNodes = Array.from(actualContentRoot.childNodes);
          allNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as Element;
              const isHeaderOrFooter = el.matches('.header-table, .sop-header, [data-role="header"], .footer-table, .sop-footer, [data-role="footer"], #doc-header, #doc-footer') ||
                                       el.classList.contains('header-table') ||
                                       el.classList.contains('footer-table') ||
                                       el.id === 'doc-header' ||
                                       el.id === 'doc-footer';
              if (!isHeaderOrFooter) {
                contentEl!.appendChild(node.cloneNode(true));
              }
            } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
              contentEl!.appendChild(node.cloneNode(true));
            }
          });

          if (headerEl) borderContainer.appendChild(headerEl);
          borderContainer.appendChild(contentEl);
          if (footerEl) borderContainer.appendChild(footerEl);
          docWrapper.appendChild(borderContainer);
          
          offscreen.innerHTML = '';
          offscreen.appendChild(docWrapper);
        }
      } else {
        headerEl = docWrapper.querySelector('#doc-header');
        footerEl = docWrapper.querySelector('#doc-footer');
        contentEl = docWrapper.querySelector('#doc-content');
      }

      // Paginate
      const { pages: generatedPages, cleanup } = paginateToA4Pages(docWrapper, {
        pageWidthMM: 210,
        pageHeightMM: 297,
        marginMM: 15,
        windowWidthPx: 1122,
        headerEl: headerEl || undefined,
        footerEl: footerEl || undefined,
      });

      // Clone pages for display
      const pageClones = generatedPages.map(page => page.cloneNode(true) as HTMLElement);
      setPages(pageClones);

      // Cleanup
      cleanup();
      document.body.removeChild(offscreen);
      setIsLoading(false);
    };

    generatePages().catch(err => {
      console.error('Failed to generate paginated preview:', err);
      setIsLoading(false);
    });
  }, [html]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Generating paginated preview...</span>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No content to display
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div ref={containerRef} className="paged-preview py-6">
        {pages.map((page, index) => (
          <div
            key={index}
            className="a4-page"
            dangerouslySetInnerHTML={{ __html: page.outerHTML }}
          />
        ))}
      </div>

      <style>{`
        /* ========== DYNAMIC BACKEND SETTINGS CSS ========== */
        /* Injected from generateIndentationCSS + generatePDFMatchingCSS */
        /* This MUST be here because pagination strips <style> tags from page HTML */
        ${dynamicCSS}

        /* ========== CELL LAYOUT CSS ========== */
        ${generateCellLayoutCSS()}

        .paged-preview {
          display: grid;
          gap: 24px;
          justify-items: center;
          background: hsl(var(--muted) / 0.3);
          padding: 24px;
        }

        .a4-page {
          width: 1122px;
          max-width: 100%;
          background: #fff;
          border: 2px solid #000;
          padding: 20px;
          box-sizing: border-box;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          margin: 20px auto;
          page-break-after: always;
        }

        /* Restore flexbox layout for footer at page bottom */
        .a4-page .border-container {
          padding: 0 !important;
          margin: 0 !important;
          box-sizing: border-box !important;
          border: none !important;
          display: flex !important;
          flex-direction: column !important;
        }
        
        /* Only the LAST page gets full A4 height to push footer to bottom */
        .a4-page:last-child .border-container {
          min-height: calc(297mm * 3.78 - 80px) !important;
        }
        
        .a4-page .doc-content {
          flex-grow: 1 !important;
        }
        
        .a4-page .doc-footer,
        .a4-page #doc-footer,
        .a4-page .footer-table {
          margin-top: auto !important;
          flex-shrink: 0 !important;
        }
        
        /* Dynamic document preview settings from backend */
        ${generateCSS(settings)}
        
        /* Base hierarchical section styling */
        ${HIERARCHICAL_CSS}
        
        /* Dynamic hierarchical indentation from backend settings - HIGHEST PRIORITY */
        ${generateIndentationCSS(indentationSettings)}
        
        .a4-page [data-level] h3 {
          display: flex;
          align-items: baseline;
          margin: 0;
          padding: 0;
          font-weight: bold;
        }
        
        .a4-page [data-level] .number {
          font-weight: bold;
        }
        
        .a4-page [data-level] .title-text {
          font-weight: bold;
        }

        /* ========== Roman Numeral & Letter List - CONTROLLED BY BACKEND ========== */
        /* All roman numeral and letter list dimension values (min-width, margin, spacing)
           are now controlled by generateIndentationCSS() via dynamicCSS above.
           Only structural display properties remain here as fallbacks. */
        /* Header styling moved to unified section below (lines 400+) to match PDF exactly */
        
        /* Keep preview clean: remove borders from section wrappers, not tables */
        .a4-page .doc-content .section {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
        
        .a4-page .doc-content .section *:not(table):not(td):not(th) {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }

        /* CRITICAL: Header table borders - ensure all cells have visible borders */
        .a4-page .doc-header .header-table,
        .a4-page .doc-header .header-table td,
        .a4-page .doc-header .header-table th,
        .a4-page #doc-header .header-table,
        .a4-page #doc-header .header-table td,
        .a4-page #doc-header .header-table th,
        .a4-page #doc-header table,
        .a4-page #doc-header table td,
        .a4-page #doc-header table th,
        .a4-page .doc-header table,
        .a4-page .doc-header table td,
        .a4-page .doc-header table th {
          border: 1px solid #000 !important;
          border-collapse: collapse !important;
        }

        /* CRITICAL: Preserve borders on footer tables */
        .a4-page .doc-footer .footer-table,
        .a4-page .doc-footer .footer-table td,
        .a4-page .doc-footer .footer-table th,
        .a4-page #doc-footer .footer-table,
        .a4-page #doc-footer .footer-table td,
        .a4-page #doc-footer .footer-table th,
        .a4-page #doc-footer table,
        .a4-page #doc-footer table td,
        .a4-page #doc-footer table th,
        .a4-page .doc-footer table,
        .a4-page .doc-footer table td,
        .a4-page .doc-footer table th {
          border: 1px solid #000 !important;
          border-collapse: collapse !important;
        }

        /* Preserve borders on any table with border attribute */
        .a4-page table[border="1"],
        .a4-page table[border="1"] td,
        .a4-page table[border="1"] th {
          border: 1px solid #000 !important;
          border-collapse: collapse !important;
        }

        /* Preserve nested table borders in header/footer (like document metadata tables) */
        .a4-page .doc-header table table,
        .a4-page .doc-header table table td,
        .a4-page .doc-header table table th,
        .a4-page #doc-header table table,
        .a4-page #doc-header table table td,
        .a4-page #doc-header table table th,
        .a4-page .doc-footer table table,
        .a4-page .doc-footer table table td,
        .a4-page .doc-footer table table th,
        .a4-page #doc-footer table table,
        .a4-page #doc-footer table table td,
        .a4-page #doc-footer table table th {
          border: 1px solid #000 !important;
        }

        /* Ensure header-table and footer-table have proper border-collapse */
        .a4-page .header-table,
        .a4-page .footer-table {
          border-collapse: collapse !important;
          border-spacing: 0 !important;
        }

        /* FALLBACK: Direct header-table selectors (when not wrapped in .doc-header) */
        .a4-page .header-table td,
        .a4-page .header-table th,
        .a4-page .header-table table,
        .a4-page .header-table table td,
        .a4-page .header-table table th {
          border: 1px solid #000 !important;
          border-collapse: collapse !important;
        }

        /* FALLBACK: Direct footer-table selectors (when not wrapped in .doc-footer) */
        .a4-page .footer-table td,
        .a4-page .footer-table th,
        .a4-page .footer-table table,
        .a4-page .footer-table table td,
        .a4-page .footer-table table th {
          border: 1px solid #000 !important;
          border-collapse: collapse !important;
        }

        /* Content tables in document body - full width with visible borders */
        /* EXCLUDE header and footer containers explicitly */
        .a4-page .doc-content table:not(.header-table):not(.footer-table) {
          width: 100% !important;
          border-collapse: collapse !important;
          border: 1px solid #000 !important;
          margin: 16px 0 !important;
        }

        .a4-page .doc-content table:not(.header-table):not(.footer-table) td,
        .a4-page .doc-content table:not(.header-table):not(.footer-table) th {
          border: 1px solid #000 !important;
          padding: 8px 12px !important;
          text-align: left !important;
          vertical-align: top !important;
        }

        .a4-page .doc-content table:not(.header-table):not(.footer-table) th {
          background-color: #f0f0f0 !important;
          font-weight: bold !important;
        }

        /* PROTECT header tables - restore proper styling to match PDF */
        .a4-page .doc-header table,
        .a4-page .header-table {
          border-collapse: collapse !important;
        }

        /* Header table cells - dynamic from backend settings (match PDF exactly) */
        .a4-page .doc-header table td,
        .a4-page .doc-header table th,
        .a4-page .header-table td,
        .a4-page .header-table th {
          vertical-align: middle !important;
          line-height: ${settings?.header?.lineHeight || 1.2} !important;
          padding: ${settings?.header?.cellPadding || 6}px ${(settings?.header?.cellPadding || 6) + 2}px !important;
          font-size: ${settings?.header?.fontSize || 10}px !important;
          border: 1px solid #000 !important;
        }

        /* Nested tables in header (metadata block) - match documentPreviewGenerator.ts */
        .a4-page .header-table table td,
        .a4-page .header-table table th,
        .a4-page .doc-header table table td,
        .a4-page .doc-header table table th {
          padding: ${Math.max((settings?.header?.cellPadding || 6) - 2, 2)}px ${Math.max((settings?.header?.cellPadding || 6) - 2, 4)}px !important;
          font-size: ${Math.max((settings?.header?.fontSize || 10) - 1, 8)}px !important;
          line-height: ${settings?.header?.lineHeight || 1.2} !important;
        }

        /* Header title cells (black bar) - use backend title font size (match PDF formula) */
        .a4-page .header-table [style*="background: #000"],
        .a4-page .header-table [style*="background:#000"],
        .a4-page .header-table [style*="background-color:#000"],
        .a4-page .header-table [style*="background-color: #000"],
        .a4-page .doc-header [style*="background: #000"],
        .a4-page .doc-header [style*="background:#000"] {
          padding: ${settings?.header?.cellPadding || 6}px ${(settings?.header?.cellPadding || 6) + 2}px !important;
          font-size: ${Math.min((settings?.header?.titleFontSize || 14) - 2, 12)}px !important;
          text-align: center !important;
        }

        /* Ensure header logo cell stays centered */
        .a4-page .header-table td[rowspan],
        .a4-page .doc-header td[rowspan] {
          text-align: center !important;
          vertical-align: middle !important;
        }

        /* Header logo image styling - use backend logo max height */
        .a4-page .header-table img,
        .a4-page .doc-header img {
          max-height: ${settings?.header?.logoMaxHeight || 80}px !important;
          max-width: 100% !important;
          object-fit: contain !important;
          display: block !important;
          margin: auto !important;
        }

        /* Header headings - match PDF */
        .a4-page .header-table h1,
        .a4-page .header-table h2,
        .a4-page .header-table h3,
        .a4-page .header-table .title,
        .a4-page .doc-header h1,
        .a4-page .doc-header h2,
        .a4-page .doc-header h3 {
          font-size: ${settings?.header?.titleFontSize || 14}px !important;
          margin: 0 !important;
          line-height: ${settings?.header?.lineHeight || 1.2} !important;
        }

        /* Header cells with center alignment */
        .a4-page .header-table td[style*="text-align: center"],
        .a4-page .header-table td[style*="text-align:center"] {
          text-align: center !important;
        }

        /* ========== Document Image Styling ========== */
        .a4-page .document-image-container,
        .a4-page figure[data-type="resizable-image"],
        .a4-page figure.resizable-image {
          display: block !important;
          margin: 16px 0 !important;
          page-break-inside: avoid !important;
        }

        .a4-page .document-image-container.align-left,
        .a4-page figure[data-align="left"] {
          text-align: left !important;
        }

        .a4-page .document-image-container.align-center,
        .a4-page figure[data-align="center"] {
          text-align: center !important;
        }

        .a4-page .document-image-container.align-right,
        .a4-page figure[data-align="right"] {
          text-align: right !important;
        }

        .a4-page .document-image-container img,
        .a4-page figure[data-type="resizable-image"] img,
        .a4-page figure.resizable-image img {
          max-width: 100% !important;
          height: auto !important;
          display: inline-block !important;
        }

        .a4-page .document-image-container figcaption,
        .a4-page figure[data-type="resizable-image"] figcaption,
        .a4-page figure.resizable-image figcaption {
          margin-top: 8px !important;
          font-size: 12px !important;
          color: #666 !important;
          font-style: italic !important;
          text-align: center !important;
        }

        @media (max-width: 1200px) {
          .a4-page {
            transform: scale(0.85);
            transform-origin: top center;
          }
        }

        @media (max-width: 1000px) {
          .a4-page {
            transform: scale(0.7);
          }
        }

        @media (max-width: 800px) {
          .a4-page {
            transform: scale(0.55);
          }
        }
      `}</style>
    </div>
  );
}

import { useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useDocumentPreviewSettings } from "@/hooks/useDocumentPreviewSettings";
import { fontRules } from "@/utils/fontRules";
import type { DocumentTemplate } from "@/hooks/useDocumentTemplates";
import { PDFSettings, DEFAULT_PDF_SETTINGS } from '@/types/pdfSettings';
import { generateIndentationCSS } from '@/utils/indentationCSSGenerator';
// Smart paginator
import { paginateToA4Pages } from "@/utils/smartPaginator";
export interface PDFGenerationOptions {
  title: string;
  author?: string;
  subject?: string;
  keywords?: string;
  format?: "a4" | "letter";
  orientation?: "portrait" | "landscape";
}

export interface TemplateGenerationData {
  template: DocumentTemplate;
  sectionContents: Record<string, string>;
  systemData: {
    companyLogo?: string;
    companyName: string;
    documentNumber: string;
    documentTitle: string;
    documentType: string;
    version: string;
    revisionNumber: string;
    revisionDate: string;
    language: string;
  };
}

export function usePDFGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { indentationSettings } = useSystemSettings();
  const { settings: previewSettings, generateCSS: generatePreviewCSS } = useDocumentPreviewSettings();

  const generatePDFFromHTML = async (
    htmlContent: string, 
    options: PDFGenerationOptions,
    pdfSettings: PDFSettings = DEFAULT_PDF_SETTINGS,
    documentPreviewCSS?: string
  ): Promise<Blob | null> => {
    if (isGenerating) return null;
    try {
      setIsGenerating(true);
      console.log('Starting smart pagination PDF generation...');
      
      // ALWAYS generate combined CSS from both settings sources using centralized generator
      const indentationCSS = generateIndentationCSS(indentationSettings);
      const previewCSS = generatePreviewCSS(previewSettings);
      const combinedSettingsCSS = `${previewCSS}\n${indentationCSS}`;
      
      // Use provided CSS or fall back to generated settings CSS
      const finalDocumentPreviewCSS = documentPreviewCSS || combinedSettingsCSS;
      console.log('PDF Generation: Using combined settings CSS (preview + indentation)');

      // 1) Inject footer placeholders if present in options metadata
      let processedHtml = htmlContent;
      if ((options as any).footerData) {
        const footerData = (options as any).footerData;
        if (footerData.submission_number) {
          processedHtml = processedHtml.replace(/{{submission_number}}/g, footerData.submission_number);
          processedHtml = processedHtml.replace(/{{document_number}}/g, footerData.submission_number);
        }
        if (footerData.revision_number) {
          processedHtml = processedHtml.replace(/{{revision_number}}/g, footerData.revision_number);
        }
        if (footerData.revision_date) {
          processedHtml = processedHtml.replace(/{{revision_date}}/g, footerData.revision_date);
        }
      }

      // 2) Inject CSS for accurate border rendering in html2canvas + document preview settings
      console.log('PDF Generation: Injecting CSS with finalDocumentPreviewCSS:', !!finalDocumentPreviewCSS);
      processedHtml = injectCanvasRenderingCSS(processedHtml, finalDocumentPreviewCSS);

      // 3) Create a temporary container for HTML content
      const container = document.createElement('div');
      container.innerHTML = processedHtml;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '1122px'; // A4 width at 150 DPI (increased from 793px for higher quality)
      container.style.backgroundColor = '#ffffff';
      document.body.appendChild(container);

      // Force browser reflow to ensure DOM is fully parsed
      void container.offsetHeight;
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('Container appended, DOM ready check passed');

      // 3) Wait for images to load in the original DOM
      const images = container.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => new Promise(resolve => {
        if (img.complete) return resolve(true);
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
      })));

      // 4) Find document structure (content-first, with auto-normalization)
      const findSections = () => {
        const cEl = container.querySelector('#doc-content, .doc-content') as HTMLElement | null;
        const hEl = container.querySelector('#doc-header, .doc-header') as HTMLElement | null;
        let fEl = container.querySelector('#doc-footer, .doc-footer') as HTMLElement | null;
        
        // Fallback footer detection: look for .footer-table not inside #doc-footer
        if (!fEl) {
          const footerTable = container.querySelector('.footer-table, .sop-footer, [data-role="footer"]') as HTMLElement | null;
          if (footerTable) {
            console.log('PDF: Footer found via class fallback (.footer-table)');
            fEl = document.createElement('div');
            fEl.id = 'doc-footer';
            fEl.className = 'doc-footer';
            fEl.appendChild(footerTable.cloneNode(true));
            // Remove original from content to avoid duplication
            footerTable.remove();
            // Insert the new footer wrapper after content
            if (cEl) {
              cEl.parentNode?.insertBefore(fEl, cEl.nextSibling);
            }
          }
        }
        
        return { contentEl: cEl, headerEl: hEl, footerEl: fEl };
      };

      let { contentEl, headerEl, footerEl } = findSections();

      if (!contentEl) {
        console.warn('No #doc-content found. Attempting to auto-normalize wrapper...');
        // Synthesize a minimal wrapper structure expected by the paginator
        const wrapper = document.createElement('div');
        wrapper.id = 'doc-wrapper';
        wrapper.className = 'document-wrapper';
        
        // Create border container
        const borderContainer = document.createElement('div');
        borderContainer.className = 'border-container';
        
        const header = document.createElement('div');
        header.id = 'doc-header';
        const content = document.createElement('div');
        content.id = 'doc-content';
        const footer = document.createElement('div');
        footer.id = 'doc-footer';

        // Enhanced detection for header/footer - look for multiple patterns
        const headerCandidate = container.querySelector('.header-table, .sop-header, [data-role="header"], table:first-of-type') as HTMLElement | null;
        const footerCandidate = container.querySelector('.footer-table, .sop-footer, [data-role="footer"], table[border="1"]:last-of-type') as HTMLElement | null;

        console.log('Auto-normalization detected:', {
          hasHeaderCandidate: !!headerCandidate,
          hasFooterCandidate: !!footerCandidate,
          headerClass: headerCandidate?.className || 'none',
          footerClass: footerCandidate?.className || 'none'
        });

        if (headerCandidate) {
          header.appendChild(headerCandidate.cloneNode(true));
          headerCandidate.remove();
        }
        if (footerCandidate) {
          footer.appendChild(footerCandidate.cloneNode(true));
          footerCandidate.remove();
        }

        // Move remaining top-level content nodes into content - preserve ALL content
        const contentNodes: Node[] = [];
        Array.from(container.childNodes).forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (['SCRIPT', 'STYLE'].includes(el.tagName)) return;
            // Skip if it's already our new wrapper
            if (el === wrapper) return;
            contentNodes.push(node);
          } else if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text) {
              contentNodes.push(node);
            }
          }
        });

        console.log(`Auto-normalization: Found ${contentNodes.length} content nodes to preserve`);

        contentNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            const p = document.createElement('p');
            p.textContent = node.textContent || '';
            content.appendChild(p);
          } else {
            content.appendChild(node);
          }
        });

        // Build normalized structure with border container
        borderContainer.appendChild(header);
        borderContainer.appendChild(content);
        borderContainer.appendChild(footer);
        wrapper.appendChild(borderContainer);

        // Replace container content with normalized structure
        container.innerHTML = '';
        container.appendChild(wrapper);

        console.log('Auto-normalization complete. New structure:', {
          hasWrapper: !!container.querySelector('#doc-wrapper'),
          hasBorderContainer: !!container.querySelector('.border-container'),
          hasHeader: !!container.querySelector('#doc-header'),
          hasContent: !!container.querySelector('#doc-content'),
          hasFooter: !!container.querySelector('#doc-footer'),
          contentChildCount: container.querySelector('#doc-content')?.childNodes.length || 0
        });

        // Re-evaluate sections
        ({ contentEl, headerEl, footerEl } = findSections());
      }

      if (!contentEl) {
        console.error('Content element not found after normalization. IDs in container:', Array.from(container.querySelectorAll('[id]')).map(el => el.id));
        console.error('DOM snapshot:', container.innerHTML.substring(0, 600));
        throw new Error('Required document sections not found (#doc-content or .doc-content missing)');
      }

      // Derive a safe root for pagination: prefer the closest #doc-wrapper, then global #doc-wrapper, then container
      const docWrapper = (contentEl.closest('#doc-wrapper') as HTMLElement | null)
        || (container.querySelector('#doc-wrapper') as HTMLElement | null)
        || (contentEl.closest('.document-wrapper') as HTMLElement | null)
        || container;

      if (docWrapper !== container) {
        console.log('Using doc wrapper for pagination:', (docWrapper as HTMLElement).id || (docWrapper as HTMLElement).className);
      } else {
        console.warn('Doc wrapper not found; falling back to container as root for pagination.');
      }

      console.log('Document structure validated:', {
        hasHeader: !!headerEl,
        hasContent: !!contentEl,
        hasFooter: !!footerEl
      });

      // 5) PDF dimensions
      const pageWidthMM = options.format === 'a4' ? 210 : 215.9;
      const pageHeightMM = options.format === 'a4' ? 297 : 279.4;

      // 6) Build pages using smart paginator with custom settings
      const { pages, cleanup } = paginateToA4Pages(docWrapper as HTMLElement, {
        pageWidthMM,
        pageHeightMM,
        marginTopMM: pdfSettings.margins.top,
        marginRightMM: pdfSettings.margins.right,
        marginBottomMM: pdfSettings.margins.bottom,
        marginLeftMM: pdfSettings.margins.left,
        windowWidthPx: 1122,
        headerEl,
        footerEl,
        borderEnabled: pdfSettings.border.enabled,
        borderThickness: pdfSettings.border.thickness,
        borderColor: pdfSettings.border.color,
        borderStyle: pdfSettings.border.style,
        paddingTopPx: pdfSettings.padding.top,
        paddingRightPx: pdfSettings.padding.right,
        paddingBottomPx: pdfSettings.padding.bottom,
        paddingLeftPx: pdfSettings.padding.left,
      });

      // 7) Initialize PDF
      const pdf = new jsPDF({
        orientation: options.orientation || 'portrait',
        unit: 'mm',
        format: options.format || 'a4',
      });

      pdf.setProperties({
        title: options.title || 'Document',
        author: options.author || 'Document Management System',
        subject: options.subject || '',
        keywords: options.keywords || '',
        creator: 'Document Management System',
      });

      // 8) Render each page via html2canvas and add to PDF
      const contentWidthMM = pageWidthMM - pdfSettings.margins.left - pdfSettings.margins.right;
      const contentHeightMM = pageHeightMM - pdfSettings.margins.top - pdfSettings.margins.bottom;
      for (let i = 0; i < pages.length; i++) {
        const pageDiv = pages[i] as HTMLElement;
        
        // Merge separate meta-tables into one to eliminate gaps in PDF
        mergeMetaTablesForPDF(pageDiv);
        
        // Remove all inner borders except header/footer
        stripInnerBorders(pageDiv);
        
        // Ensure header/footer tables have proper borders
        enforceHeaderFooterBorders(pageDiv);
        
        const canvas = await html2canvas(pageDiv, {
          scale: 3, // Increased from 2 to 3 for sharper output
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 1122,
          windowHeight: pageDiv.scrollHeight,
          allowTaint: false,
          imageTimeout: 0,
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', pdfSettings.margins.left, pdfSettings.margins.top, contentWidthMM, contentHeightMM, undefined, 'FAST');
        // Page numbers
        pdf.setFontSize(9);
        pdf.setTextColor(102, 102, 102);
        pdf.text(`Page ${i + 1} of ${pages.length}`, pageWidthMM - pdfSettings.margins.right - 2, pageHeightMM - pdfSettings.margins.bottom - 2, { align: 'right' });
      }

      // 9) Cleanup
      cleanup();
      document.body.removeChild(container);

      // 10) Export blob
      const pdfBlob = pdf.output('blob');
      console.log('PDF generation completed successfully');
      toast({ title: 'Success', description: 'PDF generated with smart pagination' });
      return pdfBlob;
    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast({ title: 'PDF Generation Failed', description: error.message || 'Failed to generate PDF', variant: 'destructive' });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePDFFromDocument = async (
    document: any,
    documentSections: any[],
    options: Omit<PDFGenerationOptions, "title">,
    company?: any,
    pdfSettings: PDFSettings = DEFAULT_PDF_SETTINGS
  ): Promise<Blob | null> => {
    try {
      console.log('Generating PDF from document using unified renderer...');
      
      // Import unified renderer
      const { generateUnifiedDocumentHTML, extractSectionsFromDocument } = await import('@/utils/documentRenderer');
      
      // Extract sections using unified extractor
      const sections = extractSectionsFromDocument(document, documentSections);
      
      // Generate unified HTML
      const htmlContent = generateUnifiedDocumentHTML({
        document: {
          id: document.id,
          title: document.title || 'Untitled Document',
          document_number: document.document_number || 'N/A',
          version: document.version || '1.0',
          language: document.language || 'en',
          status: document.status || 'draft',
          created_at: document.created_at,
          revision_number: document.revision_number || 0,
        },
        sections,
        company: company || {
          company_name: document.company_name || 'Company Name',
          company_logo_url: document.company_logo_url,
          company_code: document.company_code,
          registered_address: document.registered_address,
        },
        indentationCSS: generateIndentationCSS(indentationSettings),
        documentTypeName: document.document_type_name || document.type_name || '',
        processName: document.department_name || document.process_name || '',
        includeHeader: true,
        includeBorder: false,
        includeTableOfContents: false,
      });

      // Use unified PDF generation from HTML
      return await generatePDFFromHTML(
        htmlContent, 
        {
          ...options,
          title: document.title || 'Document',
        },
        pdfSettings
      );
    } catch (error: any) {
      console.error("Document PDF generation error:", error);
      toast({
        title: "PDF Generation Failed",
        description: error.message || "Failed to generate PDF from document",
        variant: "destructive",
      });
      return null;
    }
  };

  const generateDocumentFromTemplate = async (data: TemplateGenerationData): Promise<Blob | null> => {
    try {
      setIsGenerating(true);

      // 1. Clone template HTML
      let finalHtml = data.template.html_template;

      // 2. Replace system placeholders
      finalHtml = finalHtml.replace(/\{\{company_name\}\}/g, data.systemData.companyName);
      finalHtml = finalHtml.replace(/\{\{document_number\}\}/g, data.systemData.documentNumber);
      finalHtml = finalHtml.replace(/\{\{document_title\}\}/g, data.systemData.documentTitle);
      finalHtml = finalHtml.replace(/\{\{document_type\}\}/g, data.systemData.documentType);
      finalHtml = finalHtml.replace(/\{\{version\}\}/g, data.systemData.version);
      finalHtml = finalHtml.replace(/\{\{revision_number\}\}/g, data.systemData.revisionNumber);
      finalHtml = finalHtml.replace(/\{\{revision_date\}\}/g, data.systemData.revisionDate);

      // Handle company logo - replace both direct placeholders and CSS background-image
      if (data.systemData.companyLogo) {
        const logoImg = `<img src="${data.systemData.companyLogo}" alt="Company Logo" style="max-height: 50px;" />`;
        finalHtml = finalHtml.replace(/\{\{company_logo\}\}/g, logoImg);
        // Also handle CSS background-image syntax
        finalHtml = finalHtml.replace(
          /background-image:\s*url\(['"]?\{\{company_logo\}\}['"]?\)/gi,
          `background-image: url('${data.systemData.companyLogo}')`,
        );
      } else {
        finalHtml = finalHtml.replace(/\{\{company_logo\}\}/g, data.systemData.companyName);
        finalHtml = finalHtml.replace(/background-image:\s*url\(['"]?\{\{company_logo\}\}['"]?\)/gi, "display: none");
      }

      // 3. Inject section content
      finalHtml = injectSectionContent(finalHtml, data.sectionContents);

      // 4. Apply font rules
      finalHtml = applyFontRules(finalHtml, data.systemData.language);

      // 5. Convert to PDF
      return await generatePDFFromHTML(finalHtml, {
        title: data.systemData.documentTitle,
        subject: `${data.systemData.documentType} - ${data.systemData.documentNumber}`,
        keywords: `template, ${data.template.template_code}`,
        format: "a4",
        orientation: "portrait",
      });
    } catch (error: any) {
      console.error("Template PDF generation error:", error);
      toast({
        title: "PDF Generation Failed",
        description: error.message || "Failed to generate PDF from template",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Generate PDF from preview HTML without restructuring
   * This maintains the exact layout and borders as shown in preview
   */
  const generatePDFFromPreviewHTML = async (
    htmlContent: string,
    options: PDFGenerationOptions
  ): Promise<Blob | null> => {
    try {
      setIsGenerating(true);
      const { title, format = 'a4', orientation = 'portrait' } = options;

      // Inject CSS for accurate rendering without altering structure
      const processedHtml = injectPreviewRenderingCSS(htmlContent);

      // Create hidden container
      const container = document.createElement('div');
      container.innerHTML = processedHtml;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '1122px'; // A4 width at ~150 DPI
      container.style.backgroundColor = '#ffffff';
      document.body.appendChild(container);

      // Wait for images to load
      const images = container.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = resolve; // Continue even if image fails
            setTimeout(resolve, 3000); // Timeout after 3s
          });
        })
      );

      // Calculate page height (A4 aspect ratio: 297/210)
      const containerHeight = container.scrollHeight;
      const pageHeight = Math.round(1122 * 297 / 210); // ~1587px
      const numPages = Math.ceil(containerHeight / pageHeight);

      // Create PDF
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const marginMM = 15;

      // Capture each page slice
      for (let i = 0; i < numPages; i++) {
        const yOffset = i * pageHeight;

        // Capture slice using html2canvas with precise cropping
        const canvas = await html2canvas(container, {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: 1122,
          height: pageHeight,
          x: 0,
          y: yOffset, // Precise crop from yOffset
          allowTaint: false,
          imageTimeout: 0,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        
        if (i > 0) {
          pdf.addPage();
        }

        // Add image to PDF with margins
        pdf.addImage(
          imgData,
          'JPEG',
          marginMM,
          marginMM,
          pdfWidth - 2 * marginMM,
          pdfHeight - 2 * marginMM,
          undefined,
          'FAST'
        );
      }

      // Cleanup
      document.body.removeChild(container);

      // Convert to blob
      const pdfBlob = pdf.output('blob');

      toast({
        title: "Success",
        description: "PDF generated successfully"
      });

      return pdfBlob;
    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = (pdfBlob: Blob, filename: string) => {
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    isGenerating,
    generatePDFFromHTML,
    generatePDFFromDocument,
    generateDocumentFromTemplate,
    generatePDFFromPreviewHTML,
    downloadPDF,
  };
}

// Helper function to inject section content into template
// EXPORTED for use in ReviewGenerate preview
export function injectSectionContent(htmlTemplate: string, sectionContents: Record<string, string>): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlTemplate, "text/html");

  // Remove example-box elements (formatting reference only)
  const exampleBoxes = doc.querySelectorAll(".example-box");
  exampleBoxes.forEach((box) => box.remove());

  const sections = doc.querySelectorAll("[data-section]");

  sections.forEach((section) => {
    const sectionId = section.getAttribute("data-section") || "";

    // Try to infer section number for fallback keys
    const numberFromAttr = (section.getAttribute("data-section-number") || "").trim();
    const numberFromSpan = (section.querySelector(".number") as HTMLElement | null)?.textContent?.trim() || "";

    // As an additional fallback, try to parse from a heading text (e.g., "3.0 Responsibilities and Roles")
    let numberFromHeading = "";
    const heading = section.querySelector("h1, h2, h3, h4, .title, .section-title") as HTMLElement | null;
    if (heading) {
      const m = heading.textContent?.trim().match(/^([0-9]+(?:\.[0-9]+)*)/);
      if (m && m[1]) numberFromHeading = m[1];
    }

    const sectionNumber = numberFromAttr || numberFromSpan || numberFromHeading;

    const keysToTry = [sectionId, sectionNumber ? `__num__${sectionNumber}` : "", sectionNumber].filter(
      Boolean,
    ) as string[];

    const contentDiv = section.querySelector(".content");
    if (!contentDiv) return;

    let userContent: string | undefined;
    for (const k of keysToTry) {
      const v = sectionContents[k];
      if (v && typeof v === "string" && v.trim()) {
        userContent = v;
        break;
      }
    }

    if (userContent) {
      // Only replace the content div's innerHTML, keep all template structure
      contentDiv.innerHTML = userContent;
    } else {
      // Check if section is optional before removing
      const isOptional = section.getAttribute("data-optional") === "true";
      if (isOptional) {
        section.remove();
      }
    }
  });

  // Return the FULL HTML document with DOCTYPE to preserve all template styling
  let cleanedHtml = `<!DOCTYPE html>${doc.documentElement.outerHTML}`;

  // Remove all {{SECTION:...}} markers
  cleanedHtml = cleanedHtml.replace(/\{\{SECTION:[^}]+\}\}/g, "");

  return cleanedHtml;
}

// Helper function to strip inner borders while preserving header/footer borders
function stripInnerBorders(pageDiv: HTMLElement) {
  const elements = pageDiv.querySelectorAll<HTMLElement>('*');

  elements.forEach((el) => {
    // Don't touch the pageDiv border itself
    if (el === pageDiv) return;

    // Check if this element should keep its borders
    const shouldKeepBorders = 
      // Header/footer elements
      el.matches('.header-table, .footer-table, .sop-header, .sop-footer') ||
      el.matches('[data-role="header"], [data-role="footer"]') ||
      el.matches('#doc-header, #doc-footer') ||
      // Tables inside header/footer
      el.closest('#doc-header') !== null ||
      el.closest('#doc-footer') !== null ||
      el.closest('.header-table') !== null ||
      el.closest('.footer-table') !== null ||
      // Memo structural tables (Subject/To/From/CC and approval signatures)
      el.matches('.info-table, .sign-table') ||
      el.closest('.info-table') !== null ||
      el.closest('.sign-table') !== null ||
      // Tables with border="1" attribute (SOP templates)
      (el.tagName.toLowerCase() === 'table' && el.getAttribute('border') === '1') ||
      (el.closest('table[border="1"]') !== null) ||
      // Explicitly marked tables
      (el.tagName.toLowerCase() === 'table' && el.getAttribute('data-keep-borders') === 'true') ||
      (el.closest('[data-keep-borders="true"]') !== null);

    if (shouldKeepBorders) {
      // Keep borders for these elements
      return;
    }

    // Remove borders from everything else
    el.style.border = 'none';
    el.style.outline = 'none';
    el.style.boxShadow = 'none';

    // Extra safety for tables and cells
    const tag = el.tagName.toLowerCase();
    if (tag === 'table' || tag === 'td' || tag === 'th') {
      el.style.borderColor = 'transparent';
      el.style.borderWidth = '0';
      el.style.borderStyle = 'none';
    }
  });
}

// Helper function: merge 3 separate meta-tables into 1 combined table
// This eliminates gaps caused by html2canvas not properly collapsing borders
// across separate nested tables
function mergeMetaTablesForPDF(pageDiv: HTMLElement) {
  const headerTable = pageDiv.querySelector<HTMLTableElement>('.header-table');
  if (!headerTable) return;

  const metaCells = headerTable.querySelectorAll<HTMLTableCellElement>('td.meta-cell');
  if (metaCells.length < 2) return; // Not a memo header with multiple meta-cells

  // Collect all rows from all meta-tables
  const allMetaRows: HTMLTableRowElement[] = [];
  metaCells.forEach(cell => {
    const metaTable = cell.querySelector<HTMLTableElement>('table.meta-table');
    if (metaTable) {
      const rows = metaTable.querySelectorAll<HTMLTableRowElement>('tr');
      rows.forEach(row => allMetaRows.push(row.cloneNode(true) as HTMLTableRowElement));
    }
  });

  if (allMetaRows.length === 0) return;

  // Build one combined meta-table
  const combinedTable = document.createElement('table');
  combinedTable.className = 'meta-table';
  combinedTable.style.width = '100%';
  combinedTable.style.tableLayout = 'fixed';
  combinedTable.style.borderCollapse = 'collapse';
  combinedTable.style.borderSpacing = '0';

  const tbody = document.createElement('tbody');
  allMetaRows.forEach(row => {
    // Apply inline styles to each td for html2canvas reliability
    const cells = row.querySelectorAll<HTMLTableCellElement>('td, th');
    cells.forEach(cell => {
      cell.style.border = '1px solid #000';
      cell.style.padding = '3px 8px';
      cell.style.fontSize = '10pt';
      cell.style.lineHeight = '1.2';
      cell.style.verticalAlign = 'middle';
    });
    tbody.appendChild(row);
  });
  combinedTable.appendChild(tbody);

  // Put combined table in first meta-cell, give it rowspan=3
  const firstMetaCell = metaCells[0];
  firstMetaCell.innerHTML = '';
  firstMetaCell.appendChild(combinedTable);
  firstMetaCell.setAttribute('rowspan', String(metaCells.length));
  firstMetaCell.style.border = 'none';
  firstMetaCell.style.padding = '0';
  firstMetaCell.style.verticalAlign = 'top';

  // Remove remaining meta-cells from subsequent rows
  for (let i = 1; i < metaCells.length; i++) {
    metaCells[i].remove();
  }
  
  // Also eliminate gaps between the 3 main tables (header-table, info-table, sign-table)
  // These have margin-top: 16px which creates white space in the PDF
  const infoTable = pageDiv.querySelector<HTMLElement>('.info-table');
  const signTable = pageDiv.querySelector<HTMLElement>('.sign-table');
  
  if (infoTable) {
    infoTable.style.marginTop = '-1px'; // Overlap by 1px to share border
    infoTable.style.marginBottom = '0';
  }
  if (signTable) {
    signTable.style.marginTop = '-1px'; // Overlap by 1px to share border
    signTable.style.marginBottom = '0';
  }
  // Also ensure header-table has no bottom margin
  if (headerTable) {
    headerTable.style.marginBottom = '0';
  }
  
  console.log(`PDF: Merged ${metaCells.length} meta-tables into 1 combined table with ${allMetaRows.length} rows`);
}

// Helper function to enforce borders on header/footer tables
function enforceHeaderFooterBorders(pageDiv: HTMLElement) {
  // Ensure header tables have borders and centered content (including nested tables)
  const headerTables = pageDiv.querySelectorAll<HTMLElement>(
    '#doc-header table, .header-table, [data-role="header"] table, .info-table, .sign-table'
  );
  headerTables.forEach(table => {
    table.style.border = '1px solid #000';
    table.style.borderCollapse = 'collapse';
    
    // Apply borders and centering to all cells — but SKIP .meta-cell (outer wrapper for meta-tables)
    const cells = table.querySelectorAll<HTMLElement>('td, th');
    cells.forEach(cell => {
      if (cell.classList.contains('meta-cell')) {
        // Meta-cell should have NO border and NO padding — it's just a wrapper
        cell.style.border = 'none';
        cell.style.padding = '0';
        cell.style.verticalAlign = 'top';
      } else {
        cell.style.border = '1px solid #000';
        cell.style.textAlign = 'center';
        cell.style.verticalAlign = 'middle';
      }
    });
    
    // Handle nested tables within header
    const nestedTables = table.querySelectorAll<HTMLElement>('table');
    nestedTables.forEach(nested => {
      nested.style.borderCollapse = 'collapse';
      
      // Check if this is a meta-table — apply compact styling
      const isMetaTable = nested.classList.contains('meta-table');
      
      const nestedCells = nested.querySelectorAll<HTMLElement>('td, th');
      nestedCells.forEach(cell => {
        cell.style.border = '1px solid #000';
        cell.style.verticalAlign = 'middle';
        if (isMetaTable) {
          cell.style.padding = '3px 8px';
          cell.style.fontSize = '10pt';
          cell.style.lineHeight = '1.2';
        } else {
          cell.style.textAlign = 'center';
        }
      });
    });
  });

  // Ensure footer tables have borders and centered content
  const footerTables = pageDiv.querySelectorAll<HTMLElement>(
    '#doc-footer table, .footer-table, [data-role="footer"] table'
  );
  footerTables.forEach(table => {
    table.style.border = '1px solid #000';
    table.style.borderCollapse = 'collapse';
    
    // Apply per-row alignment (first cell left, others centered)
    const rows = table.querySelectorAll<HTMLTableRowElement>('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll<HTMLElement>('td, th');
      cells.forEach((cell, index) => {
        cell.style.border = '1px solid #000';
        cell.style.verticalAlign = 'middle';
        cell.style.textAlign = index === 0 ? 'left' : 'center';
      });
    });
  });

  // Also enforce borders and centering on all tables with border="1" attribute
  const borderedTables = pageDiv.querySelectorAll<HTMLElement>('table[border="1"]');
  borderedTables.forEach(table => {
    table.style.border = '1px solid #000';
    table.style.borderCollapse = 'collapse';
    
    const cells = table.querySelectorAll<HTMLElement>('td, th');
    cells.forEach(cell => {
      cell.style.border = '1px solid #000';
      cell.style.textAlign = 'center';
      cell.style.verticalAlign = 'middle';
    });
    
    // Handle nested tables (like document metadata tables in header)
    const nestedTables = table.querySelectorAll<HTMLElement>('table');
    nestedTables.forEach(nested => {
      nested.style.borderCollapse = 'collapse';
      const nestedCells = nested.querySelectorAll<HTMLElement>('td, th');
      nestedCells.forEach(cell => {
        cell.style.border = '1px solid #000';
        cell.style.textAlign = 'center';
        cell.style.verticalAlign = 'middle';
      });
    });
  });
}

// Helper function to inject CSS for accurate border rendering in html2canvas (paginated version)
// Also includes aggressive overrides for inline styles in header/footer tables
// Accepts optional documentPreviewCSS which should include hierarchical indentation CSS
function injectCanvasRenderingCSS(htmlTemplate: string, documentPreviewCSS?: string): string {
  const enhancedCSS = `
    <style id="canvas-rendering-fix">
      /* Force accurate rendering in html2canvas */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        box-sizing: border-box !important;
        image-rendering: crisp-edges !important;
        image-rendering: -webkit-optimize-contrast !important;
      }
      
      /* Avoid weird gaps in tables */
      table {
        border-spacing: 0 !important;
      }
      
      /* ─── PDF Header Table Fix ─── 
         The container renders at 1122px then scales ~60% to fit A4.
         We boost sizes here so the header looks proper after scale-down. */
      .header-table {
        width: 100% !important;
        border-collapse: collapse !important;
        table-layout: fixed !important;
      }
      
      /* Logo column: ~15%, Metadata column: ~25%, middle area: ~60% */
      .header-table > tbody > tr:first-child > td:first-child,
      .header-table > tr:first-child > td:first-child {
        width: 15% !important;
        text-align: center !important;
        vertical-align: middle !important;
        padding: 10px !important;
      }
      
      /* Right-side metadata column */
      .header-table > tbody > tr:first-child > td:last-child,
      .header-table > tr:first-child > td:last-child {
        width: 25% !important;
        vertical-align: top !important;
        padding: 10px !important;
      }
      
      /* Header cell fonts - ONLY direct children, not nested tables */
      .header-table > tbody > tr > td,
      .header-table > tr > td,
      .header-table > tbody > tr > th,
      .header-table > tr > th {
        font-size: 20px !important;
        line-height: 1.4 !important;
        padding: 10px 12px !important;
      }
      
      /* Black bar title - large and prominent */
      .header-table td[style*="background"],
      .header-table td[style*="background: black"],
      .header-table td[style*="background:#000"],
      .header-table td[style*="background: #000"] {
        font-size: 26px !important;
        font-weight: bold !important;
        padding: 14px 16px !important;
        letter-spacing: 2px !important;
      }
      
      /* Logo image */
      .header-table img {
        max-height: 120px !important;
        max-width: 100% !important;
        object-fit: contain !important;
      }
      
      /* Nested metadata table (Document No., Issue, etc.) */
      .header-table table {
        width: 100% !important;
        border-collapse: collapse !important;
        table-layout: fixed !important;
      }
      
      /* Nested table cells - smaller font for meta info */
      .header-table table td,
      .header-table table th {
        font-size: 14px !important;
        padding: 5px 8px !important;
        line-height: 1.3 !important;
      }
      
      /* SOP PROCESS row (dark nested table) */
      .header-table table td[style*="background: #222"],
      .header-table table td[style*="background:#222"] {
        font-size: 14px !important;
        padding: 6px 10px !important;
        letter-spacing: 1px !important;
      }
      
      /* Document title row - centered and prominent */
      .header-table > tbody > tr:last-child > td,
      .header-table > tr:last-child > td {
        font-size: 16px !important;
        font-weight: 600 !important;
        text-align: center !important;
        padding: 8px 10px !important;
      }
      
      /* ─── Memo meta-table overrides ─── */
      /* Remove outer meta-cell borders to prevent double-border gaps */
      .header-table .meta-cell,
      .header-table td.meta-cell,
      .header-table td.meta-cell[style] {
        width: 35% !important;
        padding: 0 !important;
        border: none !important;
        vertical-align: top !important;
      }
      
      .header-table .logo-cell {
        width: 20% !important;
        text-align: center !important;
        vertical-align: middle !important;
      }
      
      .header-table .title-cell {
        width: 45% !important;
        font-size: 20pt !important;
        font-weight: bold !important;
        letter-spacing: 1px !important;
        text-align: center !important;
        vertical-align: middle !important;
        padding: 10px !important;
      }
      
      /* Document title cell below POLICY bar — prominent */
      .header-table .doc-title-cell {
        font-size: 18pt !important;
        font-weight: bold !important;
        text-align: center !important;
        vertical-align: middle !important;
        padding: 10px 14px !important;
      }
      
      /* Inner meta-table: compact, seamless rows */
      .header-table .meta-table,
      .header-table table.meta-table {
        width: 100% !important;
        table-layout: fixed !important;
        border-collapse: collapse !important;
      }
      
      .header-table .meta-table td,
      .header-table .meta-table th,
      .header-table table.meta-table td,
      .header-table .meta-table td[style],
      .header-table table.meta-table td[style] {
        padding: 3px 8px !important;
        font-size: 10pt !important;
        line-height: 1.2 !important;
        vertical-align: middle !important;
        border: 1px solid #000 !important;
        white-space: nowrap !important;
      }
      
      .header-table .meta-table .label {
        width: 45% !important;
        text-align: left !important;
      }
      
      .header-table .meta-table .value {
        width: 55% !important;
        text-align: center !important;
      }
      
      .header-table .color-swatch {
        height: 18px !important;
        background: #0b3bff !important;
        display: block !important;
        width: 100% !important;
      }
      
      /* Section headings — bold and properly sized */
      [data-section] h2,
      [data-section] h3,
      .policy-section-title,
      .doc-content h2,
      .doc-content h3 {
        font-weight: bold !important;
        font-size: 12pt !important;
        margin-top: 16px !important;
        margin-bottom: 8px !important;
        color: #000 !important;
      }
      
      /* Content tables - fit within page width */
      table:not(.header-table):not(.footer-table):not(.meta-table):not(.info-table):not(.sign-table) {
        width: 100% !important;
        max-width: 100% !important;
        border-collapse: collapse !important;
        table-layout: fixed !important;
        overflow: hidden !important;
        margin: 10px 0 !important;
      }
      
      table:not(.header-table):not(.footer-table):not(.meta-table):not(.info-table):not(.sign-table) td,
      table:not(.header-table):not(.footer-table):not(.meta-table):not(.info-table):not(.sign-table) th {
        overflow-wrap: break-word !important;
        word-wrap: break-word !important;
        padding: 6px 8px !important;
        border: 1px solid #000 !important;
        vertical-align: top !important;
      }
      
      table:not(.header-table):not(.footer-table):not(.meta-table):not(.info-table):not(.sign-table) th {
        background-color: #f0f0f0 !important;
        font-weight: bold !important;
      }
    </style>
  `;
  
  // Document preview settings CSS (includes hierarchical indentation CSS)
  // Injected LAST for highest priority
  const settingsCSS = documentPreviewCSS ? `
    <style id="document-preview-settings-pdf">
      ${documentPreviewCSS}
    </style>
  ` : '';
  
  // Inject the CSS before the closing </head> tag or at the beginning of <body>
  // Settings CSS is injected LAST to ensure it has highest priority
  if (htmlTemplate.includes('</head>')) {
    return htmlTemplate.replace('</head>', `${enhancedCSS}${settingsCSS}</head>`);
  } else if (htmlTemplate.includes('<body>')) {
    return htmlTemplate.replace('<body>', `<body>${enhancedCSS}${settingsCSS}`);
  } else {
    // If no head or body tag, prepend to the content
    return enhancedCSS + settingsCSS + htmlTemplate;
  }
}

// Helper function to inject minimal CSS for preview rendering (no structure changes)
function injectPreviewRenderingCSS(htmlTemplate: string): string {
  const minimalCSS = `
    <style id="preview-rendering-fix">
      /* Force accurate color and border rendering */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        box-sizing: border-box !important;
      }
      
      /* Align header, content, footer to same left edge */
      #doc-wrapper .doc-header,
      #doc-wrapper .doc-content,
      #doc-wrapper .doc-footer {
        margin-left: 0 !important;
        margin-right: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        width: 100% !important;
      }

      /* Header/Footer tables fill full width - preserve their borders */
      #doc-wrapper .header-table,
      #doc-wrapper .footer-table {
        width: 100% !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        border-collapse: collapse !important;
        border-spacing: 0 !important;
      }

      /* Remove ANY extra frames in preview as well (keep only outer frame) */
      #doc-wrapper .border-container > table:not(.header-table):not(.footer-table):not(.info-table):not(.sign-table),
      #doc-wrapper .border-container > div:not(.doc-header):not(.doc-content):not(.doc-footer) {
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
      }

      #doc-wrapper .border-container > table:not(.header-table):not(.footer-table):not(.info-table):not(.sign-table) td,
      #doc-wrapper .border-container > table:not(.header-table):not(.footer-table):not(.info-table):not(.sign-table) th {
        border: none !important;
      }
      
      /* Preserve memo structural tables */
      .info-table, .info-table td, .info-table th,
      .sign-table, .sign-table td, .sign-table th {
        border: 1px solid #000 !important;
      }
      
      .info-table, .sign-table {
        width: 100% !important;
        border-collapse: collapse !important;
        margin-top: -1px !important;
        margin-bottom: 0 !important;
      }

      /* Remove stray margins on wrapper divs to keep a straight left edge */
      #doc-wrapper .doc-header > div,
      #doc-wrapper .doc-footer > div,
      #doc-wrapper .doc-content > div:first-child {
        margin-left: 0 !important;
        padding-left: 0 !important;
      }

      /* Keep preview clean: remove borders from section wrappers, not tables */
      #doc-wrapper .doc-content .section {
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
      }
      
      #doc-wrapper .doc-content .section *:not(table):not(td):not(th) {
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
      }
      
      /* HTML2Canvas rendering fixes */
      #doc-wrapper .doc-content {
        -webkit-box-shadow: none !important;
        box-shadow: none !important;
      }
      
      /* Prevent border rendering artifacts */
      table {
        border-spacing: 0 !important;
      }
      
      /* Force sharp image rendering */
      * {
        image-rendering: crisp-edges !important;
        image-rendering: -webkit-optimize-contrast !important;
      }
    </style>
  `;
  
  // Inject the CSS before the closing </head> tag or at the beginning of <body>
  if (htmlTemplate.includes('</head>')) {
    return htmlTemplate.replace('</head>', `${minimalCSS}</head>`);
  } else if (htmlTemplate.includes('<body>')) {
    return htmlTemplate.replace('<body>', `<body>${minimalCSS}`);
  } else {
    // If no head or body tag, prepend to the content
    return minimalCSS + htmlTemplate;
  }
}

// Helper function to apply font rules based on language
function applyFontRules(htmlTemplate: string, language: string): string {
  const rules = fontRules[language] || fontRules.english;

  const fontStyles = `
    <style>
      body { 
        font-family: ${rules.standard}, Arial, sans-serif; 
        font-size: ${rules.sizes.bodyText.size}pt;
        line-height: 1.6;
      }
      .header-main { 
        font-size: ${rules.sizes.documentType.size}pt; 
        font-weight: ${rules.sizes.documentType.bold ? "bold" : "normal"};
      }
      h1, h2, h3 { 
        font-size: ${rules.sizes.headings.size}pt; 
        font-weight: ${rules.sizes.headings.bold ? "bold" : "normal"};
      }
      .footer, .footer-table { 
        font-size: ${rules.sizes.footer.size}pt; 
      }
      .level-1, .level-2, .level-3 {
        font-size: ${rules.sizes.bodyText.size}pt;
      }
      .level-1-roman {
        margin: 0.25rem 0;
        margin-left: 40px;
        font-size: ${rules.sizes.bodyText.size}pt;
      }
      .level-1-roman .roman-item {
        display: flex !important;
        align-items: baseline !important;
        margin: 0 0 0.4rem 0;
        line-height: 1.6;
      }
      .level-1-roman .roman-number {
        font-weight: normal;
        flex-shrink: 0;
        min-width: 28px;
        text-align: left;
        margin-right: 6px;
      }
      .level-1-roman .roman-content {
        flex: 1;
        display: block;
      }
      .level-1-roman .roman-content p {
        display: inline;
        margin: 0;
        padding: 0;
      }
      
      /* Override for p/div elements used as roman-items */
      p.roman-item,
      div.roman-item {
        display: flex !important;
        align-items: baseline !important;
      }
    </style>
  `;

  return htmlTemplate.replace("</head>", `${fontStyles}</head>`);
}

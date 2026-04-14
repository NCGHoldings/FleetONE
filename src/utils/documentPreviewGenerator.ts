import { injectSectionContent } from "@/hooks/usePDFGeneration";
import { transformDocumentHTML } from "./contentStructureTransformer";
import { HIERARCHICAL_CSS } from "./hierarchicalStyles";
import { generateCellLayoutCSS } from "./cellToHtml";
import {
  generateIndentationCSS as centralizedGenerateIndentationCSS,
  DEFAULT_INDENTATION,
  IndentationSettings,
} from "./indentationCSSGenerator";

/**
 * Normalize template section attributes to ensure consistent IDs and numbers
 */
export function normalizeTemplateSections(
  html: string,
  sections: Array<{
    sectionId: string;
    sectionNumber: string;
    isRequired?: boolean;
  }>,
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const sectionByNumber = new Map(sections.map((s) => [s.sectionNumber, s]));

  doc.querySelectorAll("[data-section]").forEach((el) => {
    const currentId = el.getAttribute("data-section") || "";
    const numberFromAttr = (
      el.getAttribute("data-section-number") || ""
    ).trim();
    const numberFromSpan =
      (
        el.querySelector(".number") as HTMLElement | null
      )?.textContent?.trim() || "";
    let numberFromHeading = "";
    const heading = el.querySelector(
      "h1,h2,h3,h4,.title,.section-title",
    ) as HTMLElement | null;
    if (heading) {
      const m = heading.textContent?.trim().match(/^([0-9]+(?:\.[0-9]+)*)/);
      if (m && m[1]) numberFromHeading = m[1];
    }

    const sectionNumber = numberFromAttr || numberFromSpan || numberFromHeading;
    if (sectionNumber) {
      el.setAttribute("data-section-number", sectionNumber);
      const mapping = sectionByNumber.get(sectionNumber);
      if (mapping?.sectionId && mapping.sectionId !== currentId) {
        el.setAttribute("data-section", mapping.sectionId);
      }
      if (mapping && mapping.isRequired === false) {
        el.setAttribute("data-optional", "true");
      }
    }
  });

  return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
}

/**
 * Map of row labels to step numbers for signature injection
 */
const SIGNATURE_ROW_LABELS: Record<string, string> = {
  "reviewed by": "step_1",
  "approved by": "step_2",
  "prepared by": "step_3",
  "checked by": "step_4",
  "verified by": "step_5",
  "authorized by": "step_6",
};

/**
 * Inject collected signatures into document footer
 */
export function injectSignaturesIntoFooter(
  html: string,
  signatures: Array<{
    step_number: number;
    signature: {
      name: string;
      date: string;
      use_image: boolean;
      signature_image_url?: string;
      job_title?: string;
    };
    action: string;
    point_placeholder?: string;
    point_label?: string;
  }>,
): string {
  let result = html;

  // Early exit if no signatures
  if (!signatures || signatures.length === 0) {
    console.log(
      "injectSignaturesIntoFooter: No signatures provided, skipping injection",
    );
    return html;
  }

  // Sort signatures by step number
  const sortedSignatures = [...signatures].sort(
    (a, b) => a.step_number - b.step_number,
  );

  console.log("injectSignaturesIntoFooter: === SIGNATURE INJECTION START ===");
  console.log(
    "injectSignaturesIntoFooter: Signatures received:",
    signatures.length,
  );
  console.log("injectSignaturesIntoFooter: Template analysis", {
    htmlLength: html.length,
    hasFooterTable: html.includes("footer-table"),
    hasStep1NamePlaceholder: html.includes("{{step_1_name}}"),
    hasStep2NamePlaceholder: html.includes("{{step_2_name}}"),
    step1NameOccurrences: (html.match(/\{\{step_1_name\}\}/g) || []).length,
    step2NameOccurrences: (html.match(/\{\{step_2_name\}\}/g) || []).length,
  });

  console.log(
    "injectSignaturesIntoFooter: Signatures to inject:",
    signatures.map((s) => ({
      step_number: s.step_number,
      point_placeholder: s.point_placeholder,
      point_label: s.point_label,
      name: s.signature?.name,
      job_title: s.signature?.job_title,
      date: s.signature?.date,
      use_image: s.signature?.use_image,
      has_image_url: !!s.signature?.signature_image_url,
    })),
  );

  // First, try placeholder replacement (for templates with {{step_X_name}} placeholders)
  sortedSignatures.forEach((sig) => {
    const placeholderKey = sig.point_placeholder || `step_${sig.step_number}`;

    console.log(
      `injectSignaturesIntoFooter: Processing signature for "${placeholderKey}"`,
      {
        nameToInject: sig.signature?.name,
        jobTitleToInject: sig.signature?.job_title,
        dateToInject: sig.signature?.date,
      },
    );

    // Check if placeholder exists before replacement
    const namePlaceholder = `{{${placeholderKey}_name}}`;
    const hadNamePlaceholder = result.includes(namePlaceholder);

    // Replace name placeholder
    result = result.replace(
      new RegExp(`{{${placeholderKey}_name}}`, "g"),
      sig.signature?.name || "",
    );

    console.log(
      `injectSignaturesIntoFooter: Name replacement for ${placeholderKey}`,
      {
        placeholder: namePlaceholder,
        hadPlaceholder: hadNamePlaceholder,
        replacedWith: sig.signature?.name || "",
      },
    );

    // Replace designation/job title placeholder
    result = result.replace(
      new RegExp(`{{${placeholderKey}_designation}}`, "g"),
      sig.signature?.job_title || "",
    );

    // Replace date placeholder (format as YYYY/MM/DD)
    let formattedDate = "";
    if (sig.signature?.date) {
      // If already in YYYY/MM/DD format, use as-is
      if (sig.signature.date.includes("/")) {
        formattedDate = sig.signature.date;
      } else {
        // Parse and format ISO dates or other formats
        try {
          formattedDate = new Date(sig.signature.date)
            .toISOString()
            .split("T")[0]
            .replace(/-/g, "/");
        } catch {
          formattedDate = sig.signature.date;
        }
      }
    }
    result = result.replace(
      new RegExp(`{{${placeholderKey}_date}}`, "g"),
      formattedDate,
    );

    // Replace signature placeholder
    if (sig.signature?.use_image && sig.signature?.signature_image_url) {
      result = result.replace(
        new RegExp(`{{${placeholderKey}_signature}}`, "g"),
        `<img src="${sig.signature.signature_image_url}" style="max-width: 120px; max-height: 35px; display: block; margin: 0 auto; object-fit: contain;" alt="Signature" />`,
      );
    } else {
      result = result.replace(
        new RegExp(`{{${placeholderKey}_signature}}`, "g"),
        `<span style="font-style: italic; color: #666; font-size: 10px;">${sig.signature?.name || ""}</span>`,
      );
    }

    // Replace action/status placeholder (if exists)
    result = result.replace(
      new RegExp(`{{${placeholderKey}_action}}`, "g"),
      sig.action === "approve" ? "✓" : "✗",
    );
  });

  console.log("injectSignaturesIntoFooter: After placeholder replacement", {
    stillHasStep1Name: result.includes("{{step_1_name}}"),
    stillHasStep2Name: result.includes("{{step_2_name}}"),
  });

  // Second, use DOM manipulation to fill empty cells in footer table rows
  // This handles templates without placeholders (e.g., empty <td></td> cells)
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(result, "text/html");

    // Find footer table (by class or by position - last table before closing div)
    const footerTable =
      doc.querySelector(".footer-table") ||
      doc.querySelector('table[border="1"]:last-of-type');

    if (footerTable) {
      const rows = footerTable.querySelectorAll("tr");

      // Build dynamic mapping from signature data (point_label -> signature)
      const dynamicLabelToSig: Record<string, (typeof sortedSignatures)[0]> =
        {};
      sortedSignatures.forEach((sig) => {
        if (sig.point_label) {
          dynamicLabelToSig[sig.point_label.toLowerCase()] = sig;
        }
        // Also map by placeholder for fallback
        const placeholder = sig.point_placeholder || `step_${sig.step_number}`;
        // Extract label from placeholder if possible (step_1 -> check SIGNATURE_ROW_LABELS reverse)
        Object.entries(SIGNATURE_ROW_LABELS).forEach(([label, stepKey]) => {
          if (stepKey === placeholder) {
            dynamicLabelToSig[label] = sig;
          }
        });
      });

      console.log(
        "injectSignaturesIntoFooter: Dynamic label mapping:",
        Object.keys(dynamicLabelToSig),
      );

      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 5) return; // Need at least 5 columns

        const labelCell = cells[0];
        const labelText = labelCell?.textContent?.trim().toLowerCase() || "";

        // Find matching signature using dynamic mapping first, then static fallback
        let matchingSig = dynamicLabelToSig[labelText];

        // If no dynamic match, try static mapping
        if (!matchingSig) {
          const stepKey = SIGNATURE_ROW_LABELS[labelText];
          if (stepKey) {
            matchingSig = sortedSignatures.find((sig) => {
              const sigKey = sig.point_placeholder || `step_${sig.step_number}`;
              return sigKey === stepKey;
            });
          }
        }

        if (!matchingSig) return;

        console.log(
          `injectSignaturesIntoFooter: Found matching signature for "${labelText}":`,
          {
            name: matchingSig.signature.name,
            job_title: matchingSig.signature.job_title,
            step: matchingSig.step_number,
            placeholder: matchingSig.point_placeholder,
            label: matchingSig.point_label,
          },
        );

        // Only fill cells that are empty or contain only whitespace/placeholders
        const isEmptyOrPlaceholder = (cell: Element) => {
          const content = cell.textContent?.trim() || "";
          return content === "" || content.startsWith("{{");
        };

        // Name column (index 1)
        if (isEmptyOrPlaceholder(cells[1])) {
          cells[1].innerHTML = matchingSig.signature.name || "";
        }

        // Designation column (index 2)
        if (isEmptyOrPlaceholder(cells[2])) {
          cells[2].innerHTML = matchingSig.signature.job_title || "";
        }

        // Signature column (index 3)
        if (isEmptyOrPlaceholder(cells[3])) {
          if (
            matchingSig.signature.use_image &&
            matchingSig.signature.signature_image_url
          ) {
            cells[3].innerHTML = `<img src="${matchingSig.signature.signature_image_url}" style="max-width: 120px; max-height: 35px; display: block; margin: 0 auto; object-fit: contain;" alt="Signature" />`;
          } else {
            cells[3].innerHTML = `<span style="font-style: italic; color: #666; font-size: 10px;">${matchingSig.signature.name || ""}</span>`;
          }
        }

        // Date column (index 4)
        if (isEmptyOrPlaceholder(cells[4])) {
          let formattedDate = "";
          if (matchingSig.signature.date) {
            if (matchingSig.signature.date.includes("/")) {
              formattedDate = matchingSig.signature.date;
            } else {
              try {
                formattedDate = new Date(matchingSig.signature.date)
                  .toISOString()
                  .split("T")[0]
                  .replace(/-/g, "/");
              } catch {
                formattedDate = matchingSig.signature.date;
              }
            }
          }
          cells[4].innerHTML = formattedDate;
        }
      });

      result = `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
    }
  } catch (err) {
    console.error("injectSignaturesIntoFooter: DOM manipulation failed:", err);
  }

  // Clear any remaining unfilled placeholders
  result = result.replace(/\{\{[^}]+_name\}\}/g, "");
  result = result.replace(/\{\{[^}]+_designation\}\}/g, "");
  result = result.replace(/\{\{[^}]+_date\}\}/g, "");
  result = result.replace(/\{\{[^}]+_signature\}\}/g, "");
  result = result.replace(/\{\{[^}]+_action\}\}/g, "");

  console.log("injectSignaturesIntoFooter: === INJECTION COMPLETE ===");
  console.log("injectSignaturesIntoFooter: Result analysis:", {
    resultLength: result.length,
    stillHasStep1Name: result.includes("{{step_1_name}}"),
    stillHasStep2Name: result.includes("{{step_2_name}}"),
    containsFirstSignerName: signatures[0]?.signature?.name
      ? result.includes(signatures[0].signature.name)
      : "N/A",
  });

  return result;
}

/**
 * Fix memo header CSS — directly replace the template's CSS rules for the header
 * meta-table and signature table to ensure professional spacing.
 * 
 * This approach replaces the CSS rules in the template's own <style> block,
 * which is more reliable than trying to override with !important.
 */
function fixMemoHeaderCSS(html: string): string {
  if (!html.includes('header-table') || !html.includes('meta-table')) return html;
  
  let result = html;
  
  // Replace logo-cell width: from 25% to 20%
  result = result.replace(
    /\.header-table\s+\.logo-cell\s*\{[^}]*width:\s*25%[^}]*\}/g,
    `.header-table .logo-cell { width: 20%; text-align: center; }`
  );
  
  // Replace title-cell width: from 50% to 45%
  result = result.replace(
    /\.header-table\s+\.title-cell\s*\{[^}]*width:\s*50%[^}]*\}/g,
    `.header-table .title-cell { width: 45%; text-align: center; font-size: 16pt; font-weight: bold; letter-spacing: 1px; }`
  );
  
  // Replace meta-cell width: from 25% to 35%
  result = result.replace(
    /\.header-table\s+\.meta-cell\s*\{[^}]*width:\s*25%[^}]*\}/g,
    `.header-table .meta-cell { width: 35%; padding: 0; border: none; vertical-align: top; }`
  );
  
  // Replace meta-table base styles
  result = result.replace(
    /\.header-table\s+\.meta-table\s*\{[^}]*border-collapse:\s*collapse[^}]*\}/g,
    `.header-table .meta-table { width: 100%; border-collapse: collapse; table-layout: fixed; }`
  );
  
  // Replace meta-table td styles — increase padding and font size
  result = result.replace(
    /\.header-table\s+\.meta-table\s+td\s*\{[^}]*\}/g,
    `.header-table .meta-table td { border: 1px solid #000; padding: 3px 8px; font-size: 10pt; vertical-align: middle; }`
  );
  
  // Replace meta-table .label width
  result = result.replace(
    /\.header-table\s+\.meta-table\s+\.label\s*\{[^}]*\}/g,
    `.header-table .meta-table .label { width: 45%; text-align: left; white-space: nowrap; }`
  );
  
  // Replace meta-table .value width
  result = result.replace(
    /\.header-table\s+\.meta-table\s+\.value\s*\{[^}]*\}/g,
    `.header-table .meta-table .value { width: 55%; text-align: center; }`
  );
  
  // Ensure color-swatch is visible with explicit sizing
  result = result.replace(
    /\.header-table\s+\.color-swatch\s*\{[^}]*\}/g,
    `.header-table .color-swatch { height: 18px; background: #0b3bff; display: block; width: 100%; }`
  );
  
  // Fix sign-table: ensure approved-cell has white background, not gray
  result = result.replace(
    /\.sign-table\s+\.approved-cell\s*\{[^}]*background:\s*#f5f5f5[^}]*\}/g,
    `.sign-table .approved-cell { height: 45px; background: #ffffff; vertical-align: bottom; padding-bottom: 6px; }`
  );
  
  console.log('fixMemoHeaderCSS: Replaced template CSS for professional header/signature styling');
  return result;
}

/**
 * DOM-based fallback to replace header placeholder text that survived
 * HTML entity encoding/decoding through DOMParser.
 * 
 * After DOMParser processes the template, entities like &lt;Process Name&gt;
 * become literal <Process Name> text in DOM text nodes. This function
 * walks the header table's text nodes and replaces them.
 */
function replaceHeaderPlaceholdersDOM(
  html: string,
  replacements: { processName: string; documentTitle: string }
): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Target header tables where placeholder text typically lives
    const headerTables = doc.querySelectorAll('.header-table, [data-role="header"], #doc-header');
    
    if (headerTables.length === 0) return html;

    // Placeholder patterns to replace (as they appear after DOM decoding)
    const placeholderMap: Array<{ patterns: RegExp[]; value: string }> = [
      {
        patterns: [
          /[<\u003c]?\s*Process\s*Name\s*[>\u003e]?/gi,
          /[<\u003c]?\s*Name\s+of\s+the\s+Process\s*[>\u003e]?/gi,
        ],
        value: replacements.processName,
      },
      {
        patterns: [
          /[<\u003c]?\s*Topic\s+of\s+the\s+SOP\s*[>\u003e]?/gi,
        ],
        value: replacements.documentTitle,
      },
    ];

    headerTables.forEach((header) => {
      // Walk all text nodes in the header
      const walker = doc.createTreeWalker(header, NodeFilter.SHOW_TEXT, null);
      let node: Text | null;
      
      while ((node = walker.nextNode() as Text | null)) {
        if (!node.textContent) continue;
        let text = node.textContent;
        let changed = false;

        for (const { patterns, value } of placeholderMap) {
          for (const pattern of patterns) {
            if (pattern.test(text)) {
              text = text.replace(pattern, value);
              changed = true;
            }
          }
        }

        if (changed) {
          node.textContent = text;
        }
      }
    });

    return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
  } catch (err) {
    console.error('replaceHeaderPlaceholdersDOM: Failed', err);
    return html;
  }
}

/**
 * Inject structural IDs (#doc-header, #doc-content, #doc-footer) into
 * templates that use class-based detection only.
 * 
 * This ensures PaginatedPreview can reliably find the document structure
 * without falling back to heuristic detection.
 */
function injectStructuralIDs(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Skip if structural IDs already exist
    if (doc.querySelector('#doc-header') || doc.querySelector('#doc-content') || doc.querySelector('#doc-footer')) {
      return html;
    }

    const container = doc.querySelector('.border-container') || doc.body;
    if (!container) return html;

    // Find header table
    const headerTable = container.querySelector('.header-table, [data-role="header"]');
    if (headerTable && !headerTable.closest('#doc-header')) {
      const headerWrapper = doc.createElement('div');
      headerWrapper.id = 'doc-header';
      headerWrapper.className = 'doc-header';
      headerTable.parentNode?.insertBefore(headerWrapper, headerTable);
      headerWrapper.appendChild(headerTable);
    }

    // Find footer table
    const footerTable = container.querySelector('.footer-table, [data-role="footer"]');
    if (footerTable && !footerTable.closest('#doc-footer')) {
      const footerWrapper = doc.createElement('div');
      footerWrapper.id = 'doc-footer';
      footerWrapper.className = 'doc-footer';
      footerTable.parentNode?.insertBefore(footerWrapper, footerTable);
      footerWrapper.appendChild(footerTable);
    }

    // Check if there's already a .doc-content div in the template (e.g., memo templates)
    const existingDocContent = container.querySelector('.doc-content');
    if (existingDocContent && !existingDocContent.id) {
      // Just add the ID to the existing content wrapper
      existingDocContent.id = 'doc-content';
      
      // CRITICAL: Move memo structural tables (info-table, sign-table) INSIDE doc-content
      // PaginatedPreview/SmartPaginator ONLY renders elements within #doc-header, #doc-content, #doc-footer.
      // If these tables are siblings outside these containers, they get discarded during pagination.
      const memoTables = container.querySelectorAll('.info-table, .sign-table, [data-section="memo_info"], [data-section="signatures"]');
      if (memoTables.length > 0) {
        // Prepend memo tables at the TOP of doc-content, before any content sections
        // Insert in document order: info-table first, then sign-table
        const firstChild = existingDocContent.firstChild;
        const tablesArr = Array.from(memoTables);
        tablesArr.forEach(table => {
          if (firstChild) {
            existingDocContent.insertBefore(table, firstChild);
          } else {
            existingDocContent.appendChild(table);
          }
        });
        console.log('injectStructuralIDs: Moved', memoTables.length, 'memo tables inside #doc-content');
      }
    } else if (!container.querySelector('#doc-content, .doc-content')) {
      // No existing content wrapper — create one and wrap nodes between header and footer
      const headerWrapper = container.querySelector('#doc-header');
      const footerWrapper = container.querySelector('#doc-footer');
      
      const contentWrapper = doc.createElement('div');
      contentWrapper.id = 'doc-content';
      contentWrapper.className = 'doc-content';

      // Collect nodes between header and footer
      const allChildren = Array.from(container.childNodes);
      const headerIdx = headerWrapper ? allChildren.indexOf(headerWrapper) : -1;
      const footerIdx = footerWrapper ? allChildren.indexOf(footerWrapper) : allChildren.length;
      
      const startIdx = headerIdx >= 0 ? headerIdx + 1 : 0;
      const contentNodes = allChildren.slice(startIdx, footerIdx);
      
      // Separate memo structural tables (info-table, sign-table) from content
      const memoStructuralSelectors = '.info-table, .sign-table, [data-section="memo_info"], [data-section="signatures"]';
      
      // Only wrap if there are content nodes
      if (contentNodes.length > 0) {
        // Insert content wrapper before the first content node
        const firstContentNode = contentNodes[0];
        container.insertBefore(contentWrapper, firstContentNode);
        
        // Move content nodes into wrapper, but keep memo structural tables outside
        contentNodes.forEach(node => {
          // Skip if it's already the content wrapper or header/footer
          if (node === contentWrapper) return;
          
          // Check if this node is a memo structural table
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            if (el.matches(memoStructuralSelectors)) {
              // Keep memo structural tables outside doc-content — insert before it
              container.insertBefore(el, contentWrapper);
              return;
            }
          }
          
          contentWrapper.appendChild(node);
        });
      }
    }

    return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
  } catch (err) {
    console.error('injectStructuralIDs: Failed', err);
    return html;
  }
}


/**
 * Normalize content table widths to prevent horizontal overflow.
 * Strips inline pixel widths from content tables and their cells,
 * forces table-layout: fixed so columns distribute evenly.
 * Skips header-table, footer-table, meta-table, info-table, sign-table.
 */
function normalizeContentTableWidths(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    // Find all content tables (skip structural tables)
    const contentTables = doc.querySelectorAll<HTMLTableElement>(
      'table:not(.header-table):not(.footer-table):not(.meta-table):not(.info-table):not(.sign-table)'
    );
    
    contentTables.forEach(table => {
      // Skip tables inside header/footer
      if (table.closest('#doc-header') || table.closest('#doc-footer') || 
          table.closest('.doc-header') || table.closest('.doc-footer')) {
        return;
      }
      
      // Force table to fit within page
      table.style.width = '100%';
      table.style.maxWidth = '100%';
      table.style.tableLayout = 'fixed';
      table.style.borderCollapse = 'collapse';
      table.style.overflow = 'hidden';
      
      // Convert pixel widths to percentage widths to preserve proportions
      // Get all first-row cells to determine column widths
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        const cells = firstRow.querySelectorAll<HTMLElement>('td, th');
        const pixelWidths: number[] = [];
        let totalPxWidth = 0;
        let hasAnyWidth = false;
        
        cells.forEach(cell => {
          let w = 0;
          // Check inline style width
          if (cell.style.width && cell.style.width.includes('px')) {
            w = parseFloat(cell.style.width);
            hasAnyWidth = true;
          }
          // Check width attribute 
          else if (cell.getAttribute('width')) {
            const attrW = cell.getAttribute('width')!;
            if (attrW.includes('px') || /^\d+$/.test(attrW)) {
              w = parseFloat(attrW);
              hasAnyWidth = true;
            }
          }
          // Check colwidth attribute (TipTap)
          else if (cell.getAttribute('colwidth')) {
            w = parseFloat(cell.getAttribute('colwidth')!);
            hasAnyWidth = true;
          }
          pixelWidths.push(w);
          totalPxWidth += w;
        });
        
        if (hasAnyWidth && totalPxWidth > 0) {
          // Convert pixel widths to percentages
          cells.forEach((cell, index) => {
            const pxW = pixelWidths[index];
            if (pxW > 0) {
              const pct = Math.round((pxW / totalPxWidth) * 100);
              cell.style.width = `${pct}%`;
            } else {
              // Cell without explicit width: distribute remaining space
              cell.style.width = '';
            }
            // Remove pixel-based attributes
            cell.removeAttribute('width');
            cell.removeAttribute('colwidth');
          });
          
          // Also set the same percentages on all subsequent rows for consistency
          const allRows = table.querySelectorAll('tr');
          allRows.forEach((row, rowIdx) => {
            if (rowIdx === 0) return; // Skip first row (already handled)
            const rowCells = row.querySelectorAll<HTMLElement>('td, th');
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
          // No pixel widths found — distribute equally
          const equalPct = Math.floor(100 / cells.length);
          cells.forEach(cell => {
            cell.style.width = `${equalPct}%`;
            cell.removeAttribute('width');
            cell.removeAttribute('colwidth');
          });
        }
      }
      
      // Ensure text wraps in all cells
      table.querySelectorAll<HTMLElement>('td, th').forEach(cell => {
        cell.style.overflowWrap = 'break-word';
        cell.style.wordBreak = 'break-word';
      });
    });
    
    return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
  } catch (e) {
    console.warn('normalizeContentTableWidths failed:', e);
    return html;
  }
}


/**
 * Generate document preview HTML from template and data
 */
export interface DocumentPreviewOptions {
  template: {
    html_template: string;
    section_mappings?: {
      sections: Array<{
        sectionId: string;
        sectionNumber: string;
        isRequired?: boolean;
      }>;
    };
  };
  templateContent: Record<string, string>;
  company?: {
    company_name?: string;
    company_code?: string;
    company_logo_url?: string;
  };
  branch?: {
    branch_name?: string;
  };
  department?: {
    department_name?: string;
  };
  documentData: {
    documentNumber?: string;
    title?: string;
    documentType?: string;
    version?: string;
    revisionNumber?: number | string;
    language?: string;
    // Memo-specific metadata
    subject?: string;
    to?: string;
    from?: string;
    cc?: string;
  };
  signatures?: Array<{
    step_number: number;
    signature: {
      name: string;
      date: string;
      use_image: boolean;
      signature_image_url?: string;
      job_title?: string;
    };
    action: string;
    point_placeholder?: string;
    point_label?: string;
  }>;
  /** Optional custom CSS from document preview settings */
  documentPreviewCSS?: string;
  /** Optional hierarchical indentation CSS from backend settings */
  hierarchicalIndentationCSS?: string;
  /** Optional header settings from backend for dynamic header styling */
  headerSettings?: {
    cellPadding: number;
    fontSize: number;
    titleFontSize: number;
    lineHeight: number;
    logoMaxHeight: number;
  };
}

export function generateDocumentPreview(
  options: DocumentPreviewOptions,
): string {
  const {
    template,
    templateContent,
    company,
    branch,
    department,
    documentData,
    signatures,
    documentPreviewCSS,
    hierarchicalIndentationCSS,
    headerSettings,
  } = options;

  // Clone template HTML
  let previewHtml = template.html_template;

  const sections = template.section_mappings?.sections || [];

  // CRITICAL: Apply system placeholder replacements BEFORE normalizeTemplateSections,
  // because normalizeTemplateSections runs DOMParser which decodes HTML entities.
  // Regex-based replacements must happen on the original template HTML.
  previewHtml = previewHtml.replace(
    /\{\{company_name\}\}/g,
    company?.company_name || "COMPANY NAME",
  );
  previewHtml = previewHtml.replace(
    /\{\{company_code\}\}/g,
    company?.company_code || "CODE",
  );
  previewHtml = previewHtml.replace(
    /\{\{branch_name\}\}/g,
    branch?.branch_name || "BRANCH NAME",
  );
  previewHtml = previewHtml.replace(
    /\{\{process_name\}\}/g,
    department?.department_name || "DEPARTMENT NAME",
  );
  previewHtml = previewHtml.replace(
    /\{\{document_number\}\}/g,
    documentData.documentNumber || "PREVIEW-001",
  );
  previewHtml = previewHtml.replace(
    /\{\{document_title\}\}/g,
    documentData.title || "Document Title",
  );
  previewHtml = previewHtml.replace(
    /\{\{document_type\}\}/g,
    documentData.documentType || "Document Type",
  );
  previewHtml = previewHtml.replace(
    /\{\{version\}\}/g,
    documentData.version || "1.0",
  );
  previewHtml = previewHtml.replace(
    /\{\{issue_number\}\}/g,
    documentData.version || "00",
  );
  previewHtml = previewHtml.replace(
    /\{\{revision_number\}\}/g,
    String(documentData.revisionNumber || "0"),
  );
  previewHtml = previewHtml.replace(
    /\{\{revision_date\}\}/g,
    new Date().toISOString().split("T")[0],
  );
  previewHtml = previewHtml.replace(
    /\{\{date\}\}/g,
    new Date().toISOString().split("T")[0],
  );
  previewHtml = previewHtml.replace(
    /\{\{language\}\}/g,
    documentData.language || "English",
  );

  // Memo-specific placeholder replacements (regex-based for {{placeholder}} templates)
  previewHtml = previewHtml.replace(
    /\{\{subject\}\}/g,
    documentData.subject || documentData.title || "Subject",
  );
  previewHtml = previewHtml.replace(
    /\{\{to\}\}/g,
    documentData.to || "",
  );
  previewHtml = previewHtml.replace(
    /\{\{from\}\}/g,
    documentData.from || "",
  );
  previewHtml = previewHtml.replace(
    /\{\{cc\}\}/g,
    documentData.cc || "",
  );

  // DOM-based fallback: fill memo info-table cells (To/From/CC) even when
  // the template doesn't use {{placeholder}} tags but has label cells like "To", "From", "CC"
  if (documentData.to || documentData.from || documentData.cc || documentData.subject) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(previewHtml, 'text/html');
      
      // Find all tables that could be memo info tables (info-table or tables with Subject/To/From rows)
      const allTables = doc.querySelectorAll('table.info-table, table');
      
      allTables.forEach((table) => {
        const rows = table.querySelectorAll('tr');
        rows.forEach((row) => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const labelText = (cells[0].textContent || '').trim().toLowerCase();
            const valueCell = cells[1];
            const valueCellText = (valueCell.textContent || '').trim();
            
            // Only fill if the value cell is empty
            if (valueCellText === '' || valueCellText === '{{to}}' || valueCellText === '{{from}}' || valueCellText === '{{cc}}' || valueCellText === '{{subject}}') {
              if (labelText === 'to' && documentData.to) {
                valueCell.textContent = documentData.to;
              } else if (labelText === 'from' && documentData.from) {
                valueCell.textContent = documentData.from;
              } else if ((labelText === 'cc' || labelText === 'cc (optional)') && documentData.cc) {
                valueCell.textContent = documentData.cc;
              } else if (labelText.includes('subject') && documentData.subject) {
                valueCell.textContent = documentData.subject;
              }
            }
          }
        });
      });
      
      previewHtml = `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
    } catch (err) {
      console.error('DOM-based memo field injection failed:', err);
    }
  }

  // Memo header & footer placeholder mappings
  previewHtml = previewHtml.replace(
    /\{\{reference\}\}/g,
    documentData.documentNumber || "PREVIEW-001",
  );
  previewHtml = previewHtml.replace(
    /\{\{issued_date\}\}/g,
    new Date().toISOString().split("T")[0],
  );
  previewHtml = previewHtml.replace(
    /\{\{format_revision\}\}/g,
    documentData.version || "1.0",
  );
  previewHtml = previewHtml.replace(
    /\{\{format_revision_date\}\}/g,
    new Date().toISOString().split("T")[0],
  );
  previewHtml = previewHtml.replace(
    /\{\{page_number\}\}/g,
    "1",
  );
  previewHtml = previewHtml.replace(
    /\{\{total_pages\}\}/g,
    "1",
  );

  // Sign-table placeholder replacements (clear unreplaced signature/approval placeholders)
  // These placeholders exist in the sign-table for originated_by, formatted_by, reviewed_by, issued_by, approved_N
  const signTablePlaceholders = [
    'originated_by', 'formatted_by', 'reviewed_by', 'issued_by',
    'approved_1', 'approved_2', 'approved_3', 'approved_4',
  ];
  const signFieldSuffixes = ['_signature', '_name', '_designation'];
  signTablePlaceholders.forEach(prefix => {
    signFieldSuffixes.forEach(suffix => {
      const regex = new RegExp(`\\{\\{${prefix}${suffix}\\}\\}`, 'g');
      previewHtml = previewHtml.replace(regex, '');
    });
  });

  // Fallback replacements for literal placeholder text BEFORE DOMParser decodes entities
  // Templates may use &lt;...&gt; or literal <...> — handle both forms
  previewHtml = previewHtml.replace(
    /&lt;Name of the Process&gt;/g,
    department?.department_name || "DEPARTMENT NAME",
  );
  previewHtml = previewHtml.replace(
    /&lt;Topic of the SOP&gt;/g,
    documentData.title || "Document Title",
  );
  previewHtml = previewHtml.replace(
    /&lt;Process Name&gt;/g,
    department?.department_name || "DEPARTMENT NAME",
  );
  previewHtml = previewHtml.replace(
    /&amp;lt;Name of the Process&amp;gt;/g,
    department?.department_name || "DEPARTMENT NAME",
  );
  previewHtml = previewHtml.replace(
    /&amp;lt;Topic of the SOP&amp;gt;/g,
    documentData.title || "Document Title",
  );
  previewHtml = previewHtml.replace(
    /&amp;lt;Process Name&amp;gt;/g,
    department?.department_name || "DEPARTMENT NAME",
  );

  // Replace company logo BEFORE normalization so {{company_logo}} works reliably
  if (company?.company_logo_url) {
    previewHtml = previewHtml.replace(
      /\{\{company_logo\}\}/g,
      `<div style="display: flex; align-items: center; justify-content: center; height: 100%; width: 100%;"><img src="${company.company_logo_url}" alt="Company Logo" style="max-height: 80px; max-width: 100%; object-fit: contain;" /></div>`,
    );
  } else {
    previewHtml = previewHtml.replace(
      /\{\{company_logo\}\}/g,
      company?.company_name || "COMPANY NAME",
    );
  }

  // Remove all {{SECTION:...}} markers before normalization
  previewHtml = previewHtml.replace(/\{\{SECTION:[^}]+\}\}/g, "");

  // Normalize template DOM to align section IDs and add data-section-number for fallbacks
  previewHtml = normalizeTemplateSections(previewHtml, sections);

  // Build extended section contents with fallback by section id and number
  const extendedSectionContents: Record<string, string> = {
    ...templateContent,
  };
  sections.forEach((section) => {
    const content =
      templateContent[section.sectionId] ||
      templateContent[`__num__${section.sectionNumber}`];
    if (content && content.trim()) {
      extendedSectionContents[section.sectionId] = content;
      extendedSectionContents[`__num__${section.sectionNumber}`] = content;
    }
  });

  console.log(
    "Extended section contents with fallbacks:",
    extendedSectionContents,
  );

  // Inject user content into template sections
  previewHtml = injectSectionContent(previewHtml, extendedSectionContents);

  // DOM-based fallback: Replace any remaining header placeholder text that survived
  // DOMParser entity decoding (e.g., "<Process Name>" or "<Topic of the SOP>" as literal text)
  previewHtml = replaceHeaderPlaceholdersDOM(previewHtml, {
    processName: department?.department_name || "DEPARTMENT NAME",
    documentTitle: documentData.title || "Document Title",
  });

  // Inject structural IDs (#doc-header, #doc-content, #doc-footer) if not present
  previewHtml = injectStructuralIDs(previewHtml);

  // Fix memo header CSS — directly replace template CSS for professional spacing
  previewHtml = fixMemoHeaderCSS(previewHtml);

  // MEMO HEADER FALLBACK: If the template has memo info fields but no header-table,
  // inject a default company header to ensure memos always have a proper header.
  if (!previewHtml.includes('class="header-table"') && !previewHtml.includes("class='header-table'")) {
    // Check if this is a memo template (has info-table with Subject/To/From or memo placeholders)
    const isMemoTemplate = previewHtml.includes('memo_info') || 
      previewHtml.includes('Subject of the Memorandum') ||
      (documentData.subject && documentData.to !== undefined);
    
    if (isMemoTemplate) {
      const companyLogoHtml = company?.company_logo_url
        ? `<div style="display: flex; align-items: center; justify-content: center; height: 100%; width: 100%;"><img src="${company.company_logo_url}" alt="Company Logo" style="max-height: 60px; max-width: 120px; object-fit: contain;" /></div>`
        : (company?.company_name || "COMPANY NAME");
      
      const memoHeaderHtml = `
        <table class="header-table" data-role="header" style="width: 100%; border-collapse: collapse; border: 1px solid #000;">
          <tr>
            <td style="width: 25%; text-align: center; border: 1px solid #000; padding: 8px; vertical-align: middle;" rowspan="3">${companyLogoHtml}</td>
            <td style="width: 50%; text-align: center; font-size: 18pt; font-weight: bold; letter-spacing: 1px; border: 1px solid #000; padding: 8px; vertical-align: middle;" rowspan="3">MEMORANDUM</td>
            <td style="width: 25%; border: 1px solid #000; padding: 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 55%; border: 1px solid #000; padding: 4px 6px; font-size: 10pt;">Colour code</td>
                  <td style="width: 45%; border: 1px solid #000; padding: 4px 6px; text-align: center;"><div style="height: 16px; background: #0b3bff;"></div></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="width: 25%; border: 1px solid #000; padding: 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 55%; border: 1px solid #000; padding: 4px 6px; font-size: 10pt;">Reference</td>
                  <td style="width: 45%; border: 1px solid #000; padding: 4px 6px; font-size: 10pt; text-align: center;">${documentData.documentNumber || "PREVIEW-001"}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="width: 25%; border: 1px solid #000; padding: 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 55%; border: 1px solid #000; padding: 4px 6px; font-size: 10pt;">Issued Date</td>
                  <td style="width: 45%; border: 1px solid #000; padding: 4px 6px; font-size: 10pt; text-align: center;">${new Date().toISOString().split("T")[0]}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`;
      
      // Insert header at the beginning of the document body
      // Try to insert before border-container content or at the body start
      if (previewHtml.includes('class="border-container"')) {
        previewHtml = previewHtml.replace(
          /(<div[^>]*class="border-container"[^>]*>)/,
          `$1\n${memoHeaderHtml}\n`
        );
      } else if (previewHtml.includes('<body>')) {
        previewHtml = previewHtml.replace(
          '<body>',
          `<body>\n${memoHeaderHtml}\n`
        );
      } else {
        // Prepend to HTML
        previewHtml = memoHeaderHtml + previewHtml;
      }
      
      console.log('Memo header fallback: Injected default header for memo template');
    }
  }

  // Inject signatures into footer if provided
  if (signatures && signatures.length > 0) {
    previewHtml = injectSignaturesIntoFooter(previewHtml, signatures);
  }

  // Normalize content table widths — strip inline pixel widths that cause overflow
  previewHtml = normalizeContentTableWidths(previewHtml);

  // Inject intelligent page-break CSS and table styles
  const pageBreakAndTableStyles = `
  <style>
    /* A4 page setup with intelligent pagination */
    @page {
      size: A4;
      margin: 15mm;
    }
    
    /* Allow page breaks inside sections so long content can span multiple pages */
    .section, .level-0, .level-1, .level-2, .level-3, [data-level] {
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    
    /* Prevent orphaned headings - keep heading with following content */
    h1, h2, h3, h4, h5, h6, .title, .section-title, .title-text, .main-section-title {
      page-break-after: avoid !important;
      break-after: avoid !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    /* Table page-break rules - allow tables to split across pages */
    table:not(.header-table):not(.footer-table):not(.meta-table):not(.info-table):not(.sign-table) {
      border-collapse: collapse !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 10px 0 !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
      table-layout: fixed !important;
      overflow: hidden !important;
    }
    
    table:not(.header-table):not(.footer-table):not(.meta-table):not(.info-table):not(.sign-table) tr {
      page-break-inside: avoid !important; /* Keep rows intact */
      break-inside: avoid !important;
      page-break-after: auto !important;
      break-after: auto !important;
    }
    
    table:not(.header-table):not(.footer-table):not(.meta-table):not(.info-table):not(.sign-table) td,
    table:not(.header-table):not(.footer-table):not(.meta-table):not(.info-table):not(.sign-table) th {
      overflow-wrap: break-word !important;
      word-wrap: break-word !important;
    }
    
    /* Repeat table headers on each page */
    table thead {
      display: table-header-group !important;
    }
    
    table tbody {
      display: table-row-group !important;
    }
    
    /* Content tables - full width with visible borders */
    .doc-content table:not(.header-table):not(.footer-table),
    .section table:not(.header-table):not(.footer-table) {
      width: 100% !important;
      border-collapse: collapse !important;
      border: 1px solid #000 !important;
      margin: 16px 0 !important;
    }
    
    /* Ensure header and footer tables ALWAYS have borders */
    .header-table,
    .header-table td,
    .header-table th,
    table.header-table,
    table.header-table td,
    table.header-table th {
      border: 1px solid #000 !important;
    }
    
    /* Header table — compact, professional layout */
    .header-table {
      width: 100% !important;
      border-collapse: collapse !important;
    }
    
    .header-table img {
      max-height: 50px !important;
      max-width: 100px !important;
      object-fit: contain !important;
    }
    
    /* Only apply compact sizing to meta-table cells, NOT title cells */
    .header-table .meta-table td {
      padding: 1px 3px !important;
      font-size: 10px !important;
      line-height: 1 !important;
      vertical-align: middle !important;
    }
    
    /* Preserve inline font sizes on header title cells */
    .header-table > tbody > tr > td,
    .header-table > tr > td {
      vertical-align: middle !important;
    }
    
    /* Title cells — preserve font-size from inline styles */
    .header-table td[style*="background"] {
      padding: 10px !important;
    }
    
    /* Section headings in document content — bold */
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
    
    /* Document title cell — prominent in header */
    .header-table .doc-title-cell {
      font-size: 14pt !important;
      font-weight: bold !important;
      text-align: center !important;
      vertical-align: middle !important;
      padding: 8px !important;
    }
    
    /* Logo cell — 20% width, centered */
    .header-table .logo-cell {
      width: 20% !important;
      text-align: center !important;
      vertical-align: middle !important;
    }
    
    /* MEMORANDUM title — 45% width (only title-cell, NOT logo-cell with rowspan) */
    .header-table .title-cell {
      width: 45% !important;
      font-size: 14pt !important;
      font-weight: bold !important;
      letter-spacing: 1px !important;
      text-align: center !important;
    }
    
    /* Meta cell — 35% width, holds the nested meta-table */
    .header-table .meta-cell {
      width: 35% !important;
      padding: 0 !important;
      border: none !important;
      vertical-align: top !important;
    }
    
    /* Meta table (Colour code / Reference / Issued Date) — force fill parent */
    .header-table .meta-table {
      width: 100% !important;
      display: table !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
    }
    
    .header-table .meta-table td {
      padding: 3px 8px !important;
      font-size: 10pt !important;
      vertical-align: middle !important;
      border: 1px solid #000 !important;
    }
    
    .header-table .meta-table .label {
      width: 45% !important;
      font-weight: normal !important;
      text-align: left !important;
      white-space: nowrap !important;
    }
    
    .header-table .meta-table .value {
      width: 55% !important;
      text-align: center !important;
    }
    
    .header-table .color-swatch {
      height: 16px !important;
      background: #0b3bff !important;
      display: block !important;
      width: 100% !important;
    }
    
    .footer-table,
    .footer-table td,
    .footer-table th,
    table.footer-table,
    table.footer-table td,
    table.footer-table th {
      border: 1px solid #000 !important;
    }
    
    /* Memo info table (Subject, To, From, CC) */
    .info-table,
    .info-table td,
    .info-table th,
    table.info-table,
    table.info-table td,
    table.info-table th {
      border: 1px solid #000 !important;
    }
    
    .info-table {
      width: 100% !important;
      border-collapse: collapse !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    .info-table .label {
      width: 25% !important;
      font-weight: bold !important;
      background: #f2f2f2 !important;
    }
    
    /* Memo signature/approval table — professional layout */
    .sign-table,
    .sign-table td,
    .sign-table th,
    table.sign-table,
    table.sign-table td,
    table.sign-table th {
      border: 1px solid #000 !important;
    }
    
    .sign-table {
      width: 100% !important;
      border-collapse: collapse !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin-top: 8px !important;
    }
    
    /* Only header rows (th) should be gray */
    .sign-table th {
      background: #f2f2f2 !important;
      font-weight: bold !important;
      font-size: 9pt !important;
      padding: 5px 8px !important;
      text-align: left !important;
    }
    
    /* Data cells — white background */
    .sign-table td {
      font-size: 8pt !important;
      padding: 4px 8px !important;
      text-align: center !important;
      vertical-align: bottom !important;
      background: #ffffff !important;
    }
    
    .sign-table .sig-cell {
      height: 50px !important;
      vertical-align: bottom !important;
      padding-bottom: 6px !important;
      background: #ffffff !important;
    }
    
    .sign-table .sig-line {
      border-top: 1px dotted #000 !important;
      width: 80% !important;
      margin: 0 auto 3px auto !important;
    }
    
    .sign-table .sig-name {
      font-size: 8pt !important;
    }
    
    .sign-table .sig-designation {
      font-size: 7pt !important;
      color: #555 !important;
    }
    
    /* Approved cells — white, NOT gray */
    .sign-table .approved-cell {
      height: 45px !important;
      background: #ffffff !important;
      vertical-align: bottom !important;
      padding-bottom: 6px !important;
    }
    
    /* Memo main-section styling */
    .main-section {
      margin-bottom: 15px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    .main-section h3 {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    
    .main-section .number {
      display: inline-block !important;
      width: 45px !important;
    }
    
    .main-section .content {
      margin-left: 45px !important;
    }
    
    .main-section .placeholder-text {
      color: #666 !important;
      font-style: italic !important;
    }
    
    /* Tables with border attribute should keep borders */
    table[border="1"],
    table[border="1"] td,
    table[border="1"] th {
      border: 1px solid #000 !important;
    }
    
    /* Standard cell padding and alignment for content tables only */
    .doc-content table:not(.header-table):not(.footer-table) td,
    .doc-content table:not(.header-table):not(.footer-table) th {
      padding: 8px !important;
      text-align: left !important;
      vertical-align: top !important;
    }
    
    /* Optional header background for content tables */
    .doc-content table:not(.header-table):not(.footer-table) th {
      background-color: #f0f0f0 !important;
      font-weight: bold !important;
    }
    
    /* Image page-break rules */
    img {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      max-width: 100% !important;
    }
    
    /* Header and footer table rules */
    .header-table, .footer-table {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    .header-table {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    
    /* Header table sizing - dynamic from backend settings */
    .header-table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
    }
    
    .header-table td,
    .header-table th {
      padding: ${headerSettings?.cellPadding || 8}px ${(headerSettings?.cellPadding || 8) + 2}px !important;
      font-size: ${headerSettings?.fontSize || 14}px !important;
      line-height: ${headerSettings?.lineHeight || 1.3} !important;
    }
    
    .header-table h1,
    .header-table h2,
    .header-table h3,
    .header-table .title {
      font-size: ${headerSettings?.titleFontSize || 18}px !important;
      margin: 0 !important;
      line-height: ${headerSettings?.lineHeight || 1.3} !important;
    }
    
    .header-table img {
      max-height: ${headerSettings?.logoMaxHeight || 100}px !important;
      max-width: 100% !important;
      display: block !important;
      margin: auto !important;
      object-fit: contain !important;
    }
    
    .header-table td[rowspan] {
      vertical-align: middle !important;
      text-align: center !important;
    }
    
    /* Nested tables in header (metadata block on right side) */
    .header-table table {
      width: 100% !important;
      border-collapse: collapse !important;
    }
    
    .header-table table td,
    .header-table table th {
      padding: ${Math.max((headerSettings?.cellPadding || 8) - 2, 4)}px ${Math.max((headerSettings?.cellPadding || 8) - 1, 6)}px !important;
      font-size: ${Math.max((headerSettings?.fontSize || 14) - 2, 12)}px !important;
      white-space: nowrap !important;
    }
    
    /* Black bar title in header */
    .header-table [style*="background"],
    .header-table td[style*="background:#000"],
    .header-table td[style*="background: #000"],
    .header-table td[style*="background:black"],
    .header-table td[style*="background: black"] {
      padding: ${headerSettings?.cellPadding || 10}px ${(headerSettings?.cellPadding || 10) + 2}px !important;
      font-size: ${headerSettings?.titleFontSize || 18}px !important;
      letter-spacing: 1px !important;
    }
    
    /* Footer table sizing - readable defaults */
    .footer-table td,
    .footer-table th {
      padding: 6px 8px !important;
      font-size: 10px !important;
      line-height: 1.2 !important;
    }
    
    /* Paragraph orphan/widow control */
    p {
      orphans: 3;
      widows: 3;
    }
    
    /* List page-break rules */
    ul, ol {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    li {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    /* Print-specific rules */
    @media print {
      .section, .level-0, .level-1, .level-2, .level-3, [data-level] {
        page-break-inside: avoid;
        break-inside: avoid;
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
`;

  // Inject document preview settings CSS if provided
  const customSettingsCSS = documentPreviewCSS
    ? `<style id="document-preview-settings">${documentPreviewCSS}</style>`
    : "";

  // Add base hierarchical CSS (includes Roman numeral styling)
  const baseHierarchicalCSS = `<style id="base-hierarchical-styles">${HIERARCHICAL_CSS}</style>`;

  // Inject hierarchical indentation CSS if provided (from backend settings)
  const hierarchicalCSS = hierarchicalIndentationCSS
    ? `<style id="hierarchical-indentation-settings">${hierarchicalIndentationCSS}</style>`
    : "";

  // Inject before </head> tag - base CSS first, then custom settings, then dynamic hierarchical CSS LAST for highest priority
  previewHtml = previewHtml.replace(
    "</head>",
    `${pageBreakAndTableStyles}${baseHierarchicalCSS}${customSettingsCSS}${hierarchicalCSS}<style id="cell-layout-styles">${generateCellLayoutCSS()}</style></head>`,
  );

  // CRITICAL: Transform content to add proper level classes before returning
  // This ensures CSS selectors (.level-0, .level-1, .content) can match the HTML structure
  previewHtml = transformDocumentHTML(previewHtml);

  return previewHtml;
}

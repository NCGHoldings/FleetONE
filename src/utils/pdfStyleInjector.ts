/**
 * Shared CSS injection utility for consistent PDF and Preview styling
 * This ensures both PaginatedPreview and PDF generation use identical styles
 */

/**
 * Inject CSS for accurate border rendering in html2canvas and preview
 * Also includes aggressive overrides for inline styles in header/footer tables
 * Accepts optional documentPreviewCSS which should include hierarchical indentation CSS
 */
export function injectCanvasRenderingCSS(htmlTemplate: string, documentPreviewCSS?: string): string {
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
    </style>
  `;
  
  // Document preview settings CSS (includes hierarchical indentation CSS)
  const settingsCSS = documentPreviewCSS ? `
    <style id="document-preview-settings-pdf">
      ${documentPreviewCSS}
    </style>
  ` : '';
  
  // Memo-specific meta-table overrides — HIGHEST priority, injected LAST
  // These override the generic .header-table table td rules that cramp the meta-table
  const memoMetaTableCSS = `
    <style id="memo-meta-table-override">
      /* Memo header column proportions */
      .header-table .logo-cell { width: 20% !important; }
      .header-table .title-cell {
        width: 45% !important;
        font-size: 14pt !important;
        font-weight: bold !important;
        letter-spacing: 1px !important;
        text-align: center !important;
        vertical-align: middle !important;
        padding: 8px !important;
      }
      .header-table .meta-cell,
      .header-table td.meta-cell,
      .header-table td.meta-cell[style] {
        width: 35% !important;
        padding: 0 !important;
        border: none !important;
        vertical-align: top !important;
      }
      
      /* Meta-table inner layout — override nested table cramping */
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
      }
      
      .header-table .meta-table .label {
        width: 45% !important;
        text-align: left !important;
        white-space: nowrap !important;
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

      /* Sign-table: data rows white, not gray */
      .sign-table .approved-cell { background: #ffffff !important; }
      .sign-table .sig-cell { background: #ffffff !important; }
    </style>
  `;
  
  // Inject the CSS before the closing </head> tag or at the beginning of <body>
  // Memo meta-table CSS is injected LAST for highest priority
  if (htmlTemplate.includes('</head>')) {
    return htmlTemplate.replace('</head>', `${enhancedCSS}${settingsCSS}${memoMetaTableCSS}</head>`);
  } else if (htmlTemplate.includes('<body>')) {
    return htmlTemplate.replace('<body>', `<body>${enhancedCSS}${settingsCSS}${memoMetaTableCSS}`);
  } else {
    // If no head or body tag, prepend to the content
    return enhancedCSS + settingsCSS + memoMetaTableCSS + htmlTemplate;
  }
}

/**
 * Inject minimal CSS for preview rendering (no structure changes)
 */
export function injectPreviewRenderingCSS(htmlTemplate: string): string {
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
      #doc-wrapper .border-container > table:not(.header-table):not(.footer-table),
      #doc-wrapper .border-container > div:not(.doc-header):not(.doc-content):not(.doc-footer) {
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
      }

      #doc-wrapper .border-container > table:not(.header-table):not(.footer-table) td,
      #doc-wrapper .border-container > table:not(.header-table):not(.footer-table) th {
        border: none !important;
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

/**
 * Generate the comprehensive PDF-matching CSS for preview components
 * This CSS should be applied within <style> tags in preview components
 */
export function generatePDFMatchingCSS(settings?: {
  header?: {
    lineHeight?: number;
    cellPadding?: number;
    fontSize?: number;
    titleFontSize?: number;
  };
}): string {
  const headerLineHeight = settings?.header?.lineHeight || 1.2;
  const headerCellPadding = settings?.header?.cellPadding || 6;
  const headerFontSize = settings?.header?.fontSize || 10;
  const headerTitleFontSize = settings?.header?.titleFontSize || 14;

  return `
    /* ========== PDF-MATCHING STYLES ========== */
    
    /* Force accurate rendering */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-sizing: border-box !important;
    }
    
    /* Avoid weird gaps in tables */
    table {
      border-spacing: 0 !important;
    }
    
    /* ========== HEADER TABLE STYLES ========== */
    .doc-header table,
    .header-table,
    #doc-header table {
      border-collapse: collapse !important;
      border-spacing: 0 !important;
      width: 100% !important;
    }
    
    /* Header table cells - dynamic from backend settings */
    .doc-header table td,
    .doc-header table th,
    .header-table td,
    .header-table th,
    #doc-header table td,
    #doc-header table th {
      vertical-align: middle !important;
      line-height: ${headerLineHeight} !important;
      padding: ${headerCellPadding}px ${headerCellPadding + 2}px !important;
      font-size: ${headerFontSize}px !important;
      border: 1px solid #000 !important;
    }
    
    /* Nested tables in header (metadata block) */
    .header-table table td,
    .header-table table th,
    .doc-header table table td,
    .doc-header table table th {
      padding: ${Math.max(headerCellPadding - 2, 2)}px ${Math.max(headerCellPadding - 2, 4)}px !important;
      font-size: ${Math.max(headerFontSize - 1, 8)}px !important;
      line-height: ${headerLineHeight} !important;
    }
    
    /* Memo meta-table overrides — proper spacing for Colour code/Reference/Issued Date */
    .header-table .meta-cell,
    .header-table td.meta-cell,
    .header-table td.meta-cell[style] { width: 35% !important; padding: 0 !important; border: none !important; vertical-align: top !important; }
    .header-table .logo-cell { width: 20% !important; }
    .header-table .title-cell {
      width: 45% !important; font-size: 14pt !important; font-weight: bold !important;
      letter-spacing: 1px !important; text-align: center !important; padding: 8px !important;
    }
    .header-table .meta-table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
    .header-table .meta-table td,
    .header-table .meta-table th,
    .header-table .meta-table td[style],
    .header-table table.meta-table td[style] {
      padding: 3px 8px !important; font-size: 10pt !important; line-height: 1.2 !important;
      vertical-align: middle !important; border: 1px solid #000 !important;
    }
    .header-table .meta-table .label { width: 45% !important; text-align: left !important; white-space: nowrap !important; }
    .header-table .meta-table .value { width: 55% !important; text-align: center !important; }
    .header-table .color-swatch { height: 18px !important; background: #0b3bff !important; display: block !important; width: 100% !important; }
    .sign-table .approved-cell { background: #ffffff !important; }
    .sign-table .sig-cell { background: #ffffff !important; }
    
    /* Header title cells (black bar) */
    .header-table [style*="background: #000"],
    .header-table [style*="background:#000"],
    .header-table [style*="background-color:#000"],
    .header-table [style*="background-color: #000"],
    .doc-header [style*="background: #000"],
    .doc-header [style*="background:#000"] {
      padding: ${headerCellPadding}px ${headerCellPadding + 2}px !important;
      font-size: ${Math.min(headerTitleFontSize - 2, 12)}px !important;
      text-align: center !important;
    }
    
    /* ========== FOOTER TABLE STYLES ========== */
    .doc-footer table,
    .footer-table,
    #doc-footer table {
      border-collapse: collapse !important;
      border-spacing: 0 !important;
      width: 100% !important;
    }
    
    .doc-footer table td,
    .doc-footer table th,
    .footer-table td,
    .footer-table th,
    #doc-footer table td,
    #doc-footer table th {
      border: 1px solid #000 !important;
      vertical-align: middle !important;
    }
    
    /* ========== CONTENT TABLE STYLES ========== */
    .doc-content table:not(.header-table):not(.footer-table) {
      width: 100% !important;
      border-collapse: collapse !important;
      border: 1px solid #000 !important;
      margin: 16px 0 !important;
    }

    .doc-content table:not(.header-table):not(.footer-table) td,
    .doc-content table:not(.header-table):not(.footer-table) th {
      border: 1px solid #000 !important;
      padding: 8px 12px !important;
      text-align: left !important;
      vertical-align: top !important;
    }

    .doc-content table:not(.header-table):not(.footer-table) th {
      background-color: #f0f0f0 !important;
      font-weight: bold !important;
    }
    
    /* ========== ROMAN NUMERAL & LETTER LIST STYLES ========== */
    /* NOTE: Removed hardcoded values - these are now controlled by generateIndentationCSS() */
    /* which uses backend settings for roman numeral and letter list alignment */
  `;
}

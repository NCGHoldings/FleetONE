import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      'div', 'span', 'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'tfoot',
      'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u',
      'img', 'a', 'style', 'header', 'footer', 'section', 'article',
      'nav', 'main', 'aside', 'figure', 'figcaption', 'blockquote',
      'pre', 'code', 'small', 'sub', 'sup', 'mark', 'del', 'ins',
      'dl', 'dt', 'dd', 'address', 'time', 'abbr', 'cite', 'dfn',
      'kbd', 'samp', 'var', 'q', 's', 'wbr'
    ],
    ALLOWED_ATTR: [
      'class', 'id', 'style', 'src', 'alt', 'href', 'target', 'rel',
      'width', 'height', 'colspan', 'rowspan', 'border', 'cellpadding',
      'cellspacing', 'align', 'valign', 'title', 'name', 'content',
      'datetime', 'cite', 'lang', 'dir', 'data-*'
    ],
    ALLOW_DATA_ATTR: true,
  });
}

/**
 * Create a sanitized HTML props object for dangerouslySetInnerHTML
 * @param html - The HTML string to sanitize
 * @returns Object for use with dangerouslySetInnerHTML
 */
export function createSanitizedHTML(html: string): { __html: string } {
  return { __html: sanitizeHTML(html) };
}



# Fix Content Overflow and Blank Pages in Special Hire Quotation PDF

## Problem
Two issues visible in the screenshot:

1. **Content overflowing the right edge** — The cancellation policy text is cut off on the right side. Root cause: every single space in body text paragraphs was replaced with `\u00A0` (non-breaking space). Combined with `whiteSpace: "pre-wrap"`, this creates unbreakable lines that cannot wrap, causing horizontal overflow.

2. **Blank pages in PDF** — The Page 2 div has `minHeight: "297mm"`, so even though the T&C content is shorter than a full A4 page, `html2canvas` captures the full 297mm height. The smart-break algorithm then sees this large canvas and may produce an extra blank page from the whitespace at the bottom.

## Solution

### File: `src/components/special-hire/QuotationPreview.tsx`

**1. Remove `\u00A0` from all body text paragraphs (T&C, Extra Charges, etc.)**
- Keep `\u00A0` only for short labels (e.g., "Bus\u00A0Type:", "Account\u00A0No.:")
- Revert paragraph text back to regular spaces — the `whiteSpace: "pre-wrap"` style already preserves normal spaces during `html2canvas` capture
- This allows long sentences to wrap naturally at the container boundary

**2. Add `overflowWrap: "break-word"` to both page containers**
- As a safety net, add `overflowWrap: "break-word"` alongside `whiteSpace: "pre-wrap"` on both `data-pdf-page` divs to force word-breaking if any line still exceeds the container width

**3. Change Page 2 `minHeight` to `height: "auto"`**
- Remove `minHeight: "297mm"` from the Page 2 div so `html2canvas` only captures the actual content height, eliminating the blank space that produces empty PDF pages

### File: `src/lib/pdf-multi-page.ts`

**4. Skip near-empty canvases in `addCanvasToPDF`**
- Add a guard: if a canvas slice's content height in mm is less than ~10mm (just whitespace), skip adding it as a page. This prevents blank pages from residual whitespace in any captured canvas.

## Technical Detail
```text
Current issue:
  "If\u00A0cancelled\u00A014\u00A0days\u00A0or\u00A0more..." 
  → entire sentence is ONE unbreakable unit → overflows container

Fix:
  "If cancelled 14 days or more..."  (regular spaces)
  + whiteSpace: "pre-wrap"           (preserves spaces in html2canvas)
  + overflowWrap: "break-word"       (safety net for long words)
  → text wraps normally within the A4 width

Blank page fix:
  Page 2: minHeight: "297mm" → removed (height: auto)
  → html2canvas captures only actual content
  → no extra whitespace → no blank PDF pages
```


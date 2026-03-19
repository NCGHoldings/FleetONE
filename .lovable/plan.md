

# Fix Text Spacing Issue in Special Hire Quotation PDF

## Problem
When `html2canvas` captures the quotation, it collapses whitespace and merges adjacent words (e.g., "BUSINESS REG NO" becomes "BUSINESSREGNO"). This is a known issue documented in the project's rendering standards.

## Solution
Apply the established fix used across other document templates (Yutong, Light Vehicle):

### File: `src/components/special-hire/QuotationPreview.tsx`

1. **Add `whiteSpace: "pre-wrap"` to the root container** — Apply this style to both page divs (data-pdf-page="1" and data-pdf-page="2") so all child text elements preserve whitespace during html2canvas capture.

2. **Use non-breaking spaces (`\u00A0`) in critical labels** — Replace regular spaces with `\u00A0` in labels like "Quotation No", "Bus Type", "Seating Capacity", "Pick Up", "Drop Off", bank details, and Terms & Conditions text to prevent word merging.

3. **Add `letterRendering: true`** to the html2canvas options — already present in `pdf-multi-page.ts`, so no change needed there.

This is the same pattern used successfully in the Yutong and Light Vehicle quotation templates to prevent html2canvas from collapsing whitespace.


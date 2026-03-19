

# Fix Blank Page Between Quote and Terms & Conditions

## Problem
Page 1's container (`data-pdf-page="1"`) still has `minHeight: "297mm"` (line 210). When the quote content doesn't fill the full A4 height, `html2canvas` captures the empty whitespace. The smart-break algorithm then slices this into two pages — one with content and one blank — before Page 2 (T&C) starts.

## Solution

### File: `src/components/special-hire/QuotationPreview.tsx`

**Remove `minHeight: "297mm"` from the Page 1 container (line 210).**

This is the same fix already applied to Page 2. Without `minHeight`, `html2canvas` captures only the actual content height, eliminating the blank space that produces an empty PDF page.

The 10mm skip guard in `pdf-multi-page.ts` is already in place as a safety net, but it can't help when `minHeight` forces the canvas to be exactly 297mm — that's too large to skip.


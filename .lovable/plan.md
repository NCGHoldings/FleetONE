

# Fix Yutong Quotation PDF Text Spacing Issues

## Problem
When the quotation is rendered to PDF via `html2canvas`, spaces inside label text get collapsed, causing words to merge together:
- "BUSINESS REG NO" → "BUSINESSREG NO"
- "SEATING CAPACITY" → "SEATINGCAPACITY"  
- "WEICHAI WP10H 400HP 9.5L" → "WEICHAIWP10H400HP9.5L"

This is a known `html2canvas` rendering quirk — it sometimes drops regular spaces between words inside inline elements.

## Fix — `src/components/yutong/YutongQuotationPreview.tsx`

### 1. Add `white-space: pre-wrap` to all text elements
Add `whiteSpace: "pre-wrap"` to the inline style of every `<p>` in the customer info section and every text line in the product table cell. This forces html2canvas to preserve whitespace exactly as written.

Affected areas:
- **Customer info labels** (lines ~391-437): All `<p>` tags — add `whiteSpace: "pre-wrap"` to their style objects
- **Product cell** (lines ~500-515): The `<td>` containing BUS MODEL, SEATING CAPACITY, ENGINE, YEAR, CONDITION — add `whiteSpace: "pre-wrap"` to its style

### 2. Use non-breaking spaces (`\u00A0`) in critical labels
As a belt-and-suspenders approach, replace regular spaces in multi-word labels with `{'\u00A0'}`:
- `BUSINESS REG NO` → `BUSINESS{'\u00A0'}REG{'\u00A0'}NO`
- `SEATING CAPACITY` → `SEATING{'\u00A0'}CAPACITY`
- `TAX REG NO` → `TAX{'\u00A0'}REG{'\u00A0'}NO`
- `FINANCE COMPANY` → `FINANCE{'\u00A0'}COMPANY`
- `BUS MODEL` → `BUS{'\u00A0'}MODEL`
- `SPECIAL FEATURES` → `SPECIAL{'\u00A0'}FEATURES`

### 3. Add spacing after colon in labels
Ensure each label colon is followed by `\u00A0` so the value doesn't stick to the colon:
- `<b>CUSTOMER :</b>{'\u00A0'}{value}` pattern for all fields

### Files to Edit
- `src/components/yutong/YutongQuotationPreview.tsx` — apply `whiteSpace: "pre-wrap"` and non-breaking spaces to all label text


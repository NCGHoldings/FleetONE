
# Fix: Professional Customer Details Layout in Yutong Invoice

## Problem

The customer information section (CUSTOMER, COMPANY, ADDRESS, CONTACT, DATE, etc.) looks unprofessional because:

1. **Labels and values are spread apart** — `justify-content: space-between` pushes labels to the left edge and values to the right edge, creating a wide gap that looks messy
2. **ADDRESS wraps badly** — the long address text breaks to a new line and doesn't align with other values
3. **No consistent column alignment** — each row's value starts at a different position depending on the label width

## Solution

### File: `src/lib/yutong-order-invoice-generator.ts`

**Restructure the meta rows to use a proper two-column layout with fixed label widths:**

**CSS Changes (lines 274-282):**

Replace the current `.meta-left .row` and `.meta-right .row` styles:

```css
.meta-left .row, .meta-right .row {
  margin: 4px 0;
  display: flex;
  align-items: baseline;
}

.meta-left .label, .meta-right .label {
  font-weight: 700;
  min-width: 140px;
  flex-shrink: 0;
}

.meta-right .label {
  min-width: 160px;
}
```

Key changes:
- Remove `justify-content: space-between` so labels and values sit next to each other
- Add `min-width: 140px` on left labels and `min-width: 160px` on right labels to create consistent column alignment
- Add `flex-shrink: 0` so labels never compress
- Use `align-items: baseline` so multi-line addresses align properly with their labels
- Reduce margin from `6px` to `4px` for tighter, cleaner spacing

This ensures:
- CUSTOMER, COMPANY, ADDRESS, CONTACT, DATE labels all have the same width
- Values start at the same horizontal position
- Long addresses wrap neatly under themselves, not under the label
- Right column (PROFORMA NO, QUOTATION NO, PURPOSE) also aligns consistently

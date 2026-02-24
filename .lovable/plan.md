

# Fix: Invoice Download - Missing Cell Values and Vertical Centering

## Problems

Looking at the downloaded PDF vs the in-app preview:

1. **QTY, UNIT PRICE, and TOTAL cells appear empty** in the downloaded PDF — the `rowspan="8"` merged cells with `vertical-align: middle` are not rendering correctly when `html2canvas` captures the page. The values exist but `html2canvas` has known issues with vertically centering content in rowspan cells.

2. **Content is not vertically centered** in the merged cells — even when values do show, they stick to the top rather than being centered between the 8 product rows.

## Root Cause

`html2canvas` does not reliably support `vertical-align: middle` on `rowspan` cells. The CSS property is ignored during rasterization, causing content to either disappear or render at the top of the cell.

## Solution

### File: `src/lib/yutong-order-invoice-generator.ts`

**Replace rowspan approach with a nested layout using flexbox:**

Instead of using `rowspan="8"` on the QTY, UNIT PRICE, and TOTAL cells (which breaks in html2canvas), restructure the table so that:

1. Only the first product row (`MAKE`) contains the QTY/PRICE/TOTAL cells
2. These cells use `rowspan="8"` but with an inner wrapper div that uses `display: flex; align-items: center; justify-content: center; height: 100%` to force centering
3. Add explicit `height` to the merged cells so html2canvas can compute the layout

**CSS Changes (around line 198):**
- Update `.merged-cell` to include:
  - `position: relative`
  - Add a child `.merged-cell-content` wrapper with `display: flex; align-items: center; justify-content: center; height: 100%; position: absolute; top: 0; left: 0; right: 0; bottom: 0`

**HTML Changes (lines 703-705):**
- Wrap the content of each merged cell in a `<div class="merged-cell-content">` div
- Example: `<td rowspan="8" class="qty merged-cell"><div class="merged-cell-content">1.00</div></td>`

**Specific edits:**

1. **CSS addition** (after line 201): Add `.merged-cell-content` style:
   ```
   .merged-cell {
     vertical-align: middle !important;
     text-align: center;
     position: relative;
   }
   .merged-cell-content {
     display: flex;
     align-items: center;
     justify-content: center;
     height: 100%;
     width: 100%;
     position: absolute;
     top: 0;
     left: 0;
     right: 0;
     bottom: 0;
     padding: 8px;
     box-sizing: border-box;
     font-weight: 700;
   }
   ```

2. **HTML wrapping** (lines 703-705): Wrap each merged cell value in a content div:
   - `<td rowspan="8" class="qty merged-cell"><div class="merged-cell-content">${data.quantity}.00</div></td>`
   - Same for UNIT PRICE and TOTAL cells

This ensures `html2canvas` can correctly render and center the values in the downloaded PDF, matching the in-app preview.


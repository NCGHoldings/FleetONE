

# Match Tax Invoice to Government EOG Format

## What's changing
Update the Sri Lanka Tax Invoice HTML generator (`src/lib/sri-lanka-tax-invoice-generator.ts`) to exactly match the government EOG 02/04/05 format shown in the screenshot. This affects all modules (Yutong, Sinotruck, Light Vehicle) since they all call `generateSriLankaTaxInvoiceHTML`.

## Current vs Target differences
1. **Title**: Current uses underlined text; target has "Tax Invoice" in a double-bordered box centered at top
2. **Labels**: Target shows underlined field labels (e.g., "Supplier's TIN:", "Date of Invoice:") — current uses bold only
3. **Supplier/Purchaser block**: Target uses "Supplier's Name:" and "Purchaser's Name:" labels with underlines; current uses just "Name:"
4. **Layout borders**: Target has clear black borders around every section/cell — matches a traditional printed government form
5. **Overall aesthetic**: Clean, minimal government form look — no background colors on totals rows, no gray fills

## File to edit
**`src/lib/sri-lanka-tax-invoice-generator.ts`** — Update the HTML/CSS in `generateSriLankaTaxInvoiceHTML()`:
- Restyle `.ti-title` to render inside a centered double-bordered box
- Update label text to match screenshot exactly: "Supplier's TIN:", "Supplier's Name:", "Purchaser's TIN:", "Purchaser's Name:"
- Add underline styling to all field labels
- Remove gray background from totals row; keep all rows with consistent black borders
- Ensure the items table header uses bold text on white/light background matching the screenshot
- Keep all data bindings and placeholder logic identical — only HTML/CSS changes

## What stays the same
- `SriLankaTaxInvoiceData` interface — no changes
- `tax-invoice-template-resolver.ts` — no changes
- All module generators (Yutong, Sinotruck, Light Vehicle) — they call the same function, so they automatically get the updated format
- DB template system — the fallback generator is what we're updating




# Add VAT Toggle to Yutong Quotation Preview

## What to build
A toggle switch above the quotation preview that shows/hides VAT in the pricing table. When enabled, the table displays: SubTotal → Discount → VAT (18%) → Total (with VAT). When disabled, it shows the current layout without VAT. Both preview and PDF download respect the toggle state.

## Implementation

### File: `src/components/yutong/YutongQuotationViewModal.tsx`
- Add `showVAT` state (`useState(false)`)
- Render a toggle switch (using existing `Switch` component) above the preview tab content, labeled "Include VAT"
- Pass `showVAT` prop to `YutongQuotationPreview`

### File: `src/components/yutong/YutongQuotationPreview.tsx`
- Add `showVAT?: boolean` to the props interface
- Calculate VAT amount: `const vatRate = 0.18; const vatAmount = showVAT ? grandTotal * vatRate : 0; const totalWithVAT = grandTotal + vatAmount;`
- After the current Grand Total row, conditionally render (when `showVAT` is true):

```text
Current layout (showVAT off):
  Bus Subtotal    103,500,000
  GRAND TOTAL     103,500,000

New layout (showVAT on):
  SubTotal        103,500,000
  Discount        -
  VAT (18%)        18,630,000
  Total           122,130,000
```

- When `showVAT` is true: replace the single "GRAND TOTAL" row with 3 summary rows (SubTotal, VAT, Total) styled like the reference screenshot
- When `showVAT` is false: keep existing layout unchanged

### No other files need changes
The PDF download already captures `printRef.current` via `html2canvas`, so whatever is visible in the preview (with or without VAT) will be in the downloaded PDF.


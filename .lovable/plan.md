

# Fix: VAT Calculation — Price Already Includes VAT

## Problem
The current VAT toggle adds 18% **on top** of the grand total, inflating it. But prices are already **VAT-inclusive**. The correct approach:

- **Base (excl. VAT)** = `grandTotal / 1.18`
- **VAT amount** = `grandTotal - base` (i.e. `grandTotal * 0.18 / 1.18`)
- **Total stays the same** = `grandTotal` (unchanged)

## File: `src/components/yutong/YutongQuotationPreview.tsx`

Change 3 values in the VAT section (lines 702-784):

| Row | Current | Corrected |
|-----|---------|-----------|
| SubTotal | `grandTotal` | `Math.round(grandTotal / 1.18)` |
| VAT (18%) | `Math.round(grandTotal * 0.18)` | `Math.round(grandTotal - grandTotal / 1.18)` |
| TOTAL (Including VAT) | `Math.round(grandTotal * 1.18)` | `grandTotal` (no change to the actual total) |

Example with 52,500,000:
- SubTotal: 44,491,525
- VAT (18%): 8,008,475
- Total: 52,500,000 ← same as original

No other files need changes.




# Fix: AR Invoice Line Item Column Layout

## Issues (from screenshots)

1. **Description field** uses auto-expanding `Textarea` — when long text is entered, the row stretches vertically and the field takes too much space
2. **Qty field** (70px) is too narrow to see the value clearly
3. **Unit Price field** (110px) — value entered but hard to see; needs better width and formatting

## Changes

### File: `src/components/accounting/ARInvoiceForm.tsx`

1. **Description column**: Replace `Textarea` with a regular `Input` field. Invoice line descriptions should be single-line (e.g., "Yutong Bus ZK6122H"). If longer notes are needed, there's already a Notes field at the bottom. Remove the auto-expand `onInput` handler.

2. **Adjust column widths** for better balance:
   - Item Category: 150px (was 170)
   - Description: flex/auto (was minWidth 180) — takes remaining space
   - Qty: 80px (was 70)
   - Unit Price: 120px (was 110)
   - Tax Code: 110px (unchanged)
   - Revenue Account: 180px (was 160)
   - Line Total: 120px (was 110)

3. **Unit Price**: Use `CurrencyInput` component instead of plain `Input type="number"` for thousand-separator formatting, consistent with the rest of the system.

### Result
- Description stays single-line, clean row height
- Qty and Unit Price are clearly visible with proper width
- Unit Price shows formatted numbers (e.g., "2,000" instead of "2000")


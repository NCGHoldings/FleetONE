

# Revert Description Field to Textarea + Keep Layout Fixes

## Problem

The Description field was changed from `Textarea` to `Input`, but the user preferred the previous Textarea approach and considers the Input change a regression. The Textarea allowed multi-line descriptions which is needed for invoice line items.

## Changes

### File: `src/components/accounting/ARInvoiceForm.tsx`

1. **Revert Description field** from `Input` back to `Textarea` with auto-expanding behavior:
   - Replace `<Input>` at lines 429-434 with `<Textarea>` that has `rows={1}`, auto-expands on input, and uses `min-h-9` styling
   - Add back the `onInput` handler for auto-height adjustment

2. **Keep all other improvements** — column widths (80px Qty, 120px Unit Price, 180px Revenue Account, 120px Line Total), CurrencyInput for Unit Price — these are all correct and stay as-is.

### Result
- Description field works like before — starts compact, expands when text is long
- All other column widths and formatting remain improved
- No other files affected


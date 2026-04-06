

# Fix Cheque Print Layout to Match Sri Lankan Cheque Format

## Current Issues (from screenshot)
1. **Amount-in-words wrong order**: Shows "ONE THOUSAND FOUR HUNDRED AND FIFTY SIX AND CENTS TWELVE RUPEES ONLY" — "RUPEES" should come BEFORE the number, not after cents
2. **No "Pay" label**: Sri Lankan cheques have "Pay" printed on the left before the payee name line
3. **No "Rupees" label**: The amount-in-words area should have "Rupees" on the left margin
4. **Date position**: Needs fine-tuning — Sri Lankan cheques have date boxes at top-right with separators (DD/MM/YYYY)
5. **Amount box position**: The Rs. amount box should align with the second words line, right-aligned
6. **No signature line**: Missing the signature area at bottom-right
7. **Missing "Bearer/Order" text**: Sri Lankan cheques typically have "or bearer" at the end of payee line

## Sri Lankan Standard Cheque Layout Reference
Based on research (Central Bank standards, cheque printing software references):
- **Size**: 175mm × 75mm (current is correct)
- **Date**: Top-right, ~8mm from top, DD/MM/YYYY in individual boxes with "/" separators
- **"Pay" line**: ~18-20mm from top, "Pay" label at left margin (~5mm), payee text starts ~18mm from left
- **Amount words Line 1**: ~30mm from top, starts at ~5mm left
- **Amount words Line 2**: ~38mm from top, starts at ~5mm left  
- **"Rupees" label**: Printed at left margin of amount words area
- **Amount figures box**: Right side (~138mm from left), vertically centered between words lines
- **Signature line**: Bottom-right area (~55mm from top, right-aligned)
- **MICR band**: Bottom 12mm (clear zone, no printing)

## Changes

### File: `src/components/accounting/ChequePrintPreview.tsx`

1. **Fix `numberToWords` function**: Change word order to "RUPEES [number] AND CENTS [cents] ONLY"
   ```
   // Before: result += " AND CENTS " + convert(decPart) + " RUPEES ONLY"
   // After:  "RUPEES " + convert(intPart) + " AND CENTS " + convert(decPart) + " ONLY"
   // No cents: "RUPEES " + convert(intPart) + " ONLY"
   ```

2. **Add "Pay" label**: Position at left margin (~5mm from left, 18mm from top), shift payee text to start at ~18mm

3. **Add "Rupees" label**: At left margin of amount words area (~5mm, 30mm top), shift words text to start at ~22mm

4. **Adjust date position**: Keep at top-right but add "/" separators between DD, MM, YYYY groups for visual clarity

5. **Adjust amount figures box**: Move to align vertically with words lines (~32mm from top, right edge at ~172mm)

6. **Add signature line**: Horizontal line at bottom-right (~55mm from top, 100-165mm from left) with small "Signature" label

7. **Add "or Bearer" text**: After payee name line, small text at the right end

8. **Fix splitAmountWords**: Account for the "RUPEES" prefix now being part of the words string — adjust split threshold

## Result
- Cheque layout matches real Sri Lankan bank cheque leaf positions
- Amount-in-words reads correctly: "RUPEES ONE THOUSAND FOUR HUNDRED AND FIFTY SIX AND CENTS TWELVE ONLY"
- All standard fields (Pay, Rupees, Date, Amount, Signature) are properly positioned
- Calibration offsets still work for fine-tuning per printer


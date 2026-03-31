

# Fix: Payment Image Preview + Cash Receipt Checkmark/Cross Icons

## Two Issues

### Issue 1: Payment proof image not previewed when adding payment
When a user selects a payment proof image file, only the filename is shown as a badge. No image thumbnail preview is displayed.

**Fix**: After selecting a file, create an object URL preview and show a small thumbnail image below the file input. This gives visual confirmation that the correct image was selected.

**Files**: `YutongPaymentTracking.tsx`, `SinotrukPaymentTracking.tsx`, `SinotruckPaymentTracking.tsx`, `LightVehiclePaymentTracking.tsx`

Changes per file:
- Add a `useState` for `paymentProofPreview` (string URL)
- On file select: create `URL.createObjectURL(file)` and set preview state
- On modal close: revoke the object URL
- Render a thumbnail `<img>` below the file input when preview exists

### Issue 2: Cash receipt shows "CASH: TRUE/FALSE" text instead of visual icons
The MODE OF PAYMENT section displays raw text like `CASH: TRUE` / `CASH: FALSE`. Should use ✓ and ✗ symbols instead.

**Fix**: In all 3 cash receipt preview files, change the display from:
```
CASH: TRUE  →  CASH: ✓
CASH: FALSE →  CASH: ✗
```

Same for CHEQUE and BANK fields.

**Files**: 
- `src/components/yutong/YutongCashReceiptPreview.tsx` (lines 163-171)
- `src/components/sinotruck/SinotrukCashReceiptPreview.tsx` (lines 163-171)
- `src/components/sinotruck/SinotruckCashReceiptPreview.tsx` (lines 198-206)

Changes per file: Replace `'TRUE' : 'FALSE'` with `'✓' : '✗'` in the 3 payment method spans.

## Summary
- 7 files modified total
- Payment form gets image thumbnail preview
- Cash receipt gets clean ✓/✗ icons instead of TRUE/FALSE text


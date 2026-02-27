

# Add Sri Lankan Cheque Print to AP Payments

## Overview
When an AP payment is made via cheque, add a functional "Print Cheque" button that opens a real Sri Lankan-format cheque layout, with all details auto-positioned for direct printing onto a physical cheque leaf.

## What Changes

### 1. Rebuild ChequePrintPreview for Sri Lankan Format
**File: `src/components/accounting/ChequePrintPreview.tsx`**

Replace the current card-style preview with an actual cheque-sized layout (17.5cm x 7.5cm) using absolute CSS positioning:

- **Date**: Top-right, each digit (DD/MM/YYYY) in individual boxes, spaced to match printed cheque cells
- **Payee line**: "Pay __________ or bearer" with the vendor name positioned on the line
- **Amount in words**: Two lines below payee, with "Rupees" prefix and "Only" at the end, using `numberToWords()`
- **Amount in figures**: Right-side box with Rs. prefix and formatted number (e.g., "Rs. 125,000.00")
- **Account payee crossing**: Two parallel diagonal lines in top-left corner with "A/C PAYEE ONLY" text (auto-added for amounts over Rs. 500,000 or togglable)
- **MICR line area**: Bottom strip left blank (bank's pre-printed zone)

CSS `@media print` styles will:
- Hide all UI chrome (dialog header, buttons)
- Set exact page size to cheque dimensions
- Remove margins/padding for precise alignment
- Use `position: absolute` with cm-based coordinates for each field

### 2. Wire Print Button in AP Payments View
**File: `src/components/accounting/APPaymentsView.tsx`**

- Add state: `printCheque` and `showChequePrint`
- The existing Print button (line 283) will:
  - Only be enabled/shown when `payment_method === 'cheque'`
  - On click, populate `printCheque` with: `cheque_number`, `cheque_date`, `payee` (vendor name), `amount`, `bank_account_name`, `reference`
- Render `<ChequePrintPreview>` at the bottom of the component
- For non-cheque payments, the print icon opens the existing voucher preview instead

### 3. Cheque Position Calibration Controls
**Added to `ChequePrintPreview.tsx`**

A small settings gear icon (hidden during print) that reveals offset adjustments:
- Vertical offset (mm) and Horizontal offset (mm) sliders
- These allow users to fine-tune alignment for their specific printer/cheque book
- Values stored in `localStorage` so they persist across sessions

## Technical Details

### Cheque Dimensions (Sri Lankan Standard)
```text
Width: 175mm (~17.5cm)
Height: 75mm (~7.5cm)

Field positions (from top-left, in mm):
- Date digits:        top: 8mm,  left: 120mm  (8 boxes, 6mm apart)
- Payee name:         top: 22mm, left: 15mm,  width: 145mm
- Amount words line1: top: 32mm, left: 5mm,   width: 130mm
- Amount words line2: top: 40mm, left: 5mm,   width: 130mm
- Amount figures box: top: 30mm, left: 140mm, width: 30mm
- A/C Payee crossing: top: 2mm,  left: 2mm    (diagonal lines)
```

### Files Modified (2)
- `src/components/accounting/ChequePrintPreview.tsx` -- Complete rewrite with Sri Lankan cheque layout
- `src/components/accounting/APPaymentsView.tsx` -- Wire print button + conditional cheque print logic

### Print Flow
1. User records AP payment with method "Cheque" and enters cheque number/date
2. In the payments list, the printer icon appears highlighted for cheque payments
3. Click opens `ChequePrintPreview` with auto-populated fields positioned correctly
4. User clicks "Print" which triggers `window.print()` with cheque-specific CSS
5. Only the cheque content prints at exact dimensions, fitting a physical cheque leaf


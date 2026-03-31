

# Fix: Amount Formatting with Thousand Separators + Payment Proof View Button

## Two Issues

### Issue 1: Amount inputs don't show thousand separators
All payment/amount inputs use `type="number"` which displays raw digits (100000) instead of formatted (100,000). This affects every module.

**Fix**: Create a reusable `CurrencyInput` component that:
- Displays formatted value with commas (100,000) using `type="text"`
- Strips non-numeric characters on change, stores raw number
- Shows "LKR" prefix inside the input for clarity
- Works as a drop-in replacement for `<Input type="number">`

Then replace `type="number"` amount inputs across all payment forms:
- `YutongPaymentTracking.tsx` (line 802-807)
- `SinotruckPaymentTracking.tsx`
- `SinotrukPaymentTracking.tsx`
- `LightVehiclePaymentTracking.tsx`
- `SpreadsheetQuickActions.tsx` (Yutong + Sinotruck)
- Spreadsheet "Add Order" forms (unit price, total amount)

### Issue 2: No "View Payment Proof" button on payment rows
When a payment has an uploaded proof photo (`payment_slip_url`), there's no way to view it — especially at verify time.

**Fix**: In the Payment History table actions column (all 4 payment tracking files):
- Add an "eye" icon button next to Verify when `payment.payment_slip_url` exists
- Clicking opens the image/PDF in a dialog or new tab
- This lets the user review the proof before clicking Verify

## Files to create
1. `src/components/ui/currency-input.tsx` — Reusable formatted currency input

## Files to modify
1. `src/components/yutong/YutongPaymentTracking.tsx` — Replace amount input + add proof view button
2. `src/components/sinotruck/SinotruckPaymentTracking.tsx` — Same
3. `src/components/sinotruck/SinotrukPaymentTracking.tsx` — Same
4. `src/components/lightvehicle/LightVehiclePaymentTracking.tsx` — Same
5. `src/components/yutong/spreadsheet/SpreadsheetQuickActions.tsx` — Replace amount inputs
6. `src/components/sinotruck/spreadsheet/SpreadsheetQuickActions.tsx` — Replace amount inputs
7. `src/components/yutong/spreadsheet/YutongSpreadsheetCore.tsx` — Add order form amounts
8. `src/components/sinotruck/spreadsheet/SinotrukSpreadsheetCore.tsx` — Add order form amounts
9. `src/components/lightvehicle/spreadsheet/LightVehicleSpreadsheetCore.tsx` — Add order form amounts

## CurrencyInput component design

```tsx
// Usage: <CurrencyInput value={amount} onValueChange={(num) => setAmount(num)} />
// Displays: "100,000" in the field, returns 100000 as number
```

- `type="text"` with `inputMode="numeric"` for mobile numeric keyboard
- On every keystroke: strip non-digits, format with `toLocaleString()`, update parent with raw number
- On blur: ensure clean formatting
- Supports placeholder, disabled, className like standard Input


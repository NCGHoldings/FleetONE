

# Improve Daily Expenses Row Readability with Zebra Striping

## Problem
The daily expenses list (21 categories) in the Quick Entry / OCR card is hard to scan — all rows look the same with no visual separation.

## Fix
Add alternating background colors (zebra striping) to expense category rows in `OCRExtractedDataCard.tsx`. This is a small CSS change.

### In `src/components/trips/OCRExtractedDataCard.tsx` (line 864)
Add `even:bg-muted/40` class to each expense row div to create alternating backgrounds, plus add some vertical padding for spacing:

```
// Before:
<div key={key} className="flex justify-between items-center">

// After:
<div key={key} className={`flex justify-between items-center py-1.5 px-2 rounded-sm ${index % 2 === 0 ? 'bg-muted/40' : ''}`}>
```

Use the `.map` index parameter (already available via `DB_EXPENSE_CATEGORIES.map`) to determine even/odd rows. This gives a clean zebra stripe effect that makes rows easy to distinguish.

### Also apply to `DailyBusExpensesForm.tsx`
Check if the standalone daily expenses form has the same readability issue and apply consistent zebra styling there too.

## Files to Change
- `src/components/trips/OCRExtractedDataCard.tsx` — add zebra striping to expense category rows (line 858-890)
- `src/components/trips/DailyBusExpensesForm.tsx` — apply same styling if applicable

## Result
- Expense rows alternate between white and light gray backgrounds
- Each row has slightly more padding for better readability
- Easy to visually track a label to its value across the row


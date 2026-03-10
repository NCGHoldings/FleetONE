

# Fix: AR Invoice Creation & School Bus Auto-AR Issues

## Issues Found

### 1. Buses Inline Add Fails — Missing Required Fields
The `buses` table requires `model` (string) and `type` (string) as NOT NULL columns. The current inline add in `APInvoiceForm.tsx` only provides `bus_no`, `capacity`, and `year`:
```typescript
// BROKEN - missing model and type
.insert([{ bus_no: newBusNumber.trim(), capacity: 0, year: new Date().getFullYear() }])
```
This causes a database error every time a user tries to add a new bus from the dropdown.

### 2. AR Invoice Number Running (Same Bug as AP Payment)
`ARInvoiceForm.tsx` line 127-135 has the same pattern that was fixed in `APPaymentForm.tsx` — the `generateNumber` is in the `useEffect` deps. While `useCallback` stabilized the function reference, the effect still lacks a `useRef` guard. On form re-opens, `form.getValues("invoice_number")` returns `""` after reset, triggering repeated generation.

### 3. School Bus Auto-AR — `as any` Cast Hides Missing business_unit_code on JE Lines
In `useSchoolBusFinance.ts`, the journal entry lines insert (line 546-564) does NOT include `business_unit_code` on the lines, while the manual JE creation in `useAccountingMutations.ts` (line 65) does. This causes school bus JE lines to be invisible when the sub-company view filters by `business_unit_code`.

## Fixes

### File: `src/components/accounting/APInvoiceForm.tsx`
- Fix `handleAddBus` to include required `model` and `type` fields with defaults (`model: "N/A"`, `type: "bus"`)

### File: `src/components/accounting/ARInvoiceForm.tsx`
- Add `useRef` guard (`hasGeneratedNumber`) to prevent repeated invoice number generation — same pattern as the AP Payment fix

### File: `src/hooks/useSchoolBusFinance.ts`
- Add `business_unit_code: 'SBO'` to all `journal_entry_lines` inserts (lines 546-564 and 600-619)
- This ensures school bus GL entries are visible when filtering by business unit

| File | Change |
|---|---|
| `src/components/accounting/APInvoiceForm.tsx` | Add `model` and `type` to bus insert |
| `src/components/accounting/ARInvoiceForm.tsx` | Add useRef guard for invoice number generation |
| `src/hooks/useSchoolBusFinance.ts` | Add `business_unit_code: 'SBO'` to JE line inserts |




# Fix Final Invoice: Mileage, Bus Type & Stale Paid Amount

## Problems in Screenshot

1. **Mileage: 0** — `generateInvoiceData()` (line 202-242) never sets `tripDistance` or `totalKm`, so the template defaults to `0`
2. **Bus Type: Standard Bus** — Parent passes `resolveBusType(selectedTrip)` but if `bus_fleet_details` isn't in the Supabase query, it falls back to "Standard Bus"
3. **Overpaid Credit: 6,900** — Line 206 uses stale `quotationData.total_paid` instead of `freshTotalPaid` for `paidAmount`, so the PDF renders with wrong paid total even though the modal UI shows correct fresh data

## About the Existing Trip

The old invoice PDF was already generated and stored with wrong data. After the code fix, you can either:
- **Regenerate** the existing invoice (click "Generate Final Invoice" again — it will overwrite)
- **Create a new trip** to test fresh

Both will work after the fix. No need to delete anything.

## Changes

### File 1: `src/components/special-hire/GenerateBalanceInvoiceModal.tsx`

**Fix `generateInvoiceData()` (line 202-242):**

1. Add `tripDistance` and `totalKm` to the props interface (add to `quotationData` type)
2. Pass them through to the returned `InvoiceData`:
   ```
   tripDistance: quotationData.tripDistance,
   totalKm: quotationData.totalKm,
   ```
3. Fix `paidAmount` to use fresh data:
   ```
   paidAmount: freshTotalPaid ?? quotationData.total_paid ?? quotationData.advance_paid ?? 0,
   ```
   (Currently line 206 ignores `freshTotalPaid`)

### File 2: `src/components/special-hire/ConfirmedTripsTable.tsx`

**Pass mileage data when opening the modal (around line 1612-1638):**

Add to the `quotationData` prop:
```
tripDistance: getTripDistance(selectedTrip),
totalKm: calculateTotalKm(selectedTrip),
```

Import `getTripDistance, calculateTotalKm` from `@/lib/special-hire-invoice-helpers`.

Also ensure the Supabase query for confirmed trips includes `bus_fleet_details` and `bus_types(name)` join so `resolveBusType()` has data to work with.

### File 3: `src/components/special-hire/GenerateBalanceInvoiceModal.tsx` (props)

Add to the `quotationData` interface:
```
tripDistance?: number;
totalKm?: number;
```

## Expected Result

After fix + regenerate:
- Mileage: shows actual KM from quotation (e.g., 345)
- Bus Type: resolved from `bus_fleet_details` or `bus_types` join
- Total Paid: uses fresh DB total (155,471)
- Overpaid Credit: disappears (155,471 - 155,471 = 0)


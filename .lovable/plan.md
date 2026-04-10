

# Fix Missing hireType and intermediateStops on Payment Reminder Invoice

## Problem

The invoice generator code is correct — it already supports `hireType` and `intermediateStops`. Three of the four invoice data construction paths already pass these fields:
- Draft invoice (line 445) — has both fields
- Document regeneration (`useDocumentRegeneration.ts` line 189) — has both fields
- Balance invoice modal (`GenerateBalanceInvoiceModal.tsx` line 256) — has both fields

But the **payment reminder** invoice (lines 1528-1567 in `ConfirmedTripsTable.tsx`) is missing both `hireType` and `intermediateStops`. This is why the screenshot shows "External" and no intermediate stops on the payment reminder PDF.

## Fix

### `src/components/special-hire/ConfirmedTripsTable.tsx`

Add two fields to the `reminderData` object (after line 1566, before the closing `};`):

```typescript
hireType: trip.hire_type || 'External',
intermediateStops: (() => {
  try {
    if (trip.intermediate_stops) {
      const parsed = typeof trip.intermediate_stops === 'string'
        ? JSON.parse(trip.intermediate_stops)
        : trip.intermediate_stops;
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {}
  return [];
})(),
```

This is the exact same pattern used in the draft invoice data construction (line 445-456) in the same file.

## Result

- Payment reminder invoices will show the actual hire type (Outside/Internal/Lyceum) instead of "External"
- Payment reminder invoices will show full route with intermediate stops (e.g., "Galle → Cholaw → Jaffna → Kandy → Galle") instead of just pickup → drop


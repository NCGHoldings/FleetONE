

# Fix: Payment Reminder Intermediate Stops & Show Both KM Values in Mileage

## Problems

1. **Payment Reminder still passes `intermediateStops`** to the invoice generator (line 1518 in ConfirmedTripsTable.tsx). While the generator now ignores them, passing them is unnecessary and could cause issues if logic changes. Should be removed.

2. **Mileage shows only one value** — either actual KM or quoted KM. The user wants BOTH displayed when a post-trip adjustment exists: the original quoted KM and the actual KM traveled. For example: `54.5 (Quoted: 50 KM)` or `Quoted: 50 | Actual: 54.5`.

## Implementation

### File 1: `src/lib/invoice-generator.ts`

**Line 294-297** — Update Mileage display to show both values when adjustments exist:
```
// BEFORE
<td style="...">${mileage}</td>

// AFTER — show "Actual: X KM (Quoted: Y KM)" when adjustments exist, else just the number
```

**Line 231-236** — Update mileage variable to also prepare the original quoted value:
```typescript
const mileage = (data.hasAdjustments && data.actualKmTraveled)
  ? data.actualKmTraveled
  : (data.tripDistance || data.totalKm || 0);
const originalKm = data.originalQuotedKm || data.tripDistance || data.totalKm || 0;
```

Then in the HTML (line 296), render conditionally:
```
${data.hasAdjustments && data.actualKmTraveled
  ? `${mileage} KM (Quoted: ${originalKm} KM)`
  : `${mileage}`}
```

### File 2: `src/components/special-hire/ConfirmedTripsTable.tsx`

**Line 1499-1518** — Remove `intermediateStops` parsing and passing from Payment Reminder data:
- Delete lines 1499-1506 (intermediate stops parsing block)
- Remove `intermediateStops,` from line 1518 in `reminderData`

Also check all other invoice data constructions in this file and remove `intermediateStops` from them, since the generator no longer uses them.

## Result
- Payment Reminder no longer passes unnecessary intermediate stops data
- Mileage field shows both actual and quoted KM when post-trip adjustment exists (e.g., "54.5 KM (Quoted: 50 KM)")
- Single KM value shown when no adjustments exist
- Trips table already correctly shows only pickup and drop locations


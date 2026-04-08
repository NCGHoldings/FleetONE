

# Fix: Invoice Mileage, Route Display, and Driver/Conductor Data

## Problems

1. **Mileage shows original KM, not adjusted KM**: Line 241 in `invoice-generator.ts` prioritizes `tripDistance` (original quoted KM) over `actualKmTraveled` (post-trip adjustment). When a post-trip adjustment exists, the mileage should reflect the actual KM traveled.

2. **Route shows all intermediate stops**: Lines 232-239 build the full route chain (`Pickup → Stop1 → Stop2 → Drop`). The user wants only `Pickup → Drop` in the invoice Item Detail column.

3. **Driver/Conductor data missing in some generation paths**: The initial draft generation in `ConfirmedTripsTable.tsx` passes driver/conductor, but regeneration hooks (`useDocumentRegeneration.ts`, `useDocumentManagement.ts`, `useFinanceApproval.ts`) do not pass `tripDistance`, `totalKm`, `actualKmTraveled`, or `originalQuotedKm` — meaning mileage shows as 0 in regenerated documents.

## Implementation

### File 1: `src/lib/invoice-generator.ts`
**Line 231-241** — Fix route and mileage logic:
- Remove intermediate stops from the `itemDetail` route string — only use `pickupLocation → dropLocation`
- Change mileage priority: if post-trip adjustment exists (`hasAdjustments` and `actualKmTraveled`), use `actualKmTraveled` first; otherwise use `tripDistance` or `totalKm`

```
// BEFORE
const routeParts = [data.pickupLocation];
if (data.intermediateStops && data.intermediateStops.length > 0) { ... }
routeParts.push(data.dropLocation);
const itemDetail = data.itemDetail || routeParts.join(' → ');
const mileage = data.tripDistance || data.totalKm || data.actualKmTraveled || 0;

// AFTER
const itemDetail = data.itemDetail || `${data.pickupLocation} → ${data.dropLocation}`;
const mileage = (data.hasAdjustments && data.actualKmTraveled)
  ? data.actualKmTraveled
  : (data.tripDistance || data.totalKm || 0);
```

### File 2: `src/hooks/useDocumentRegeneration.ts`
**~Line 140-183** — Add missing fields to invoice data:
- Add `tripDistance: getTripDistance(quotationData)` and `totalKm: calculateTotalKm(quotationData)`
- When `hasAdjustments`, also add `originalQuotedKm` and `actualKmTraveled` from `adjustmentData`
- Import `getTripDistance` and `calculateTotalKm` from `special-hire-invoice-helpers`

### File 3: `src/hooks/useDocumentManagement.ts`
**Invoice data objects** — Add `tripDistance` and `totalKm` fields from the quotation data, similar to File 2.

### File 4: `src/hooks/useFinanceApproval.ts`
**All invoice data objects** — Add `tripDistance`, `totalKm`, and adjustment KM fields where applicable.

## Result
- Mileage field shows actual KM traveled when a post-trip adjustment exists, otherwise shows original quoted KM
- Item Detail shows only `Pickup → Drop` — no intermediate stops cluttering the invoice
- Driver/conductor info continues to appear in the Remark line for each bus
- All document generation paths (initial, regeneration, approval) produce consistent data


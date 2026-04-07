

# Fix: Multi-Bus Invoice & Vehicle Assignment

## Problem

The system user reported that a quotation was created for **2 buses**, but:
1. The invoice only shows **1 bus** with the full total amount attributed to it
2. The bus number field (`assigned_bus_no`) only stores a **single** bus number — there's no way to assign multiple bus numbers for multi-bus trips

## Root Cause

- `assigned_bus_no` is a single text field on `special_hire_quotations` — it cannot hold multiple bus numbers
- `VehicleAssignmentModal` only allows selecting **one** bus
- `invoice-generator.ts` (line 312-317) renders a **single row** in the line items table, showing the full `subTotal` and one `vehicleNo`
- The `numberOfBuses` field exists in `InvoiceData` but is never used to split the invoice into per-bus rows

## Plan

### 1. Update Vehicle Assignment to support multiple buses
**Modify `src/components/special-hire/VehicleAssignmentModal.tsx`**
- Read `number_of_buses` from the quotation to know how many bus slots to show
- Render N bus selection fields (one per bus in the quotation)
- Store as comma-separated string in `assigned_bus_no` (e.g., `"NE 2157, NE 2158"`) — no DB schema change needed
- Also allow multiple driver/conductor names (comma-separated) for each bus

### 2. Update Invoice to show per-bus line items
**Modify `src/lib/invoice-generator.ts`**
- Parse `vehicleNo` as comma-separated list (split by `,`)
- When `numberOfBuses > 1`:
  - Calculate `perBusAmount = totalAmount / numberOfBuses`
  - Render one row per bus with individual vehicle number and per-bus amount
  - Show full total in the summary section (unchanged)
- When `numberOfBuses === 1`: keep current single-row behavior

### 3. Pass number_of_buses through all invoice generation paths
**Verify/update these files** to ensure `numberOfBuses` is correctly passed:
- `src/components/special-hire/ConfirmedTripsTable.tsx`
- `src/hooks/useFinanceApproval.ts`
- `src/hooks/useDocumentRegeneration.ts`
- `src/hooks/useDocumentManagement.ts`
- `src/components/special-hire/EnhancedDocumentViewer.tsx`

Currently these files pass `vehicleNo` from `assigned_bus_no` but may not pass `numberOfBuses` from the quotation's `number_of_buses`.

## Technical Details

**Invoice line items table (current — single row):**
```text
| Description | Item Detail | Vehicle No | Amount  |
| Leyland...  | Route...    | NE 2157    | 42,870  |
```

**Invoice line items table (fixed — per bus rows):**
```text
| Description | Item Detail | Vehicle No | Amount  |
| Leyland...  | Route...    | NE 2157    | 21,435  |
| Leyland...  | Route...    | NE 2158    | 21,435  |
```

**No database migration needed** — `assigned_bus_no` is already a text field that can hold comma-separated values.

## Files
- **Modify**: `src/components/special-hire/VehicleAssignmentModal.tsx` — multi-bus assignment UI
- **Modify**: `src/lib/invoice-generator.ts` — per-bus line item rows
- **Verify/Modify**: `src/components/special-hire/ConfirmedTripsTable.tsx` — pass `numberOfBuses`
- **Verify/Modify**: `src/hooks/useFinanceApproval.ts` — pass `numberOfBuses`
- **Verify/Modify**: `src/hooks/useDocumentRegeneration.ts` — pass `numberOfBuses`
- **Verify/Modify**: `src/hooks/useDocumentManagement.ts` — pass `numberOfBuses`
- **Verify/Modify**: `src/components/special-hire/EnhancedDocumentViewer.tsx` — pass `numberOfBuses`


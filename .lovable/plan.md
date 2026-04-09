

# Add Vehicle Number to AP Payments & AR Receipts — Fleet Integration

## Problem

The AP Payment form (both Direct Payment and normal modes) has no option to record which vehicle/bus the expense is for. This makes it impossible to track vehicle-level costs from payments. The same gap exists in AR Receipts. AP Invoices already have `bus_id`, `bus_no`, `bus_type` columns — payments and receipts need parity.

## Plan

### 1. Database Migration — Add Vehicle Fields

Add columns to both `ap_payments` and `ar_receipts`:

```sql
ALTER TABLE ap_payments ADD COLUMN bus_id UUID REFERENCES buses(id);
ALTER TABLE ap_payments ADD COLUMN bus_no TEXT;
ALTER TABLE ap_payments ADD COLUMN vehicle_type TEXT; -- 'fleet' or 'external'

ALTER TABLE ar_receipts ADD COLUMN bus_id UUID REFERENCES buses(id);
ALTER TABLE ar_receipts ADD COLUMN bus_no TEXT;
ALTER TABLE ar_receipts ADD COLUMN vehicle_type TEXT;
```

### 2. AP Payment Form — Vehicle Selector

**File: `src/components/accounting/APPaymentForm.tsx`**

- Add a "Vehicle / Bus No" section below the vendor fields
- Searchable combobox that:
  - Loads all buses from `buses` table (fleet vehicles)
  - Groups by type/category if available
  - Allows free-text entry for non-fleet vehicles (e.g., hired vehicles)
- When a fleet bus is selected: stores `bus_id` + `bus_no`, sets `vehicle_type = 'fleet'`
- When typed manually: stores only `bus_no`, sets `vehicle_type = 'external'`
- Optional field — not required for every payment

### 3. AR Receipt Form — Same Vehicle Selector

**File: `src/components/accounting/ARReceiptForm.tsx`**

- Add the same vehicle selector component
- Same logic: fleet bus dropdown + free-text option

### 4. Mutation Updates

**File: `src/hooks/useAccountingMutations.ts`**

- `useCreateAPPayment`: Accept `bus_id`, `bus_no`, `vehicle_type` and pass to insert
- `useCreateARReceipt`: Same addition
- GL journal entries: Pass `bus_id` to journal entry metadata for fleet cost analytics

### 5. Fleet Integration Bridge

When a payment records a `bus_id`:
- The existing Vehicle Operating Cost Dashboard (`useFleetFinancials`) can query `ap_payments` by `bus_id` to include payment-based expenses alongside `daily_bus_expenses`
- Journal entries tagged with `bus_id` already flow into route-wise P&L

## Files to Change

- **New SQL migration** — add `bus_id`, `bus_no`, `vehicle_type` to `ap_payments` and `ar_receipts`
- **`src/components/accounting/APPaymentForm.tsx`** — add vehicle selector with fleet lookup + free-text
- **`src/components/accounting/ARReceiptForm.tsx`** — add vehicle selector
- **`src/hooks/useAccountingMutations.ts`** — pass vehicle fields in create mutations and to journal entries

## Result

- Every AP payment and AR receipt can optionally record which vehicle it's for
- Fleet vehicles are selectable from a dropdown (linked via `bus_id`)
- Non-fleet vehicles can be typed manually (stored as `bus_no` with `vehicle_type = 'external'`)
- Vehicle-tagged payments feed into fleet operating cost analytics
- Full interconnection: Payment → Vehicle → Fleet Analytics → GL


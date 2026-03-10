

# Add Route & Bus Fields to AP Invoice Form

## Problem
The AP Invoice form currently only has: Vendor, Invoice Date, Due Date, Notes, and line items. It lacks **Route** and **Bus** selection fields, which are needed to track which route/bus an expense relates to. The school bus operations section also needs these details with the ability to add new entries if they don't exist in the dropdown.

## Solution

### 1. Database Migration — Add `route_id` and `bus_id` columns to `ap_invoices`

```sql
ALTER TABLE ap_invoices 
  ADD COLUMN route_id uuid REFERENCES routes(id),
  ADD COLUMN bus_id uuid REFERENCES buses(id),
  ADD COLUMN school_route_id uuid REFERENCES school_routes(id);
```

This allows linking any AP invoice to a fleet route, a bus, or a school route.

### 2. Update `APInvoiceForm.tsx` — Add Route & Bus dropdowns

Add two new searchable dropdown fields in the header section:

- **Route** dropdown: Fetches from `routes` table (active routes). Includes a "+" button to type-in/add a new route if it doesn't exist.
- **Bus** dropdown: Fetches from `buses` table (active buses). Includes a "+" button to add a new bus inline if not found.
- **School Route** dropdown (optional): Shows when business_unit_code is SBO, fetches from `school_routes`.

Each dropdown uses the Popover + Command (cmdk) searchable pattern already established in the codebase, with an "Add New" option at the bottom that opens a small inline form.

### 3. Update `useCreateAPInvoice` and `useUpdateAPInvoice` in `useAccountingMutations.ts`

Include `route_id`, `bus_id`, and `school_route_id` in the insert/update payloads so the values are persisted.

### 4. Update `AccountsPayableView.tsx` — Show Route & Bus columns in the AP invoice list table

Add Route and Bus columns to the invoice list so users can see which invoices are linked to which routes/buses.

### Files to Edit

| File | Change |
|---|---|
| SQL Migration | Add `route_id`, `bus_id`, `school_route_id` columns to `ap_invoices` |
| `src/components/accounting/APInvoiceForm.tsx` | Add Route, Bus, School Route searchable dropdowns with "Add New" option |
| `src/hooks/useAccountingMutations.ts` | Pass `route_id`, `bus_id`, `school_route_id` in create/update mutations |
| `src/components/accounting/AccountsPayableView.tsx` | Show Route & Bus in invoice list table |


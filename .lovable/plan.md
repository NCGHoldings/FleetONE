

# Add Bus Number, Type & Category to AR Invoices

## What This Does

Adds bus-level tracking to every AR invoice so you can link income to specific buses. When creating or editing an AR invoice, you'll be able to:
- Select a bus number (with type-ahead search)
- See/select bus type (Normal, Semi, Express, etc.)
- See/select bus category (Public Bus, School Bus, Special Hire) and sub-category
- Add a new bus on-the-fly if it doesn't exist — this auto-creates the bus profile in Fleet Management
- Edit category assignments that persist across the system

## Database Changes

Add 4 new columns to `ar_invoices`:

```sql
ALTER TABLE ar_invoices ADD COLUMN bus_id uuid REFERENCES buses(id);
ALTER TABLE ar_invoices ADD COLUMN bus_no text;
ALTER TABLE ar_invoices ADD COLUMN bus_type text;
ALTER TABLE ar_invoices ADD COLUMN bus_category_id uuid REFERENCES bus_categories(id);
ALTER TABLE ar_invoices ADD COLUMN bus_sub_category_id uuid REFERENCES bus_sub_categories(id);
```

`bus_id` links to Fleet Management. `bus_no` is stored as text too for display without joins.

## File Changes

### 1. New Migration — Add columns to `ar_invoices`
Add the 5 columns above with indexes on `bus_id` and `bus_category_id`.

### 2. `src/components/accounting/ARInvoiceForm.tsx` — Add bus fields to the form
- Add a new row below the header fields with: **Bus Number** (searchable combobox), **Type** (select), **Category** (select), **Sub-Category** (select)
- Bus Number combobox: queries `buses` table, shows matches as user types, includes "+ Add New Bus" option at bottom
- Selecting a bus auto-fills Type and Category from its profile
- Type selector: shows distinct bus types from DB, selecting a type filters bus number suggestions
- Category/Sub-Category: shows from `bus_categories`/`bus_sub_categories`, selecting updates the bus profile too
- "+ Add New Bus" opens inline fields for bus_no, type, category → inserts into `buses` table → auto-selects it
- All fields are **optional** (some invoices may not relate to a bus)

### 3. `src/hooks/useAccountingMutations.ts` — Pass bus fields through
Update `useCreateARInvoice` and `useUpdateARInvoice` mutation types to include `bus_id`, `bus_no`, `bus_type`, `bus_category_id`, `bus_sub_category_id` and persist them.

### 4. `src/components/accounting/AccountsReceivableView.tsx` — Show bus info in invoice list
Add "Bus No." and "Category" columns to the AR invoices data table with category badge rendering.

### 5. Update bus profile when category is set/changed
When a user assigns or changes a category on an invoice, update `buses.category_id` and `buses.sub_category_id` so Fleet Management stays in sync.

## Flow Summary

```text
AR Invoice Form
  ├─ Type selected (e.g., "Normal")
  │   └─ Bus Number dropdown filtered to Normal type buses
  ├─ Bus Number selected (e.g., "NC 6915")
  │   └─ Auto-fills Type, Category, Sub-Category from bus profile
  ├─ Bus not found?
  │   └─ "+ Add New Bus" → creates bus in Fleet Management
  │       └─ Auto-fills form with new bus
  ├─ Category changed on form?
  │   └─ Updates bus profile in Fleet Management
  └─ Invoice saved
      └─ ar_invoices row includes bus_id, bus_no, type, category
          └─ Visible in AR Invoices list with category badge
```


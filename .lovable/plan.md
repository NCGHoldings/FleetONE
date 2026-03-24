

# Fix Yutong Full Flow: GL Posting, Customer Category, and Finance Integration

## Root Cause Analysis

### Critical Error: `source_module` column does not exist
The console error `"Could not find the 'source_module' column of 'journal_entries' in the schema cache"` is the primary blocker. In `useVehicleSalesFinance.ts` (line 349), every GL posting inserts `source_module: 'yutong_sales'` into `journal_entries`, but this column does not exist in the database. This causes ALL payment verifications to fail with a 400 error.

### Customer Category Not Flowing Through
The `customer_category_id` is saved on quotations but never passed to:
- `yutong_orders` table (no column exists)
- `createVehicleCustomer()` function (doesn't accept or set category)
- AR Invoice creation (no category-based GL resolution)

## Changes

### 1. Database Migration: Add `source_module` to `journal_entries` + `customer_category_id` to order tables
- Add `source_module TEXT` column to `journal_entries` (this is referenced by many modules, not just Yutong)
- Add `customer_category_id UUID` (FK to `customer_categories`) to `yutong_orders`, `sinotruck_orders`, `lightvehicle_orders`

### 2. Fix `useVehicleSalesFinance.ts` -- Customer Category Integration
- Update `createVehicleCustomer()` to accept and set `customer_category_id` on the customer record
- Update `createVehicleARInvoice()` to use category-based GL account resolution via `resolveCustomerARAccounts()`
- This ensures Internal vs External customers use the correct Trade Receivable and Revenue accounts

### 3. Pass `customer_category_id` through Order Creation
**File:** `src/hooks/useYutongOrderManagement.ts`
- Fetch `customer_category_id` from the source quotation
- Insert it into the order record
- Add to `CreateOrderData` interface

### 4. Pass Category Through Payment Verification Flow
**File:** `src/components/yutong/YutongPaymentTracking.tsx`
- When creating/getting a finance customer, include `customer_category_id` from the order's linked quotation
- When creating AR Invoice on invoice approval, resolve GL accounts via category

### 5. Update Supabase Types
Regenerate types to include the new columns.

## Flow After Fix
```text
Quotation (customer_category_id) 
    → Order (inherits customer_category_id)
        → Record Payment (pending)
            → Verify Payment 
                → Create Finance Customer (with category)
                → GL: DR Bank / CR Customer Advance ← uses source_module tag
            → Approve System Invoice
                → Create AR Invoice (category-based GL resolution)
                → GL: DR Trade Receivable / CR Sales Revenue
                → Apply Advance: DR Advance / CR Receivable
```

## Files Touched
- New Supabase migration (add `source_module` to `journal_entries`, `customer_category_id` to order tables)
- `src/hooks/useVehicleSalesFinance.ts` -- category-aware customer + AR invoice creation
- `src/hooks/useYutongOrderManagement.ts` -- pass category to orders
- `src/components/yutong/YutongPaymentTracking.tsx` -- pass category through verify flow
- `src/integrations/supabase/types.ts` -- update types


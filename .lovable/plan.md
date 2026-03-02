
# Fix: Yutong Quotation Versions Showing N/A for Bus Model Details

## Problem
29 existing versioned quotations (v1.1, v1.3, etc.) have `bus_model_id` and `seating_capacity` as NULL because they were created before the versioning fix. The preview correctly shows "N/A" instead of wrong data, but the actual fix is to populate the missing data.

Some parent records are also NULL (chained versions like v1.1 -> v1.5 -> v1.6), so a simple one-level parent lookup won't work -- we need to trace up the entire chain to the root (v1.0) which has the correct `bus_model_id`.

## Solution

### 1. Database Migration: Backfill missing bus_model_id using recursive parent chain

Run a recursive CTE migration that traces each NULL record up to its root ancestor (the v1.0 with a valid `bus_model_id`), then updates all descendants:

```sql
WITH RECURSIVE chain AS (
  SELECT id, parent_quotation_id, bus_model_id, seating_capacity, customer_id
  FROM yutong_quotations
  WHERE bus_model_id IS NOT NULL
  UNION ALL
  SELECT child.id, child.parent_quotation_id, chain.bus_model_id, chain.seating_capacity, COALESCE(child.customer_id, chain.customer_id)
  FROM yutong_quotations child
  JOIN chain ON child.parent_quotation_id = chain.id
  WHERE child.bus_model_id IS NULL
)
UPDATE yutong_quotations q
SET bus_model_id = chain.bus_model_id,
    seating_capacity = chain.seating_capacity,
    customer_id = COALESCE(q.customer_id, chain.customer_id)
FROM chain
WHERE q.id = chain.id AND q.bus_model_id IS NULL;
```

This fixes all 29 existing records in one pass.

### 2. Preview Component Fallback: Look up parent's bus_model_id

**File: `src/components/yutong/YutongQuotationPreview.tsx`**

In the `fetchData` function (around line 100-116), add a fallback: if `bus_model_id` is null but `parent_quotation_id` exists on the quotation, query the parent's `bus_model_id` and use that to fetch bus model details. This acts as a safety net for any edge cases the migration doesn't cover.

This requires adding `parent_quotation_id` to the `YutongQuotation` interface and updating the fetch logic to:
1. Try `quotation.bus_model_id` first (normal path)
2. If null, query the parent chain to find a valid `bus_model_id`
3. Fetch bus model details using whichever ID was found

### Files Modified
- **New migration SQL** -- Recursive backfill of bus_model_id, seating_capacity, customer_id
- **`src/components/yutong/YutongQuotationPreview.tsx`** -- Add parent chain fallback for bus_model_id lookup

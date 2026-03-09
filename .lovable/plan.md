

# Fix Special Hire KPI Cards Not Updating

## Root Cause

Two problems:

1. **Supabase 1000-row limit**: The query fetches all rows with `.select('status, gross_revenue, ...')`. Supabase caps results at 1000 rows by default. With 2000+ quotations, `quotations.length` is capped and never reflects the real count.

2. **No `is_active_version` filter**: The query counts ALL quotation versions (including old revisions), inflating the number. The QuotationsList filters by `is_active_version = true`, but the KPI query does not.

3. **No realtime refresh**: KPIs only load on mount and when the comparison period changes. Adding a new quotation calls `loadStats()` from `handleFormSubmit`, but if a quotation is added from the public form or another tab, the KPIs stay stale.

## Plan

### File: `src/pages/SpecialHire.tsx` — Fix `loadStats()`

Replace the current fetch-all-rows approach with **server-side counting** using `{ count: 'exact', head: true }` for each metric. This bypasses the 1000-row limit entirely.

**Current (broken):**
```typescript
const { data: quotations } = await supabase
  .from('special_hire_quotations')
  .select('status, gross_revenue, approval_status, created_at');
const totalQuotations = quotations?.length || 0; // capped at 1000
```

**Fixed:**
```typescript
// Total active quotations (server-side count)
const { count: totalQuotations } = await supabase
  .from('special_hire_quotations')
  .select('*', { count: 'exact', head: true })
  .eq('is_active_version', true);

// Pending quotations
const { count: pendingQuotations } = await supabase
  .from('special_hire_quotations')
  .select('*', { count: 'exact', head: true })
  .eq('is_active_version', true)
  .eq('status', 'pending');

// Confirmed trips
const { count: confirmedTrips } = await supabase
  .from('special_hire_quotations')
  .select('*', { count: 'exact', head: true })
  .eq('is_active_version', true)
  .eq('status', 'confirmed');

// Pending approvals
const { count: pendingApprovals } = await supabase
  .from('special_hire_quotations')
  .select('*', { count: 'exact', head: true })
  .eq('is_active_version', true)
  .eq('approval_status', 'pending');
```

Same pattern for comparison period counts (adding `.lte('created_at', comparisonDate)`).

For **revenue** (needs actual values, not just count): use `.select('amount')` with `.eq('status', 'approved')` — revenue comes from payments table which likely has fewer rows, but apply the same `{ count }` pattern if needed, or use `.limit(10000)` to be safe.

### Also in `src/pages/SpecialHire.tsx` — Add realtime subscription

Add a `useEffect` subscribing to `postgres_changes` on `special_hire_quotations` and `special_hire_payments` to auto-refresh KPIs when data changes (matching the pattern already used in the spreadsheet).


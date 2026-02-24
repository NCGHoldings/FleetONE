

# Fix: Special Hire KPIs Not Updating Beyond 2000 Records

## Problem

The Special Hire Management KPI cards are stuck showing **2000 Total Quotations** when the database actually has **2033**. This happens because:

1. **Supabase row limit**: The `loadStats()` function fetches all rows using `.select('status, gross_revenue, approval_status, created_at')` which is capped by Supabase's default PostgREST row limit (~2000). It then counts rows client-side with `.length`, so the count is never accurate beyond the limit.

2. **Missing `is_active_version` filter**: The KPI query counts ALL quotations (including old versions), while the quotation list correctly filters by `is_active_version = true` (showing 1743). The KPIs should match the list.

3. **Comparison period logic is flawed**: The "comparison" query uses `.lte('created_at', comparisonDate)` which fetches all records *before* the comparison date -- this gives the cumulative total at that point, not just the records in the comparison window. Change percentages are therefore meaningless for older data.

## Actual vs Displayed Numbers

| Metric | Database (Real) | KPI Shows | Issue |
|--------|-----------------|-----------|-------|
| Total Quotations | 2033 (all) / 1743 (active) | 2000 | Row limit cap |
| Confirmed Trips | 97 | 97 | Happens to be under limit |
| Revenue | LKR 7,250,960.50 | LKR 7,250,960.5 | Correct (payments table is small) |
| Pending Approval | 163 | ~152 | Row limit excludes some |

## Solution

### File: `src/pages/SpecialHire.tsx` -- Rewrite `loadStats()` function (lines 142-225)

Replace the client-side counting approach with **server-side counting using Supabase `count` and `head` options**, and add the `is_active_version` filter.

**New approach for each metric:**

```typescript
const loadStats = async () => {
  try {
    const selectedPeriod = comparisonPeriods.find(p => p.value === comparisonPeriod);
    const daysBack = selectedPeriod?.days || 7;
    const currentDate = new Date();
    const comparisonStartDate = new Date();
    comparisonStartDate.setDate(currentDate.getDate() - daysBack);
    const previousStartDate = new Date();
    previousStartDate.setDate(currentDate.getDate() - (daysBack * 2));

    // Use count queries instead of fetching all rows
    const [
      { count: totalQuotations },
      { count: pendingQuotations },
      { count: confirmedTrips },
      { count: pendingApprovals },
      { data: revenueData },
      { count: pendingFinanceApprovals },
      // Comparison period counts (records created in previous period)
      { count: compTotalQuotations },
      { count: compConfirmedTrips },
    ] = await Promise.all([
      // Total active quotations
      supabase.from('special_hire_quotations')
        .select('*', { count: 'exact', head: true })
        .eq('is_active_version', true),
      // Pending
      supabase.from('special_hire_quotations')
        .select('*', { count: 'exact', head: true })
        .eq('is_active_version', true)
        .eq('status', 'pending'),
      // Confirmed
      supabase.from('special_hire_quotations')
        .select('*', { count: 'exact', head: true })
        .eq('is_active_version', true)
        .eq('status', 'confirmed'),
      // Pending approval
      supabase.from('special_hire_quotations')
        .select('*', { count: 'exact', head: true })
        .eq('is_active_version', true)
        .eq('approval_status', 'pending'),
      // Revenue (small table, safe to fetch)
      supabase.from('special_hire_payments')
        .select('status, amount'),
      // Finance pending
      supabase.from('special_hire_payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_finance'),
      // Comparison: quotations created in previous period
      supabase.from('special_hire_quotations')
        .select('*', { count: 'exact', head: true })
        .eq('is_active_version', true)
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', comparisonStartDate.toISOString()),
      // Comparison: confirmed in previous period
      supabase.from('special_hire_quotations')
        .select('*', { count: 'exact', head: true })
        .eq('is_active_version', true)
        .eq('status', 'confirmed')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', comparisonStartDate.toISOString()),
    ]);

    // Current period new quotations for comparison
    const { count: currentPeriodNew } = await supabase
      .from('special_hire_quotations')
      .select('*', { count: 'exact', head: true })
      .eq('is_active_version', true)
      .gte('created_at', comparisonStartDate.toISOString());

    const totalRevenue = revenueData
      ?.filter(p => p.status === 'approved')
      .reduce((sum, p) => sum + p.amount, 0) || 0;

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    setStats({
      totalQuotations: totalQuotations || 0,
      pendingQuotations: pendingQuotations || 0,
      confirmedTrips: confirmedTrips || 0,
      totalRevenue,
      pendingApprovals: pendingApprovals || 0,
      pendingFinanceApprovals: pendingFinanceApprovals || 0,
      totalQuotationsChange: calculateChange(currentPeriodNew || 0, compTotalQuotations || 0),
      confirmedTripsChange: calculateChange(confirmedTrips || 0, compConfirmedTrips || 0),
      // ... other change calculations
    });
  } catch (error) {
    console.error('Error loading stats:', error);
  }
};
```

### Key Changes Summary

1. **Use `{ count: 'exact', head: true }`** -- asks Supabase to count server-side without returning row data. Works for any table size.
2. **Add `.eq('is_active_version', true)`** -- KPI totals now match the quotation list count (1743 active, not 2033 total).
3. **Fix comparison logic** -- compare records created in the current period vs. the previous period of equal length, not cumulative totals.
4. **Use `Promise.all()`** -- run all count queries in parallel for faster loading.
5. **No row limit issues** -- `head: true` means no rows are fetched, only the count header.

## Also Fix: Build Errors (Pre-existing)

The build has many pre-existing TypeScript errors in other files. These are unrelated to this KPI fix but block deployment. The most critical ones will be addressed:

- **`AssetMaintenanceView.tsx`**: Missing state variables (`selectedLog`, `completionCost`, `completionNotes`) -- add the missing `useState` declarations
- **`ExpenseReviewView.tsx`**: Missing `toast` import and incorrect type access -- fix imports and type cast
- **`BudgetAnalytics.tsx`**: `account_id` doesn't exist on `BudgetLineItem` -- use correct property name
- **Other files**: Type casting fixes for `gl_settings` queries and `NCG_HOLDING_ID` exports


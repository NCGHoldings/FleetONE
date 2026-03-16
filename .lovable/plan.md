

# Fix: Total Quotations Showing 2000 Instead of 2088

## Problem
The "Quotations (2000)" count shown in the `QuotationsList` header is derived from `filteredQuotations.length` — the number of rows actually fetched from Supabase. Supabase enforces a server-side row limit (likely configured to 2000 for this project). Since there are now 2088 active quotations, the query silently truncates at 2000.

The **dashboard KPI cards** (`stats.totalQuotations`) already use `{ count: 'exact', head: true }` and show the correct count. The problem is specifically in components that fetch actual rows and use `.length` for counts.

## Affected Areas

| Component | How it counts | Issue |
|---|---|---|
| `QuotationsList.tsx` line 1047 | `filteredQuotations.length` | Capped at 2000 |
| `useSpecialHireSpreadsheetData.ts` line 84-96 | fetches all rows, no pagination | Capped at 2000 |
| `useRealtimeSpecialHire.ts` line 94-104 | fetches confirmed rows | Will hit limit as confirmed grows |
| `SpecialHireCalendarView.tsx` line 214 | monthly date query | Less likely to hit limit (date-filtered) |

## Fix

### 1. `QuotationsList.tsx` — Paginated fetch
Replace the single `.select()` call with a paginated fetch loop that uses `.range(from, to)` to retrieve all rows in batches of 1000:

```typescript
const loadQuotations = async () => {
  try {
    const batchSize = 1000;
    let allData: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('special_hire_quotations')
        .select(`*, bus_types!bus_type_id (name, capacity)`)
        .eq('is_active_version', true)
        .order('created_at', { ascending: false })
        .range(from, from + batchSize - 1);

      if (error) throw error;
      allData = allData.concat(data || []);
      hasMore = (data?.length || 0) === batchSize;
      from += batchSize;
    }
    // ...rest of transform logic uses allData
  }
};
```

### 2. `useSpecialHireSpreadsheetData.ts` — Same paginated pattern
Apply the same batch-fetch approach to the spreadsheet data hook.

### 3. `useRealtimeSpecialHire.ts` — Same paginated pattern
Apply to the confirmed quotations fetch (currently filtered to `status=confirmed`, but will hit the limit as the dataset grows).

### Files to modify
- `src/components/special-hire/QuotationsList.tsx`
- `src/hooks/useSpecialHireSpreadsheetData.ts`
- `src/hooks/useRealtimeSpecialHire.ts`


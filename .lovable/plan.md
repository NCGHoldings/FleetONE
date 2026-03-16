
Root cause found:
- The DB has 2092 active special hire quotations (`is_active_version = true`), but `QuotationsList` still shows 2000.
- `QuotationsList` currently uses offset pagination (`.range(from, to)`), and this project appears to be hitting a Supabase API row cap behavior where offset beyond 2000 returns no more rows.
- So the loop stops at exactly 2000, and `filteredQuotations.length` stays 2000.

Implementation plan:

1) Fix pagination strategy in Special Hire list (main issue)
- File: `src/components/special-hire/QuotationsList.tsx`
- Replace offset-based loop with cursor/keyset pagination (not `.range(from,to)`).
- Page by ordered cursor (`created_at DESC, id DESC`) and fetch next batch using cursor condition.
- This avoids the 2000 offset ceiling and retrieves all rows reliably.

2) Make displayed count robust and accurate
- In `QuotationsList`, add a separate exact count query:
  - `select('*', { count: 'exact', head: true }).eq('is_active_version', true)`
- Display logic:
  - No active filters/search: show server exact total (2092+)
  - With filters/search: show `filteredQuotations.length`
- This keeps header count correct even during large dataset loads.

3) Apply the same pagination fix to related large-data hooks
- File: `src/hooks/useSpecialHireSpreadsheetData.ts`
- File: `src/hooks/useRealtimeSpecialHire.ts`
- Replace remaining offset `.range(from, to)` loops with cursor pagination for consistency and future-proofing.

4) Keep existing behavior intact
- Preserve current transforms, joins, and sorting in UI.
- Keep realtime refresh behavior unchanged.
- Keep export data source aligned with full loaded dataset.

Validation checklist after implementation:
- “Total Quotations” KPI and “Quotations (X)” table header match when no filters are applied.
- Table header shows 2092+ (not 2000 cap).
- Search/filter still updates count correctly.
- Excel export includes records beyond 2000.
- Realtime updates still refresh list without regression.

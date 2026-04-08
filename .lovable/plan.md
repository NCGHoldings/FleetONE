

# Fix: Cannot Set Route on Newly Added Bus in Daily Edit Mode

## Problem

When you add a new bus to the roster and try to select a route while in "Today Only" (daily) edit mode, the system blocks you with a "No trip generated" error. This happens because:

1. Line 415-419 in `useFleetMasterSpreadsheet.ts` checks if a `trip_id` exists for the row
2. A newly added bus has no trip yet — trips haven't been created for it
3. The function returns early without saving the route to **either** the daily trip or the master roster
4. The route never gets saved, so you're stuck

Fields like `route_label` and `remark` are fundamental roster-level fields that should **always** be saveable to the master roster, even in daily mode when no trip exists yet.

## Fix

### In `useFleetMasterSpreadsheet.ts` (line 415-420)

When in daily mode and no `trip_id` exists, instead of blocking entirely, allow "roster-level" fields (`route_label`, `route_id`, `remark`) to fall through to the master roster update (line 486-489). Only block for trip-specific fields like `odometer_start`, `fuel_liters`, etc.

```text
Current flow:
  daily mode + no trip_id → ERROR (blocks everything)

Fixed flow:
  daily mode + no trip_id + roster field (route_label, remark) → update master roster
  daily mode + no trip_id + trip field (odometer, fuel) → ERROR (correct behavior)
```

The change is ~5 lines: instead of returning immediately when `!row?.trip_id`, check if the field is a "roster-level" field. If yes, let it fall through to the master roster update at line 486. If no, show the error.

## Files to Change
- `src/hooks/useFleetMasterSpreadsheet.ts` — modify the daily mode guard (line 415-420) to allow roster-level fields through when no trip exists

## Result
- New buses can have routes assigned immediately after being added, regardless of edit mode
- Trip-specific fields (odometer, fuel) still correctly require trip creation first
- Route changes in daily mode with existing trips continue to update both daily trip and master roster




# Fix: Fleet Sheet Tab Visibility

The "Fleet Sheet" tab exists in the code at `src/pages/DailyTrips.tsx` (line 101-104), positioned between "Daily Trips" and "Bus P&L". However, with 4 tabs, the `TabsList` may overflow on smaller screens, hiding the Fleet Sheet tab.

## Fix

In `src/pages/DailyTrips.tsx`, add `flex-wrap` or horizontal scroll to the `TabsList` so all 4 tabs are always visible:

- Line 96: Add `className="flex-wrap h-auto"` to `<TabsList>` to allow wrapping on narrow screens
- This ensures "Fleet Sheet" is always visible regardless of screen width

## Single file change
| File | Change |
|---|---|
| `src/pages/DailyTrips.tsx` line 96 | Add `flex-wrap h-auto` classes to `TabsList` |


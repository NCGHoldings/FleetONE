

# Pass Daily Trips Date to Quick Entry Page

## Problem

When you select a date on the Daily Trips page (e.g., April 1st) and click "Quick Entry", the Quick Entry page opens with **today's date** instead of the selected date. The user expects the same date to carry over.

## Root Cause

1. **DailyTrips.tsx line 262**: The "Quick Entry" button navigates to `/trips/quick-entry` without passing the selected date as a query parameter
2. **QuickTripsEntry.tsx line 38**: The page always initializes with `new Date()` and never reads a `date` query parameter from the URL

## Fix

### Step 1: Pass date from Daily Trips to Quick Entry
In `src/pages/DailyTrips.tsx`, update the Quick Entry navigation (lines 262 and 320) to include the selected date:
```
navigate(`/trips/quick-entry?date=${format(selectedDate, 'yyyy-MM-dd')}`)
```

### Step 2: Read date parameter in Quick Entry page
In `src/pages/QuickTripsEntry.tsx`, use `useSearchParams` to read the `date` query parameter and initialize `selectedDate` from it instead of always using `new Date()`:
```
const [searchParams] = useSearchParams();
const initialDate = searchParams.get('date') 
  ? parseISO(searchParams.get('date')!) 
  : new Date();
const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
```

The user can still change the date on the Quick Entry page using the existing date picker.

### Step 3: Also fix other Quick Entry navigations
In `src/components/trips/BusDailySummaryTable.tsx`, the "Add Trips" button (line 151) also navigates without a date — fix it to pass the current date too.

## Files to Change
- `src/pages/DailyTrips.tsx` — add `?date=` param to Quick Entry navigation (2 places)
- `src/pages/QuickTripsEntry.tsx` — read `date` from URL search params, use as initial date
- `src/components/trips/BusDailySummaryTable.tsx` — add `?date=` param to "Add Trips" navigation (line 151)

## Result
- Selecting April 1st on Daily Trips and clicking Quick Entry opens Quick Entry with April 1st pre-selected
- User can still change the date on the Quick Entry page if needed
- All navigation paths to Quick Entry consistently pass the date


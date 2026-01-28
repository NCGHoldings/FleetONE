
# Fix for Distance Calculation - search-locations Edge Function Crash

## Problem Summary

The distance calculation shows **391 km instead of 9 km** because:
1. The `search-locations` edge function crashes with `TypeError: supabase.from(...).upsert(...).catch is not a function`
2. This causes a 502 error when trying to fetch coordinates for selected locations
3. Without coordinates, the system falls back to geocoding, which returns wrong locations

## Root Cause

In `search-locations/index.ts` (lines 226-237), the code attempts to use `.catch()` directly on the Supabase query result:

```typescript
await supabase
  .from('cached_locations')
  .upsert({...})
  .catch(() => {});  // ← ERROR: .catch() doesn't exist on query builder response
```

The Supabase client's query builder doesn't return a raw Promise - it returns a `PostgrestFilterBuilder` object that resolves to `{ data, error }`. The `.catch()` method doesn't exist on this object.

## Solution

Fix the caching logic to handle errors properly using try-catch:

```typescript
// Cache the results in background (don't await)
Promise.all(
  suggestions.map(async (suggestion: any) => {
    try {
      await supabase
        .from('cached_locations')
        .upsert({
          place_id: suggestion.id,
          place_name: suggestion.place_name,
          main_text: suggestion.text,
          search_terms: [searchQuery],
          last_accessed_at: new Date().toISOString()
        }, { onConflict: 'place_id' });
    } catch (e) {
      // Ignore caching errors
    }
  })
).catch(() => {}); // ← This .catch() IS valid on Promise.all()
```

Also fix similar issue at line 99:
```typescript
// Current (broken):
.catch(() => {});

// Fixed:
try { ... } catch (e) { /* ignore */ }
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/search-locations/index.ts` | Replace `.catch()` on Supabase queries with proper try-catch blocks |

---

## Expected Result

After this fix:
1. `search-locations` function stops crashing with 502 errors
2. When user selects "Lyceum International School, Anuradhapura", Place Details API is called
3. Real coordinates (lat: ~8.32, lng: ~80.40) are returned to the form
4. Form passes coordinates to `calculate-distance`
5. Distance is calculated correctly as **~9 km** instead of 391 km

---

## Secondary Fix: Ensure Coordinates Pass Through

After fixing the edge function crash, verify:
1. LocationAutocomplete correctly receives coordinates from `getDetails` call
2. Coordinates are stored in `pickupCoords`/`dropCoords` state
3. Form passes coordinates to `calculate-distance` in the request body

---

## Testing Steps

1. Deploy fixed `search-locations` function
2. Test the function directly: `POST /search-locations` with `{"query": "Lyceum"}`
3. Verify no 502 error
4. In the Special Hire form, select a location from dropdown
5. Check browser console for "Fetched coordinates for..." log
6. Click "Calculate Costs"
7. Verify edge function logs show `pickupCoordsInput: [80.xx, 8.xx]` (not undefined)
8. Verify trip distance is ~9 km

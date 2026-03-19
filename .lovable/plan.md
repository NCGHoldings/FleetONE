

# Fix Location Picking & Wrong Trip Distances in Special Hire

## Problem
Two issues cause wrong trip distances in new quotations:

1. **Missing coordinates in multi-bus fleet path**: `calculateMultiBusFleetCosts` (line 792) calls `calculate-distance` without passing `pickupCoords`/`dropCoords`. This forces re-geocoding, which can resolve to wrong locations.

2. **No geocoding bias for ambiguous locations**: The `geocodeLK` function in the edge function only uses `components=country:LK`. Short Plus Codes and ambiguous place names can resolve to completely wrong locations. Using the pickup point as a bias for intermediate stops and drop-off would improve accuracy.

## Changes

### File 1: `src/components/special-hire/SpecialHireForm.tsx`

**Fix `calculateMultiBusFleetCosts`** (around line 792): Pass `pickupCoords` and `dropCoords` in the request body, same as the main calculation path does (lines 1166-1178). Also pass intermediate stop coordinates (lat/lng) that are already captured via `updateIntermediateStop`.

### File 2: `supabase/functions/calculate-distance/index.ts`

**Add location bias to `geocodeLK`**: 
- Add optional `biasLocation?: {lat: number, lng: number}` parameter
- When provided, append `&location=${lat},${lng}&bounds=${lat-0.5},${lng-0.5}|${lat+0.5},${lng+0.5}` to the Google Geocoding URL
- After resolving `pickupPoint`, pass it as bias when geocoding `dropLocation` and all intermediate stops (lines 197, 217)

## Files
- `src/components/special-hire/SpecialHireForm.tsx` — pass coordinates in multi-bus fleet path
- `supabase/functions/calculate-distance/index.ts` — add bias to `geocodeLK`, apply to drop + intermediate geocoding


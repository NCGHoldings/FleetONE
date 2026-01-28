
# Fix for Distance Calculation: Coordinates Not Being Passed

## Problem Summary

The distance calculation shows **391 km instead of 9 km** because coordinates are not being captured from location selection.

## Root Cause Analysis

### Finding 1: Edge Function Logs Confirm No Coordinates Received
```
pickupCoordsInput: undefined,
dropCoordsInput: undefined,
```

### Finding 2: LocationAutocomplete Returns [0, 0]
The `search-locations` edge function returns placeholder coordinates:
```typescript
// search-locations/index.ts line 220
coordinates: [0, 0], // Will be fetched when user selects
```

When user clicks a suggestion, `LocationAutocomplete` passes these `[0, 0]` values to the form.

### Finding 3: No Place Details API Call
The `LocationAutocomplete` component was designed to fetch real coordinates on selection using `getDetails`, but this was never implemented. The comment says "Will be fetched when user selects" but no such fetch exists.

### The Broken Flow
```text
1. User types "Lyceum International School"
2. search-locations returns suggestions with coordinates: [0, 0]
3. User clicks suggestion → LocationAutocomplete passes [0, 0] to form
4. Form stores pickupCoords = [0, 0] 
5. When calculating: [0, 0] is technically truthy but invalid
6. Edge function sees [0, 0] and should reject it → falls back to geocoding
7. Geocoding returns wrong location (Malabe instead of Anuradhapura)
```

---

## Solution: Fetch Coordinates on Selection

When the user selects a location from the dropdown, we need to fetch the actual coordinates using Google Place Details API.

### Step 1: Update LocationAutocomplete to Fetch Coordinates

Modify `handleSuggestionClick` to call the `search-locations` edge function with `getDetails: true` to fetch real coordinates:

```typescript
const handleSuggestionClick = async (suggestion: LocationSuggestion) => {
  skipNextSearchRef.current = true;
  lastSelectedValueRef.current = suggestion.place_name;
  
  // If coordinates are valid (not [0,0]), use them directly
  if (suggestion.coordinates && 
      suggestion.coordinates[0] !== 0 && 
      suggestion.coordinates[1] !== 0) {
    onChange(suggestion.place_name, suggestion.coordinates);
  } else {
    // Fetch real coordinates from Place Details API
    try {
      const { data } = await supabase.functions.invoke('search-locations', {
        body: { getDetails: true, placeId: suggestion.id }
      });
      
      if (data?.coordinates && data.coordinates[0] !== 0) {
        onChange(suggestion.place_name, data.coordinates);
      } else {
        // Fallback: just pass the name, edge function will geocode
        onChange(suggestion.place_name);
      }
    } catch (error) {
      console.warn('Failed to fetch coordinates:', error);
      onChange(suggestion.place_name);
    }
  }
  
  setShowSuggestions(false);
  setSuggestions([]);
  setHighlightedIndex(-1);
  
  if (inputRef.current) {
    inputRef.current.blur();
  }
};
```

### Step 2: Add Validation in Edge Function

Update `calculate-distance` to reject invalid `[0, 0]` coordinates:

```typescript
// calculate-distance/index.ts lines 173-179
const pickupPoint = pickupCoordsInput && 
  pickupCoordsInput.length === 2 && 
  pickupCoordsInput[0] !== 0 && 
  pickupCoordsInput[1] !== 0
    ? { lat: pickupCoordsInput[1], lng: pickupCoordsInput[0], formatted_address: pickupLocation }
    : await geocodeLK(pickupLocation);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ui/location-autocomplete.tsx` | Fetch real coordinates when user selects a location |
| `supabase/functions/calculate-distance/index.ts` | Reject invalid [0,0] coordinates and fall back to geocoding |

---

## API Cost Consideration

This solution adds one Place Details API call per location selection. Cost impact:
- Place Details: $17 per 1000 calls
- Estimated additional cost: ~$0.017 per location selected
- For 500 quotations/month with 3 locations each = 1,500 calls = ~$25.50/month

However, this is **necessary** for accurate distance calculation. The alternative (wrong 391 km calculations) leads to incorrect customer quotes and lost revenue.

---

## Alternative: Geocoding with Regional Bias

If Place Details cost is too high, we could enhance the geocoding in `calculate-distance` to use regional bias:

```typescript
// Add bounds for Sri Lanka to improve geocoding accuracy
const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:LK&bounds=5.9,79.4|10.0,82.0&key=${GOOGLE_API_KEY}`;
```

This is lower cost ($5/1000 vs $17/1000) but less reliable.

---

## Recommended Approach

Implement **Option 1** (fetch coordinates on selection) because:
1. It guarantees correct coordinates from the exact place the user clicked
2. It prevents all future geocoding errors
3. Cost increase is manageable within budget
4. Provides the best user experience

---

## Testing Plan

1. Select "Lyceum International School, Anuradhapura" from dropdown
2. Verify console logs show coordinates like `[80.39, 8.32]` (Anuradhapura area)
3. Add intermediate stop "Keells - Anuradhapura"
4. Click "Calculate Costs"
5. Verify edge function logs show `pickupCoordsInput: [80.xx, 8.xx]` (not undefined)
6. Verify trip distance is ~9 km (not 391 km)

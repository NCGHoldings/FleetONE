
# Fix for Wrong Distance Calculation (391 km instead of 9 km)

## Problem Summary

When creating a Special Hire quotation for:
- **Pickup**: Lyceum International School, Anuradhapura
- **Stop**: Keells - Anuradhapura  
- **Drop**: Lyceum International School, Anuradhapura

The system calculates **391 km** instead of the correct **9 km** shown in Google Maps.

## Root Cause

### Critical Finding from Edge Function Logs

The user typed "Lyceum International School, 128, Isurupura New Kandy Rd, **Anuradhapura** 50000" but Google Geocoding returned:
```
lat: 6.9135511, lng: 79.978717
formatted_address: "Isurupura, Malabe, Sri Lanka"
```

**Malabe is near Colombo, ~170 km from Anuradhapura!** Google matched "Isurupura" (a common place name) to the wrong location.

### Why This Happens

1. **When user selects a location from the autocomplete dropdown**, the `LocationAutocomplete` component returns BOTH the place name AND coordinates
2. **But the form only captures the text** and discards the coordinates
3. **During cost calculation**, the system re-geocodes the text address using Google
4. **Google returns the WRONG location** because it matches "Isurupura" to Malabe instead of Anuradhapura

### Code Evidence

**Current code (broken):**
```typescript
// SpecialHireForm.tsx line 2021-2025
<LocationAutocomplete
  value={field.value || ""}
  onChange={field.onChange}  // ← Only stores text, loses coordinates!
  placeholder="Enter pickup location"
/>
```

The `LocationAutocomplete.onChange` signature accepts coordinates:
```typescript
onChange: (value: string, coordinates?: [number, number]) => void
```

But `field.onChange` from react-hook-form only stores the string!

**Same issue for intermediate stops (line 2066):**
```typescript
onChange={(value) => updateIntermediateStop(stop.id, value)}
// The updateIntermediateStop function ignores coordinates completely
```

---

## Technical Solution

### Step 1: Add Coordinate State

Add new state variables to track coordinates:
```typescript
const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
const [dropCoords, setDropCoords] = useState<[number, number] | null>(null);
```

### Step 2: Capture Coordinates on Location Selection

**For Pickup Location:**
```typescript
<LocationAutocomplete
  value={field.value || ""}
  onChange={(value, coords) => {
    field.onChange(value);
    if (coords) {
      setPickupCoords(coords);
    }
  }}
  placeholder="Enter pickup location"
/>
```

**For Drop Location:**
```typescript
<LocationAutocomplete
  value={field.value || ""}
  onChange={(value, coords) => {
    field.onChange(value);
    if (coords) {
      setDropCoords(coords);
    }
  }}
  placeholder="Enter drop location"
/>
```

### Step 3: Update Intermediate Stops Handler

Change the `updateIntermediateStop` function to accept coordinates:
```typescript
const updateIntermediateStop = (id: string, location: string, coords?: [number, number]) => {
  setIntermediateStops(intermediateStops.map(stop => 
    stop.id === id 
      ? { ...stop, location, lat: coords?.[1], lng: coords?.[0] } 
      : stop
  ));
};
```

Update the JSX:
```typescript
<LocationAutocomplete
  value={stop.location}
  onChange={(value, coords) => updateIntermediateStop(stop.id, value, coords)}
  placeholder={`Stop ${index + 1} location`}
  className="flex-1"
/>
```

### Step 4: Pass Coordinates to Distance Calculation

Update the distance calculation body to include coordinates when available:
```typescript
let distanceCalculationBody: any = {
  pickupLocation: data.pickupLocation,
  dropLocation: data.dropLocation,
  intermediateStops: validIntermediateStops,
  numberOfBuses: data.numberOfBuses,
};

// CRITICAL: Pass coordinates to skip re-geocoding
if (pickupCoords) {
  distanceCalculationBody.pickupCoords = pickupCoords;
}
if (dropCoords) {
  distanceCalculationBody.dropCoords = dropCoords;
}
```

### Step 5: Load Coordinates When Editing

When loading an existing quotation for editing, initialize the coordinate state:
```typescript
// In the initialization useEffect
if (isEditing && initialData) {
  if (initialData.pickup_lat && initialData.pickup_lng) {
    setPickupCoords([initialData.pickup_lng, initialData.pickup_lat]);
  }
  if (initialData.drop_lat && initialData.drop_lng) {
    setDropCoords([initialData.drop_lng, initialData.drop_lat]);
  }
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/special-hire/SpecialHireForm.tsx` | Add coordinate state, capture coordinates on selection, pass to distance calculation |

---

## Expected Outcome

After this fix:
1. When user selects "Lyceum International School" in Anuradhapura from autocomplete → coordinates are captured
2. During cost calculation → system uses captured coordinates instead of re-geocoding
3. Distance is calculated correctly as **~9 km** instead of 391 km

---

## Why This Was Missed

1. The LocationAutocomplete component was correctly designed to return coordinates
2. But the form integration didn't capture them
3. The issue only appears when Google geocoding returns ambiguous results
4. "Isurupura" is a place name that exists in multiple locations in Sri Lanka


# Special Hire: Manual Trip Distance Override Feature

## Overview
Add an option to manually enter/override the trip distance (Pickup → Drop) after the initial Google Maps calculation. This allows staff to adjust the main route distance when Google Maps calculations don't match reality or when using known routes.

## Current Manual Override vs. New Feature

| Feature | Distances Covered |
|---------|-------------------|
| **Manual Parking Distance Override** | Parking → Pickup, Drop → Parking (empty run) |
| **Manual Trip Distance Override (NEW)** | Pickup → Drop (main trip distance) |

## How It Works

1. User fills form and clicks "Calculate" - Google Maps calculates all distances
2. After calculation, user enables "Manual Trip Distance Override" toggle
3. Input field appears for "Trip Distance (Pickup → Drop)"
4. User enters custom distance
5. System recalculates costs (hire charge, exceeding distance, etc.) based on manual trip distance

## Implementation Details

### Phase 1: State Management (`SpecialHireForm.tsx`)

Add new state variables:
```typescript
const [useManualTripDistance, setUseManualTripDistance] = useState(initialData?.uses_manual_trip_distance || false);
const [manualTripDistance, setManualTripDistance] = useState<number>(initialData?.manual_km_trip || 0);
const [originalCalculatedTripDistance, setOriginalCalculatedTripDistance] = useState<number>(0);
```

### Phase 2: UI Toggle & Input Fields

Add below the Manual Parking Distance Override section (around line 2135):

```
┌─────────────────────────────────────────────────────────┐
│ [Toggle] Manual Trip Distance Override                  │
│          "Enter custom trip distance manually"          │
│                                                         │
│ When enabled:                                           │
│ ┌─────────────────────────────────────┐                │
│ │ Trip Distance (Pickup → Drop)       │                │
│ │ [_______150_______] km              │                │
│ │ Google calculated: 152.3 km         │                │
│ └─────────────────────────────────────┘                │
│                                                         │
│ [Recalculate with Manual Trip Distance] button          │
│ [Reset to Google Calculated Value] link                 │
└─────────────────────────────────────────────────────────┘
```

### Phase 3: Recalculation Logic

When manual trip distance is entered and recalculate is clicked:

```typescript
// Recalculate with manual trip distance
const tripDistance = manualTripDistance;

// Find appropriate rate card based on manual distance
const rateCard = allRateCards.find(card => 
  tripDistance >= card.from_km && 
  (card.to_km === null || tripDistance <= card.to_km)
);

// Recalculate:
// - Hire charge (from rate card)
// - Fixed rate
// - Exceeding distance charge (if applicable)
// - Available hours (tripDistance / 10 km/h)
// - Overtime/overnight charges
// - Total distance and fuel costs
```

### Phase 4: Database Storage

Add new columns to `special_hire_quotations`:

| Column | Type | Purpose |
|--------|------|---------|
| `uses_manual_trip_distance` | boolean | Flag indicating manual trip distance override |
| `manual_km_trip` | numeric | User-entered trip distance |

### Phase 5: Cost Breakdown Display Update

Update `CostBreakdown.tsx` to show when manual trip distance is used:

```
Distance Analysis:
  Parking → Pickup: 21.5 km
  Trip Distance: 150 km (Manual)  ← Badge indicator
  Drop → Parking: 32.6 km
  Total: 204.1 km
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/special-hire/SpecialHireForm.tsx` | Add state, UI toggle, input field, recalculation logic |
| `src/components/special-hire/CostBreakdown.tsx` | Show "(Manual)" badge for trip distance |
| Database migration | Add `uses_manual_trip_distance`, `manual_km_trip` columns |
| `src/integrations/supabase/types.ts` | Update types for new columns |

## Calculation Impact

When manual trip distance is used, the following are recalculated:
- **Rate Card Selection**: Based on manual distance instead of Google Maps
- **Hire Charge**: From matched rate card
- **Exceeding Distance**: If manual distance > rate card coverage
- **Available Hours**: `manual_km_trip / 10` for overtime calculation
- **Total Distance**: Parking + Manual Trip + Parking
- **Fuel Cost**: Based on new total distance

## User Flow

```
1. User fills quotation form with locations
2. Clicks "Calculate" → System calculates via Google Maps API
3. Distance Analysis shows: Trip Distance: 152.3 km
4. User knows the actual route is 150 km
5. Enables "Manual Trip Distance Override" toggle
6. Input field appears with current value (152.3)
7. User changes to 150
8. Clicks "Recalculate with Manual Trip Distance"
9. System recalculates all charges with manual distance
10. Distance Analysis shows: Trip Distance: 150 km (Manual)
11. On save, manual trip distance is stored in database
```

## Edge Cases

1. **Editing quotation**: Load saved manual trip distance and toggle state
2. **Combined overrides**: Can use both parking override AND trip override together
3. **Reset capability**: Allow reset to Google calculated value
4. **Validation**: Manual distance must be > 0


# Special Hire: Manual Parking Distance Override Feature

## Overview
Add an option to manually enter/override the "Parking to Pickup" and "Drop to Parking" distances after the initial calculation. This allows staff to adjust distances when Google Maps calculations don't match reality or when using known routes.

## Current Options vs. New Feature

| Option | Behavior |
|--------|----------|
| **Standard** | Google Maps calculates all distances automatically |
| **Use Pickup as Parking** | Sets parking distances to 0 (no empty run) |
| **Manual Distance Override (NEW)** | User enters specific parking distances manually |

## How It Works

1. User fills form and clicks "Calculate" - Google Maps calculates distances normally
2. After calculation, user enables "Manual Distance Override" toggle
3. Input fields appear for "Parking → Pickup" and "Drop → Parking" distances
4. User enters custom distances
5. System recalculates costs with the manual distances (fuel, totals, etc.)

## Implementation Details

### Phase 1: State Management (`SpecialHireForm.tsx`)

Add new state variables:
```typescript
const [useManualParkingDistance, setUseManualParkingDistance] = useState(false);
const [manualParkingToPickup, setManualParkingToPickup] = useState<number>(0);
const [manualDropToParking, setManualDropToParking] = useState<number>(0);
```

Initialize from `initialData` when editing:
```typescript
const [useManualParkingDistance, setUseManualParkingDistance] = useState(
  initialData?.uses_manual_parking_distance || false
);
const [manualParkingToPickup, setManualParkingToPickup] = useState<number>(
  initialData?.manual_km_parking_to_pickup || 0
);
const [manualDropToParking, setManualDropToParking] = useState<number>(
  initialData?.manual_km_drop_to_parking || 0
);
```

### Phase 2: UI Toggle & Input Fields

Add below the "Use Pickup as Parking" toggle (around line 1965):

```text
┌─────────────────────────────────────────────────────────┐
│ [Toggle] Manual Parking Distance Override               │
│          "Enter custom parking distances manually"      │
│                                                         │
│ When enabled:                                           │
│ ┌─────────────────┐  ┌─────────────────┐               │
│ │ Parking→Pickup  │  │ Drop→Parking    │               │
│ │ [____45____] km │  │ [____45____] km │               │
│ └─────────────────┘  └─────────────────┘               │
│                                                         │
│ [Recalculate with Manual Distances] button              │
└─────────────────────────────────────────────────────────┘
```

### Phase 3: Calculation Logic Update

When `useManualParkingDistance` is enabled, override the API-returned distances:

```typescript
// After distance calculation returns
let kmParkingToPickup = distanceData.kmParkingToPickup || 0;
let kmDropToParking = distanceData.kmDropToParking || 0;

// Override with manual values if enabled
if (useManualParkingDistance) {
  kmParkingToPickup = manualParkingToPickup;
  kmDropToParking = manualDropToParking;
}

// Use these values for fuel cost calculation
const totalEmptyRun = kmParkingToPickup + kmDropToParking;
const fuelCost = totalEmptyRun * (fuelSettings.diesel_price_lkr_per_l / busEfficiency);
```

### Phase 4: Database Storage

Add new columns to `special_hire_quotations`:

| Column | Type | Purpose |
|--------|------|---------|
| `uses_manual_parking_distance` | boolean | Flag indicating manual override is enabled |
| `manual_km_parking_to_pickup` | numeric | User-entered parking to pickup distance |
| `manual_km_drop_to_parking` | numeric | User-entered drop to parking distance |

### Phase 5: Cost Breakdown Display Update

Update `CostBreakdown.tsx` to show when manual distances are used:

```text
Distance Analysis:
  Parking → Pickup: 45 km (Manual)
  Trip Distance: 150 km
  Drop → Parking: 45 km (Manual)
  Total: 240 km
```

## Mutual Exclusivity

- **Manual Distance Override** is mutually exclusive with **Use Pickup as Parking**
- If one is enabled, the other is automatically disabled
- **Manual Override** can work with or without **Multi-parking** mode

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/special-hire/SpecialHireForm.tsx` | Add state, UI toggle, input fields, calculation override, save logic |
| `src/components/special-hire/CostBreakdown.tsx` | Show "(Manual)" badge when manual distances used |
| Database migration | Add 3 new columns to `special_hire_quotations` table |
| `src/integrations/supabase/types.ts` | Update types for new columns |

## User Flow

```text
1. User fills quotation form with locations
2. Clicks "Calculate" → System calculates via Google Maps API
3. Cost breakdown shows: Parking→Pickup: 52 km, Drop→Parking: 48 km
4. User knows the actual distance is 45 km each way
5. Enables "Manual Parking Distance Override" toggle
6. Input fields appear with current values (52, 48)
7. User changes to 45 and 45
8. Clicks "Recalculate with Manual Distances"
9. System recalculates fuel costs with manual values
10. Cost breakdown shows: Parking→Pickup: 45 km (Manual)
11. On save, manual distances are stored in database
```

## Edge Cases

1. **Editing quotation**: Load saved manual values and toggle state
2. **Reset to calculated**: When toggle is disabled, revert to original API-calculated distances
3. **Validation**: Manual distances must be >= 0
4. **Display only after calculation**: Manual override option only appears after initial calculation

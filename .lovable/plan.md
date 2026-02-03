
# Special Hire: "Use Pickup as Parking" Feature

## Overview
Add an option to mark the customer's pickup location as the same as the parking location. When enabled, this eliminates the "Parking to Pickup" and "Drop to Parking" distance segments and their associated fuel costs from the quotation.

## Business Logic

| Scenario | Parking → Pickup | Trip Distance | Drop → Parking | Fuel Cost |
|----------|------------------|---------------|----------------|-----------|
| Normal | Calculated | Calculated | Calculated | Based on empty run |
| Pickup as Parking | **0 km** | Calculated | **0 km** | **0 LKR** |

When the bus is already at the customer pickup point (e.g., customer picks up from depot), there's no empty run, so no fuel cost to pass to customer.

---

## Implementation Details

### Phase 1: Form UI Changes (`SpecialHireForm.tsx`)

Add a toggle switch below the parking location selector:

```text
Parking Location: [Dropdown]

[Toggle] Pickup Location Same as Parking
         "Bus starts from customer pickup point - no empty run"
```

**State Management:**
- Add `const [usePickupAsParking, setUsePickupAsParking] = useState(false)`
- When enabled: disable parking location dropdown, show informational badge
- Initialize from `initialData.uses_pickup_as_parking` when editing

### Phase 2: Distance Calculation (`calculate-distance/index.ts`)

Modify edge function to accept and handle new parameter:

```typescript
const {
  // ... existing params
  usePickupAsParking = false,  // NEW
} = await req.json()

// When usePickupAsParking is true:
if (usePickupAsParking) {
  return {
    kmParkingToPickup: 0,
    kmTrip: [calculated normally],
    kmDropToParking: 0,
    // ... rest of response
    usePickupAsParking: true,
  };
}
```

### Phase 3: Data Storage

Store the setting in the quotation record:

| Field | Type | Purpose |
|-------|------|---------|
| `uses_pickup_as_parking` | boolean | Flag to indicate pickup = parking |

**Note:** The `parking_location_id` will still be stored (as a fallback reference), but when `uses_pickup_as_parking = true`, the system ignores parking distances.

### Phase 4: Cost Calculation Updates

When `usePickupAsParking` is enabled:
- `kmParkingToPickup = 0`
- `kmDropToParking = 0`
- `fuelCostFuelOnly = 0` (no empty run = no fuel cost to customer)
- Customer total = Hire charge only (no fuel addon)

### Phase 5: Display Updates (`CostBreakdown.tsx`)

Update Distance Analysis section to handle this case:

```text
Distance Analysis:
  Parking → Pickup: 0 km (Same location)
  Trip Distance: 150 km
  Drop → Parking: 0 km (Same location)
  Total: 150 km

Fuel Cost (Empty Run): LKR 0 (No empty run)
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/special-hire/SpecialHireForm.tsx` | Add toggle, state, pass to edge function, save to DB |
| `supabase/functions/calculate-distance/index.ts` | Handle `usePickupAsParking` param, return 0 for parking distances |
| `src/components/special-hire/CostBreakdown.tsx` | Display "(Same location)" when applicable |

---

## UI Preview

```text
┌─────────────────────────────────────────────────────┐
│ Hire Type:        [Outside ▼]                       │
│                                                     │
│ Parking Location: [Colombo Depot ▼] (disabled)      │
│                                                     │
│ ☑ Pickup Location Same as Parking                   │
│   Bus starts from customer pickup - no empty run    │
│                                                     │
│ Multi-parking:    [ ] Different locations per bus   │
└─────────────────────────────────────────────────────┘
```

---

## Edge Cases

1. **Multi-parking mode**: When `usePickupAsParking` is enabled, multi-parking should be disabled (mutually exclusive)
2. **Editing**: Load `uses_pickup_as_parking` from database and restore UI state
3. **PDF Generation**: Quotation document should reflect "0 km" for parking segments

---

## Data Flow

```text
1. User enables "Pickup Location Same as Parking" toggle
2. Parking location dropdown becomes disabled
3. User clicks "Calculate"
4. Edge function receives usePickupAsParking: true
5. Edge function returns kmParkingToPickup: 0, kmDropToParking: 0
6. Form calculates: fuelCostFuelOnly = 0
7. CostBreakdown shows: "0 km (Same location)"
8. On save: uses_pickup_as_parking = true stored in DB
```

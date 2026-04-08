

# Fix: Bulk Add Added School & Special Hire Buses — Revert and Filter

## Problem
You clicked "Bulk Add All" and it added all 218 buses from the fleet — including 93 School Buses and 6 Special Hire buses. The Fleet Sheet should only contain **Public Bus** category buses (119 buses).

## Fix

### 1. Database Migration — Remove non-Public Bus roster entries
Delete roster entries for buses that belong to "School Bus" or "Special Hire" categories:
```sql
DELETE FROM fleet_master_roster 
WHERE bus_id IN (
  SELECT id FROM buses 
  WHERE category_id IN (
    'd4accac9-0ff0-4147-9f03-b316920e3c73',  -- School Bus
    '6193b18f-3d26-4392-a03d-e43aa36b05f8'   -- Special Hire
  )
);
```
This removes ~99 incorrectly added entries and restores the roster to Public Bus only.

### 2. Fix `bulkAddAllBuses` — Filter by Public Bus category only
**File: `src/hooks/useFleetMasterSpreadsheet.ts` (line 629)**

Change the query from:
```typescript
supabase.from("buses").select("id, bus_no, route")
```
To:
```typescript
supabase.from("buses").select("id, bus_no, route, category_id")
  .eq("category_id", "8ba0dd7b-c503-4c3e-86e0-ac68480f3f8c") // Public Bus only
```

### 3. Fix `loadAvailableBuses` — Also filter by Public Bus
**File: `src/components/fleet/FleetMasterSpreadsheet.tsx` (line 53-58)**

Same filter — the "Add Bus" dropdown should only show Public Bus category buses.

## Files to Change
- New SQL migration — delete non-Public Bus roster entries
- `src/hooks/useFleetMasterSpreadsheet.ts` — filter bulkAddAllBuses to Public Bus category
- `src/components/fleet/FleetMasterSpreadsheet.tsx` — filter loadAvailableBuses to Public Bus category

## Result
- Roster reverts to ~119 Public Bus entries (your original 46 + any others)
- "Bulk Add All" only adds Public Bus category buses going forward
- "Add Bus" dropdown only shows Public Bus options
- School Bus and Special Hire buses never appear in the Fleet Sheet


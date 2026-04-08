

# Fix: SBS Buses Incorrectly Categorized as Public Bus Instead of School Bus

## Problem

85 buses with type starting with "SBS" (School Bus Service) — like "SBS KURUNEGALA", "SBS PANADURA", "SBS WATTALA", etc. — are all categorized as "Public Bus". They should be "School Bus".

This happens because the import logic in `FleetVehicleDataImport.tsx` only checks if the type contains "school" or "special", and defaults everything else to "Public Bus". "SBS" doesn't match "school", so it falls through.

**Affected buses**: 85 total across 7 SBS depots (Kurunegala: 27, Wattala: 21, Nugegoda: 12, Panadura: 11, Anuradhapura: 7, Nuwaraeliya: 5, Rathnapura: 2).

## Implementation

### Step 1: Fix existing data — Migration to re-categorize SBS buses
Create a migration that updates all buses where `type ILIKE 'SBS%'` to set `category_id` to the School Bus category ID (`d4accac9-0ff0-4147-9f03-b316920e3c73`).

```sql
UPDATE buses 
SET category_id = 'd4accac9-0ff0-4147-9f03-b316920e3c73',
    category_assignment_source = 'auto_sbs_fix'
WHERE type ILIKE 'SBS%';
```

### Step 2: Fix import logic — `FleetVehicleDataImport.tsx`
Update `getCategoryId()` (line 361-367) to recognize "SBS" prefix as School Bus:

```typescript
const getCategoryId = (usageType?: string): string | undefined => {
  if (!usageType) return catByName.get("public bus");
  const u = usageType.toLowerCase().trim();
  if (u.includes("school") || u.startsWith("sbs")) return catByName.get("school bus");
  if (u.includes("special")) return catByName.get("special hire");
  return catByName.get("public bus");
};
```

This ensures future imports also correctly categorize SBS buses.

## Files to Change
- New migration SQL — bulk update 85 buses to School Bus category
- `src/components/fleet/FleetVehicleDataImport.tsx` — add `u.startsWith("sbs")` check in `getCategoryId()`

## Result
- All 85 SBS buses immediately show as "School Bus" in Fleet Management
- Future Excel imports correctly auto-assign SBS buses to School Bus category


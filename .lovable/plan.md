

# Fix: Fleet Import — Category Assignment, Missing Buses & NOT NULL Errors

## Problems Identified

### 1. Insert Fails with `null value in column "type" violates not-null constraint`
The `buses.type` column is NOT NULL. When Excel's "Usage Type" is empty, the import tries to insert without `type`, causing 41 buses to be skipped (screenshot shows "109 created, 41 skipped"). The `year` and `capacity` columns are also NOT NULL.

### 2. Categories Not Auto-Assigned from Excel Data
The Excel has a "Permit Category" column (values: Normal, Semi, A/C, Super Luxury, etc.) and "Usage Type" column (School Hire, Public Transport, Parked, etc.). These should map to the existing `bus_categories` (Public Bus, School Bus, Special Hire) and `bus_sub_categories` (Semi Luxury, Super Luxury, Leyland).

Currently 137 out of 184 buses have no category assigned.

### 3. All Excel Columns Must Be Captured
The Excel has columns like "Documents", "Insurence Month", "Licence", "Amount Revenue Expire", "Days To Revenue", "Days to expire Insurence" that aren't mapped. Some are computed/display-only, but "Documents" and "Licence" could be useful.

## Plan

### Fix 1: Default NOT NULL fields for new buses
In `handleImport`, when creating new buses, set defaults:
- `type`: Use Excel's "Usage Type" if present, otherwise `"Public Transport"` (most common)
- `year`: Use Excel year if present, otherwise `2000`
- `capacity`: Use Excel capacity if present, otherwise `54`

### Fix 2: Auto-assign category from Excel data
During import, map Excel "Usage Type" and "Permit Category" to categories:

| Excel Usage Type | Category | Sub-Category |
|---|---|---|
| School Hire | School Bus | — |
| Special Hire | Special Hire | — |
| Public Transport, SBS*, NAS, Highway, Inter-City, City, Normal, A/C | Public Bus | — |
| Parked, Repair | Public Bus (default) | — |

| Excel Permit Category | Sub-Category |
|---|---|
| Semi, Semi Luxury | Semi Luxury |
| Super Luxury | Super Luxury |
| Normal, Luxury Service, Expressway, A/C | — (none) |

Logic:
1. Fetch `bus_categories` and `bus_sub_categories` once before the loop
2. For each row, determine `category_id` from usage type mapping
3. Determine `sub_category_id` from permit category mapping
4. Set `category_assignment_source = 'excel_import'`
5. Apply to both updates and new inserts

### Fix 3: Add missing header synonyms
Add synonyms for columns not yet mapped:
- `revenue_license_expiry`: add "licence", "license"
- `insurance_expiry`: add "insurence month" (already there but verify exact match)
- "Documents" column — add as a new mapped field `documents_status` (text, informational)
- "Amount Revenue Expire" — this is a monetary value, likely the revenue license fee

### Fix 4: Ensure all 217 buses import (0 skipped)
The 41 skipped buses failed due to NOT NULL constraint. With defaults added, all should succeed.

## Files
- **Modify**: `src/components/fleet/FleetVehicleDataImport.tsx`
  - Add NOT NULL defaults (`type`, `year`, `capacity`) for new bus inserts
  - Add category/sub-category auto-assignment logic using `bus_categories` and `bus_sub_categories` tables
  - Add broader header synonyms for "licence", "documents"
  - Log which Excel rows fail with the actual error for debugging


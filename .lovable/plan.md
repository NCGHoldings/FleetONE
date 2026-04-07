
## What I found

- The Fleet page showing **185** is not the real DB total anymore — the database currently has **187 buses**, so the page count/import refresh is out of sync.
- The importer still has **2 hard schema bugs**:
  1. it writes `route_id` into `buses`, but `buses` has **no `route_id` column**
  2. it writes `documents_status` into `buses`, but `buses` has **no `documents_status` column**
  
  Any row containing those values can fail and end up as skipped.
- Header matching is still too loose. It uses `includes(...)` with generic aliases like `name`, `owner`, `insurance`, `license`, `phone`, so Excel columns can map to the wrong fields.
- Some Excel columns still do not have a proper storage target, so “all columns captured” is not true yet.
- Current data confirms the import is incomplete: **124 buses are still uncategorized**, and many buses still miss permit/owner/leasing/driver data.

## Plan

### 1. Fix the broken importer payload
Update `FleetVehicleDataImport.tsx` so it only writes real columns into `buses`.

- Keep on `buses`:
  - `bus_no`
  - `vehicle_name`
  - `vehicle_brand`
  - `permit_no`
  - `permit_category`
  - `capacity`
  - `chassis_number`
  - `engine_number`
  - `type`
  - `route`
  - `year`
  - owner/leasing/insurance/driver fields
  - `category_id`
  - `sub_category_id`
- Stop sending invalid fields to `buses`:
  - `route_id`
  - `documents_status` unless we add it via migration first

### 2. Replace header matching with safer logic
The current matcher is too broad and can mis-map columns.

Implement a deterministic mapping flow:
- exact normalized header match first
- approved alias match second
- no generic catch-all aliases like `name`, `owner`, `insurance`, `license`, `phone`
- preview screen shows **Excel column -> system field** before import
- ambiguous columns like `Ownership`, `Licence`, `Amount Revenue Expire`, `Insurance Month`, `Documents` are shown clearly instead of guessed silently

### 3. Capture every Excel column properly
Your Excel columns must all be preserved.

Add a migration for missing fields that currently have no clean home, for example:
- `ownership_type`
- `revenue_amount`
- `insurance_month`
- `documents_status`

Also add a raw import snapshot/audit field so **no Excel column is lost**, even if we later refine the structured mapping.

For derived columns like:
- `Days To Revenue`
- `Days to expire Insurence`

we can calculate them from expiry dates in the UI, but still preserve the imported raw value for audit if needed.

### 4. Sync both fleet tables, not just `buses`
Some operational data belongs in `fleet_master_roster`, not only in `buses`.

During import:
- upsert `buses` by normalized `bus_no`
- auto-create missing buses from Excel
- also upsert `fleet_master_roster` for:
  - route allocation
  - route label / route id
  - default driver
  - permit/operational type if relevant

This is important because right now `fleet_master_roster` only has **43 rows**, so many imported buses are not reflected in operations views.

### 5. Fix category and sub-category assignment
Use Excel data to assign categories consistently:

- `Usage Type` -> main category
  - School -> School Bus
  - Special -> Special Hire
  - everything else -> Public Bus
- `Permit Catagory` -> sub-category
  - Semi / Semi Luxury -> Semi Luxury
  - Super Luxury -> Super Luxury
  - other values -> leave blank or exact match if configured

This should eliminate the current **124 uncategorized** buses after re-import.

### 6. Expand the Bus Master Data Sheet
Update the master sheet so it actually shows the imported master data.

Add sections/fields for:
- category + sub-category
- usage type
- allocation route
- ownership
- owner details
- leasing details
- permit details
- revenue/license details
- insurance company + expiry + month
- driver details
- documents status
- import audit / raw source snapshot

Files:
- `src/hooks/useBusMasterData.ts`
- `src/components/fleet/BusMasterOverviewTab.tsx`

### 7. Improve import QA and final counts
The importer should not just say “skipped”.

Add:
- row-by-row failure list with bus number + exact error
- field-by-field preview instead of only “18 fields”
- forced refetch after import completes
- fleet counter must reflect actual DB rows immediately

## Technical details

### Files to update
- `src/components/fleet/FleetVehicleDataImport.tsx`
- `src/pages/FleetManagement.tsx`
- `src/hooks/useBusMasterData.ts`
- `src/components/fleet/BusMasterOverviewTab.tsx`
- `src/integrations/supabase/types.ts`

### Database work
- new migration for missing vehicle master-data columns and import audit storage

## Expected result

After this fix:
- Fleet count matches the real database
- all Excel buses can be imported/updated correctly
- no Excel column is silently dropped
- Semi Luxury / Super Luxury and other category logic works properly
- the Master Data Sheet becomes the full source of truth for each bus

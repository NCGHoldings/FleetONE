

# Fleet Vehicle Master Data Import from Operations Excel

## Problem
Your operations team maintains a comprehensive Excel sheet with 100% accurate vehicle data (permits, chassis, engine, insurance, leasing, ownership, etc.), but the system's `buses` table has almost none of this filled in — 0 out of 75 buses have engine/chassis numbers, owner info, or leasing details. We need a bulk import tool that matches buses by Vehicle No and populates all missing fields.

## Excel Column → Database Mapping

| Excel Column | Target | Status |
|---|---|---|
| Vehicle No | `buses.bus_no` | **Match key** (normalized) |
| Vehicle Name | `buses.vehicle_name` | **New column needed** |
| Vehicle Brand | `buses.vehicle_brand` | **New column needed** |
| Permit No | `buses.permit_no` | **New column needed** |
| Permit Category | `buses.permit_category` | **New column needed** |
| Seating Capacity | `buses.capacity` | Exists |
| Chassis No | `buses.chassis_number` | Exists (empty) |
| Engine No | `buses.engine_number` | Exists (empty) |
| Usage Type | `buses.type` | Exists |
| Allocation Route | `buses.route` | Exists |
| YOM | `buses.year` | Exists |
| Ownership | `buses.owner_name` | Exists (empty) |
| Owner's Address | `buses.owner_address` | Exists (empty) |
| Owner's ID | `buses.owner_nic` | Exists (empty) |
| Leasing Bank | `buses.leasing_bank` | **New column needed** |
| Leasing End Date | `buses.leasing_end_date` | **New column needed** |
| Permit Expiry Date | `buses.permit_expiry_date` | **New column needed** |
| Revenue Expire | `buses.revenue_license_expiry` | Exists (mostly empty) |
| Insurance Company | `buses.insurance_company` | **New column needed** |
| Insurance Expiry Date | `buses.insurance_expiry` | Exists (mostly empty) |
| Driver Name | `buses.default_driver_name` | **New column needed** |
| Phone Number | `buses.driver_phone` | **New column needed** |

## Plan

### Step 1: Database Migration
Add 10 new columns to `buses` table:
- `vehicle_name`, `vehicle_brand`, `permit_no`, `permit_category`
- `leasing_bank`, `leasing_end_date`
- `permit_expiry_date`, `insurance_company`
- `default_driver_name`, `driver_phone`

### Step 2: Fleet Vehicle Data Import Component
New `FleetVehicleDataImport.tsx` component accessible from Fleet Management page:
- Upload Excel file (the operations sheet)
- Auto-detect headers using synonym matching (same pattern as `FleetExcelImport`)
- Match each row to existing buses by normalized `bus_no`
- Show preview table with match status: Matched (green), New (yellow), Conflict (orange)
- For matched buses: show which fields will be updated (only non-empty Excel values overwrite)
- For unmatched: option to create new bus records
- **Import button** updates all matched buses in bulk

### Step 3: Import Logic
- Normalize bus numbers using existing `normalizeBusNo()` utility
- For each matched bus: UPDATE only the fields that have values in the Excel
- For unmatched buses with "Auto-create" enabled: INSERT new bus records
- Show summary: X updated, Y created, Z skipped
- After import, also update `insurance_records` table if insurance company + expiry provided
- Update `route_permits` if permit_no + expiry provided

### Step 4: Add to Fleet Management Page
Add an "Import Vehicle Data" button (next to existing Fleet Roster import) that opens this new import dialog.

## Files
- **New migration**: Add 10 columns to `buses` table
- **New**: `src/components/fleet/FleetVehicleDataImport.tsx` — Excel upload, parse, preview, bulk update
- **Modify**: `src/pages/FleetManagement.tsx` — add "Import Vehicle Data" button
- **Modify**: `src/integrations/supabase/types.ts` — update Bus type with new columns

## Result
- One-click import from the operations Excel to populate all 75+ buses with complete vehicle data
- Existing bus numbers are matched and updated (not duplicated)
- New buses in Excel but not in system are auto-created
- All fields (permits, insurance, leasing, ownership, chassis/engine) populated from the single source of truth


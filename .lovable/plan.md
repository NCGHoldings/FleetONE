

# Grant Super Admin Access to lghsashi@gmail.com

## Current State
- **User ID**: `461d6742-d4a5-492b-889a-7f11a2ebf2c2`
- **Current role**: `staff` only
- **Current page access**: All 24 pages set to `false`

## What Needs to Happen

### 1. Create a temporary edge function `grant-full-access`
A simple edge function that uses the service role key to:
- Add `super_admin` role to `user_roles` table
- Set `has_access = true` for all 26 pages in `user_page_permissions`

### 2. Deploy and call it
- Deploy the function
- Call it with `{ "target_email": "lghsashi@gmail.com" }`
- Verify the changes took effect

### 3. Clean up
- Delete the edge function after use (it's a one-time admin operation)

### Pages to grant (26 total)
`dashboard`, `customers`, `daily_trips`, `fleet_management`, `maintenance`, `insurance`, `staff_management`, `staff_performance`, `route_permits`, `driver_training`, `real_time_tracking`, `driver_allocation`, `staff_attendance`, `school_bus_service`, `complaints`, `special_hire`, `document_manager`, `feedback`, `yutong_quotations`, `yutong_bus_models`, `yutong_addons`, `nsp_daily_sales`, `nsp_summary`, `governance_calendar`, `seasonal_themes`, `accounting`


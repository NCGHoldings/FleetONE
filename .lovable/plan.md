

# Grant Super Admin Access to abiwork12345@gmail.com

## Current State
- **User ID**: `82b15c32-1b42-4740-bc3b-2e9f6603e875`
- **Current role**: `supervisor`
- **Needs**: `super_admin` role + `has_access = true` for all 60 pages

## Plan

### 1. Add super_admin role
Upsert a `super_admin` row into `user_roles` for this user.

### 2. Grant access to all pages
Upsert `has_access = true` for all 60 page identifiers found in the system into `user_page_permissions`.

### 3. Implementation
Create a temporary edge function `grant-full-access` that:
- Uses the service role key to bypass RLS
- Adds `super_admin` role
- Grants access to all pages
- Execute it, then delete it

### Pages (60 total)
All existing page identifiers from the database: `accounting`, `api_usage`, `budgeting`, `business_ideas`, `complaints`, `conductor_submissions`, `customers`, `daily_trips`, `dashboard`, `data_entry_settings`, `document_manager`, `driver_allocation`, `driver_training`, `executive_dashboard`, `feedback`, `feedback_module`, `fleet_analytics`, `fleet_management`, `governance_calendar`, `governance_holidays`, `insurance`, `late_entry_requests`, `lightvehicle_addons`, `lightvehicle_quotations`, `lightvehicle_referral`, `lightvehicle_vehicle_data`, `lightvehicle_vehicle_models`, `maintenance`, `marketing_dashboard`, `marketing_job_requests`, `marketing_projects`, `marketing_social`, `marketing_tasks`, `marketing_team`, `nsp_daily_sales`, `nsp_summary`, `real_time_tracking`, `route_permits`, `scheduled_tasks`, `school_bus_service`, `seasonal_themes`, `sinotruck_customers`, `sinotruck_quotations`, `sinotruck_truck_models`, `special_hire`, `staff_attendance`, `staff_management`, `staff_performance`, `system_health`, `system_issues`, `trips_analytics`, `tyre_management`, `vehicle_inquiries`, `whatsapp_hub`, `yutong_addons`, `yutong_bus_models`, `yutong_old_sales`, `yutong_quotations`, `yutong_referral`, `yutong_vehicle_data`


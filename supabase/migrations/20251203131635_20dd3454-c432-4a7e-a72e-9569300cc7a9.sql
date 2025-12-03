-- ============================================
-- PERFORMANCE OPTIMIZATION: RLS Policies
-- Creates has_any_role() function and index
-- ============================================

-- Step 1: Create optimized has_any_role() function
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role = ANY(_roles)
  )
$$;

-- Step 2: Add dedicated index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_lookup 
ON public.user_roles(user_id);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO service_role;

-- Step 3: Update core RLS policies using has_any_role()

-- accident_records
DROP POLICY IF EXISTS "Users with admin roles can manage accident records" ON public.accident_records;
CREATE POLICY "Users with admin roles can manage accident records" ON public.accident_records
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- accident_documents  
DROP POLICY IF EXISTS "Users with admin roles can manage accident documents" ON public.accident_documents;
CREATE POLICY "Users with admin roles can manage accident documents" ON public.accident_documents
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- accident_audit_trail
DROP POLICY IF EXISTS "Users with admin roles can view audit trail" ON public.accident_audit_trail;
CREATE POLICY "Users with admin roles can view audit trail" ON public.accident_audit_trail
  FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- buses
DROP POLICY IF EXISTS "Users with appropriate roles can manage buses" ON public.buses;
CREATE POLICY "Users with appropriate roles can manage buses" ON public.buses
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- bus_loans
DROP POLICY IF EXISTS "Users with admin roles can manage bus loans" ON public.bus_loans;
CREATE POLICY "Users with admin roles can manage bus loans" ON public.bus_loans
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- bus_loan_payments
DROP POLICY IF EXISTS "Users with admin roles can manage loan payments" ON public.bus_loan_payments;
CREATE POLICY "Users with admin roles can manage loan payments" ON public.bus_loan_payments
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- bus_tyres
DROP POLICY IF EXISTS "Users with appropriate roles can manage tyres" ON public.bus_tyres;
CREATE POLICY "Users with appropriate roles can manage tyres" ON public.bus_tyres
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- bus_types
DROP POLICY IF EXISTS "Users with admin roles can manage bus types" ON public.bus_types;
CREATE POLICY "Users with admin roles can manage bus types" ON public.bus_types
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- daily_trips
DROP POLICY IF EXISTS "Users with appropriate roles can manage trips" ON public.daily_trips;
CREATE POLICY "Users with appropriate roles can manage trips" ON public.daily_trips
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor', 'staff']::app_role[]));

-- daily_bus_expenses
DROP POLICY IF EXISTS "Users with appropriate roles can manage expenses" ON public.daily_bus_expenses;
CREATE POLICY "Users with appropriate roles can manage expenses" ON public.daily_bus_expenses
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor', 'staff']::app_role[]));

-- document_storage
DROP POLICY IF EXISTS "Users with appropriate roles can manage documents" ON public.document_storage;
CREATE POLICY "Users with appropriate roles can manage documents" ON public.document_storage
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- document_approvals
DROP POLICY IF EXISTS "Users with appropriate roles can manage approvals" ON public.document_approvals;
CREATE POLICY "Users with appropriate roles can manage approvals" ON public.document_approvals
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- documents
DROP POLICY IF EXISTS "Users with appropriate roles can manage documents" ON public.documents;
CREATE POLICY "Users with appropriate roles can manage documents" ON public.documents
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- user_roles
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- user_page_permissions
DROP POLICY IF EXISTS "Admins can manage page permissions" ON public.user_page_permissions;
CREATE POLICY "Admins can manage page permissions" ON public.user_page_permissions
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- special_hire_quotations
DROP POLICY IF EXISTS "Users with appropriate roles can manage quotations" ON public.special_hire_quotations;
CREATE POLICY "Users with appropriate roles can manage quotations" ON public.special_hire_quotations
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor', 'finance', 'staff']::app_role[]));

-- special_hire_payments
DROP POLICY IF EXISTS "Users with appropriate roles can manage payments" ON public.special_hire_payments;
CREATE POLICY "Users with appropriate roles can manage payments" ON public.special_hire_payments
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- special_hire_trip_adjustments
DROP POLICY IF EXISTS "Users with appropriate roles can manage adjustments" ON public.special_hire_trip_adjustments;
CREATE POLICY "Users with appropriate roles can manage adjustments" ON public.special_hire_trip_adjustments
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor', 'finance']::app_role[]));

-- special_hire_submissions
DROP POLICY IF EXISTS "Users with appropriate roles can manage submissions" ON public.special_hire_submissions;
CREATE POLICY "Users with appropriate roles can manage submissions" ON public.special_hire_submissions
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- referral_agents
DROP POLICY IF EXISTS "Users with appropriate roles can manage agents" ON public.referral_agents;
CREATE POLICY "Users with appropriate roles can manage agents" ON public.referral_agents
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- routes
DROP POLICY IF EXISTS "Users with appropriate roles can manage routes" ON public.routes;
CREATE POLICY "Users with appropriate roles can manage routes" ON public.routes
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- route_permits
DROP POLICY IF EXISTS "Users with appropriate roles can manage permits" ON public.route_permits;
CREATE POLICY "Users with appropriate roles can manage permits" ON public.route_permits
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- driver_allocations
DROP POLICY IF EXISTS "Users with appropriate roles can manage allocations" ON public.driver_allocations;
CREATE POLICY "Users with appropriate roles can manage allocations" ON public.driver_allocations
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- governance_items
DROP POLICY IF EXISTS "Users with admin roles can manage governance items" ON public.governance_items;
CREATE POLICY "Users with admin roles can manage governance items" ON public.governance_items
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- governance_occurrences
DROP POLICY IF EXISTS "Users with admin roles can manage occurrences" ON public.governance_occurrences;
CREATE POLICY "Users with admin roles can manage occurrences" ON public.governance_occurrences
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- holidays
DROP POLICY IF EXISTS "Users with admin roles can manage holidays" ON public.holidays;
CREATE POLICY "Users with admin roles can manage holidays" ON public.holidays
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- companies
DROP POLICY IF EXISTS "Users with admin roles can manage companies" ON public.companies;
CREATE POLICY "Users with admin roles can manage companies" ON public.companies
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- blocked_periods
DROP POLICY IF EXISTS "Users with admin roles can manage blocked periods" ON public.blocked_periods;
CREATE POLICY "Users with admin roles can manage blocked periods" ON public.blocked_periods
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- yutong_quotations
DROP POLICY IF EXISTS "Users with appropriate roles can manage yutong quotations" ON public.yutong_quotations;
CREATE POLICY "Users with appropriate roles can manage yutong quotations" ON public.yutong_quotations
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- yutong_customers
DROP POLICY IF EXISTS "Users with appropriate roles can manage yutong customers" ON public.yutong_customers;
CREATE POLICY "Users with appropriate roles can manage yutong customers" ON public.yutong_customers
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- yutong_orders
DROP POLICY IF EXISTS "Users with appropriate roles can manage yutong orders" ON public.yutong_orders;
CREATE POLICY "Users with appropriate roles can manage yutong orders" ON public.yutong_orders
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- yutong_customer_payments
DROP POLICY IF EXISTS "Users with appropriate roles can manage yutong payments" ON public.yutong_customer_payments;
CREATE POLICY "Users with appropriate roles can manage yutong payments" ON public.yutong_customer_payments
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- yutong_bus_models
DROP POLICY IF EXISTS "Users with admin roles can manage bus models" ON public.yutong_bus_models;
CREATE POLICY "Users with admin roles can manage bus models" ON public.yutong_bus_models
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- yutong_addons
DROP POLICY IF EXISTS "Users with admin roles can manage addons" ON public.yutong_addons;
CREATE POLICY "Users with admin roles can manage addons" ON public.yutong_addons
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- nsp_daily_sales
DROP POLICY IF EXISTS "Users with appropriate roles can manage nsp sales" ON public.nsp_daily_sales;
CREATE POLICY "Users with appropriate roles can manage nsp sales" ON public.nsp_daily_sales
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance', 'staff']::app_role[]));

-- school_branches
DROP POLICY IF EXISTS "Users with appropriate roles can manage branches" ON public.school_branches;
CREATE POLICY "Users with appropriate roles can manage branches" ON public.school_branches
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- school_students
DROP POLICY IF EXISTS "Users with appropriate roles can manage students" ON public.school_students;
CREATE POLICY "Users with appropriate roles can manage students" ON public.school_students
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor', 'staff']::app_role[]));

-- real_time_tracking
DROP POLICY IF EXISTS "Users with appropriate roles can view tracking" ON public.real_time_tracking;
CREATE POLICY "Users with appropriate roles can view tracking" ON public.real_time_tracking
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor', 'staff']::app_role[]));

-- gps_location_history
DROP POLICY IF EXISTS "Users with appropriate roles can view gps history" ON public.gps_location_history;
CREATE POLICY "Users with appropriate roles can view gps history" ON public.gps_location_history
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- driver_behavior_events
DROP POLICY IF EXISTS "Users with appropriate roles can view driver events" ON public.driver_behavior_events;
CREATE POLICY "Users with appropriate roles can view driver events" ON public.driver_behavior_events
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- driver_scorecards
DROP POLICY IF EXISTS "Users with appropriate roles can view scorecards" ON public.driver_scorecards;
CREATE POLICY "Users with appropriate roles can view scorecards" ON public.driver_scorecards
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- completed_trips
DROP POLICY IF EXISTS "Users with appropriate roles can view completed trips" ON public.completed_trips;
CREATE POLICY "Users with appropriate roles can view completed trips" ON public.completed_trips
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- fleet_analytics_daily
DROP POLICY IF EXISTS "Users with appropriate roles can view analytics" ON public.fleet_analytics_daily;
CREATE POLICY "Users with appropriate roles can view analytics" ON public.fleet_analytics_daily
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- bus_fuel_readings
DROP POLICY IF EXISTS "Users with appropriate roles can manage fuel readings" ON public.bus_fuel_readings;
CREATE POLICY "Users with appropriate roles can manage fuel readings" ON public.bus_fuel_readings
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- bus_service_alerts
DROP POLICY IF EXISTS "Users with appropriate roles can manage service alerts" ON public.bus_service_alerts;
CREATE POLICY "Users with appropriate roles can manage service alerts" ON public.bus_service_alerts
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- bus_daily_mileage
DROP POLICY IF EXISTS "Users with appropriate roles can manage daily mileage" ON public.bus_daily_mileage;
CREATE POLICY "Users with appropriate roles can manage daily mileage" ON public.bus_daily_mileage
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- tyre_rotation_history
DROP POLICY IF EXISTS "Users with appropriate roles can manage rotation history" ON public.tyre_rotation_history;
CREATE POLICY "Users with appropriate roles can manage rotation history" ON public.tyre_rotation_history
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- tyre_inspection_records
DROP POLICY IF EXISTS "Users with appropriate roles can manage inspections" ON public.tyre_inspection_records;
CREATE POLICY "Users with appropriate roles can manage inspections" ON public.tyre_inspection_records
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- chart_of_accounts
DROP POLICY IF EXISTS "Users with finance roles can manage accounts" ON public.chart_of_accounts;
CREATE POLICY "Users with finance roles can manage accounts" ON public.chart_of_accounts
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- journal_entries
DROP POLICY IF EXISTS "Users with finance roles can manage journal entries" ON public.journal_entries;
CREATE POLICY "Users with finance roles can manage journal entries" ON public.journal_entries
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- journal_entry_lines
DROP POLICY IF EXISTS "Users with finance roles can manage entry lines" ON public.journal_entry_lines;
CREATE POLICY "Users with finance roles can manage entry lines" ON public.journal_entry_lines
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- accounts_receivable
DROP POLICY IF EXISTS "Users with finance roles can manage AR" ON public.accounts_receivable;
CREATE POLICY "Users with finance roles can manage AR" ON public.accounts_receivable
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- accounts_payable
DROP POLICY IF EXISTS "Users with finance roles can manage AP" ON public.accounts_payable;
CREATE POLICY "Users with finance roles can manage AP" ON public.accounts_payable
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- budgets
DROP POLICY IF EXISTS "Users with finance roles can manage budgets" ON public.budgets;
CREATE POLICY "Users with finance roles can manage budgets" ON public.budgets
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- budget_line_items
DROP POLICY IF EXISTS "Users with finance roles can manage budget items" ON public.budget_line_items;
CREATE POLICY "Users with finance roles can manage budget items" ON public.budget_line_items
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- budget_departments
DROP POLICY IF EXISTS "Users with finance roles can manage departments" ON public.budget_departments;
CREATE POLICY "Users with finance roles can manage departments" ON public.budget_departments
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- budget_templates
DROP POLICY IF EXISTS "Users with finance roles can manage templates" ON public.budget_templates;
CREATE POLICY "Users with finance roles can manage templates" ON public.budget_templates
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- budget_approvals
DROP POLICY IF EXISTS "Users with finance roles can manage budget approvals" ON public.budget_approvals;
CREATE POLICY "Users with finance roles can manage budget approvals" ON public.budget_approvals
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- budget_revisions
DROP POLICY IF EXISTS "Users with finance roles can manage revisions" ON public.budget_revisions;
CREATE POLICY "Users with finance roles can manage revisions" ON public.budget_revisions
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- sinotruck_quotations
DROP POLICY IF EXISTS "Users with appropriate roles can manage sinotruck quotations" ON public.sinotruck_quotations;
CREATE POLICY "Users with appropriate roles can manage sinotruck quotations" ON public.sinotruck_quotations
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- sinotruck_customers
DROP POLICY IF EXISTS "Users with appropriate roles can manage sinotruck customers" ON public.sinotruck_customers;
CREATE POLICY "Users with appropriate roles can manage sinotruck customers" ON public.sinotruck_customers
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- sinotruck_truck_models
DROP POLICY IF EXISTS "Users with admin roles can manage truck models" ON public.sinotruck_truck_models;
CREATE POLICY "Users with admin roles can manage truck models" ON public.sinotruck_truck_models
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- sinotruck_truck_model_images
DROP POLICY IF EXISTS "Users with admin roles can manage truck images" ON public.sinotruck_truck_model_images;
CREATE POLICY "Users with admin roles can manage truck images" ON public.sinotruck_truck_model_images
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- vehicle_inquiries
DROP POLICY IF EXISTS "Users with appropriate roles can manage inquiries" ON public.vehicle_inquiries;
CREATE POLICY "Users with appropriate roles can manage inquiries" ON public.vehicle_inquiries
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- inquiry_follow_ups
DROP POLICY IF EXISTS "Users with appropriate roles can manage follow ups" ON public.inquiry_follow_ups;
CREATE POLICY "Users with appropriate roles can manage follow ups" ON public.inquiry_follow_ups
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- inquiry_hub_settings
DROP POLICY IF EXISTS "Users with admin roles can manage hub settings" ON public.inquiry_hub_settings;
CREATE POLICY "Users with admin roles can manage hub settings" ON public.inquiry_hub_settings
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- seasonal_themes
DROP POLICY IF EXISTS "Users with admin roles can manage themes" ON public.seasonal_themes;
CREATE POLICY "Users with admin roles can manage themes" ON public.seasonal_themes
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- pending_invites
DROP POLICY IF EXISTS "Users with admin roles can manage invites" ON public.pending_invites;
CREATE POLICY "Users with admin roles can manage invites" ON public.pending_invites
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- temporary_accounts
DROP POLICY IF EXISTS "Users with admin roles can manage temp accounts" ON public.temporary_accounts;
CREATE POLICY "Users with admin roles can manage temp accounts" ON public.temporary_accounts
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- multi_day_route_config
DROP POLICY IF EXISTS "Users with admin roles can manage route config" ON public.multi_day_route_config;
CREATE POLICY "Users with admin roles can manage route config" ON public.multi_day_route_config
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- late_entry_requests
DROP POLICY IF EXISTS "Users with appropriate roles can manage late entries" ON public.late_entry_requests;
CREATE POLICY "Users with appropriate roles can manage late entries" ON public.late_entry_requests
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor', 'staff']::app_role[]));

-- conductor_submissions
DROP POLICY IF EXISTS "Users with appropriate roles can manage conductor submissions" ON public.conductor_submissions;
CREATE POLICY "Users with appropriate roles can manage conductor submissions" ON public.conductor_submissions
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));

-- approval_name_suggestions
DROP POLICY IF EXISTS "Users with appropriate roles can manage suggestions" ON public.approval_name_suggestions;
CREATE POLICY "Users with appropriate roles can manage suggestions" ON public.approval_name_suggestions
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- payment_notifications
DROP POLICY IF EXISTS "Users with appropriate roles can manage notifications" ON public.payment_notifications;
CREATE POLICY "Users with appropriate roles can manage notifications" ON public.payment_notifications
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'finance']::app_role[]));

-- special_hire_signature_settings
DROP POLICY IF EXISTS "Users with admin roles can manage signature settings" ON public.special_hire_signature_settings;
CREATE POLICY "Users with admin roles can manage signature settings" ON public.special_hire_signature_settings
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- bus_api_connections
DROP POLICY IF EXISTS "Users with appropriate roles can manage api connections" ON public.bus_api_connections;
CREATE POLICY "Users with appropriate roles can manage api connections" ON public.bus_api_connections
  FOR ALL USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'supervisor']::app_role[]));
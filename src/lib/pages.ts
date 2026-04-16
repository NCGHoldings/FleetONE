// Centralized list of navigation pages for access control and sidebar rendering
// Each page has a stable id used in permissions, a title, url, and category

export type PageItem = {
  id: string;
  title: string;
  url: string;
};

export type PageCategories = {
  main: PageItem[];
  operations: PageItem[];
  business: PageItem[];
  finance: PageItem[];
  marketing: PageItem[];
  yutong: PageItem[];
  sinotruck: PageItem[];
  lightvehicle: PageItem[];
  nsp: PageItem[];
  governance: PageItem[];
};

export const PAGES: PageCategories = {
  main: [
    { id: "dashboard", title: "Dashboard", url: "/" },
    { id: "executive_dashboard", title: "Executive Dashboard", url: "/executive-dashboard" },
    { id: "customers", title: "Customers", url: "/customers" },
    { id: "daily_trips", title: "Daily Trips", url: "/trips" },
    { id: "trips_analytics", title: "Trips Analytics", url: "/trips/analytics" },
    { id: "fleet_management", title: "Fleet Management", url: "/fleet" },
    { id: "fleet_analytics", title: "Fleet Analytics", url: "/fleet-analytics" },
    { id: "maintenance", title: "Maintenance", url: "/maintenance" },
    { id: "insurance", title: "Insurance", url: "/insurance" },
    { id: "staff_management", title: "Staff Management", url: "/staff" },
    { id: "staff_performance", title: "Staff Performance", url: "/staff-performance" },
    { id: "system_issues", title: "System Issues", url: "/system-issues" },
  ],
  operations: [
    { id: "route_permits", title: "Route Permits", url: "/permits" },
    { id: "driver_training", title: "Driver Training", url: "/training" },
    { id: "real_time_tracking", title: "Real-Time Tracking", url: "/tracking" },
    { id: "driver_allocation", title: "Driver Allocation", url: "/allocation" },
    { id: "staff_attendance", title: "Staff Attendance", url: "/attendance" },
    { id: "school_bus_service", title: "School Bus Service", url: "/school-bus-service" },
    { id: "complaints", title: "Complaints", url: "/complaints" },
    { id: "conductor_submissions", title: "Conductor Submissions", url: "/trips/conductor-submissions" },
    { id: "late_entry_requests", title: "Late Entry Requests", url: "/trips/late-entry-requests" },
  ],
  business: [
    { id: "special_hire", title: "Special Hire", url: "/special-hire" },
    { id: "business_ideas", title: "Business Ideas", url: "/business" },
    { id: "document_manager", title: "Document Manager", url: "/documents" },
    { id: "feedback_module", title: "Feedback Module", url: "/feedback-module" },
    { id: "vehicle_inquiries", title: "Vehicle Inquiries", url: "/vehicle-inquiries" },
    { id: "whatsapp_hub", title: "WhatsApp Hub", url: "/whatsapp" },
  ],
  finance: [
    { id: "accounting", title: "Accounting & GL", url: "/accounting" },
    { id: "budgeting", title: "Budgeting", url: "/budgeting" },
    { id: "api_usage", title: "API Usage", url: "/api-usage" },
    { id: "system_health", title: "System Health", url: "/system-health" },
  ],
  marketing: [
    { id: "marketing_dashboard", title: "Marketing Dashboard", url: "/marketing" },
    { id: "marketing_job_requests", title: "Job Requests", url: "/marketing?tab=job-requests" },
    { id: "marketing_tasks", title: "Tasks", url: "/marketing?tab=tasks" },
    { id: "marketing_projects", title: "Projects", url: "/marketing?tab=projects" },
    { id: "marketing_team", title: "Team Profiles", url: "/marketing?tab=team" },
    { id: "marketing_social", title: "Social Media", url: "/marketing?tab=social" },
  ],
  yutong: [
    { id: "yutong_quotations", title: "Quotations", url: "/yutong-quotations" },
    { id: "yutong_old_sales", title: "Old Sales", url: "/yutong-quotations?tab=old-sales" },
    { id: "yutong_bus_models", title: "Bus Models", url: "/yutong-quotations?tab=bus-models" },
    { id: "yutong_addons", title: "Add-ons", url: "/yutong-quotations?tab=addons" },
    { id: "yutong_vehicle_data", title: "Vehicle Data", url: "/yutong-quotations?tab=vehicle-data" },
    { id: "yutong_referral", title: "Referral Agents", url: "/yutong-quotations?tab=referral" },
  ],
  sinotruck: [
    { id: "sinotruck_quotations", title: "Quotations", url: "/sinotruck-quotations" },
    { id: "sinotruck_truck_models", title: "Truck Models", url: "/sinotruck-quotations?tab=truck-models" },
    { id: "sinotruck_customers", title: "Customers", url: "/sinotruck-quotations?tab=customers" },
  ],
  lightvehicle: [
    { id: "lightvehicle_quotations", title: "Quotations", url: "/lightvehicle-quotations" },
    { id: "lightvehicle_vehicle_models", title: "Vehicle Models", url: "/lightvehicle-quotations?tab=vehicle-models" },
    { id: "lightvehicle_addons", title: "Add-ons", url: "/lightvehicle-quotations?tab=addons" },
    { id: "lightvehicle_vehicle_data", title: "Vehicle Data", url: "/lightvehicle-quotations?tab=vehicle-data" },
    { id: "lightvehicle_referral", title: "Referral Agents", url: "/lightvehicle-quotations?tab=referral" },
  ],
  nsp: [
    { id: "nsp_daily_sales", title: "Daily Sales", url: "/nsp-daily-sales" },
    { id: "nsp_summary", title: "Summary & Reports", url: "/nsp-summary" },
    { id: "tyre_management", title: "Tyre Management", url: "/tyre-management" },
  ],
  governance: [
    { id: "governance_calendar", title: "Governance Calendar", url: "/governance/calendar" },
    { id: "governance_holidays", title: "Holiday Management", url: "/governance/holidays" },
    { id: "seasonal_themes", title: "Seasonal Themes", url: "/seasonal-themes" },
    { id: "scheduled_tasks", title: "Scheduled Tasks", url: "/scheduled-tasks" },
  ],
};

export const ALL_PAGES_FLAT: PageItem[] = [
  ...PAGES.main,
  ...PAGES.operations,
  ...PAGES.business,
  ...PAGES.finance,
  ...PAGES.marketing,
  ...PAGES.yutong,
  ...PAGES.sinotruck,
  ...PAGES.lightvehicle,
  ...PAGES.nsp,
  ...PAGES.governance,
];
